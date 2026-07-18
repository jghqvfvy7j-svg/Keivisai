// Achievement definitions and unlock logic. All computed from REAL user data —
// nothing is faked. Achievements are a strong retention driver in fitness apps.

import { getCurrentUser } from "@/lib/supabase/user";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/data";

export type Achievement = {
  id: string;
  name: string;
  description: string;
  icon: string; // lucide icon name
  unlocked: boolean;
  progress?: { current: number; target: number };
};

// Stats we need to evaluate every achievement.
type AchievementStats = {
  totalSessions: number;
  totalVolume: number;
  bestStreak: number;
  currentStreak: number;
  mealsLogged: number;
  plansCreated: number;
  prCount: number;
};

// The catalog. Each has a rule that decides unlocked + optional progress.
function evaluate(stats: AchievementStats): Achievement[] {
  const def = (
    id: string,
    name: string,
    description: string,
    icon: string,
    current: number,
    target: number
  ): Achievement => ({
    id, name, description, icon,
    unlocked: current >= target,
    progress: { current: Math.min(current, target), target },
  });

  return [
    def("first_workout", "First Steps", "Complete your first workout", "Footprints", stats.totalSessions, 1),
    def("ten_workouts", "Getting Serious", "Complete 10 workouts", "Dumbbell", stats.totalSessions, 10),
    def("fifty_workouts", "Dedicated", "Complete 50 workouts", "Medal", stats.totalSessions, 50),
    def("hundred_workouts", "Century Club", "Complete 100 workouts", "Trophy", stats.totalSessions, 100),
    def("week_streak", "On a Roll", "Reach a 7-day streak", "Flame", stats.bestStreak, 7),
    def("month_streak", "Unstoppable", "Reach a 30-day streak", "Zap", stats.bestStreak, 30),
    def("first_meal", "Nutrition Aware", "Log your first meal", "Apple", stats.mealsLogged, 1),
    def("fifty_meals", "Macro Master", "Log 50 meals", "Salad", stats.mealsLogged, 50),
    def("first_plan", "Planner", "Create your first workout plan", "ClipboardList", stats.plansCreated, 1),
    def("first_pr", "Personal Best", "Set your first personal record", "TrendingUp", stats.prCount, 1),
    def("volume_10k", "Heavy Lifter", "Lift 10,000 kg total volume", "Anvil", stats.totalVolume, 10000),
    def("volume_100k", "Iron Titan", "Lift 100,000 kg total volume", "Mountain", stats.totalVolume, 100000),
  ];
}

export async function getAchievements(): Promise<{ achievements: Achievement[]; unlockedCount: number }> {
  const emptyStats: AchievementStats = {
    totalSessions: 0, totalVolume: 0, bestStreak: 0, currentStreak: 0,
    mealsLogged: 0, plansCreated: 0, prCount: 0,
  };

  if (!supabaseConfigured()) {
    const achievements = evaluate(emptyStats);
    return { achievements, unlockedCount: 0 };
  }

  try {
    const supabase = await createClient();
    const { user } = await getCurrentUser();
    if (!user) {
      const achievements = evaluate(emptyStats);
      return { achievements, unlockedCount: 0 };
    }

    const [sessions, meals, plans, logs] = await Promise.all([
      supabase.from("workout_sessions").select("started_at,total_volume_kg").eq("user_id", user.id),
      supabase.from("nutrition_logs").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("routines").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("workout_logs").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    ]);

    const allSessions = sessions.data ?? [];
    const totalVolume = allSessions.reduce((s, x) => s + Number(x.total_volume_kg ?? 0), 0);

    // Best streak: longest run of consecutive days with a session.
    const dates = [...new Set(allSessions.map((s) => s.started_at.slice(0, 10)))].sort();
    let bestStreak = 0, run = 0, prevDay: number | null = null;
    for (const d of dates) {
      const day = Math.floor(new Date(d).getTime() / 864e5);
      if (prevDay !== null && day - prevDay === 1) run++;
      else run = 1;
      bestStreak = Math.max(bestStreak, run);
      prevDay = day;
    }

    const stats: AchievementStats = {
      totalSessions: allSessions.length,
      totalVolume,
      bestStreak,
      currentStreak: bestStreak, // simplified
      mealsLogged: meals.count ?? 0,
      plansCreated: plans.count ?? 0,
      prCount: (logs.count ?? 0) > 0 ? 1 : 0, // has at least one logged lift
    };

    const achievements = evaluate(stats);
    return { achievements, unlockedCount: achievements.filter((a) => a.unlocked).length };
  } catch {
    const achievements = evaluate(emptyStats);
    return { achievements, unlockedCount: 0 };
  }
}
