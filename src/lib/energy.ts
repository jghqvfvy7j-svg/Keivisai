// Calorie intake analysis. Everything here is REAL data: it comes straight from
// the meals the user logged (nutrition_logs). There is no estimated "burned"
// figure anymore — without a wearable that number was guesswork and confusing,
// so this screen compares what you actually ate against your own daily goal.
//
// Grouping is by LOCAL day (device timezone), the same split that fixed the
// "This week" widget: the server sends a wide window of raw rows and this runs
// on the client, so no UTC phantom days.

import { localDayOf, localDaysAgo, localToday } from "@/lib/local-date";

export type RawMeal = {
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fats_g: number | null;
  logged_at: string;
};

export type IntakeDay = {
  date: string; // YYYY-MM-DD, local
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

/** Group logged meals into per-day totals over the last `days` local days. Days
 *  with no meals are omitted, so the chart simply has no bar there. */
export function buildIntakeSeries(meals: RawMeal[], days: number): IntakeDay[] {
  const cutoff = localDaysAgo(days - 1);
  const today = localToday();
  const map = new Map<string, IntakeDay>();

  for (const m of meals) {
    const day = localDayOf(m.logged_at);
    if (day < cutoff || day > today) continue;
    const acc = map.get(day) ?? { date: day, calories: 0, protein: 0, carbs: 0, fat: 0 };
    acc.calories += Number(m.calories ?? 0);
    acc.protein += Number(m.protein_g ?? 0);
    acc.carbs += Number(m.carbs_g ?? 0);
    acc.fat += Number(m.fats_g ?? 0);
    map.set(day, acc);
  }

  return [...map.values()]
    .map((d) => ({
      date: d.date,
      calories: Math.round(d.calories),
      protein: Math.round(d.protein),
      carbs: Math.round(d.carbs),
      fat: Math.round(d.fat),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

type NumericKey = "calories" | "protein" | "carbs" | "fat";

/** Average of a field over the last `n` logged days present in the series. */
export function rollingAvg(series: IntakeDay[], key: NumericKey, n: number): number {
  const slice = series.slice(-n);
  if (!slice.length) return 0;
  return Math.round(slice.reduce((s, d) => s + d[key], 0) / slice.length);
}

/** Total of a field over the last `n` logged days present in the series. */
export function rollingTotal(series: IntakeDay[], key: NumericKey, n: number): number {
  return Math.round(series.slice(-n).reduce((s, d) => s + d[key], 0));
}
