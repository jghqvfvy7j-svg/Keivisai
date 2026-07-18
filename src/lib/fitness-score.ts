// Fitness Score (0-100) computed from real saved data. Returns null-ish
// breakdown when there isn't enough data, so the UI can say "Not enough data yet".

import { getWeekNutrition } from "@/lib/data";
import { getCurrentUser } from "@/lib/supabase/user";
import { createClient } from "@/lib/supabase/server";

export type FitnessScore = {
  hasEnoughData: boolean;
  total: number;
  breakdown: { strength: number; consistency: number; nutrition: number; recovery: number };
  note: string;
};

export async function getFitnessScore(): Promise<FitnessScore> {
  const empty: FitnessScore = {
    hasEnoughData: false,
    total: 0,
    breakdown: { strength: 0, consistency: 0, nutrition: 0, recovery: 0 },
    note: "Not enough data yet.",
  };
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return empty;

  try {
    const supabase = await createClient();
    const { user } = await getCurrentUser();
    if (!user) return empty;

    const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
    const monthAgo = new Date(Date.now() - 28 * 864e5).toISOString();

    // Nutrition comes from getWeekNutrition, which groups real meals by the
    // user's LOCAL day. Reading nutrition_days here would reintroduce the UTC
    // grouping bug: phantom days that inflate the nutrition score.
    const [{ data: sessions }, { data: profile }, nutriDays] = await Promise.all([
      supabase.from("workout_sessions")
        .select("started_at,total_volume_kg,recovery_1_10,difficulty_1_10")
        .eq("user_id", user.id).gte("started_at", monthAgo),
      supabase.from("users_profiles")
        .select("training_days,current_weight_kg").eq("user_id", user.id).maybeSingle(),
      getWeekNutrition(),
    ]);

    const sessionCount = sessions?.length ?? 0;
    const nutriCount = nutriDays.length;

    // Need at least a few sessions OR some nutrition days to score.
    if (sessionCount < 2 && nutriCount < 2) return empty;

    // Consistency: sessions this week vs goal
    const weekSessions = (sessions ?? []).filter((s) => s.started_at >= weekAgo).length;
    const goal = profile?.training_days ?? 3;
    const consistency = Math.min(100, Math.round((weekSessions / Math.max(1, goal)) * 100));

    // Strength: progressive overload — compare avg volume last 2 weeks vs prior 2 weeks
    const twoWeeks = new Date(Date.now() - 14 * 864e5).toISOString();
    const recent = (sessions ?? []).filter((s) => s.started_at >= twoWeeks);
    const older = (sessions ?? []).filter((s) => s.started_at < twoWeeks);
    const avg = (arr: typeof recent) => arr.length ? arr.reduce((s, x) => s + Number(x.total_volume_kg ?? 0), 0) / arr.length : 0;
    const recentVol = avg(recent), olderVol = avg(older);
    let strength = 50;
    if (olderVol > 0) strength = Math.max(0, Math.min(100, Math.round(50 + ((recentVol - olderVol) / olderVol) * 100)));
    else if (recentVol > 0) strength = 60;

    // Nutrition: protein adherence (avg protein vs 1.6g/kg target)
    let nutrition = 0;
    if (nutriCount >= 1 && profile?.current_weight_kg) {
      const target = Number(profile.current_weight_kg) * 1.6;
      const avgProtein = nutriDays.reduce((s, d) => s + Number(d.protein_g), 0) / nutriCount;
      nutrition = Math.min(100, Math.round((avgProtein / target) * 100));
    } else if (nutriCount >= 1) {
      nutrition = 50;
    }

    // Recovery: avg recovery check-in
    const recoveries = (sessions ?? []).map((s) => s.recovery_1_10).filter((v): v is number => typeof v === "number");
    const recovery = recoveries.length
      ? Math.round((recoveries.reduce((s, v) => s + v, 0) / recoveries.length) * 10)
      : 60;

    const total = Math.round(strength * 0.3 + consistency * 0.3 + nutrition * 0.2 + recovery * 0.2);

    return {
      hasEnoughData: true,
      total,
      breakdown: { strength, consistency, nutrition, recovery },
      note: total >= 75 ? "You're on a strong track. Keep it up." : total >= 50 ? "Solid base — consistency will move this up." : "Early days. Show up and the score climbs.",
    };
  } catch {
    return empty;
  }
}
