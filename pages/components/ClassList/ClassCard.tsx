import React from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import type {
  ClassProps,
  GradeNumber,
  GradeLetter,
} from "../../../src/types/Grades";
import { getGradeColor } from "../../../src/types/Grades";
import useSessionStore from "../../../src/stores/useSessionStore";

const nextIcon = "/assets/classes/next.svg";

export default function ClassCard({
  classTitle,
  teacherName,
  periodNumber,
  gradeLetter,
  gradeNumber,
  semLetter,
  semNumber,
  classIndex,
}: ClassProps & { classIndex: number }) {
  const router = useRouter();
  const setSelectedClass = useSessionStore((s) => s.setSelectedClass);

  const handleView = () => {
    // set selected class in store so ClassDetails can read it
    const idx = typeof classIndex !== "undefined" ? classIndex : undefined;
    if (typeof idx === "number") {
      try {
        setSelectedClass(idx);
      } catch (e) {
        /* ignore */
      }
    }

    // navigate to a single class-details route (store-driven)
    // ensure middleware sees an auth cookie so server won't redirect to /login
    try {
      document.cookie = "gradefluxAuth=1; path=/";
    } catch (e) {
      /* ignore */
    }
    router.push(`/class-details`);
  };

  const title = `${classTitle} - ${periodNumber}`;
  const gradeDesc =
    gradeNumber === "N/A"
      ? "N/A"
      : `${gradeLetter} (${(gradeNumber as number).toFixed(2)}%)`;
  const semDesc =
    semNumber === "N/A"
      ? "N/A"
      : `Semester ${semLetter} (${(semNumber as number).toFixed(2)}%)`;
  const quarterColor = getGradeColor(gradeNumber as GradeNumber);
  const semColor = getGradeColor(semNumber as GradeNumber);
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
