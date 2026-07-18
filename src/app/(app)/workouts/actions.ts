"use server";

import { buildRoutine, saveRoutine, type Split } from "@/lib/ai/routine-builder";
import { getCurrentProfile } from "@/lib/data";
import { revalidatePath } from "next/cache";

// The create screen offers goal-flavored types; map them to real splits.
const TYPE_TO_SPLIT: Record<string, Split> = {
  full_body: "full_body",
  push_pull_legs: "push_pull_legs",
  torso_pierna: "upper_lower",
  upper_lower: "upper_lower",
  hipertrofia: "bro_split",
  fuerza: "push_pull_legs",
  perdida_grasa: "full_body",
  bro_split: "bro_split",
};

// Generates a routine with 4-5 exercises/day and saves it as the active plan.
export async function generateAndSaveRoutine(input: {
  split: string;
  daysPerWeek: number;
  goal?: string;
  name?: string;
}): Promise<{ ok: boolean; error?: string; days?: number }> {
  try {
    const profile = await getCurrentProfile();
    const split = TYPE_TO_SPLIT[input.split] ?? "push_pull_legs";
    const daysPerWeek = Math.min(6, Math.max(3, input.daysPerWeek));
    const routine = await buildRoutine({
      split,
      daysPerWeek,
      goal: input.goal ?? (profile as { goal?: string } | null)?.goal,
      level: (profile as { level?: string } | null)?.level,
      equipment: (profile as { equipment_available?: string[] } | null)?.equipment_available ?? [],
      name: input.name,
    });
    const saved = await saveRoutine(routine);
    if (!saved.ok) return { ok: false, error: saved.error };
    revalidatePath("/workouts");
    revalidatePath("/home");
    return { ok: true, days: routine.days.length };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
