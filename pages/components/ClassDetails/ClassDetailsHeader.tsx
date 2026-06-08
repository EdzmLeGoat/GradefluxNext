import React from "react";
import Image from "next/image";
import { useRouter } from "next/router";
const undoIcon = "/assets/classes/undo.svg";
const prevIcon = "/assets/classes/prev.svg";
const nextIcon = "/assets/classes/next.svg";
import {
  getGradeColor,
  getGradeLetter,
  type GradeColor,
  type GradeLetter,
  type GradeNumber,
  type Period,
} from "../../../src/types/Grades";
import useSessionStore from "../../../src/stores/useSessionStore";

type ClassDetailsHeaderProps = {
  classTitle: string;
  teacherName: string;
  period: Period;
  gradeNumber: GradeNumber;
  semGradeNumber: GradeNumber;
  ppActual: number;
  ppTotal: number;
  atActual: number;
  atTotal: number;
};

function isNumeric(n: GradeNumber): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

function GradeBar({
  text,
  actual,
  total,
}: {
  text: string;
  actual: GradeNumber;
  total: GradeNumber;
}) {
  const valid = isNumeric(actual) && isNumeric(total) && total > 0;
  const barWidth = valid ? `${(actual / total) * 100}%` : "0%";
  const pct = valid ? (actual / total) * 100 : 0;
  const color = getGradeColor(pct);

  return (
    <div className={`class-grade-bar ${color}`}>
      <div className={`class-grade-bar__inner ${color}`}>
        <div className="class-grade-bar__inner-bar" style={{ width: barWidth }}>
          <p className="class-grade-bar__text">{text}</p>
        </div>
      </div>
    </div>
  );
}

type ButtonClientProps = {
  src: string;
  alt: string;
  pageRoute: string;
};

function ButtonClient({ src, alt, pageRoute }: ButtonClientProps) {
  const router = useRouter();
  const classes = useSessionStore((s) => s.classes);
  const selectedIndex = useSessionStore((s) => s.selectedClassIndex);
  const setSelectedClass = useSessionStore((s) => s.setSelectedClass);

  function onClickHandler() {
    if (pageRoute === "home") {
      // use replace so clicking back doesn't replay the navigation stack
      router.replace("/home");
      return;
    }

    // derive current class index from the store (fallback to 1)
    const current =
      typeof selectedIndex === "number" && selectedIndex > 0
        ? selectedIndex
        : 1;

    // Discover total number of classes from the store
    let total = Array.isArray(classes) && classes.length ? classes.length : 1;
    if (!total) total = 1; // fallback minimal to avoid modulo by zero

    if (pageRoute === "prevClass") {
      let prev = current - 1;
      if (prev < 1) prev = total; // wrap around to end if at start
      // update canonical selection in the store and navigate to canonical page
      setSelectedClass(prev);
      router.replace(`/class-details`);
    } else if (pageRoute === "nextClass") {
      let next = current + 1;
      if (next > total) next = 1; // wrap around to start if at end
      setSelectedClass(next);
      router.replace(`/class-details`);
    }
  }

  return (
    <button className="class-details__header-button" onClick={onClickHandler}>
      <Image
        src={src}
        alt={alt}
        width={28}
        height={28}
        className="class-details__back-icon"
      />
    </button>
  );
}

export default function ClassDetailsHeader({
  classTitle,
  teacherName,
  period,
  gradeNumber,
  semGradeNumber,
  ppActual,
  ppTotal,
  atActual,
  atTotal,
}: ClassDetailsHeaderProps) {
  const quarterGradeLetter: GradeLetter = getGradeLetter(gradeNumber);
  const quarterGradeColor: GradeColor = getGradeColor(gradeNumber);
  const ppPercentage =
    ppTotal > 0 ? Math.round((ppActual / ppTotal) * 100 * 100) / 100 : 0;
  const atPercentage =
    atTotal > 0 ? Math.round((atActual / atTotal) * 100 * 100) / 100 : 0;
  return (
    <div className="class-details-header">
      <div className="class-details__button-container">
        <ButtonClient src={undoIcon} alt="Back" pageRoute="home" />
        <div className="class-details__prev-next-container">
          <ButtonClient src={prevIcon} alt="Previous" pageRoute="prevClass" />
          <ButtonClient src={nextIcon} alt="Next" pageRoute="nextClass" />
        </div>
      </div>

      <div className="class-details-side-container">
        <h1 className="class-details-title">{classTitle}</h1>
        <p className="class-details-description">
          {teacherName} - Period {period}
        </p>
        <h1 className={`class-details-grade ${quarterGradeColor}`}>
          {quarterGradeLetter} ({gradeNumber})
        </h1>
      </div>
      <div className="class-details-grade-container">
        <GradeBar
          text={`Semester Grade - ${semGradeNumber}%`}
          actual={semGradeNumber}
          total={100}
        />
        <GradeBar
          text={`Practice & Prep (${ppPercentage}%) - ${ppActual} / ${ppTotal}`}
          actual={ppActual}
          total={ppTotal}
        />
        <GradeBar
          text={`All Tasks (${atPercentage}%) - ${atActual} / ${atTotal}`}
          actual={atActual}
          total={atTotal}
        />
      </div>
    </div>
  );
}
