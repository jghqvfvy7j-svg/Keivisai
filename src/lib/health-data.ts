// Server-only helpers for reading imported Apple Health data. Kept separate from
// data.ts so client components (which import types from data.ts) never pull the
// server-only "next/headers" chain into their bundle.

import { getCurrentUser } from "@/lib/supabase/user";
import { createClient } from "@/lib/supabase/server";

function configured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export type HealthWorkout = {
  id: string;
  activityType: string;
  date: string;
  durationMin: number | null;
  distanceKm: number | null;
  energyKcal: number | null;
  avgHr: number | null;
  maxHr: number | null;
};

export async function getHealthWorkouts(limit = 15): Promise<HealthWorkout[]> {
  if (!configured()) return [];
  try {
    const supabase = await createClient();
    const { user } = await getCurrentUser();
    if (!user) return [];
    const { data } = await supabase
      .from("health_workouts")
      .select("id, activity_type, started_at, duration_min, distance_km, active_energy_kcal, avg_heart_rate, max_heart_rate")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false })
      .limit(limit);
    return (data ?? []).map((w) => ({
      id: w.id,
      activityType: w.activity_type ?? "Workout",
      date: new Date(w.started_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      durationMin: w.duration_min ? Math.round(Number(w.duration_min)) : null,
      distanceKm: w.distance_km ? Math.round(Number(w.distance_km) * 100) / 100 : null,
      energyKcal: w.active_energy_kcal ? Math.round(Number(w.active_energy_kcal)) : null,
      avgHr: w.avg_heart_rate,
      maxHr: w.max_heart_rate,
    }));
  } catch {
    return [];
  }
}

export type HeartDaily = { day: string; restingHr: number | null; avgHr: number | null; maxHr: number | null };

export async function getHeartRateTrend(days = 30): Promise<HeartDaily[]> {
  if (!configured()) return [];
  try {
    const supabase = await createClient();
    const { user } = await getCurrentUser();
    if (!user) return [];
    const since = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
    const { data } = await supabase
      .from("health_heart_daily")
      .select("day, resting_hr, avg_hr, max_hr")
      .eq("user_id", user.id)
      .gte("day", since)
      .order("day", { ascending: true });
    return (data ?? []).map((h) => ({
      day: h.day,
      restingHr: h.resting_hr,
      avgHr: h.avg_hr,
      maxHr: h.max_hr,
    }));
  } catch {
    return [];
  }
}

// ---- Training calendar (real workout dates) --------------------------

// Returns the set of YYYY-MM-DD dates the user trained, for a given month.
// Used to render a real training calendar.
export async function getTrainingDates(year: number, month: number): Promise<string[]> {
  if (!configured()) return [];
  try {
    const supabase = await createClient();
    const { user } = await getCurrentUser();
    if (!user) return [];
    // month is 0-indexed. Build first and last day of the month.
    const first = new Date(Date.UTC(year, month, 1)).toISOString();
    const last = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59)).toISOString();
    const { data } = await supabase
      .from("workout_sessions")
      .select("started_at")
      .eq("user_id", user.id)
      .gte("started_at", first)
      .lte("started_at", last);
    const dates = new Set((data ?? []).map((s) => String(s.started_at).slice(0, 10)));
    return [...dates];
  } catch {
    return [];
  }
}
