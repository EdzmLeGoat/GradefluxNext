import React from "react";
import ClassCard from "./ClassCard";
import type { ClassProps } from "../../../src/types/Grades";
import useSessionStore from "../../../src/stores/useSessionStore";

export default function ClassListPage() {
  const classes = useSessionStore((s) => s.classes);

  return (
    <ul className="card-container">
      {classes?.map((item, index) => {
        // item will be ClassProps
        const classIndex = index + 1; // 1-based index as requested
        return (
          <ClassCard
            key={index}
            {...(item as ClassProps)}
            classIndex={classIndex}
          />
        );
      })}
    </ul>
  );
}
