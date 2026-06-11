import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import {
  calculateOverallGrade,
  getGradeLetter,
  type ClassProps,
  type ClassAssignment,
  type Period,
  type GradeNumber,
  type GradeLetter,
} from '../../src/types/Grades';

// Local Semester type used for API response
type Semester = {
  interimOne: ClassProps[];
  quarterOne: ClassProps[];
  interimTwo: ClassProps[];
  quarterTwo: ClassProps[];
};

// Parse a SOAP/XML payload and return an array of ClassProps
async function parseData(payload: any): Promise<ClassProps[]> {
  try {
    const xmlString = typeof payload === 'string' ? payload : payload?.response || payload;

    // Parse outer SOAP XML (if present) to JSON
    let soapJson: any = null;
    try {
      soapJson = await parseStringPromise(String(xmlString), { explicitArray: false, mergeAttrs: true, trim: true });
    } catch (e) {
      // fallback: not a SOAP wrapper or not parseable
      soapJson = null;
    }

    // Helper to find inner XML string inside parsed object
    const findInnerXmlString = (obj: any): string | null => {
      if (!obj || typeof obj !== 'object') return null;
      for (const key of Object.keys(obj)) {
        const val = obj[key];
        if (typeof val === 'string') {
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
        let innerXml = innerCandidate.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
        if (innerXml.trim().startsWith('<')) {
          parsedInner = await parseStringPromise(innerXml, { explicitArray: false, mergeAttrs: true, trim: true });
        }
      }
    } catch (e) {
      parsedInner = null;
    }

    const result = parsedInner || soapJson || payload;

    const coursesNode = result?.Gradebook?.Courses?.Course || result?.Courses?.Course || result?.courses?.course || null;

    const courseArray = coursesNode
      ? Array.isArray(coursesNode)
        ? coursesNode
        : [coursesNode]
      : [];

    const parsedCourses: ClassProps[] = courseArray.map((course: any, i: number) => {
      let classTitle = course.Title || course.classTitle || course.CourseName || '';
      classTitle = String(classTitle).replace(/\s*\([^)]*\)/g, '').trim();
      const teacherName = course.Staff || course.teacherName || '';
      const periodNumber = (course.Period || course.period || 'N/A') as Period;

      const mark = course.Marks?.Mark || course.Mark || null;
      let assignmentsNode = mark?.Assignments?.Assignment || course?.Assignments?.Assignment || null;
      const assignmentsArray = assignmentsNode
        ? Array.isArray(assignmentsNode)
          ? assignmentsNode
          : [assignmentsNode]
        : [];

      const assignmentList: ClassAssignment[] = assignmentsArray.map((a: any) => {
        const pointsEarnedRaw = a.Score || a.Point || a.Points || a.ScoreCalValue || null;
        const totalPointsRaw = a.ScoreMaxValue || a.PointPossible || a.Points || null;
        const pointsEarnedNum = (typeof pointsEarnedRaw === 'string' && pointsEarnedRaw !== '') ? Number(pointsEarnedRaw) : (pointsEarnedRaw ? Number(pointsEarnedRaw) : NaN);
        const totalPointsNum = (typeof totalPointsRaw === 'string' && totalPointsRaw !== '') ? Number(totalPointsRaw) : (totalPointsRaw ? Number(totalPointsRaw) : 0);

        const pts: GradeNumber = Number.isFinite(pointsEarnedNum) ? pointsEarnedNum : 'N/A';
        const totalPts: number = Number.isFinite(totalPointsNum) ? totalPointsNum : 0;

        const assignment: ClassAssignment = {
          assignmentTitle: a.Measure || a.MeasureDescription || a.AssignmentTitle || a.Title || '',
          pointsEarned: pts,
          totalPoints: totalPts,
          dateGraded: a.Date || a.DueDate || '',
          type: (a.Type || 'All Tasks / Assessments') as any,
        };
        return assignment;
      });

      const gradeNumber = calculateOverallGrade(assignmentList);
      const gradeLetter = (typeof gradeNumber === 'number') ? getGradeLetter(gradeNumber) : 'N/A';
      const semLetter = (course.semLetter || gradeLetter) as GradeLetter;
      const semNumber = (course.semNumber || gradeNumber) as GradeNumber;

      const info: ClassProps = {
        classTitle,
        teacherName,
        periodNumber,
        assignmentList,
        gradeLetter,
        gradeNumber: (typeof gradeNumber === 'number' ? gradeNumber : 'N/A'),
        semLetter,
        semNumber: (typeof semNumber === 'number' ? semNumber : 'N/A') as GradeNumber,
      };
      return info;
    });

    return parsedCourses;
  } catch (error) {
    console.error('Error parsing data in parseData:', error);
    return [];
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { userID, password } = req.body;
  const endpoint = 'https://studentvuelibtest.up.railway.app/fulfillAxios';

  try {
    const markingPeriods = Array.from({ length: 8 }, (_, i) => i); // 0..7

    const payloads = markingPeriods.map((mp) => ({
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
              <paramStr>&lt;Parms&gt;&lt;childIntId&gt;${mp}&lt;/childIntId&gt;&lt;ReportPeriod&gt;1&lt;/ReportPeriod&gt;&lt;/Parms&gt;</paramStr>
              <methodName>Gradebook</methodName>
            </ProcessWebServiceRequestMultiWeb>
          </soap:Body>
        </soap:Envelope>`,
      encrypted: false,
    }));

    // Post all payloads in parallel to the fulfillment endpoint
    const responses = await Promise.all(payloads.map((p) => axios.post(endpoint, p)));

    // Build semesters from responses: 0-3 -> first semester, 4-7 -> second semester
    const sem1: Semester = {
      interimOne: await parseData(responses[0]?.data),
      quarterOne: await parseData(responses[1]?.data),
      interimTwo: await parseData(responses[2]?.data),
      quarterTwo: await parseData(responses[3]?.data),
    };

    const sem2: Semester = {
      interimOne: await parseData(responses[4]?.data),
      quarterOne: await parseData(responses[5]?.data),
      interimTwo: await parseData(responses[6]?.data),
      quarterTwo: await parseData(responses[7]?.data),
    };

    console.log(sem2.interimOne);

    return res.status(200).json([sem1, sem2]);
  } catch (error: any) {
    console.error('SAML Automation Pipeline Exception:', error?.message || error);
    return res.status(500).json({ error: 'Pipeline processing failed', details: error?.message || String(error) });
  }
}
