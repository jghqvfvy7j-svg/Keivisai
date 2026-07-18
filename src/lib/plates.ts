// Works out which plates to slide onto each side of a barbell to reach a target
// weight. Pure arithmetic, no I/O, so it is easy to test and safe to run on the
// client while the user is typing.

/** Plates a normal gym has, heaviest first, in kilograms. */
export const DEFAULT_PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];

/** An olympic barbell. Most gyms also have a 15kg women's bar. */
export const DEFAULT_BAR_KG = 20;

export type PlateLoad = {
  /** Plates for ONE side, heaviest first. Both sides are loaded the same. */
  perSide: number[];
  /** What the bar actually weighs once loaded. */
  achieved: number;
  /** target - achieved. Positive means we could not reach the target exactly. */
  remainder: number;
  /** True when the target is below the empty bar. */
  belowBar: boolean;
};

/**
 * Greedy from the heaviest plate down. That is optimal for the usual gym set
 * (each plate is at least twice the next one down, or a clean multiple), and it
 * matches how people actually load a bar.
 */
export function calculatePlates(
  targetKg: number,
  barKg: number = DEFAULT_BAR_KG,
  available: number[] = DEFAULT_PLATES_KG
): PlateLoad {
  if (!Number.isFinite(targetKg) || targetKg <= 0) {
    return { perSide: [], achieved: 0, remainder: 0, belowBar: false };
  }
  if (targetKg < barKg) {
    return { perSide: [], achieved: barKg, remainder: 0, belowBar: true };
  }

  // Everything above the bar is split evenly between the two sides.
  let remainingPerSide = (targetKg - barKg) / 2;
  const perSide: number[] = [];

  const plates = [...available].sort((a, b) => b - a);
  for (const plate of plates) {
    // Float arithmetic: 1.25 + 2.5 style sums drift, so allow a hair of slack.
    while (remainingPerSide + 1e-9 >= plate) {
      perSide.push(plate);
      remainingPerSide -= plate;
    }
  }

  const achieved = barKg + perSide.reduce((s, p) => s + p, 0) * 2;
  const remainder = Math.round((targetKg - achieved) * 100) / 100;

  return { perSide, achieved, remainder, belowBar: false };
}

/** "2×20 + 1×5" — how a person would say it. Empty string when the bar is bare. */
export function formatPlates(perSide: number[]): string {
  if (perSide.length === 0) return "";
  const counts = new Map<number, number>();
  for (const p of perSide) counts.set(p, (counts.get(p) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([plate, n]) => `${n}×${plate}`)
    .join(" + ");
}
