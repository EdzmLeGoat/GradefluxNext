import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  ClassProps,
  ClassAssignment,
  GradeNumber,
  Semester,
  MarkingPeriod,
} from "@/types/Grades";
import { calculateOverallGrade, getGradeLetter } from "@/types/Grades";

type AssignmentIdentifier = {
  assignmentTitle: string;
  dateGraded?: string | null;
};

type SessionState = {
  yearData: Semester[];
  selectedMarkingPeriod: MarkingPeriod | null;
  selectedMarkingPeriodIndex: number | null;
  classes: ClassProps[];
  selectedClassIndex: number | null;
  setYearData: (year: Semester[]) => void;
  setClasses: (c: ClassProps[]) => void;
  setSelectedClass: (index: number | null) => void;
  // helper to recompute class grade fields from assignmentList
  recomputeClassGrades: (cls: ClassProps) => ClassProps;
  deleteAssignmentFromAll: (id: AssignmentIdentifier) => void;
  deleteAssignmentFromClass: (classIndex: number, id: AssignmentIdentifier) => void;
  updateAssignmentFromAll?: (id: AssignmentIdentifier, updates: Partial<{ pointsEarned: GradeNumber; totalPoints: GradeNumber }>) => void;
  clearSession: () => void;
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      // new year-oriented state
      yearData: [],
      selectedMarkingPeriod: null,
      selectedMarkingPeriodIndex: null,
      classes: [], // mirror of the currently-selected marking period's ClassProps[]
      selectedClassIndex: null,

      // Set the full academic year data (two semesters). This will select the latest
      // marking period that contains data and populate `classes` accordingly.
      setYearData: (year: Semester[]) => {
        // normalize to length 2 (two semesters) with expected keys
        const normalized: Semester[] = Array.isArray(year) ? year.slice(0, 2) : [];
        // produce flat marking-period list in forward order (MP1 interim, MP1, MP2 interim, MP2, MP3 interim, MP3, MP4 interim, MP4)
        const flat: ClassProps[] = [] as any;
        const buckets: ClassProps[][] = [];
        // helper to safely push semester keys
        const pushIf = (arr: any, key: string) => {
          try {
            const list = (arr as any)[key] as ClassProps[] | undefined;
            buckets.push(Array.isArray(list) ? list : []);
          } catch (e) {
            buckets.push([]);
          }
        };

        const s1 = normalized[0] || { interimOne: [], quarterOne: [], interimTwo: [], quarterTwo: [] } as Semester;
        const s2 = normalized[1] || { interimOne: [], quarterOne: [], interimTwo: [], quarterTwo: [] } as Semester;

        // forward order per internal convention: s1.interimOne, s1.quarterOne, s1.interimTwo, s1.quarterTwo, s2.interimOne, s2.quarterOne, s2.interimTwo, s2.quarterTwo
        pushIf(s1, 'interimOne');
        pushIf(s1, 'quarterOne');
        pushIf(s1, 'interimTwo');
        pushIf(s1, 'quarterTwo');
        pushIf(s2, 'interimOne');
        pushIf(s2, 'quarterOne');
        pushIf(s2, 'interimTwo');
        pushIf(s2, 'quarterTwo');

        // find latest non-empty bucket by scanning in reverse order
        let foundIndex: number | null = null;
        for (let i = buckets.length - 1; i >= 0; i--) {
          if (Array.isArray(buckets[i]) && buckets[i].length > 0) {
            foundIndex = i;
            break;
          }
        }
        console.log("Deriving selected marking period from yearData; found latest non-empty bucket at index", foundIndex);

        // derive selected marking period (MP1..MP4) from index
        let selectedMP: MarkingPeriod | null = null;
        if (foundIndex !== null) {
          if (foundIndex === 0) selectedMP = 'MP1 Interim';
          else if (foundIndex === 1) selectedMP = 'MP1';
          else if (foundIndex === 2) selectedMP = 'MP2 Interim';
          else if (foundIndex === 3) selectedMP = 'MP2';
          else if (foundIndex === 4) selectedMP = 'MP3 Interim';
          else if (foundIndex === 5) selectedMP = 'MP3';
          else if (foundIndex === 6) selectedMP = 'MP4 Interim';
          else if (foundIndex === 7) selectedMP = 'MP4';
        }

        const selectedClasses = foundIndex !== null ? buckets[foundIndex] : [];
        console.log(`found index, ${foundIndex}, class at the index:`, selectedClasses);

        set({ yearData: normalized, selectedMarkingPeriod: selectedMP, selectedMarkingPeriodIndex: foundIndex, classes: selectedClasses });
      },

      // set classes directly (updates yearData at selectedMarkingPeriodIndex if present)
      setClasses: (c: ClassProps[]) => {
        const idx = get().selectedMarkingPeriodIndex;
        const yd = get().yearData || [];
        if (typeof idx === 'number' && yd && yd.length) {
          // rebuild yd with updated entry at idx
          const copy = yd.slice();
          // compute which semester and key correspond to idx
          const semIndex = idx < 4 ? 0 : 1;
          const offset = idx % 4; // 0..3 -> determine key
          const key = ['interimOne', 'quarterOne', 'interimTwo', 'quarterTwo'][offset] as keyof Semester;
          const sem = { ...copy[semIndex] } as any;
          sem[key] = c;
          copy[semIndex] = sem;
          set({ yearData: copy, classes: c });
        } else {
          set({ classes: c });
        }
      },

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
          return get().recomputeClassGrades({ ...c, assignmentList: filtered } as ClassProps);
        });

        if (changed) {
          // update classes and sync into yearData if applicable
          get().setClasses(updated);
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
        // use setClasses to sync into yearData
        get().setClasses(copy);
      },

      updateAssignmentFromAll: (id: AssignmentIdentifier, updates: Partial<{ pointsEarned: GradeNumber; totalPoints: GradeNumber }>) => {
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
                pointsEarned: typeof updates.pointsEarned !== 'undefined' && updates.pointsEarned !== null ? updates.pointsEarned : a.pointsEarned,
                totalPoints: typeof updates.totalPoints === 'number' ? updates.totalPoints : a.totalPoints,
              };
            }
            return a;
          });
          // recompute grades for this class after the edit
          const recomputed = get().recomputeClassGrades({ ...c, assignmentList: newList } as ClassProps);
          return recomputed;
        });

        if (changed) {
          get().setClasses(updated);
        }
      },

      clearSession: () => {
        set({ classes: [], yearData: [], selectedMarkingPeriod: null, selectedMarkingPeriodIndex: null, selectedClassIndex: null });
      },
    }),
    {
      name: "gradefluxSession", // persist under same key for compatibility
      partialize: (state) => ({
        yearData: state.yearData ?? [],
        selectedMarkingPeriod: state.selectedMarkingPeriod ?? null,
        selectedMarkingPeriodIndex: state.selectedMarkingPeriodIndex ?? null,
        classes: state.classes ?? [],
        selectedClassIndex: state.selectedClassIndex ?? null,
      }),
    },
  ),
);

export default useSessionStore;
