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

  function onClickHandler() {
    if (pageRoute === "home") {
      router.push("/home");
      return;
    }

    // determine current classIndex from the URL (use classIndex param)
    const raw = router.query.classIndex || router.query.period; // fallback for legacy URLs
    const cur = Array.isArray(raw) ? raw[0] : raw;
    const current = Number(cur) || 1;

    // try to discover total number of classes from stored session
    let total = 0;
    try {
      const sessionRaw = localStorage.getItem("gradefluxSession");
      if (sessionRaw) {
        const parsed = JSON.parse(sessionRaw);
        let candidates: any[] = [];
        if (Array.isArray(parsed)) {
          candidates = parsed;
        } else if (Array.isArray(parsed.classes)) {
          candidates = parsed.classes;
        } else if (Array.isArray(parsed.data)) {
          candidates = parsed.data;
        }
        // if items are ClassInfo wrappers ({ classCardProps, classDetailsProps })
        // normalize to top-level list
        if (candidates.length > 0) {
          const normalized = candidates
            .map((c) => (c && c.classCardProps ? c : c))
            .filter(Boolean);
          total = normalized.length;
        }
      }
    } catch (e) {
      // ignore parsing errors
      console.error("Failed to parse session data for class count:", e);
    }
    if (!total) {
      // try to detect any period-specific selected keys in localStorage
      const keys = Object.keys(localStorage).filter((k) =>
        k.startsWith("selectedClassDetails_"),
      );
      if (keys.length > 0) total = keys.length;
    }
    if (!total) total = 1; // fallback minimal to avoid modulo by zero

    console.log(`Navigating from class ${current} with total ${total} classes`);
    if (pageRoute === "prevClass") {
      let prev = current - 1;
      if (prev < 1) prev = total; // wrap around to end if at start
      console.log(`Calculated previous class index: ${prev}`);
      router.push(`/class-details/${encodeURIComponent(String(prev))}`);
    } else if (pageRoute === "nextClass") {
      let next = current + 1;
      if (next > total) next = 1; // wrap around to start if at end
      console.log(`Calculated next class index: ${next}`);
      router.push(`/class-details/${encodeURIComponent(String(next))}`);
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
