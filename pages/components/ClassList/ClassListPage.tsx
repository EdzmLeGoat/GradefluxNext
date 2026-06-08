import React from "react";
import ClassCard from "./ClassCard";
import type { ClassProps } from "../../../src/types/Grades";

type Props = {
  classProps?: ClassProps[] | null;
};

export default function ClassListPage({ classProps }: Props) {
  return (
    <ul className="card-container">
      {classProps?.map((item, index) => {
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
