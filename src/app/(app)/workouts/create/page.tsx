"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Sparkles, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { mockExercises, mockProfile } from "@/lib/mock-data";
import { generateAndSaveRoutine } from "@/app/(app)/workouts/actions";
import { RoutinePresets } from "@/components/workouts/routine-presets";
import { goalLabels } from "@/lib/labels";
import type { Goal, MuscleGroup } from "@/lib/types/database";

const ROUTINE_TYPES = [
  { value: "full_body", label: "Full body" },
  { value: "push_pull_legs", label: "Push Pull Legs" },
  { value: "torso_pierna", label: "Upper / lower" },
  { value: "hipertrofia", label: "Hypertrophy" },
  { value: "fuerza", label: "Strength" },
  { value: "perdida_grasa", label: "Fat loss" },
] as const;

// Módulo 8 — reglas simples para sugerir el rango de repeticiones según el objetivo.
function repRangeForGoal(goal: Goal) {
  if (goal === "aumentar_fuerza") return "3-6";
  if (goal === "perder_grasa") return "12-15";
  return "8-12";
}

const SPLIT_BY_DAYS: Record<number, { name: string; muscles: MuscleGroup[] }[]> = {
  3: [
    { name: "Full body A", muscles: ["pecho", "espalda", "piernas", "hombros", "abdomen"] },
    { name: "Full body B", muscles: ["piernas", "espalda", "hombros", "biceps", "triceps"] },
    { name: "Full body C", muscles: ["pecho", "piernas", "gluteos", "abdomen", "espalda"] },
  ],
  4: [
    { name: "Push", muscles: ["pecho", "hombros", "triceps", "pecho", "hombros"] },
    { name: "Pull", muscles: ["espalda", "espalda", "biceps", "biceps", "abdomen"] },
    { name: "Legs", muscles: ["piernas", "gluteos", "piernas", "gluteos", "abdomen"] },
    { name: "Core & cardio", muscles: ["abdomen", "cardio", "abdomen", "hombros", "espalda"] },
  ],
  5: [
    { name: "Chest", muscles: ["pecho", "pecho", "pecho", "hombros", "triceps"] },
    { name: "Back", muscles: ["espalda", "espalda", "espalda", "biceps", "abdomen"] },
    { name: "Legs", muscles: ["piernas", "piernas", "gluteos", "gluteos", "abdomen"] },
    { name: "Shoulders", muscles: ["hombros", "hombros", "hombros", "triceps", "abdomen"] },
    { name: "Core & cardio", muscles: ["abdomen", "cardio", "abdomen", "biceps", "triceps"] },
  ],
};

export default function CreateRoutinePage() {
  const router = useRouter();
  const [goal, setGoal] = useState<Goal>(mockProfile.goal);
  const [type, setType] = useState<(typeof ROUTINE_TYPES)[number]["value"]>("push_pull_legs");
  const [days, setDays] = useState(mockProfile.training_days || 4);
  const [saving, setSaving] = useState(false);

  const split = SPLIT_BY_DAYS[days] || SPLIT_BY_DAYS[4];
  const reps = repRangeForGoal(goal);

  const generatedDays = useMemo(() => {
    return split.map((day) => {
      const used = new Set<string>();
      const exercises = day.muscles
        .map((m) => mockExercises.find((e) => e.main_muscle === m && !used.has(e.id)))
        .filter((e): e is NonNullable<typeof e> => Boolean(e))
        .map((e) => {
          used.add(e.id);
          return e;
        });
      return { ...day, exercises };
    });
  }, [split]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await generateAndSaveRoutine({
        split: type,
        daysPerWeek: days,
        goal,
      });
      if (res.ok) {
        toast.success(`Plan saved with ${res.days} days, 4-5 exercises each.`);
        router.push("/workouts");
      } else if (res.error === "not_authenticated") {
        toast.error("Sign in with Supabase connected to save your plan.");
      } else if (res.error === "no_exercises") {
        toast.error("No exercises loaded yet. Run ejercicios_completo.sql in Supabase first.");
      } else {
        toast.error("Couldn't save the plan. Try again.");
      }
    } catch {
      toast.error("Something went wrong. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-6">
      <Link href="/workouts" className="hidden items-center gap-1.5 pt-2 text-sm font-semibold text-muted lg:flex">
        <ArrowLeft className="h-4 w-4" /> Workouts
      </Link>

      <div>
        <h1 className="font-display text-2xl font-extrabold">Create a plan</h1>
        <p className="mt-1 text-sm text-muted">
          Generate a recommended plan for your goal, or tune the parameters.
        </p>
      </div>

      <RoutinePresets />

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-2">Or customize</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Goal</p>
        <div className="flex flex-wrap gap-2">
          {(Object.entries(goalLabels) as [Goal, string][]).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setGoal(value)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
                goal === value ? "border-volt bg-volt text-volt-foreground" : "border-border bg-surface-2 text-muted"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Plan type</p>
        <div className="flex flex-wrap gap-2">
          {ROUTINE_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setType(t.value)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
                type === t.value ? "border-volt bg-volt text-volt-foreground" : "border-border bg-surface-2 text-muted"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Days per week</p>
        <div className="flex gap-2">
          {[3, 4, 5, 6].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={cn(
                "h-11 flex-1 rounded-2xl border text-sm font-bold transition-colors",
                days === d ? "border-volt bg-volt text-volt-foreground" : "border-border bg-surface-2 text-muted"
              )}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <Card className="border-volt/30 bg-volt/5">
        <CardContent className="flex items-start gap-3 p-4">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-volt" />
          <p className="text-sm">
            For your goal of <span className="font-semibold">{goalLabels[goal]}</span> we suggest{" "}
            <span className="font-score font-semibold">{reps} reps</span> per set.
          </p>
        </CardContent>
      </Card>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Preview</p>
        <div className="flex flex-col gap-3">
          {generatedDays.map((day) => (
            <Card key={day.name}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold">{day.name}</p>
                  <Badge variant="outline">{day.exercises.length} exercises</Badge>
                </div>
                <ul className="mt-2 flex flex-col gap-1">
                  {day.exercises.map((ex) => (
                    <li key={ex.id} className="flex items-center justify-between text-sm">
                      <span className="text-muted">{ex.name}</span>
                      <span className="font-score text-xs text-muted">{ex.recommended_sets}×{reps}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Button size="lg" onClick={handleSave} disabled={saving}>
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        Save as my active plan
      </Button>
    </div>
  );
}
