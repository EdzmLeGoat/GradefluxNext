import React from "react";
import ClassListPage from "./components/ClassList/ClassListPage";
import useSessionStore from "../src/stores/useSessionStore";
import { calculateOverallGrade, getGradeLetter } from "@/types/Grades";

export default function HomePage() {
  const classes = useSessionStore((s) => s.classes);
  return <ClassListPage classProps={classes} />;
}
