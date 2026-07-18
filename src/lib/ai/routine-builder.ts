// Rule-based routine builder that guarantees 4-5 exercises per training day,
// picking real exercises from Supabase. Used by the coach's generate_routine
// tool and by the manual "create plan" screen.

import { getCurrentUser } from "@/lib/supabase/user";
import { createClient } from "@/lib/supabase/server";
import type { ExerciseRow, MuscleGroup } from "@/lib/types/database";
import { mockExercises } from "@/lib/mock-data";

export type Split = "full_body" | "push_pull_legs" | "upper_lower" | "bro_split";

type DayPlan = { name: string; focus: string; muscles: MuscleGroup[] };

const SPLITS: Record<Split, Record<number, DayPlan[]>> = {
  full_body: {
    3: [
      { name: "Day A", focus: "Full body", muscles: ["pecho", "espalda", "piernas", "hombros", "abdomen"] },
      { name: "Day B", focus: "Full body", muscles: ["piernas", "espalda", "hombros", "biceps", "triceps"] },
      { name: "Day C", focus: "Full body", muscles: ["pecho", "piernas", "gluteos", "abdomen", "espalda"] },
    ],
  },
  push_pull_legs: {
    3: [
      { name: "Push", focus: "Chest, shoulders, triceps", muscles: ["pecho", "hombros", "triceps", "pecho", "hombros"] },
      { name: "Pull", focus: "Back, biceps", muscles: ["espalda", "espalda", "biceps", "biceps", "abdomen"] },
      { name: "Legs", focus: "Legs & glutes", muscles: ["piernas", "gluteos", "piernas", "gluteos", "abdomen"] },
    ],
    4: [
      { name: "Push", focus: "Chest, shoulders, triceps", muscles: ["pecho", "hombros", "triceps", "pecho", "hombros"] },
      { name: "Pull", focus: "Back, biceps", muscles: ["espalda", "espalda", "biceps", "biceps", "abdomen"] },
      { name: "Legs", focus: "Legs & glutes", muscles: ["piernas", "gluteos", "piernas", "gluteos", "abdomen"] },
      { name: "Upper", focus: "Chest, back, arms", muscles: ["pecho", "espalda", "hombros", "biceps", "triceps"] },
    ],
    6: [
      { name: "Push A", focus: "Chest focus", muscles: ["pecho", "pecho", "hombros", "triceps", "triceps"] },
      { name: "Pull A", focus: "Back width", muscles: ["espalda", "espalda", "biceps", "biceps", "abdomen"] },
      { name: "Legs A", focus: "Quad focus", muscles: ["piernas", "piernas", "gluteos", "abdomen", "piernas"] },
      { name: "Push B", focus: "Shoulder focus", muscles: ["hombros", "hombros", "pecho", "triceps", "triceps"] },
      { name: "Pull B", focus: "Back thickness", muscles: ["espalda", "espalda", "biceps", "abdomen", "espalda"] },
      { name: "Legs B", focus: "Glute & hamstring", muscles: ["gluteos", "piernas", "piernas", "gluteos", "abdomen"] },
    ],
  },
  upper_lower: {
    4: [
      { name: "Upper A", focus: "Chest & back", muscles: ["pecho", "espalda", "hombros", "biceps", "triceps"] },
      { name: "Lower A", focus: "Quad focus", muscles: ["piernas", "piernas", "gluteos", "abdomen", "piernas"] },
      { name: "Upper B", focus: "Shoulders & arms", muscles: ["hombros", "espalda", "pecho", "biceps", "triceps"] },
      { name: "Lower B", focus: "Glute & hamstring", muscles: ["gluteos", "piernas", "piernas", "gluteos", "abdomen"] },
    ],
  },
  bro_split: {
    5: [
      { name: "Chest", focus: "Chest", muscles: ["pecho", "pecho", "pecho", "hombros", "triceps"] },
      { name: "Back", focus: "Back", muscles: ["espalda", "espalda", "espalda", "biceps", "abdomen"] },
      { name: "Legs", focus: "Legs & glutes", muscles: ["piernas", "piernas", "gluteos", "gluteos", "abdomen"] },
      { name: "Shoulders", focus: "Shoulders", muscles: ["hombros", "hombros", "hombros", "triceps", "abdomen"] },
      { name: "Arms", focus: "Biceps & triceps", muscles: ["biceps", "triceps", "biceps", "triceps", "abdomen"] },
    ],
  },
};

function repsForGoal(goal?: string) {
  if (goal === "aumentar_fuerza") return "4-6";
  if (goal === "perder_grasa") return "12-15";
  if (goal === "ganar_masa_muscular" || goal === "recomposicion") return "8-12";
  return "8-12";
}

// Spread training days across the week so they land on sensible weekdays.
const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const WEEKDAY_PATTERNS: Record<number, number[]> = {
  1: [0],
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 4, 5],
  6: [0, 1, 2, 3, 4, 5],
  7: [0, 1, 2, 3, 4, 5, 6],
};
function pickWeekdays(count: number): string[] {
  const pattern = WEEKDAY_PATTERNS[count] ?? WEEKDAY_PATTERNS[3];
  return pattern.map((i) => WEEKDAYS[i]);
}

// Base day patterns per split. resolveTemplate cycles/extends these to match
// EXACTLY the requested number of days (3-6), so 5-day plans always work.
const BASE_DAYS: Record<Split, DayPlan[]> = {
  full_body: [
    { name: "Day A", focus: "Full body", muscles: ["pecho", "espalda", "piernas", "hombros", "abdomen"] },
    { name: "Day B", focus: "Full body", muscles: ["piernas", "espalda", "hombros", "biceps", "triceps"] },
    { name: "Day C", focus: "Full body", muscles: ["pecho", "piernas", "gluteos", "abdomen", "espalda"] },
    { name: "Day D", focus: "Full body", muscles: ["espalda", "pecho", "piernas", "hombros", "biceps"] },
  ],
  push_pull_legs: [
    { name: "Push", focus: "Chest, shoulders, triceps", muscles: ["pecho", "hombros", "triceps", "pecho", "hombros"] },
    { name: "Pull", focus: "Back, biceps", muscles: ["espalda", "espalda", "biceps", "biceps", "abdomen"] },
    { name: "Legs", focus: "Legs & glutes", muscles: ["piernas", "gluteos", "piernas", "gluteos", "abdomen"] },
  ],
  upper_lower: [
    { name: "Upper", focus: "Chest & back", muscles: ["pecho", "espalda", "hombros", "biceps", "triceps"] },
    { name: "Lower", focus: "Legs & glutes", muscles: ["piernas", "piernas", "gluteos", "abdomen", "gluteos"] },
  ],
  bro_split: [
    { name: "Chest", focus: "Chest", muscles: ["pecho", "pecho", "pecho", "hombros", "triceps"] },
    { name: "Back", focus: "Back", muscles: ["espalda", "espalda", "espalda", "biceps", "abdomen"] },
    { name: "Legs", focus: "Legs & glutes", muscles: ["piernas", "piernas", "gluteos", "gluteos", "abdomen"] },
    { name: "Shoulders", focus: "Shoulders", muscles: ["hombros", "hombros", "hombros", "triceps", "abdomen"] },
    { name: "Arms", focus: "Biceps & triceps", muscles: ["biceps", "triceps", "biceps", "triceps", "abdomen"] },
  ],
};

function resolveTemplate(split: Split, days: number): DayPlan[] {
  // Prefer an exact hand-tuned template if one exists.
  const exact = SPLITS[split]?.[days];
  if (exact) return exact;

  // Otherwise cycle the base pattern to reach the requested day count.
  const base = BASE_DAYS[split] ?? BASE_DAYS.full_body;
  const out: DayPlan[] = [];
  for (let i = 0; i < days; i++) {
    const b = base[i % base.length];
    // add a suffix when we wrap around so day names stay unique
    const round = Math.floor(i / base.length);
    out.push({
      name: round === 0 ? b.name : `${b.name} ${round + 1}`,
      focus: b.focus,
      muscles: b.muscles,
    });
  }
  return out;
}

async function loadExercises(): Promise<{ exercises: ExerciseRow[]; fromDb: boolean }> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return { exercises: mockExercises, fromDb: false };
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("exercises").select("*");
    if (data && data.length) return { exercises: data as ExerciseRow[], fromDb: true };
    return { exercises: mockExercises, fromDb: false };
  } catch {
    return { exercises: mockExercises, fromDb: false };
  }
}

export type BuiltRoutine = {
  name: string;
  split: Split;
  daysPerWeek: number;
  fromDb: boolean; // true when exercises came from the real DB (safe to save)
  days: {
    name: string;
    focus: string;
    exercises: {
      exerciseId: string;
      name: string;
      slug: string;
      sets: number;
      reps: string;
      restSeconds: number;
    }[];
  }[];
};

// Guarantees 4-5 exercises per day. Picks distinct exercises by muscle,
// prioritizing compounds, matching the user's equipment when possible.
export async function buildRoutine(opts: {
  split: Split;
  daysPerWeek: number;
  goal?: string;
  level?: string;
  equipment?: string[];
  name?: string;
}): Promise<BuiltRoutine> {
  const { exercises: allRaw, fromDb } = await loadExercises();
  const reps = repsForGoal(opts.goal);

  // Filter by the user's available equipment so a home user only gets home
  // exercises (bodyweight, dumbbells, bands) and a gym user gets everything.
  const equip = opts.equipment ?? [];
  const isHomeOnly = equip.length > 0 && equip.every((e) => ["casa", "peso_corporal", "mancuernas", "bandas"].includes(e));
  const matchesEquipment = (ex: ExerciseRow) => {
    if (equip.length === 0) return true; // no preference → all
    // an exercise fits if ANY of its equipment tags is available to the user,
    // or if it's bodyweight/home which needs nothing special.
    return ex.equipment.some((e) => equip.includes(e)) ||
      ex.equipment.some((e) => ["peso_corporal", "casa"].includes(e));
  };
  let all = allRaw.filter(matchesEquipment);
  // Safety: if filtering left too few to build a plan, fall back to all.
  if (all.length < 20) all = allRaw;

  // Get a template for the exact requested day count. If the split doesn't
  // have one, synthesize it by cycling a sensible base pattern so we ALWAYS
  // honor the number of days the user asked for (3-6).
  const template = resolveTemplate(opts.split, opts.daysPerWeek);

  const byMuscle = new Map<MuscleGroup, ExerciseRow[]>();
  for (const ex of all) {
    const arr = byMuscle.get(ex.main_muscle) ?? [];
    arr.push(ex);
    byMuscle.set(ex.main_muscle, arr);
  }
  // prioritize compounds & preferred equipment
  const rank = (ex: ExerciseRow) => {
    let score = 0;
    if (ex.mechanic === "Compuesto" || ex.mechanic === "Compound" || ex.mechanic === "compound") score -= 2;
    if (equip.length && ex.equipment.some((e) => equip.includes(e))) score -= 1;
    // for home-only users, prefer bodyweight/dumbbell over anything needing a rack
    if (isHomeOnly && ex.equipment.some((e) => ["peso_corporal", "casa", "mancuernas"].includes(e))) score -= 1;
    if (ex.difficulty === "avanzado" && opts.level === "principiante") score += 3;
    return score;
  };
  for (const [, arr] of byMuscle) arr.sort((a, b) => rank(a) - rank(b));

  // Track exercises used ACROSS the whole plan so no exercise repeats between
  // days (rotates through the pool). Reset per muscle only when exhausted.
  const usedGlobal = new Set<string>();
  const pickFromMuscle = (muscle: MuscleGroup): ExerciseRow | undefined => {
    const pool = byMuscle.get(muscle) ?? [];
    let pick = pool.find((e) => !usedGlobal.has(e.id));
    if (!pick && pool.length) {
      // pool exhausted for this muscle across the plan — allow reuse but
      // still avoid repeating within the same day (handled by usedToday).
      pick = pool[0];
    }
    return pick;
  };

  // Assign real weekdays (spaced across the week) instead of "Day A/B".
  // e.g. 3 days -> Mon/Wed/Fri, 4 -> Mon/Tue/Thu/Fri, etc.
  const weekdaySchedule = pickWeekdays(template.length);

  const days = template.map((day, dayIdx) => {
    const usedToday = new Set<string>();
    const exercises: BuiltRoutine["days"][number]["exercises"] = [];

    for (const muscle of day.muscles) {
      if (exercises.length >= 5) break;
      const pool = byMuscle.get(muscle) ?? [];
      // first choice: not used anywhere; fallback: not used today
      let pick = pool.find((e) => !usedGlobal.has(e.id) && !usedToday.has(e.id))
        ?? pool.find((e) => !usedToday.has(e.id));
      if (!pick) pick = pickFromMuscle(muscle);
      if (pick && !usedToday.has(pick.id)) {
        usedToday.add(pick.id);
        usedGlobal.add(pick.id);
        exercises.push({
          exerciseId: pick.id, name: pick.name, slug: pick.slug,
          sets: opts.goal === "aumentar_fuerza" ? 5 : 4,
          reps, restSeconds: opts.goal === "aumentar_fuerza" ? 150 : 90,
        });
      }
    }

    // Guarantee at least 4 exercises by backfilling from any unused exercise.
    if (exercises.length < 4) {
      for (const ex of all) {
        if (exercises.length >= 4) break;
        if (!usedToday.has(ex.id) && !usedGlobal.has(ex.id)) {
          usedToday.add(ex.id); usedGlobal.add(ex.id);
          exercises.push({ exerciseId: ex.id, name: ex.name, slug: ex.slug, sets: 4, reps, restSeconds: 90 });
        }
      }
    }
    // name = weekday (tab label); focus keeps the training focus + original label
    const focusLabel = day.name === day.focus ? day.focus : `${day.name} — ${day.focus}`;
    return { name: weekdaySchedule[dayIdx], focus: focusLabel, exercises: exercises.slice(0, 5) };
  });

  return {
    name: cleanPlanName(opts.name, opts.split),
    split: opts.split,
    daysPerWeek: opts.daysPerWeek,
    fromDb,
    days,
  };
}

export function splitLabel(s: Split) {
  return s === "push_pull_legs" ? "Push Pull Legs"
    : s === "upper_lower" ? "Upper / Lower"
    : s === "bro_split" ? "Body-part split"
    : "Full body";
}

// Produces a clean, English plan name. If the AI-provided name contains Spanish
// words, accents, or clutter (day counts, "casa", "gym"), we discard it and use
// the split label instead. Keeps names professional and consistent.
function cleanPlanName(raw: string | undefined, split: Split): string {
  const fallback = splitLabel(split);
  if (!raw) return fallback;
  let name = raw.trim();
  // Strip anything after a middot/dash version marker.
  name = name.replace(/\s*[·|\-–—].*$/g, "").trim();
  const spanishHint = /[áéíóúñ¿¡]|\b(d[íi]as?|casa|gym|masa|fuerza|rutina|piernas|espalda|pecho|semana|hombros)\b/i;
  // Reject if it has Spanish, is too long, or is empty after cleaning.
  if (!name || name.length < 3 || name.length > 30 || spanishHint.test(name)) {
    return fallback;
  }
  return name;
}

// Persist a built routine to Supabase as the user's active plan.
export async function saveRoutine(routine: BuiltRoutine): Promise<{ ok: boolean; error?: string }> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return { ok: false, error: "no_supabase" };
  // If the exercises didn't come from the real DB, saving would create empty
  // days (the mock IDs don't exist in the exercises table). Refuse clearly.
  if (!routine.fromDb) return { ok: false, error: "no_exercises" };
  try {
    const supabase = await createClient();
    const { user } = await getCurrentUser();
    if (!user) return { ok: false, error: "not_authenticated" };

    // Version number: count how many plans this user already has, +1.
    const { count: existing } = await supabase
      .from("routines")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    const version = (existing ?? 0) + 1;
    const versionedName = `${routine.name} · v${version}`;

    // deactivate previous
    await supabase.from("routines").update({ is_active: false }).eq("user_id", user.id);

    const goalMap: Record<Split, string> = {
      full_body: "full_body", push_pull_legs: "push_pull_legs",
      upper_lower: "torso_pierna", bro_split: "hipertrofia",
    };
    const { data: r, error: rErr } = await supabase.from("routines").insert({
      user_id: user.id, name: versionedName, goal: goalMap[routine.split],
      days_per_week: routine.daysPerWeek, is_active: true,
    }).select().single();
    if (rErr || !r) return { ok: false, error: rErr?.message };

    for (let i = 0; i < routine.days.length; i++) {
      const day = routine.days[i];
      const { data: d, error: dErr } = await supabase.from("routine_days").insert({
        routine_id: r.id, day_name: day.name, day_order: i + 1, focus: day.focus,
      }).select().single();
      if (dErr || !d) continue;
      await supabase.from("routine_exercises").insert(
        day.exercises.map((ex, idx) => ({
          routine_day_id: d.id, exercise_id: ex.exerciseId,
          sets: ex.sets, reps: ex.reps, rest_seconds: ex.restSeconds, order_index: idx,
        }))
      );
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
