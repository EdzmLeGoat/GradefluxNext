import React from "react";
import ClassListPage from "./components/ClassList/ClassListPage";
import useSessionStore from "../src/stores/useSessionStore";
import { calculateOverallGrade, getGradeLetter } from "@/types/Grades";

export default function HomePage() {
  const classes = useSessionStore((s) => s.classes);

  // ClassListPage expects an array of ClassCardProps or ClassInfo wrappers.
  // Our persisted store holds ClassDetailsProps; normalize into ClassInfo so the list shows real data.
  const mapped = Array.isArray(classes)
    ? classes.map((c, i) => {
        const details: any = c || {};
        // compute gradeNumber from assignments if not present
        const computedGradeNumber =
          typeof details.gradeNumber === "number"
            ? details.gradeNumber
            : Array.isArray(details.assignmentList)
              ? calculateOverallGrade(details.assignmentList)
              : "N/A";
        const computedGradeLetter =
          typeof computedGradeNumber === "number"
            ? getGradeLetter(computedGradeNumber)
            : (details.gradeLetter ?? "N/A");

        const classCard = {
          classTitle: details.classTitle || `Class ${i + 1}`,
          teacherName: details.teacherName || "",
          periodNumber: details.periodNumber || String(i + 1),
          gradeLetter: details.gradeLetter ?? computedGradeLetter,
          gradeNumber: computedGradeNumber,
          semLetter: details.semLetter ?? computedGradeLetter,
          semNumber:
            typeof details.semNumber === "number"
              ? details.semNumber
              : computedGradeNumber,
        };
        return {
          classCardProps: classCard,
          classDetailsProps: details,
        };
      })
    : null;

  return <ClassListPage classCardProps={mapped} />;
}
