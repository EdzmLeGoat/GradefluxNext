import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import ClassDetailsHeader from "./ClassDetailsHeader";
import ClassDetailsAssignments from "./ClassDetailsAssignments";
import { calculateOverallGrade } from "@/types/Grades";
import type { ClassDetailsProps, ClassAssignment } from "@/types/Grades";

function sumAssignments(assignments: ClassAssignment[]) {
  let ppActual = 0;
  let ppTotal = 0;
  let atActual = 0;
  let atTotal = 0;
  assignments.forEach((a) => {
    if (a.type === "Practice / Preparation") {
      if (a.pointsEarned !== "N/A") ppActual += Number(a.pointsEarned);
      ppTotal += a.totalPoints;
    } else if (a.type === "All Tasks / Assessments") {
      if (a.pointsEarned !== "N/A") atActual += Number(a.pointsEarned);
      atTotal += a.totalPoints;
    }
  });
  return { ppActual, ppTotal, atActual, atTotal };
}

export default function ClassDetails() {
  const router = useRouter();
  const { classIndex } = router.query;
  const index =
    typeof classIndex === "string"
      ? Number(classIndex)
      : typeof classIndex === "number"
        ? classIndex
        : null;
  const [details, setDetails] = useState<ClassDetailsProps | null>(null);

  useEffect(() => {
    try {
      const indexKey = index !== null ? `selectedClassDetails_${index}` : null;
      let raw = null;
      if (indexKey) raw = localStorage.getItem(indexKey);
      if (!raw) raw = localStorage.getItem("selectedClassDetails");
      if (!raw) return;
      const parsed: ClassDetailsProps = JSON.parse(raw);
      setDetails(parsed);
    } catch (e) {
      // ignore
    }
  }, [index]);

  if (!details) {
    return (
      <div className="class-details-container">
        <div className="class-details__main-content">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  const { ppActual, ppTotal, atActual, atTotal } = sumAssignments(
    details.assignmentList || [],
  );
  const gradeNumber = calculateOverallGrade(
    details.assignmentList || [],
  ) as number;
  const semGradeNumber = gradeNumber; // use same for now

  return (
    <div className="class-details-container">
      <div className="class-details__main-content">
        <ClassDetailsHeader
          classTitle={details.classTitle}
          teacherName={details.teacherName}
          period={details.periodNumber}
          gradeNumber={typeof gradeNumber === "number" ? gradeNumber : 0}
          semGradeNumber={
            typeof semGradeNumber === "number" ? semGradeNumber : 0
          }
          ppActual={ppActual}
          ppTotal={ppTotal}
          atActual={atActual}
          atTotal={atTotal}
        />
        <ClassDetailsAssignments assignments={details.assignmentList} />
      </div>
    </div>
  );
}
