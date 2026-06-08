import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  ClassProps,
  ClassAssignment,
} from "@/types/Grades";
import { calculateOverallGrade, getGradeLetter } from "@/types/Grades";

type AssignmentIdentifier = {
  assignmentTitle: string;
  dateGraded?: string | null;
};

type SessionState = {
  classes: ClassProps[];
  selectedClassIndex: number | null;
  setClasses: (c: ClassProps[]) => void;
  setSelectedClass: (index: number | null) => void;
  // helper to recompute class grade fields from assignmentList
  recomputeClassGrades: (cls: ClassProps) => ClassProps;
  deleteAssignmentFromAll: (id: AssignmentIdentifier) => void;
  deleteAssignmentFromClass: (classIndex: number, id: AssignmentIdentifier) => void;
  updateAssignmentFromAll?: (id: AssignmentIdentifier, updates: Partial<{ pointsEarned: string | number | null; totalPoints: number }>) => void;
  clearSession: () => void;
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      classes: [],
      selectedClassIndex: null,

      setClasses: (c: ClassProps[]) => set({ classes: c }),

      setSelectedClass: (index: number | null) => {
        set({ selectedClassIndex: index });
      },

      // Helper: recompute grade & letter fields for a class object
      // Accepts a ClassProps (may have updated assignmentList) and returns an updated ClassProps
      // with gradeNumber, gradeLetter, semNumber, semLetter recalculated.
      recomputeClassGrades: (cls: ClassProps) => {
        const assignmentList = Array.isArray(cls.assignmentList) ? cls.assignmentList : [];
        const newGrade = calculateOverallGrade(assignmentList);
        const newLetter = getGradeLetter(newGrade);
        return {
          ...cls,
          assignmentList,
          gradeNumber: newGrade,
          gradeLetter: newLetter,
          semNumber: newGrade,
          semLetter: newLetter,
        } as ClassProps;
      },

      deleteAssignmentFromAll: (id: AssignmentIdentifier) => {
        const classes: ClassProps[] = get().classes || [];
        let changed = false;
        const match = (a: ClassAssignment | any) =>
          a.assignmentTitle === id.assignmentTitle &&
          ((a.dateGraded || null) === (id.dateGraded || null));

        const updated: ClassProps[] = classes.map((c) => {
          if (!c || !Array.isArray(c.assignmentList)) return c;
          const before = c.assignmentList.length;
          const filtered = c.assignmentList.filter((a: any) => !match(a));
          if (filtered.length !== before) changed = true;
          // recompute grades for this class after removal
          return (get().recomputeClassGrades ? get().recomputeClassGrades({ ...c, assignmentList: filtered } as ClassProps) : { ...c, assignmentList: filtered } as ClassProps);
        });

        if (changed) {
          set({ classes: updated });
        }
      },

      deleteAssignmentFromClass: (classIndex: number, id: AssignmentIdentifier) => {
        console.log("Deleting assignment from class", classIndex, id);
        const classes: ClassProps[] = get().classes || [];
        const idx = classIndex - 1; // 1-based index
        if (idx < 0 || idx >= classes.length) return;
        const match = (a: ClassAssignment | any) =>
          a.assignmentTitle === id.assignmentTitle &&
          ((a.dateGraded || null) === (id.dateGraded || null));

        const before = classes[idx].assignmentList?.length || 0;
        const filtered = (classes[idx].assignmentList || []).filter((a: any) => !match(a));
        if (filtered.length === before) return; // nothing removed
        const copy = classes.slice();
        // recompute grades for this class after removing the assignment (use helper)
        const recomputed = get().recomputeClassGrades({ ...copy[idx], assignmentList: filtered } as ClassProps);
        copy[idx] = recomputed;
        set({ classes: copy });
      },

      updateAssignmentFromAll: (id: AssignmentIdentifier, updates: Partial<{ pointsEarned: string | number | null; totalPoints: number }>) => {
        const classes: ClassProps[] = get().classes || [];
        let changed = false;
        const match = (a: ClassAssignment | any) =>
          a.assignmentTitle === id.assignmentTitle &&
          ((a.dateGraded || null) === (id.dateGraded || null));

        const updated: ClassProps[] = classes.map((c) => {
          if (!c || !Array.isArray(c.assignmentList)) return c;
          const newList = c.assignmentList.map((a: any) => {
            if (match(a)) {
              changed = true;
              return {
                ...a,
                pointsEarned: typeof updates.pointsEarned !== 'undefined' && updates.pointsEarned !== null ? String(updates.pointsEarned) : a.pointsEarned,
                totalPoints: typeof updates.totalPoints === 'number' ? updates.totalPoints : a.totalPoints,
              };
            }
            return a;
          });
          // recompute grades for this class after the edit
          return (get().recomputeClassGrades ? get().recomputeClassGrades({ ...c, assignmentList: newList } as ClassProps) : { ...c, assignmentList: newList } as ClassProps);
        });

        if (changed) {
          set({ classes: updated });
        }
      },

      clearSession: () => {
        set({ classes: [], selectedClassIndex: null });
      },
    }),
    {
      name: "gradefluxSession", // persist under same key for compatibility
      partialize: (state) => ({ classes: state.classes ?? [], selectedClassIndex: state.selectedClassIndex ?? null }),
    },
  ),
);

export default useSessionStore;
