import React from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import type { ClassCardProps, ClassDetailsProps } from "@/types/Grades";
import { getGradeColor } from "@/types/Grades";

const nextIcon = "/assets/classes/next.svg";

export default function ClassCard({
  classTitle,
  teacherName,
  periodNumber,
  gradeLetter,
  gradeNumber,
  semLetter,
  semNumber,
  classDetailsProps,
  classIndex,
}: ClassCardProps & {
  classDetailsProps?: ClassDetailsProps | null;
  classIndex?: number;
}) {
  const router = useRouter();

  const handleView = () => {
    // Persist the details for the ClassDetails page under an index-specific key
    const details: ClassDetailsProps = classDetailsProps || {
      classTitle,
      teacherName,
      periodNumber,
      assignmentList: [],
    };
    try {
      const key = `selectedClassDetails_${typeof classIndex !== "undefined" ? classIndex : periodNumber}`;
      localStorage.setItem(key, JSON.stringify(details));
    } catch (e) {
      // ignore
    }
    // navigate to an index-specific URL
    const idx = typeof classIndex !== "undefined" ? classIndex : periodNumber;
    router.push(`/class-details/${encodeURIComponent(String(idx))}`);
  };

  const title = `${classTitle} - ${periodNumber}`;
  const gradeDesc =
    gradeNumber === "N/A"
      ? "N/A"
      : `${gradeLetter} (${gradeNumber.toFixed(2)}%)`;
  const semDesc =
    semNumber === "N/A"
      ? "N/A"
      : `Semester ${semLetter} (${semNumber.toFixed(2)}%)`;
  const quarterColor = getGradeColor(gradeNumber);
  const semColor = getGradeColor(semNumber);
  return (
    <li className={`class-card glow ${quarterColor}`}>
      <div className="class-card__inner">
        <div className="class-card__grade-details">
          <div className="class-card__inner-grid-container">
            <div className="class-desc">
              <h1 className="class-title">{title}</h1>
              <p className="teacher-name">{teacherName}</p>
            </div>
            <div className="grade-container">
              <h1 className={`grade-desc ${quarterColor}`}>{gradeDesc}</h1>
            </div>
          </div>
          <div className="sem-grade-container">
            <h1 className={`sem-desc ${semColor}`}>{semDesc}</h1>
          </div>
        </div>
        <div className="class-card__view-button-container">
          <button
            className="class-card__view-button"
            aria-label="View class"
            onClick={handleView}
          >
            <Image src={nextIcon} alt="view class" width={24} height={24} />
          </button>
        </div>
      </div>
    </li>
  );
}
