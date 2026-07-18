// How long to rest between sets.
//
// A single number for every exercise is wrong in both directions. Ninety seconds
// after a set of cable curls is dead time. Forty-five seconds after a heavy set
// of squats means the next set is limited by your breathing, not your legs, and
// you leave reps (and strength) on the floor.
//
// So the default depends on what the movement demands. The user can always
// adjust it, and their adjustment sticks for that exercise.

/** Never rest less than this, or more than this, whatever the maths says. */
export const MIN_REST_SECONDS = 20;
export const MAX_REST_SECONDS = 300;

/** How much one tap changes the rest timer. */
export const REST_STEP_SECONDS = 10;

type RestInput = {
  mechanic?: string | null;   // compound / isolation (may still be Spanish)
  main_muscle?: string | null;
  type?: string | null;       // strength, cardio, mobility...
};

const isCompound = (m?: string | null) => !!m && /compound|compuesto/i.test(m);
const isIsolation = (m?: string | null) => !!m && /isolation|aislamiento/i.test(m);

/** The lifts that move the most weight and cost the most to recover from. */
const HEAVY_MUSCLES = /piernas|legs|espalda|back|pecho|chest|gluteos|glutes/i;

/**
 * A sensible starting rest, in seconds.
 *
 *   Core, cardio, mobility     45s   short by design
 *   Isolation                  60s   curls, raises, extensions
 *   Compound, smaller muscles  90s   shoulder press, rows for arms
 *   Compound, big lifts       120s   squat, deadlift, bench, heavy rows
 *
 * These are starting points, not prescriptions. Trained lifters chasing maximal
 * strength often rest longer on the big lifts; someone training for endurance
 * will rest less. The point is that the default should be defensible, and the
 * user should be able to change it in one tap.
 */
export function defaultRestSeconds(ex: RestInput): number {
  const muscle = ex.main_muscle ?? "";
  const type = ex.type ?? "";

  if (/cardio/i.test(type) || /cardio/i.test(muscle)) return 45;
  if (/abdomen|core|abs/i.test(muscle)) return 45;
  if (/mobility|movilidad|stretch/i.test(type)) return 30;

  if (isIsolation(ex.mechanic)) return 60;

  if (isCompound(ex.mechanic)) {
    return HEAVY_MUSCLES.test(muscle) ? 120 : 90;
  }

  // Mechanic unknown: infer from the muscle. Big muscle, probably a big lift.
  return HEAVY_MUSCLES.test(muscle) ? 90 : 60;
}

/** Keeps an adjusted rest inside sane bounds. */
export function clampRest(seconds: number): number {
  return Math.min(MAX_REST_SECONDS, Math.max(MIN_REST_SECONDS, seconds));
}

/** "1:30" */
export function formatRest(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
