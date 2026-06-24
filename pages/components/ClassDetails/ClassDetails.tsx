import React from "react";
import { useRouter } from "next/router";
import ClassDetailsHeader from "./ClassDetailsHeader";
import ClassDetailsAssignments from "./ClassDetailsAssignments";
import { calculateOverallGrade } from "@/types/Grades";
import type { ClassProps, ClassAssignment } from "@/types/Grades";
import useSessionStore from "../../../src/stores/useSessionStore";

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

  // Read classes and selected index from the Zustand store
  const classes = useSessionStore((s) => s.classes);
  const selectedIndex = useSessionStore((s) => s.selectedClassIndex);

  // Prefer explicit selectedClassIndex from the store if available, otherwise use the route index
  const effectiveIndex = selectedIndex ?? index;

  const details: ClassProps | null = React.useMemo(() => {
    if (effectiveIndex === null) return null;
    if (Array.isArray(classes) && classes.length >= effectiveIndex) {
      return classes[effectiveIndex - 1] as ClassProps;
    }
    return null;
  }, [effectiveIndex, classes]);

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
  const gradeNumber = details.gradeNumber;
  const semNumber = details.semNumber;

  return (
    <div className="class-details-container">
      <div className="class-details__main-content">
        <ClassDetailsHeader
          classTitle={details.classTitle}
          teacherName={details.teacherName}
          period={details.periodNumber}
          gradeNumber={typeof gradeNumber === "number" ? gradeNumber : 0}
          semGradeNumber={typeof semNumber === "number" ? semNumber : 0}
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
