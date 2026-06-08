import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import * as cheerio from 'cheerio';
import { parseStringPromise } from 'xml2js';
import { calculateOverallGrade, getGradeLetter } from '../../src/types/Grades';

import { ClassProps, ClassAssignment, Period, GradeNumber, GradeLetter } from '../../src/types/Grades';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { userID, password } = req.body;

  const endpoint = 'https://studentvuelibtest.up.railway.app/fulfillAxios';

  try {
    const jsonPayload = {
      url: 'https://md-mcps-psv.edupoint.com/Service/PXPCommunication.asmx',
      xml: `<?xml version="1.0" encoding="utf-8"?>
        <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
          <soap:Body>
            <ProcessWebServiceRequestMultiWeb xmlns="http://edupoint.com/webservices/">
              <userID>${userID}</userID>
              <password>${password}</password>
              <validateErrors>true</validateErrors>
              <skipLoginLog>0</skipLoginLog>
              <parent>0</parent>
              <webServiceHandleName>PXPWebServices</webServiceHandleName>
              <paramStr>&lt;Parms&gt;&lt;childIntId&gt;0&lt;/childIntId&gt;&lt;/Parms&gt;</paramStr>
              <methodName>Gradebook</methodName>
            </ProcessWebServiceRequestMultiWeb>
          </soap:Body>
        </soap:Envelope>`,
      encrypted: false
    }
    const response = await axios.post(endpoint, jsonPayload);

    console.log('Received response from fulfillment endpoint:', {
      status: response.status,
      headers: response.headers,
      dataPreview: typeof response.data === 'string' ? response.data.slice(0, 2000) : response.data
    });

    // The fulfillment endpoint returns an object like: { status: true, response: "<soap:Envelope>...</soap:Envelope>" }
    const payload = response.data;
    const xmlString = typeof payload === 'string' ? payload : payload?.response || payload;

    // Parse the outer SOAP XML to JSON
    let soapJson: any = null;
    try {
      soapJson = await parseStringPromise(xmlString, { explicitArray: false, mergeAttrs: true, trim: true });
    } catch (e) {
      console.warn('Failed to parse SOAP XML with xml2js, returning raw payload');
    }

    // Helper to find inner XML string (escaped or raw) inside parsed SOAP object
    const findInnerXmlString = (obj: any): string | null => {
      if (!obj || typeof obj !== 'object') return null;
      for (const key of Object.keys(obj)) {
        const val = obj[key];
        if (typeof val === 'string') {
          // looks like escaped XML
          if (val.indexOf('&lt;') !== -1 || val.trim().startsWith('<')) return val;
        }
        if (typeof val === 'object') {
          const nested = findInnerXmlString(val);
          if (nested) return nested;
        }
      }
      return null;
    };

    let parsedInner: any = null;
    try {
      const innerCandidate = soapJson ? findInnerXmlString(soapJson) : (typeof xmlString === 'string' && xmlString.indexOf('<') !== -1 ? xmlString : null);
      if (innerCandidate) {
        // unescape common entities if necessary
        let innerXml = innerCandidate.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
        // If innerXml still looks like XML, parse it
        if (innerXml.trim().startsWith('<')) {
          parsedInner = await parseStringPromise(innerXml, { explicitArray: false, mergeAttrs: true, trim: true });
        }
      }
    } catch (e) {
      console.warn('Failed to parse inner XML:', e);
    }

    // Return the most useful parsed object: prefer inner parsed XML (Gradebook/etc.), otherwise return the SOAP JSON
    const result = parsedInner || soapJson || payload;

    // Now map the parsed result into our ClassInfo type.
    // Support different shapes: result.Gradebook.Courses.Course, result.Courses.Course, result.courses.course
    const coursesNode = result?.Gradebook?.Courses?.Course || result?.Courses?.Course || result?.courses?.course || null;

    const courseArray = coursesNode
      ? Array.isArray(coursesNode)
        ? coursesNode
        : [coursesNode]
      : [];

    const parsedCourses: ClassProps[] = courseArray.map((course: any) => {
      // Safely extract fields from varying XML->JSON shapes
      let classTitle = course.Title || course.classTitle || course.CourseName || '';
      // Remove any parenthetical fragments like " (ITC2021B)" from titles
      classTitle = classTitle.replace(/\s*\([^)]*\)/g, '').trim();
      const teacherName = course.Staff || course.teacherName || '';
      const periodNumber = (course.Period || course.period || 'N/A') as Period;

      const mark = course.Marks?.Mark || course.Mark || null;      // Extract assignments array from nested Marks -> Mark -> Assignments -> Assignment
      let assignmentsNode = mark?.Assignments?.Assignment || course?.Assignments?.Assignment || null;
      const assignmentsArray = assignmentsNode
        ? Array.isArray(assignmentsNode)
          ? assignmentsNode
          : [assignmentsNode]
        : [];

      const assignmentList: ClassAssignment[] = assignmentsArray.map((a: any) => {
        const pointsEarnedRaw = a.Score || a.Point || a.Points || a.ScoreCalValue || null;
        const totalPointsRaw = a.ScoreMaxValue || a.PointPossible || a.Points || null;
        const pointsEarned = (typeof pointsEarnedRaw === 'string' && pointsEarnedRaw !== '') ? Number(pointsEarnedRaw) : (pointsEarnedRaw ? Number(pointsEarnedRaw) : 'N/A');
        const totalPoints = (typeof totalPointsRaw === 'string' && totalPointsRaw !== '') ? Number(totalPointsRaw) : (totalPointsRaw ? Number(totalPointsRaw) : 0);
        if (totalPoints == 0) {
          console.log(`Warning: totalPoints is zero for assignment "${a.Measure || a.MeasureDescription || a.AssignmentTitle || a.Title || 'Unknown'}" in course "${classTitle}". This may indicate missing or malformed data. Raw pointsEarned: ${pointsEarnedRaw}, Raw totalPoints: ${totalPointsRaw}`);
        }

        const assignment: ClassAssignment = {
          assignmentTitle: a.Measure || a.MeasureDescription || a.AssignmentTitle || a.Title || '',
          pointsEarned: Number.isNaN(Number(pointsEarned)) ? 'N/A' : (pointsEarned as GradeNumber),
          totalPoints: Number.isNaN(Number(totalPoints)) ? 0 : Number(totalPoints),
          dateGraded: a.Date || a.DueDate || '',
          type: (a.Type || "All Tasks / Assessments") as any,
        };
        return assignment;
      });

      //instead of relying on grade fields that may be missing, calculate overall grade from assignments
      const gradeNumber = calculateOverallGrade(assignmentList);
      const gradeLetter = (typeof gradeNumber === 'number') ? getGradeLetter(gradeNumber) : 'N/A';

      // will calculate semester grades based on previous grades but for now just mirror quarter grade
      const semLetter = (course.semLetter || gradeLetter) as GradeLetter;
      const semNumber = (course.semNumber || gradeNumber) as GradeNumber;

      const info: ClassProps = {
        classTitle: classTitle,
        teacherName: teacherName,
        periodNumber: periodNumber,
        assignmentList: assignmentList,
        gradeLetter: gradeLetter,
        gradeNumber: (typeof gradeNumber === 'number' ? gradeNumber : 'N/A'),
        semLetter: semLetter,
        semNumber: (typeof semNumber === 'number' ? semNumber : 'N/A') as GradeNumber,
      }
      return info;
    });

    return res.status(200).json(parsedCourses);
  } catch (error: any) {
    console.error('SAML Automation Pipeline Exception:', error.message);
    return res.status(500).json({ error: 'Pipeline processing failed', details: error.message });
  }
}
