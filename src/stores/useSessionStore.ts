import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  ClassDetailsProps,
  ClassAssignment,
} from "@/types/Grades";

type AssignmentIdentifier = {
  assignmentTitle: string;
  dateGraded?: string | null;
  totalPoints: number;
};

type SessionState = {
  classes: ClassDetailsProps[];
  setClasses: (c: ClassDetailsProps[]) => void;
  deleteAssignmentFromAll: (id: AssignmentIdentifier) => void;
  deleteAssignmentFromClass: (classIndex: number, id: AssignmentIdentifier) => void;
  updateAssignmentFromAll?: (id: AssignmentIdentifier, updates: Partial<{ pointsEarned: string | number | null; totalPoints: number }>) => void;
  clearSession: () => void;
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      classes: [],
      setClasses: (c: ClassDetailsProps[]) => set({ classes: c }),

      deleteAssignmentFromAll: (id: AssignmentIdentifier) => {
        const classes: ClassDetailsProps[] = get().classes || [];
        let changed = false;
        const match = (a: ClassAssignment | any) =>
          a.assignmentTitle === id.assignmentTitle &&
          ((a.dateGraded || null) === (id.dateGraded || null)) &&
          a.totalPoints === id.totalPoints;

        const updated: ClassDetailsProps[] = classes.map((c) => {
          if (!c || !Array.isArray(c.assignmentList)) return c;
          const before = c.assignmentList.length;
          const filtered = c.assignmentList.filter((a: any) => !match(a));
          if (filtered.length !== before) changed = true;
          return { ...c, assignmentList: filtered } as ClassDetailsProps;
        });

        if (changed) {
          set({ classes: updated });

          // Also update any selectedClassDetails keys in localStorage so ClassDetails page picks up change
          try {
            Object.keys(localStorage)
              .filter((k) => k === "selectedClassDetails" || k.startsWith("selectedClassDetails_"))
              .forEach((k) => {
                try {
                  const raw = localStorage.getItem(k);
                  if (!raw) return;
                  const parsed = JSON.parse(raw) as any;
                  if (!parsed || !Array.isArray(parsed.assignmentList)) return;
                  parsed.assignmentList = parsed.assignmentList.filter((a: any) => !match(a));
                  localStorage.setItem(k, JSON.stringify(parsed));
                } catch (e) {
                  // ignore per-key parse errors
                }
              });
          } catch (e) {
            // ignore
          }
        }
      },

      deleteAssignmentFromClass: (classIndex: number, id: AssignmentIdentifier) => {
        const classes: ClassDetailsProps[] = get().classes || [];
        const idx = classIndex - 1; // classIndex is 1-based across app
        if (idx < 0 || idx >= classes.length) return;
        const match = (a: ClassAssignment | any) =>
          a.assignmentTitle === id.assignmentTitle &&
          ((a.dateGraded || null) === (id.dateGraded || null)) &&
          a.totalPoints === id.totalPoints;
        const before = classes[idx].assignmentList?.length || 0;
        const filtered = (classes[idx].assignmentList || []).filter((a: any) => !match(a));
        if (filtered.length === before) return; // nothing removed
        const copy = classes.slice();
        copy[idx] = { ...copy[idx], assignmentList: filtered } as ClassDetailsProps;
        set({ classes: copy });

        // Update the specific selectedClassDetails_{index} key as well
        try {
          const key = `selectedClassDetails_${classIndex}`;
          const raw = localStorage.getItem(key) || localStorage.getItem("selectedClassDetails");
          if (raw) {
            const parsed = JSON.parse(raw) as any;
            if (parsed && Array.isArray(parsed.assignmentList)) {
              parsed.assignmentList = parsed.assignmentList.filter((a: any) => !match(a));
              localStorage.setItem(key, JSON.stringify(parsed));
            }
          }
        } catch (e) {
          // ignore
        }
      },

      updateAssignmentFromAll: (id: AssignmentIdentifier, updates: Partial<{ pointsEarned: string | number | null; totalPoints: number }>) => {
        const classes: ClassDetailsProps[] = get().classes || [];
        let changed = false;
        const match = (a: ClassAssignment | any) =>
          a.assignmentTitle === id.assignmentTitle &&
          ((a.dateGraded || null) === (id.dateGraded || null)) &&
          a.totalPoints === id.totalPoints;

        const updated: ClassDetailsProps[] = classes.map((c) => {
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
          return { ...c, assignmentList: newList } as ClassDetailsProps;
        });

        if (changed) {
          set({ classes: updated });

          // Persist changes to any selectedClassDetails keys
          try {
            Object.keys(localStorage)
              .filter((k) => k === "selectedClassDetails" || k.startsWith("selectedClassDetails_"))
              .forEach((k) => {
                try {
                  const raw = localStorage.getItem(k);
                  if (!raw) return;
                  const parsed = JSON.parse(raw) as any;
                  if (!parsed || !Array.isArray(parsed.assignmentList)) return;
                  parsed.assignmentList = parsed.assignmentList.map((a: any) => {
                    if (match(a)) {
                      return {
                        ...a,
                        pointsEarned: typeof updates.pointsEarned !== 'undefined' && updates.pointsEarned !== null ? String(updates.pointsEarned) : a.pointsEarned,
                        totalPoints: typeof updates.totalPoints === 'number' ? updates.totalPoints : a.totalPoints,
                      };
                    }
                    return a;
                  });
                  localStorage.setItem(k, JSON.stringify(parsed));
                } catch (e) {
                  // ignore per-key parse errors
                }
              });
          } catch (e) {
            // ignore
          }
        }
      },

      clearSession: () => {
        set({ classes: [] });
        try {
          localStorage.removeItem("gradefluxSession");
        } catch (e) {
          /* ignore */
        }
      },
    }),
    {
      name: "gradefluxSession", // persist under same key for compatibility
      partialize: (state) => ({ classes: state.classes ?? [] }),
    },
  ),
);

export default useSessionStore;
