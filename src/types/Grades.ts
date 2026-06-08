export type GradeColor = "white" | "green" | "blue" | "yellow" | "orange" | "red";
export type Period = "N/A" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
export type GradeLetter = "N/A" | "A" | "B" | "C" | "D" | "E";
export type AssignmentType = "All Tasks / Assessments" | "Practice / Preparation" | "District Assessment" | "Summative Assessment" | "Assignments" | "District Assessment, Ungraded" | "Senior Culminating Activity" | "Progress Check";
export type GradeNumber = number | "N/A";
export type AssignmentAPIType = "Synergy" | "Canvas"

export function getGradeColor(grade: GradeNumber): GradeColor {
  if (typeof grade === "number") {
    if (grade >= 89.5) return "blue";
    else if (grade >= 79.5) return "green";
    else if (grade >= 69.5) return "yellow";
    else if (grade >= 59.5) return "orange";
    else return "red";
  }
  return "white"; // For N/A or invalid grades
}

export function getGradeLetter(grade: GradeNumber): GradeLetter {
  if (typeof grade === "number") {
    if (grade >= 89.5) return "A";
    else if (grade >= 79.5) return "B";
    else if (grade >= 69.5) return "C";
    else if (grade >= 59.5) return "D";
    else return "E";
  }
  return "N/A"; // For N/A or invalid grades
}

export type ClassProps = {
  classTitle: string;
  teacherName: string;
  periodNumber: Period;
  assignmentList: ClassAssignment[];
  gradeLetter: GradeLetter;
  gradeNumber: GradeNumber;
  semLetter: GradeLetter;
  semNumber: GradeNumber;
};

export type ClassAssignment = {
  assignmentTitle: string;
  pointsEarned: GradeNumber;
  totalPoints: number;
  dateGraded: string; // ISO date string
  type: AssignmentType;
};

type MarkingPeriod = "MP1" | "MP2" | "MP3" | "MP4"
export function calculateOverallGrade(assignments: ClassAssignment[]): GradeNumber {
  //we only care about at and pp when calculating grade
  const allTaskAssignments = assignments.filter(
    (assignment) => assignment.type === "All Tasks / Assessments"
  );

  const practicePrepAssignments = assignments.filter(
    (assignment) => assignment.type === "Practice / Preparation"
  );

  let atTotalPointsEarned = 0;
  let atTotalPointsPossible = 0;

  allTaskAssignments.forEach((assignment) => {
    if (assignment.pointsEarned !== "N/A") {
      atTotalPointsEarned += assignment.pointsEarned;
      atTotalPointsPossible += assignment.totalPoints;
      console.log(`Adding All Task assignment "${assignment.assignmentTitle}": ${assignment.pointsEarned}/${assignment.totalPoints}`);
      console.log('running total points possible:', atTotalPointsPossible, 'total points earned:', atTotalPointsEarned);
    }
  });

  const allTaskGrade = (atTotalPointsPossible === 0) ? 100 : (atTotalPointsEarned / atTotalPointsPossible) * 100;

  let ppTotalPointsEarned = 0;
  let ppTotalPointsPossible = 0;

  practicePrepAssignments.forEach((assignment) => {
    if (assignment.pointsEarned !== "N/A") {
      ppTotalPointsEarned += assignment.pointsEarned;
      ppTotalPointsPossible += assignment.totalPoints;
    }
  });

  const practicePrepGrade = (ppTotalPointsPossible === 0) ? 100 : (ppTotalPointsEarned / ppTotalPointsPossible) * 100;

  console.log(`All Tasks: ${atTotalPointsEarned}/${atTotalPointsPossible} (${allTaskGrade}%)`);
  console.log(`Practice Prep: ${ppTotalPointsEarned}/${ppTotalPointsPossible} (${practicePrepGrade}%)`);
  if (atTotalPointsPossible === 0 && ppTotalPointsPossible === 0) {
    return "N/A";
  } else {
    // AllTask weighted at 90% and PracticePrep weighted at 10%
    // If one category has no points possible, weight the other category at 100%
    // round end result to 2 decimal places
    if (atTotalPointsPossible === 0) {
      return Math.round(practicePrepGrade * 100) / 100;
    }
    if (ppTotalPointsPossible === 0) {
      return Math.round(allTaskGrade * 100) / 100;
    }
    return Math.round((allTaskGrade * 0.9 + practicePrepGrade * 0.1) * 100) / 100;
  }
}

export type CanvasAssignmentGroup = {
  classTitle: string,
  classPeriod: Period,
  classLink: string,
  assignments: ClassAssignment[]
}
