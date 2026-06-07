import React from "react";
import ClassAssignment from "../ClassAssignment";
import type { ClassAssignment as ClassAssignmentType } from "@/types/Grades";

export default function ClassDetailsAssignments({
  assignments,
}: {
  assignments?: ClassAssignmentType[];
}) {
  if (!assignments) {
    return (
      <ul className="assignments-container">
        <li>No assignments found</li>
      </ul>
    );
  }
  const list = assignments && assignments.length ? assignments : [];

  return (
    <ul className="assignments-container">
      {list.map((a, i) => (
        <ClassAssignment key={i} assignment={a} />
      ))}
    </ul>
  );
}
