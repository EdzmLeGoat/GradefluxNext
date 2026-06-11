import Image from "next/image";
import {
  type ClassAssignment as ClassAssignmentType,
  getGradeColor,
} from "@/types/Grades";
import useSessionStore from "@/stores/useSessionStore";
import React, { useState } from "react";

const trashIcon = "/assets/classes/trash.svg";
const nextIcon = "/assets/classes/next.svg";
const boltIcon = "/assets/sidebar/bolt.svg";

export default function ClassAssignment({
  assignment,
  forwardPageLink,
}: {
  assignment: ClassAssignmentType;
  forwardPageLink?: string;
}) {
  const classTypeString =
    assignment.type === "All Tasks / Assessments" ? "AT" : "PP";
  const color =
    assignment.pointsEarned === "N/A"
      ? "white"
      : getGradeColor(
          (Number(assignment.pointsEarned) / assignment.totalPoints) * 100,
        );
  const dateNoYear = (assignment.dateGraded || "").slice(0, -5); // Extract MM-DD from MM/DD/YYYY, so remove last 5 characters

  const deleteAssignmentFromAll = useSessionStore(
    (s) => s.deleteAssignmentFromAll,
  );
  const updateAssignmentFromAll = useSessionStore(
    (s) => s.updateAssignmentFromAll,
  );

  // local editable state for points/total
  const [editing, setEditing] = useState(false);
  const [pointsValue, setPointsValue] = useState<string | null>(
    assignment.pointsEarned === "N/A" ? null : String(assignment.pointsEarned),
  );
  const [totalValue, setTotalValue] = useState<number | null>(
    typeof assignment.totalPoints === "number" ? assignment.totalPoints : null,
  );

  const handleSaveEdit = () => {
    // validation
    if (totalValue === null || isNaN(totalValue) || totalValue <= 0) {
      alert("Total points must be a non-negative non-zero number");
      return;
    }
    if (pointsValue !== null && pointsValue !== "N/A") {
      const n = Number(pointsValue);
      if (isNaN(n) || n < 0) {
        alert("Points earned must be a non-negative number or 'N/A'");
        return;
      }
      if (n > totalValue) {
        // allow, but warn
        if (!confirm("Points earned exceed total points. Proceed?")) return;
      }
    }

    try {
      // convert pointsValue to a GradeNumber (number | "N/A") so store keeps numeric types
      let pointsPayload: number | "N/A";
      if (pointsValue === null || pointsValue === "N/A") {
        pointsPayload = "N/A";
      } else {
        // safe numeric cast after validation above
        pointsPayload = Number(pointsValue);
      }

      // convert totalPoints to number
      let totalPayload: number;
      if (totalValue === null) {
        totalPayload = 10;
      } else {
        totalPayload = Number(totalValue);
      }

      updateAssignmentFromAll?.(
        {
          assignmentTitle: assignment.assignmentTitle,
          dateGraded: assignment.dateGraded || null,
        },
        {
          pointsEarned: pointsPayload,
          totalPoints: totalPayload,
        },
      );
      setEditing(false);
    } catch (e) {
      console.error("Failed to update assignment:", e);
      alert("Failed to update assignment. See console for details.");
    }
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setPointsValue(
      assignment.pointsEarned === "N/A"
        ? null
        : String(assignment.pointsEarned),
    );
    setTotalValue(assignment.totalPoints);
  };

  const handleDelete = () => {
    if (typeof window === "undefined") return;
    try {
      deleteAssignmentFromAll({
        assignmentTitle: assignment.assignmentTitle,
        dateGraded: assignment.dateGraded || null,
      });
    } catch (e) {
      console.error("Failed to delete assignment via store:", e);
      alert("Failed to delete assignment. See console for details.");
    }
  };

  return (
    <li className="assignment-item">
      <div className="assignment-left">
        <span className="class-type">{classTypeString}</span>
        <span className={"assignment-name"}>
          {assignment.assignmentTitle}
        </span>{" "}
        <p className="assignment-date min-w-0">{dateNoYear}</p>
      </div>

      <div className={`assignment-grade-container ${color}`}>
        {forwardPageLink ? (
          <div className="flex flex-nowrap flex-row max-h-[36px] items-center gap-2 overflow-x-auto">
            <Image
              className="small-icon flex-shrink-0"
              src={nextIcon}
              alt="View impact"
              width={20}
              height={20}
              onClick={() => {}}
            />
          </div>
        ) : (
          <div className="assignment-actions-container">
            <Image
              className="small-icon flex-shrink-0"
              src={trashIcon}
              alt="Delete assignment"
              width={30}
              height={30}
              onClick={handleDelete}
            />
            <Image
              className="small-icon flex-shrink-0"
              src={boltIcon}
              alt="Compute assignment"
              width={30}
              height={30}
            />
          </div>
        )}
        <span
          className="assignment-grade-actual"
          onClick={() => setEditing(true)}
        >
          {editing ? (
            <input
              value={pointsValue ?? "N/A"}
              onChange={(e) => setPointsValue(e.target.value)}
              aria-label="Points earned"
            />
          ) : (
            assignment.pointsEarned
          )}
        </span>
        <p className="assignment-grade-sep">/</p>
        <span
          className="assignment-grade-total"
          onClick={() => setEditing(true)}
        >
          {editing ? (
            <input
              type="number"
              value={totalValue ?? 0}
              onChange={(e) => setTotalValue(Number(e.target.value))}
              aria-label="Total points"
            />
          ) : (
            assignment.totalPoints
          )}
        </span>
        {editing && (
          <div style={{ display: "inline-flex", gap: 8, marginLeft: 8 }}>
            <button onClick={handleSaveEdit}>Save</button>
            <button onClick={handleCancelEdit}>Cancel</button>
          </div>
        )}
      </div>
    </li>
  );
}
