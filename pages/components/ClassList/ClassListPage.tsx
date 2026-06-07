import React from "react";
import ClassCard from "./ClassCard";
import type { ClassCardProps, ClassInfo } from "../../../src/types/Grades";

const examplePropOne: ClassCardProps = {
  classTitle: "Quantum Mechanics",
  teacherName: "Dr. Smith",
  periodNumber: "3",
  gradeLetter: "B",
  gradeNumber: 85.59,
  semLetter: "C",
  semNumber: 75.43,
};
const examplePropTwo: ClassCardProps = {
  classTitle: "Calculus II",
  teacherName: "Ms. Johnson",
  periodNumber: "5",
  gradeLetter: "A",
  gradeNumber: 92.34,
  semLetter: "A",
  semNumber: 90.12,
};
const examplePropThree: ClassCardProps = {
  classTitle: "World History",
  teacherName: "Mr. Lee",
  periodNumber: "2",
  gradeLetter: "C",
  gradeNumber: 72.45,
  semLetter: "D",
  semNumber: 65.78,
};
const examplePropFour: ClassCardProps = {
  classTitle: "English Literature",
  teacherName: "Mrs. Davis",
  periodNumber: "4",
  gradeLetter: "D",
  gradeNumber: 61.23,
  semLetter: "E",
  semNumber: 55.67,
};
const classListPropsDefault: ClassCardProps[] = [
  examplePropOne,
  examplePropTwo,
  examplePropThree,
  examplePropFour,
  examplePropOne,
  examplePropTwo,
  examplePropThree,
];

type Props = {
  classCardProps?: (ClassCardProps | ClassInfo)[] | null;
};

export default function ClassListPage({ classCardProps }: Props) {
  const list =
    classCardProps && classCardProps.length
      ? classCardProps
      : classListPropsDefault;

  return (
    <ul className="card-container">
      {list.map((item, index) => {
        // item may be a ClassInfo (with classCardProps & classDetailsProps) or ClassCardProps
        const classIndex = index + 1; // 1-based index as requested
        if ((item as any).classCardProps) {
          const ci = item as ClassInfo;
          return (
            <ClassCard
              key={index}
              {...ci.classCardProps}
              classDetailsProps={ci.classDetailsProps}
              classIndex={classIndex}
            />
          );
        }
        return (
          <ClassCard
            key={index}
            {...(item as ClassCardProps)}
            classIndex={classIndex}
          />
        );
      })}
    </ul>
  );
}
