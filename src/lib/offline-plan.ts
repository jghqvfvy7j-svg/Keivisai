// Client-side cache of the user's active plan, so it stays readable at the gym
// even with no signal. Stored in localStorage (per device). Read-only: it never
// replaces the live data, it's only a fallback the /offline page shows.

export type OfflineExercise = {
  name: string;
  muscle: string;
  sets: number;
  reps: string;
  weightKg: number | null;
  restSeconds: number;
};
export type OfflineDay = { dayName: string; focus: string; exercises: OfflineExercise[] };
export type OfflinePlan = {
  name: string;
  daysPerWeek: number;
  savedAt: string; // ISO
  days: OfflineDay[];
};

const KEY = "gk_offline_plan";

export function saveOfflinePlan(plan: OfflinePlan): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(plan));
  } catch {
    /* storage full / disabled — offline cache is best-effort */
  }
}

export function loadOfflinePlan(): OfflinePlan | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as OfflinePlan) : null;
  } catch {
    return null;
  }
}
