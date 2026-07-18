import { redirect } from "next/navigation";
// =====================================================================
// Capa de acceso a datos. Cada función intenta leer de Supabase y, si no
// hay proyecto conectado (o falla), devuelve datos de muestra para que la
// app nunca se rompa. Así funciona igual en local sin configurar nada, y
// automáticamente usa datos reales cuando defines las variables de entorno.
// =====================================================================

import { createClient } from "@/lib/supabase/server";
import type { ExerciseRow } from "@/lib/types/database";
import { mockExercises } from "@/lib/mock-data";
import { localDaysAgo, localDateStr, localToday, localDayOf } from "@/lib/local-date";
import { getCurrentUser } from "@/lib/supabase/user";
import { withTimeout } from "@/lib/with-timeout";
import { computeNutritionGoal, type NutritionGoal } from "@/lib/nutrition-targets";
import { mockProfile } from "@/lib/mock-data";

export function supabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

// ---- Ejercicios ----------------------------------------------------

export async function getExercises(): Promise<ExerciseRow[]> {
  if (!supabaseConfigured()) return mockExercises;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("exercises")
      .select("*")
      .order("name", { ascending: true });
    if (error || !data || data.length === 0) return mockExercises;
    return data as ExerciseRow[];
  } catch {
    return mockExercises;
  }
}

export async function getExerciseBySlug(slug: string): Promise<ExerciseRow | null> {
  if (!supabaseConfigured()) {
    return mockExercises.find((e) => e.slug === slug) ?? null;
  }
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("exercises")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (error || !data) {
      return mockExercises.find((e) => e.slug === slug) ?? null;
    }
    return data as ExerciseRow;
  } catch {
    return mockExercises.find((e) => e.slug === slug) ?? null;
  }
}

// ---- Perfil del usuario --------------------------------------------

export async function getCurrentProfile() {
  if (!supabaseConfigured()) return null;
  try {
    const supabase = await createClient();
    const { user } = await getCurrentUser();
    if (!user) return null;
    const { data } = await supabase
      .from("users_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    return data ?? null;
  } catch {
    return null;
  }
}

// ---- Nutrition ------------------------------------------------------

export type NutritionDay = {
  day: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  meals_count: number;
};

export type MealLog = {
  id: string;
  meal_name: string;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fats_g: number | null;
  source?: string;
  logged_at: string;
  notes?: string | null;
  items?: { food: string; qty?: string; calories?: number }[] | null;
};

export async function getTodayMeals(): Promise<MealLog[]> {
  if (!supabaseConfigured()) return [];
  try {
    const supabase = await createClient();
    const { user } = await getCurrentUser();
    if (!user) return [];
    // Fetch a window from yesterday to tomorrow (UTC) so no local-today meal is
    // missed for users far from GMT. The client filters to the exact local day.
    const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    const dayAfter = new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10);
    const { data } = await supabase
      .from("nutrition_logs")
      .select("id,meal_name,calories,protein_g,carbs_g,fats_g,source,logged_at,notes,items")
      .eq("user_id", user.id)
      .gte("logged_at", yesterday + "T00:00:00")
      .lt("logged_at", dayAfter + "T00:00:00")
      .order("logged_at", { ascending: false });
    return (data as MealLog[]) ?? [];
  } catch {
    return [];
  }
}

export async function getWeekNutrition(): Promise<NutritionDay[]> {
  if (!supabaseConfigured()) return [];
  try {
    const supabase = await createClient();
    const { user } = await getCurrentUser();
    if (!user) return [];

    // Build the week from the actual meals, grouped by the user's LOCAL day.
    // The old path read nutrition_days, a summary table filled by a trigger that
    // grouped on logged_at::date — the server's UTC date. West of Greenwich that
    // split one evening's meals across two "days", so the widget showed more days
    // logged than really happened. Grouping here, in local time, fixes it.
    const sinceUtc = localDaysAgo(7) + "T00:00:00";
    const { data } = await supabase
      .from("nutrition_logs")
      .select("calories,protein_g,carbs_g,fats_g,logged_at")
      .eq("user_id", user.id)
      .gte("logged_at", sinceUtc)
      .order("logged_at", { ascending: true });

    if (!data) return [];

    const today = localToday();
    const cutoff = localDaysAgo(6); // keep the last 7 calendar days, local
    const byDay = new Map<string, NutritionDay>();

    for (const row of data) {
      const day = localDayOf(String(row.logged_at));
      if (day < cutoff || day > today) continue; // trim UTC-window overhang
      const acc = byDay.get(day) ?? {
        day, calories: 0, protein_g: 0, carbs_g: 0, fats_g: 0, meals_count: 0,
      };
      acc.calories += Number(row.calories ?? 0);
      acc.protein_g += Number(row.protein_g ?? 0);
      acc.carbs_g += Number(row.carbs_g ?? 0);
      acc.fats_g += Number(row.fats_g ?? 0);
      acc.meals_count += 1;
      byDay.set(day, acc);
    }

    return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
  } catch {
    return [];
  }
}

// ---- Calorie intake raw data (all real, straight from logged meals) --------

export type IntakeRaw = {
  meals: {
    calories: number | null;
    protein_g: number | null;
    carbs_g: number | null;
    fats_g: number | null;
    logged_at: string;
  }[];
  goal: NutritionGoal;
};

// Fetch a wide UTC window of the user's logged meals plus their daily goal.
// Returns RAW meal rows: the client groups them by LOCAL day (device timezone),
// the same split that fixed the "This week" widget, so we never reintroduce the
// UTC phantom-day bug by aggregating on the server. The goal is computed from
// the profile (or a coach-set target) with the same function the Nutrition tab
// uses, so the numbers line up across the app.
export async function getIntakeRaw(days = 180): Promise<IntakeRaw> {
  const empty: IntakeRaw = { meals: [], goal: computeNutritionGoal({}) };
  if (!supabaseConfigured()) return empty;
  try {
    const supabase = await createClient();
    const { user } = await getCurrentUser();
    if (!user) return empty;

    // One extra day of margin so no local-day row is clipped by the UTC window;
    // the client trims to the exact local range.
    const since = localDaysAgo(days + 1) + "T00:00:00";

    const [{ data: meals }, { data: profile }] = await Promise.all([
      supabase
        .from("nutrition_logs")
        .select("calories,protein_g,carbs_g,fats_g,logged_at")
        .eq("user_id", user.id)
        .gte("logged_at", since)
        .order("logged_at", { ascending: true }),
      supabase
        .from("users_profiles")
        .select(
          "gender,current_weight_kg,height_cm,age,goal,level,training_days,custom_calories,custom_protein_g,custom_carbs_g,custom_fats_g"
        )
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    return {
      meals: (meals as IntakeRaw["meals"]) ?? [],
      goal: computeNutritionGoal(profile ?? {}),
    };
  } catch {
    return empty;
  }
}

// Returns the profile to render.
// Loads the signed-in user's REAL profile. This function is FAIL CLOSED:
//
// - Network stalled or unreachable  -> throws, so the error screen shows.
// - Not signed in                   -> redirects to /login.
// - Supabase not configured         -> throws (a misconfigured deploy must be
//                                      loud, never quietly serve demo data).
// - Signed in, no profile row yet   -> a blank profile for THIS user.
//
// It NEVER returns mock/demo data. A real user seeing demo numbers would look
// like data loss, and an unverified visitor must never be served a private view.
export async function getProfile() {
  if (!supabaseConfigured()) {
    throw new Error("Supabase is not configured for this deployment.");
  }

  const TIMEOUT = Symbol("timeout");
  const supabase = await createClient();

  // Shared with every other data function in this same request: one round trip,
  // not six. It already has the timeout and the rejection guard built in.
  const { user, failed } = await getCurrentUser();

  // Network stalled or unreachable: fail closed. Never guess, never show demo.
  if (failed) {
    throw new Error("Could not reach the server. Check your connection.");
  }
  if (!user) redirect("/login");

  const profileQuery = Promise.resolve(
    supabase.from("users_profiles").select("*").eq("user_id", user.id).maybeSingle()
  );
  const profileResult = await withTimeout<{ data: unknown } | typeof TIMEOUT>(
    profileQuery.catch(() => TIMEOUT as never),
    6000,
    TIMEOUT
  );
  if (profileResult === TIMEOUT) {
    throw new Error("Could not reach the server. Check your connection.");
  }

  const data = profileResult.data;
  if (data) return data as typeof mockProfile;

  // Signed in but no profile row yet: a blank profile for THIS user, not mock.
  return {
    ...mockProfile,
    name: user.email?.split("@")[0] ?? "Athlete",
    gender: null,
    current_weight_kg: null,
    height_cm: null,
    age: null,
    onboarding_completed: false,
  } as typeof mockProfile;
}

// ---- Home dashboard stats (real when signed in, else zeros) ---------

export type PrPrediction = {
  exercise: string;
  current: number;
  target: number;
  weeks: number;
};

export type HomeStats = {
  sessionsThisWeek: number;
  lastSessionMinutes: number | null;
  lastSessionFocus: string | null;
  weekVolume: number;
  prevWeekVolume: number;
  streakDays: number;
  /** Meals in a window around today, in UTC. The CLIENT filters this to its own
   *  local day; the server cannot know the user's timezone. */
  todayMeals: { logged_at: string; calories: number; protein_g: number }[];
  hasRealData: boolean;
  prPrediction: PrPrediction | null;
  deloadSuggested: boolean;
};

export async function getHomeStats(): Promise<HomeStats> {
  const empty: HomeStats = {
    sessionsThisWeek: 0, lastSessionMinutes: null, lastSessionFocus: null,
    weekVolume: 0, prevWeekVolume: 0, streakDays: 0,
    todayMeals: [], hasRealData: false, prPrediction: null, deloadSuggested: false,
  };
  if (!supabaseConfigured()) return empty;
  try {
    const supabase = await createClient();
    const { user } = await getCurrentUser();
    if (!user) return empty;

    const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
    const twoWeeks = new Date(Date.now() - 14 * 864e5).toISOString();

    // The server runs in UTC and has no idea what day it is where the user is.
    // Slicing an ISO string gives the UTC date, so for anyone west of Greenwich
    // "today 00:00" lands in yesterday evening: last night's dinner was being
    // counted as today's calories. We fetch a wide window here and let the
    // device, which knows its own timezone, pick the real day. Same approach as
    // getTodayMeals, which is why the two screens used to disagree.
    const from = localDaysAgo(1) + "T00:00:00";
    const to = localDateStr(new Date(Date.now() + 864e5)) + "T23:59:59";

    const [{ data: sessions }, { data: mealsWindow }] = await Promise.all([
      supabase.from("workout_sessions")
        .select("started_at,duration_minutes,total_volume_kg,focus")
        .eq("user_id", user.id).gte("started_at", twoWeeks).order("started_at", { ascending: false }),
      supabase.from("nutrition_logs")
        .select("calories,protein_g,logged_at")
        .eq("user_id", user.id)
        .gte("logged_at", from)
        .lte("logged_at", to),
    ]);

    const all = sessions ?? [];
    const thisWeek = all.filter((s) => s.started_at >= weekAgo);
    const prevWeek = all.filter((s) => s.started_at < weekAgo);
    const last = all[0];

    // streak: consecutive days (from today backwards) with a session
    const days = new Set(all.map((s) => s.started_at.slice(0, 10)));
    let streak = 0;
    for (let i = 0; i < 14; i++) {
      const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
      if (days.has(d)) streak++;
      else if (i > 0) break;
    }

    // Real PR prediction: find the exercise with the most logged top weight and
    // project a modest next target. Only if there's actual logged data.
    let prPrediction: PrPrediction | null = null;
    try {
      const { data: topLogs } = await supabase
        .from("workout_logs")
        .select("weight_kg, exercise_name")
        .eq("user_id", user.id)
        .order("weight_kg", { ascending: false })
        .limit(1);
      const top = topLogs?.[0];
      if (top && top.weight_kg && top.exercise_name) {
        const current = Math.round(Number(top.weight_kg) * 2) / 2; // nearest 0.5
        // Next target: +2.5kg (a standard small plate jump), realistic ~2-3 weeks.
        prPrediction = {
          exercise: top.exercise_name,
          current,
          target: current + 2.5,
          weeks: 2,
        };
      }
    } catch { /* no logs table or no data — skip prediction */ }

    // Deload suggestion: if the user has trained at least 3x/week for 5+ of the
    // last 6 weeks straight, suggest a lighter week to recover.
    let deloadSuggested = false;
    try {
      const sixWeeksAgo = new Date(Date.now() - 42 * 864e5).toISOString();
      const { data: longRange } = await supabase
        .from("workout_sessions")
        .select("started_at")
        .eq("user_id", user.id)
        .gte("started_at", sixWeeksAgo);
      if (longRange && longRange.length >= 15) {
        // Count sessions per week bucket.
        const weekCounts = new Map<number, number>();
        for (const s of longRange) {
          const wk = Math.floor(new Date(s.started_at).getTime() / (7 * 864e5));
          weekCounts.set(wk, (weekCounts.get(wk) ?? 0) + 1);
        }
        const solidWeeks = [...weekCounts.values()].filter((c) => c >= 3).length;
        deloadSuggested = solidWeeks >= 5;
      }
    } catch { /* skip */ }

    return {
      sessionsThisWeek: thisWeek.length,
      lastSessionMinutes: last?.duration_minutes ?? null,
      lastSessionFocus: last?.focus ?? null,
      weekVolume: Math.round(thisWeek.reduce((s, x) => s + Number(x.total_volume_kg ?? 0), 0)),
      prevWeekVolume: Math.round(prevWeek.reduce((s, x) => s + Number(x.total_volume_kg ?? 0), 0)),
      streakDays: streak,
      todayMeals: (mealsWindow ?? []).map((m) => ({
        logged_at: String(m.logged_at),
        calories: Number(m.calories ?? 0),
        protein_g: Number(m.protein_g ?? 0),
      })),
      hasRealData: all.length > 0 || (mealsWindow ?? []).length > 0,
      prPrediction,
      deloadSuggested,
    };
  } catch {
    return empty;
  }
}

// ---- Active routine (real, with days + exercises) ------------------

export type RoutineWithDays = {
  id: string;
  name: string;
  goal: string;
  days_per_week: number;
  days: {
    id: string;
    day_name: string;
    day_order: number;
    focus: string;
    exercises: {
      id: string;
      sets: number;
      reps: string;
      rest_seconds: number;
      suggested_weight_kg: number | null;
      exercise: {
        id: string; name: string; slug: string;
        image_url: string | null; main_muscle: string;
      };
    }[];
  }[];
};

export async function getActiveRoutine(): Promise<RoutineWithDays | null> {
  if (!supabaseConfigured()) return null;
  try {
    const supabase = await createClient();
    const { user } = await getCurrentUser();
    if (!user) return null;

    const { data: routine } = await supabase
      .from("routines")
      .select("id,name,goal,days_per_week")
      .eq("user_id", user.id).eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1).maybeSingle();
    if (!routine) return null;

    const { data: days } = await supabase
      .from("routine_days")
      .select("id,day_name,day_order,focus")
      .eq("routine_id", routine.id)
      .order("day_order", { ascending: true });
    if (!days || days.length === 0) return { ...routine, days: [] };

    const dayIds = days.map((d) => d.id);
    const { data: res } = await supabase
      .from("routine_exercises")
      .select("id,routine_day_id,sets,reps,rest_seconds,suggested_weight_kg,order_index,exercise:exercises(id,name,slug,image_url,main_muscle)")
      .in("routine_day_id", dayIds)
      .order("order_index", { ascending: true });

    const exByDay = new Map<string, NonNullable<typeof res>>();
    for (const r of res ?? []) {
      const arr = exByDay.get(r.routine_day_id) ?? [];
      arr.push(r);
      exByDay.set(r.routine_day_id, arr);
    }

    return {
      ...routine,
      days: days.map((d) => ({
        ...d,
        exercises: (exByDay.get(d.id) ?? []).map((r) => ({
          id: r.id, sets: r.sets, reps: r.reps, rest_seconds: r.rest_seconds,
          suggested_weight_kg: r.suggested_weight_kg,
          exercise: Array.isArray(r.exercise) ? r.exercise[0] : r.exercise,
        })),
      })),
    };
  } catch {
    return null;
  }
}

// Display name resolver. If the user set a name we use it; otherwise we fall
// back to a gender-based default: Helena (female) / Lucas (male).
export function displayName(profile: { name?: string | null; gender?: string | null }) {
  const n = (profile.name ?? "").trim();
  const looksLikeEmail = n.includes("@") || n === "";
  if (n && !looksLikeEmail) return n;
  if (profile.gender === "femenino") return "Helena";
  if (profile.gender === "masculino") return "Lucas";
  return n || "Athlete";
}

// ---- Coach chat history (per user) ---------------------------------

export type CoachMessage = { role: "user" | "assistant"; content: string; image?: string };

// Loads the user's most recent conversation so the chat persists across visits.
export async function getLatestConversation(): Promise<{ id: string; messages: CoachMessage[] } | null> {
  if (!supabaseConfigured()) return null;
  try {
    const supabase = await createClient();
    const { user } = await getCurrentUser();
    if (!user) return null;

    const { data: conv } = await supabase
      .from("coach_conversations")
      .select("id")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1).maybeSingle();
    if (!conv) return null;

    // Load messages. We try to include image_path (added by
    // coach_imagen_en_chat.sql); if that migration hasn't run, the column is
    // missing and the select errors, so we fall back to text-only. History must
    // never disappear just because the new column isn't there yet.
    const withImg = await supabase
      .from("coach_messages")
      .select("role,content,image_path")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true });

    let rows: { role: "user" | "assistant"; content: string; image_path?: string | null }[];
    if (withImg.error) {
      const basic = await supabase
        .from("coach_messages")
        .select("role,content")
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: true });
      rows = (basic.data as typeof rows) ?? [];
    } else {
      rows = (withImg.data as typeof rows) ?? [];
    }

    // Turn any stored image path into a fresh signed URL (1h) so the thumbnail
    // renders again. Signing runs through the user's own client, so Storage RLS
    // still guarantees they only ever get a URL for their own photo.
    const messages: CoachMessage[] = await Promise.all(
      rows.map(async (r) => {
        const msg: CoachMessage = { role: r.role, content: r.content };
        if (r.image_path) {
          try {
            const { data: signed } = await supabase.storage
              .from("coach-photos")
              .createSignedUrl(r.image_path, 3600);
            if (signed?.signedUrl) msg.image = signed.signedUrl;
          } catch {
            /* couldn't sign — show the text without the thumbnail */
          }
        }
        return msg;
      })
    );

    return { id: conv.id, messages };
  } catch {
    return null;
  }
}

// Default display name based on gender when the user hasn't set one.
// Helena for female, Lucas for male, Athlete otherwise.
export function defaultNameForGender(gender?: string | null): string {
  if (gender === "femenino") return "Helena";
  if (gender === "masculino") return "Lucas";
  return "Athlete";
}

// ---- Progress page (real data or empty) -----------------------------

export type ProgressData = {
  hasData: boolean;
  weekDelta: number | null;
  bodyWeight: { date: string; peso: number }[];
  weeklyVolume: { week: string; volumen: number }[];
  latestWeight: number | null;
};

export async function getProgressData(): Promise<ProgressData> {
  const empty: ProgressData = {
    hasData: false, weekDelta: null, bodyWeight: [], weeklyVolume: [], latestWeight: null,
  };
  if (!supabaseConfigured()) return empty;
  try {
    const supabase = await createClient();
    const { user } = await getCurrentUser();
    if (!user) return empty;

    const monthAgo = new Date(Date.now() - 56 * 864e5).toISOString();
    const [{ data: sessions }, { data: metrics }] = await Promise.all([
      supabase.from("workout_sessions")
        .select("started_at,total_volume_kg")
        .eq("user_id", user.id).gte("started_at", monthAgo)
        .order("started_at", { ascending: true }),
      supabase.from("body_metrics")
        .select("recorded_at,weight_kg")
        .eq("user_id", user.id).order("recorded_at", { ascending: true }).limit(30),
    ]);

    const s = sessions ?? [];
    const m = metrics ?? [];
    if (s.length === 0 && m.length === 0) return empty;

    // Weekly volume buckets (last 4 weeks)
    const now = Date.now();
    const weeks = [3, 2, 1, 0].map((w) => {
      const start = now - (w + 1) * 7 * 864e5;
      const end = now - w * 7 * 864e5;
      const vol = s.filter((x) => {
        const t = new Date(x.started_at).getTime();
        return t >= start && t < end;
      }).reduce((sum, x) => sum + Number(x.total_volume_kg ?? 0), 0);
      return { week: `W${4 - w}`, volumen: Math.round(vol) };
    });

    const thisWeek = weeks[3].volumen;
    const lastWeek = weeks[2].volumen;
    const weekDelta = lastWeek ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : null;

    const bodyWeight = m.map((x) => ({
      date: new Date(x.recorded_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      peso: Number(x.weight_kg),
    }));

    return {
      hasData: true,
      weekDelta,
      bodyWeight,
      weeklyVolume: weeks,
      latestWeight: bodyWeight.length ? bodyWeight[bodyWeight.length - 1].peso : null,
    };
  } catch {
    return empty;
  }
}

// ---- Exercise history & personal records (pro features) -------------

export type ExerciseHistoryPoint = { date: string; topWeight: number; topReps: number };
export type ExercisePR = { weight: number; reps: number; date: string; estimated1RM: number };

// Full logged history for one exercise (for the progression chart + PR).
export async function getExerciseHistory(exerciseId: string): Promise<{
  history: ExerciseHistoryPoint[];
  pr: ExercisePR | null;
}> {
  if (!supabaseConfigured()) return { history: [], pr: null };
  try {
    const supabase = await createClient();
    const { user } = await getCurrentUser();
    if (!user) return { history: [], pr: null };

    // Join logs -> sessions to get the date, filter to this user's sessions.
    const { data: sessions } = await supabase
      .from("workout_sessions")
      .select("id,started_at")
      .eq("user_id", user.id)
      .order("started_at", { ascending: true });
    if (!sessions || sessions.length === 0) return { history: [], pr: null };

    const sessionMap = new Map(sessions.map((s) => [s.id, s.started_at]));
    const { data: logs } = await supabase
      .from("workout_logs")
      .select("session_id,weight_kg,reps,completed")
      .eq("exercise_id", exerciseId)
      .in("session_id", sessions.map((s) => s.id));
    if (!logs || logs.length === 0) return { history: [], pr: null };

    // Bucket by session date; keep the top set (by weight) each day.
    const byDate = new Map<string, { topWeight: number; topReps: number }>();
    let pr: ExercisePR | null = null;

    for (const log of logs) {
      const startedAt = sessionMap.get(log.session_id);
      if (!startedAt) continue;
      const w = Number(log.weight_kg ?? 0);
      const r = parseInt(String(log.reps ?? "0"), 10) || 0;
      if (w <= 0) continue;
      const day = new Date(startedAt).toISOString().slice(0, 10);
      const cur = byDate.get(day);
      if (!cur || w > cur.topWeight) byDate.set(day, { topWeight: w, topReps: r });

      // Epley 1RM estimate to rank PRs fairly across rep ranges.
      const oneRM = w * (1 + r / 30);
      if (!pr || oneRM > pr.estimated1RM) {
        pr = { weight: w, reps: r, date: day, estimated1RM: Math.round(oneRM) };
      }
    }

    const history = [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({
        date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        topWeight: v.topWeight,
        topReps: v.topReps,
      }));

    return { history, pr };
  } catch {
    return { history: [], pr: null };
  }
}

// Auto-progression suggestion for an exercise, based on the last session.
export async function getProgressionSuggestion(exerciseId: string, targetReps: string): Promise<string | null> {
  if (!supabaseConfigured()) return null;
  try {
    const supabase = await createClient();
    const { user } = await getCurrentUser();
    if (!user) return null;

    const { data: sessions } = await supabase
      .from("workout_sessions")
      .select("id,started_at,difficulty_1_10")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false })
      .limit(1);
    if (!sessions || sessions.length === 0) return null;

    const last = sessions[0];
    const { data: logs } = await supabase
      .from("workout_logs")
      .select("weight_kg,reps,completed")
      .eq("exercise_id", exerciseId)
      .eq("session_id", last.id);
    if (!logs || logs.length === 0) return null;

    // Parse the top of the target rep range (e.g. "8-12" -> 12).
    const topTarget = parseInt(targetReps.split("-").pop() || "0", 10) || 0;
    const allHitTarget = logs.every((l) => (parseInt(String(l.reps ?? "0"), 10) || 0) >= topTarget && l.completed);
    const hardSession = (last.difficulty_1_10 ?? 0) >= 9;
    const lastWeight = Math.max(...logs.map((l) => Number(l.weight_kg ?? 0)));

    if (lastWeight <= 0) return null;
    if (allHitTarget && !hardSession) {
      const bump = lastWeight < 20 ? 1.25 : lastWeight < 40 ? 2.5 : 5;
      return `You hit all your reps last time. Try ${lastWeight + bump} kg today (+${bump} kg).`;
    }
    if (hardSession) {
      return `Last session was tough. Keep ${lastWeight} kg and focus on clean reps.`;
    }
    return `Aim to match or beat ${lastWeight} kg for all sets.`;
  } catch {
    return null;
  }
}

// ---- Exercise alternatives (same muscle, respects equipment) --------

export async function getAlternatives(exerciseId: string, mainMuscle: string, limit = 4) {
  if (!supabaseConfigured()) return [];
  try {
    const supabase = await createClient();
    // Prefer alternatives that match the user's available equipment.
    const { user } = await getCurrentUser();
    let userEquip: string[] = [];
    if (user) {
      const { data: p } = await supabase
        .from("users_profiles").select("equipment_available").eq("user_id", user.id).maybeSingle();
      userEquip = p?.equipment_available ?? [];
    }

    const { data } = await supabase
      .from("exercises")
      .select("id,name,slug,image_url,main_muscle,equipment")
      .eq("main_muscle", mainMuscle)
      .neq("id", exerciseId)
      .limit(30);
    if (!data) return [];

    // Rank: same-equipment first when the user has a preference.
    const ranked = [...data].sort((a, b) => {
      if (userEquip.length === 0) return 0;
      const am = a.equipment.some((e: string) => userEquip.includes(e)) ? 0 : 1;
      const bm = b.equipment.some((e: string) => userEquip.includes(e)) ? 0 : 1;
      return am - bm;
    });
    return ranked.slice(0, limit);
  } catch {
    return [];
  }
}

// ---- Profile completion (retention nudge on Home) -------------------

export type ProfileCompletion = {
  percent: number;
  missing: { key: string; label: string; href: string }[];
};

export function getProfileCompletion(profile: {
  name?: string | null; goal?: string | null; level?: string | null;
  current_weight_kg?: number | null; height_cm?: number | null;
  training_days?: number | null; equipment_available?: string[] | null;
}): ProfileCompletion {
  const checks: { key: string; label: string; href: string; done: boolean }[] = [
    { key: "name", label: "Add your name", href: "/profile/settings", done: !!(profile.name && profile.name.trim()) },
    { key: "goal", label: "Set your goal", href: "/profile/settings", done: !!profile.goal },
    { key: "level", label: "Set your experience level", href: "/profile/settings", done: !!profile.level },
    { key: "weight", label: "Log your weight", href: "/profile/settings", done: !!profile.current_weight_kg },
    { key: "height", label: "Add your height", href: "/profile/settings", done: !!profile.height_cm },
    { key: "equipment", label: "Choose your equipment", href: "/onboarding", done: !!(profile.equipment_available && profile.equipment_available.length) },
  ];
  const done = checks.filter((c) => c.done).length;
  const percent = Math.round((done / checks.length) * 100);
  const missing = checks.filter((c) => !c.done).map(({ key, label, href }) => ({ key, label, href }));
  return { percent, missing };
}

// ---- Recent workout sessions (for history + delete) -----------------

export type RecentSession = {
  id: string;
  date: string;
  focus: string | null;
  volume: number;
  durationMin: number | null;
};

export async function getRecentSessions(limit = 10): Promise<RecentSession[]> {
  if (!supabaseConfigured()) return [];
  try {
    const supabase = await createClient();
    const { user } = await getCurrentUser();
    if (!user) return [];
    const { data } = await supabase
      .from("workout_sessions")
      .select("id,started_at,focus,total_volume_kg,duration_minutes")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false })
      .limit(limit);
    return (data ?? []).map((s) => ({
      id: s.id,
      date: new Date(s.started_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      focus: s.focus,
      volume: Math.round(Number(s.total_volume_kg ?? 0)),
      durationMin: s.duration_minutes,
    }));
  } catch {
    return [];
  }
}

// ---- Completed training days this week (for the Train tab) -----------

// Returns the set of day names (lowercased focus/day labels) the user has
// already completed since Monday this week, plus the count, so the Train tab can
// show checkmarks and highlight what's next.
export async function getCompletedDaysThisWeek(): Promise<{ focuses: string[]; count: number }> {
  if (!supabaseConfigured()) return { focuses: [], count: 0 };
  try {
    const supabase = await createClient();
    const { user } = await getCurrentUser();
    if (!user) return { focuses: [], count: 0 };

    // Start of this week (Monday 00:00 local-ish, using UTC boundaries).
    const now = new Date();
    const dow = (now.getUTCDay() + 6) % 7; // 0 = Monday
    const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - dow));

    const { data } = await supabase
      .from("workout_sessions")
      .select("focus, started_at")
      .eq("user_id", user.id)
      .gte("started_at", monday.toISOString());

    const focuses = [...new Set((data ?? []).map((s) => (s.focus ?? "").toLowerCase().trim()).filter(Boolean))];
    return { focuses, count: (data ?? []).length };
  } catch {
    return { focuses: [], count: 0 };
  }
}
