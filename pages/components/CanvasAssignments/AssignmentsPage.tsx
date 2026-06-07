import React from "react";
import Sidebar from "../Main/Sidebar/Sidebar";
import { type CanvasAssignmentGroup } from "../../../src/types/Grades";
import ClassAssignment from "@/util/ClassAssignment";
const exampleAssignmentGroupList: CanvasAssignmentGroup[] = [
  {
    classTitle: "Intro to AI",
    classPeriod: "2",
    classLink: "gradeflux/2",
    assignments: [
      {
        assignmentTitle: "Assignment 1",
        pointsEarned: 95,
        totalPoints: 100,
        dateGraded: "2024-06-01",
        type: "All Tasks / Assessments",
      },
      {
        assignmentTitle: "Assignment 2",
        pointsEarned: 88,
        totalPoints: 100,
        dateGraded: "2024-06-05",
        type: "Practice / Preparation",
      },
      {
        assignmentTitle: "Assignment 3",
        pointsEarned: 76,
        totalPoints: 100,
        dateGraded: "2024-06-10",
        type: "All Tasks / Assessments",
      },
    ],
  },
];
export default function AssignmentsPage() {
  return (
    <div className="canvas-assignments-container">
      <h1 className="upcoming-title">Upcoming Assignments</h1>
      {exampleAssignmentGroupList.map((assignmentGroup, idx) => (
        <div
          className="canvas-assignment-group"
          key={assignmentGroup.classLink ?? idx}
        >
          <h2>
            {assignmentGroup.classTitle} - Period {assignmentGroup.classPeriod}
          </h2>
          <ul>
            {assignmentGroup.assignments.map((assignment, aidx) => (
              <ClassAssignment
                key={`${assignmentGroup.classPeriod}-${aidx}-${assignment.assignmentTitle}`}
                assignment={assignment}
                forwardPageLink={`gradeflux/${assignmentGroup.classPeriod}/${encodeURIComponent(
                  assignment.assignmentTitle,
                )}`}
              />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
