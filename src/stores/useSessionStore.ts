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
  changeMarkingPeriod: (mp: MarkingPeriod | string) => void;
  recomputeSemesterGrade: (cls: ClassProps) => ClassProps;
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

        // Before persisting, compute semester grades for all quarter pairs in the normalized year data.
        try {
          for (let semIdx = 0; semIdx < 2; semIdx++) {
            const sem = normalized[semIdx] || ({ interimOne: [], quarterOne: [], interimTwo: [], quarterTwo: [] } as Semester);
            const q1 = Array.isArray(sem.quarterOne) ? sem.quarterOne : [];
            const q2 = Array.isArray(sem.quarterTwo) ? sem.quarterTwo : [];

            // For each class in quarterOne, find matching class in quarterTwo and compute semester grade
            q1.forEach((c1, i) => {
              const matchIndex = q2.findIndex(
                (c2) => c2 && c2.classTitle === c1.classTitle && c2.periodNumber === c1.periodNumber && c2.teacherName === c1.teacherName,
              );
              const c2 = matchIndex !== -1 ? q2[matchIndex] : undefined;

              const rawG1 = calculateOverallGrade(Array.isArray(c1.assignmentList) ? c1.assignmentList : []);
              const rawG2 = c2 ? calculateOverallGrade(Array.isArray(c2.assignmentList) ? c2.assignmentList : []) : undefined;
              const g1 = typeof rawG1 === 'number' ? Math.round(rawG1) : undefined;
              const g2 = typeof rawG2 === 'number' ? Math.round(rawG2 as number) : undefined;

              let semNumber: GradeNumber;
              if (typeof g1 === 'number' && typeof g2 === 'number') {
                semNumber = (g1 + g2) / 2;
              } else if (typeof g1 === 'number') {
                semNumber = g1;
              } else if (typeof g2 === 'number') {
                semNumber = g2;
              } else {
                semNumber = 'N/A';
              }

              const semLetter = getGradeLetter(semNumber);

              // ensure gradeNumber is present for quarter classes using the precise quarter grade (not the rounded integer)
              const updatedC1 = { ...c1, gradeNumber: typeof rawG1 === 'number' ? rawG1 : c1.gradeNumber, gradeLetter: typeof rawG1 === 'number' ? getGradeLetter(rawG1 as GradeNumber) : c1.gradeLetter, semNumber, semLetter } as ClassProps;
              q1[i] = updatedC1;
              if (c2 && matchIndex !== -1) {
                const updatedC2 = { ...c2, gradeNumber: typeof rawG2 === 'number' ? rawG2 : c2.gradeNumber, gradeLetter: typeof rawG2 === 'number' ? getGradeLetter(rawG2 as GradeNumber) : c2.gradeLetter, semNumber, semLetter } as ClassProps;
                q2[matchIndex] = updatedC2;
              }
            });

            // Also process any classes that are only in quarterTwo but not in quarterOne
            q2.forEach((c2, j) => {
              const existsInQ1 = q1.some((c1) => c1 && c1.classTitle === c2.classTitle && c1.periodNumber === c2.periodNumber && c1.teacherName === c2.teacherName);
              if (!existsInQ1) {
                const rawG2 = calculateOverallGrade(Array.isArray(c2.assignmentList) ? c2.assignmentList : []);
                const g2 = typeof rawG2 === 'number' ? Math.round(rawG2) : undefined;
                const semNumber: GradeNumber = typeof g2 === 'number' ? g2 : 'N/A'; // no counterpart, semester equals quarter2 if numeric
                const semLetter = getGradeLetter(semNumber);
                q2[j] = { ...c2, gradeNumber: typeof rawG2 === 'number' ? rawG2 : c2.gradeNumber, gradeLetter: typeof rawG2 === 'number' ? getGradeLetter(rawG2 as GradeNumber) : c2.gradeLetter, semNumber, semLetter } as ClassProps;
              }
            });

            // write back the modified semester buckets
            if (!normalized[semIdx]) normalized[semIdx] = { interimOne: [], quarterOne: [], interimTwo: [], quarterTwo: [] } as Semester;
            (normalized[semIdx] as any).quarterOne = q1;
            (normalized[semIdx] as any).quarterTwo = q2;
          }
        } catch (e) {
          // be resilient to unexpected shapes
          console.warn('Failed computing semester grades during setYearData hydration', e);
        }

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

      // Change the active marking period by name (e.g. "MP1 Interim", "MP1", "MP2 Interim", ...)
      changeMarkingPeriod: (mp: MarkingPeriod | string) => {
        const names = ['MP1 Interim', 'MP1', 'MP2 Interim', 'MP2', 'MP3 Interim', 'MP3', 'MP4 Interim', 'MP4'];
        const mpStr = String(mp);
        const idx = names.indexOf(mpStr);
        if (idx === -1) return; // unknown marking period

        const yd = get().yearData || [];
        const semIndex = idx < 4 ? 0 : 1;
        const offset = idx % 4; // 0..3
        const key = ['interimOne', 'quarterOne', 'interimTwo', 'quarterTwo'][offset] as keyof Semester;
        const sem = yd[semIndex] || ({ interimOne: [], quarterOne: [], interimTwo: [], quarterTwo: [] } as Semester);
        const classesForMP = Array.isArray((sem as any)[key]) ? (sem as any)[key] : [];

        set({ selectedMarkingPeriod: mpStr as any, selectedMarkingPeriodIndex: idx, classes: classesForMP });
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

      // Recompute semester grade for a specific class by finding its matching quarter partner
      // in the same semester and updating the yearData and classes mirror accordingly.
      recomputeSemesterGrade: (cls: ClassProps) => {
        const yd = (get().yearData || []).slice();
        const match = (a: ClassProps | any, b: ClassProps | any) => a && b && a.classTitle === b.classTitle && a.periodNumber === b.periodNumber && a.teacherName === b.teacherName;

        for (let semIdx = 0; semIdx < yd.length; semIdx++) {
          const sem = yd[semIdx] as Semester | undefined;
          if (!sem) continue;
          const q1 = Array.isArray(sem.quarterOne) ? sem.quarterOne.slice() : [];
          const q2 = Array.isArray(sem.quarterTwo) ? sem.quarterTwo.slice() : [];

          const idx1 = q1.findIndex((c) => match(c, cls));
          const idx2 = q2.findIndex((c) => match(c, cls));
          if (idx1 === -1 && idx2 === -1) continue;

          const c1 = idx1 !== -1 ? q1[idx1] : undefined;
          const c2 = idx2 !== -1 ? q2[idx2] : undefined;

          // ensure quarter gradeNumbers are up-to-date
          const upC1 = c1 ? get().recomputeClassGrades(c1) : undefined;
          const upC2 = c2 ? get().recomputeClassGrades(c2) : undefined;

          const raw1 = upC1 ? (typeof upC1.gradeNumber === 'number' ? upC1.gradeNumber : calculateOverallGrade(upC1.assignmentList ?? [])) : undefined;
          const raw2 = upC2 ? (typeof upC2.gradeNumber === 'number' ? upC2.gradeNumber : calculateOverallGrade(upC2.assignmentList ?? [])) : undefined;
          const g1 = typeof raw1 === 'number' ? Math.round(raw1) : undefined;
          const g2 = typeof raw2 === 'number' ? Math.round(raw2) : undefined;

          let semNumber: GradeNumber;
          if (typeof g1 === 'number' && typeof g2 === 'number') {
            semNumber = (g1 + g2) / 2;
          } else if (typeof g1 === 'number') {
            semNumber = g1;
          } else if (typeof g2 === 'number') {
            semNumber = g2;
          } else {
            semNumber = 'N/A';
          }

          const semLetter = getGradeLetter(semNumber);

          if (upC1) {
            q1[idx1] = { ...upC1, semNumber, semLetter } as ClassProps;
          }
          if (upC2) {
            q2[idx2] = { ...upC2, semNumber, semLetter } as ClassProps;
          }

          // write back semester buckets
          const copySem = { ...sem } as any;
          copySem.quarterOne = q1;
          copySem.quarterTwo = q2;
          yd[semIdx] = copySem;

          // persist updated yearData
          set({ yearData: yd });

          // if current selected marking period is one of these quarters, update classes mirror
          const selectedIdx = get().selectedMarkingPeriodIndex;
          const mpIndexQ1 = semIdx * 4 + 1;
          const mpIndexQ2 = semIdx * 4 + 3;
          if (selectedIdx === mpIndexQ1) {
            set({ classes: q1 });
          } else if (selectedIdx === mpIndexQ2) {
            set({ classes: q2 });
          }

          // return updated class corresponding to the input cls (prefer upC1/upC2)
          if (upC1) return q1[idx1] as ClassProps;
          if (upC2) return q2[idx2] as ClassProps;
        }

        return cls;
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
          // recompute semester grades for any classes that were changed
          updated.forEach((c) => {
            try { get().recomputeSemesterGrade(c); } catch (e) { }
          });
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
        try { get().recomputeSemesterGrade(copy[idx]); } catch (e) { }
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
          // recompute semester grades for changed classes
          updated.forEach((c) => {
            try { get().recomputeSemesterGrade(c); } catch (e) { }
          });
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
