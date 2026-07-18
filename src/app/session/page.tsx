"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Check, Plus, Minus, ChevronLeft, ChevronRight, Info, TrendingUp, Repeat, Timer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { equipmentLabels } from "@/lib/labels";
import { defaultRestSeconds, clampRest, formatRest, REST_STEP_SECONDS } from "@/lib/rest";
import { calculatePlates, formatPlates } from "@/lib/plates";
import { ExerciseImage } from "@/components/exercises/exercise-image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { mockRoutineDays, mockExercises } from "@/lib/mock-data";
import { muscleLabels } from "@/lib/labels";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { saveSessionOrQueue } from "@/lib/offline-queue";

const REST_TIPS = [
  "Breathe deep and lower your heart rate before the next set.",
  "Keep your rest consistent for steady progress.",
  "Visualize the next set: tight form, full range.",
  "Sip water and reset your grip.",
  "Quality reps beat heavy sloppy ones.",
];

type SetLog = { weight: string; reps: string; rir: string; completed: boolean };

function getTodayDay() {
  const dow = new Date().getDay();
  return mockRoutineDays[dow % mockRoutineDays.length];
}

const REST_SECONDS_DEFAULT = 90;

/** How each RIR value feels. Shown when the user picks, so the number means
 *  something instead of being trivia they have to memorise. */
const RIR_OPTIONS: { value: string; label: string; color: string }[] = [
  { value: "4", label: "Light", color: "bg-info text-bg" },
  { value: "3", label: "Moderate", color: "bg-volt text-volt-foreground" },
  { value: "2", label: "Hard", color: "bg-warning text-bg" },
  { value: "1", label: "Very hard", color: "bg-coral text-coral-foreground" },
  { value: "0", label: "Max", color: "bg-danger text-white" },
];

const RIR_COLORS: Record<string, string> = Object.fromEntries(
  RIR_OPTIONS.map((o) => [o.value, o.color])
);

/** "8-12" -> "8". The plan gives a range; the log starts at its low end so the
 *  minus button has something to work with, and the row never has to render
 *  wide placeholder text like "8-12" inside a narrow number field. */
function startingReps(planned: string | null | undefined): string {
  if (!planned) return "";
  const first = String(planned).match(/\d+/);
  return first ? first[0] : "";
}

export default function ActiveWorkoutPage() {
  const router = useRouter();
  const [mockDay] = useState(getTodayDay);
  // Real routine day loaded from Supabase; until then we show the mock plan.
  const [realDay, setRealDay] = useState<{ focus: string; day_name: string; exercises: typeof mockDay.exercises } | null>(null);
  const day = realDay ?? mockDay;
  const [exercises, setExercises] = useState(mockDay.exercises);

  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [logs, setLogs] = useState<SetLog[][]>(() =>
    exercises.map((re) =>
      Array.from({ length: re.sets }, () => ({
        weight: re.suggested_weight_kg ? String(re.suggested_weight_kg) : "",
        reps: "",
        rir: "",
        completed: false,
      }))
    )
  );
  const [resting, setResting] = useState(false);
  const [showSwap, setShowSwap] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  /** Which set's RIR we are picking, if any. */
  const [rirPicker, setRirPicker] = useState<number | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [checkIn, setCheckIn] = useState<{ difficulty: number; energy: number; recovery: number }>({ difficulty: 0, energy: 0, recovery: 0 });
  const [startedAt] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  // Real exercise library for the Swap sheet (falls back to mock if offline).
  const [library, setLibrary] = useState<typeof mockExercises>([]);

  // When the real routine loads, replace the exercises and reset the logs.
  useEffect(() => {
    if (realDay) {
      setExercises(realDay.exercises);
      setLogs(realDay.exercises.map((re) =>
        Array.from({ length: re.sets }, () => ({
          weight: re.suggested_weight_kg ? String(re.suggested_weight_kg) : "",
          reps: startingReps(re.reps), rir: "", completed: false,
        }))
      ));
      setExerciseIndex(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realDay]);

  // Load the real active routine (today's day) and the exercise library from
  // Supabase. Falls back to the mock plan if nothing is configured or found.
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;
    let active = true;
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !active) return;

        // Real active routine → today's day (or first day).
        const { data: routine } = await supabase
          .from("routines").select("id").eq("user_id", user.id).eq("is_active", true)
          .order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (routine && active) {
          const { data: days } = await supabase
            .from("routine_days").select("id,day_name,day_order,focus")
            .eq("routine_id", routine.id).order("day_order", { ascending: true });
          if (days && days.length > 0) {
            const idx = new Date().getDay() % days.length;
            const chosen = days[idx];
            const { data: res } = await supabase
              .from("routine_exercises")
              .select("id,sets,reps,rest_seconds,suggested_weight_kg,order_index,exercise:exercises(id,name,slug,image_url,main_muscle,secondary_muscles,equipment,instructions,mechanic,type)")
              .eq("routine_day_id", chosen.id)
              .order("order_index", { ascending: true });
            const realExercises = (res ?? []).map((r) => ({
              id: r.id, sets: r.sets, reps: r.reps, rest_seconds: r.rest_seconds,
              suggested_weight_kg: r.suggested_weight_kg,
              exercise: Array.isArray(r.exercise) ? r.exercise[0] : r.exercise,
            })).filter((r) => r.exercise);
            if (realExercises.length > 0 && active) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              setRealDay({ focus: chosen.focus || chosen.day_name, day_name: chosen.day_name, exercises: realExercises as any });
            }
          }
        }

        // Real exercise library for Swap.
        const { data: allEx } = await supabase
          .from("exercises")
          .select("id,name,slug,image_url,main_muscle,secondary_muscles,equipment,instructions,mechanic,type")
          .limit(500);
        if (allEx && active) setLibrary(allEx as typeof mockExercises);
      } catch { /* fall back to mock */ }
    })();
    return () => { active = false; };
  }, []);

  const current = exercises[exerciseIndex];
  const currentLogs = logs[exerciseIndex];

  // Only barbell lifts get a plate breakdown. Telling someone which plates to
  // load on a dumbbell curl would be noise.
  const usesBarbell = (current?.exercise.equipment ?? []).some((e) =>
    /barbell|barra/i.test(e)
  );

  // Rest the user has adjusted for a given exercise, keyed by exercise id. Their
  // choice sticks for the rest of the session.
  const [restOverride, setRestOverride] = useState<Record<string, number>>({});

  /** The rest to use for an exercise: their choice, else the routine's, else a
   *  sensible default for that kind of movement. */
  function restFor(idx: number): number {
    const e = exercises[idx];
    if (!e) return REST_SECONDS_DEFAULT;
    const chosen = restOverride[e.exercise.id];
    if (chosen) return chosen;
    if (e.rest_seconds) return e.rest_seconds;
    return defaultRestSeconds(e.exercise as { mechanic?: string | null; main_muscle?: string | null; type?: string | null });
  }

  /** Nudge the rest up or down. Applies to the running countdown too, so the
   *  change is felt immediately rather than only on the next set. */
  function adjustRest(delta: number) {
    const e = exercises[exerciseIndex];
    if (!e) return;
    const next = clampRest(restFor(exerciseIndex) + delta);
    setRestOverride((prev) => ({ ...prev, [e.exercise.id]: next }));
    if (resting) setSecondsLeft((s) => Math.max(0, s + delta));
  }

  /** Add one more set, copying the last one's weight so it's ready to log. */
  function addSet() {
    setLogs((prev) => {
      const copy = prev.map((l) => [...l]);
      const last = copy[exerciseIndex].at(-1);
      copy[exerciseIndex].push({
        weight: last?.weight ?? "",
        reps: last?.reps ?? "",
        rir: "",
        completed: false,
      });
      return copy;
    });
  }

  /** Drop the last set. Never removes the only one, and never a completed one
   *  without the user noticing: we keep it simple and just take the last. */
  function removeSet() {
    setLogs((prev) => {
      if (prev[exerciseIndex].length <= 1) return prev;
      const copy = prev.map((l) => [...l]);
      copy[exerciseIndex].pop();
      return copy;
    });
  }

  // Coaching hint for the rest screen, based on the last completed set's effort
  // (RIR). Guides the user to add weight, hold, or ease off on the next set.
  const lastCompleted = [...currentLogs].reverse().find((s) => s.completed);
  let effortHint: string | null = null;
  if (lastCompleted && lastCompleted.rir) {
    const rir = parseFloat(lastCompleted.rir);
    if (!isNaN(rir)) {
      if (rir >= 4) effortHint = "That felt easy (4+ in reserve). Add a little weight next set.";
      else if (rir >= 2) effortHint = "Good effort. Keep the same weight and aim for the same reps or one more.";
      else if (rir >= 1) effortHint = "Tough set. Hold this weight, focus on clean reps.";
      else effortHint = "Near failure. Keep the weight or drop slightly to keep form tight.";
    }
  }

  // Fetch an auto-progression tip for the current exercise (best-effort).
  useEffect(() => {
    const exId = current?.exercise?.id;
    if (!exId) return;
    let active = true;
    fetch(`/api/exercises/progression?exerciseId=${exId}&reps=${encodeURIComponent(current.reps)}`)
      .then((r) => r.json())
      .then((d) => { if (active) setSuggestion(d.suggestion ?? null); })
      .catch(() => { if (active) setSuggestion(null); });
    return () => { active = false; };
  }, [current?.exercise?.id, current?.reps]);

  const totalSets = logs.reduce((sum, sets) => sum + sets.length, 0);
  const completedSets = logs.reduce((sum, sets) => sum + sets.filter((s) => s.completed).length, 0);

  // Cronómetro total de la sesión
  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(t);
  }, [startedAt]);

  // Temporizador de descanso
  useEffect(() => {
    if (!resting || secondsLeft <= 0) return;
    const t = setTimeout(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setResting(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearTimeout(t);
  }, [resting, secondsLeft]);

  function updateSet(setIdx: number, field: "weight" | "reps" | "rir", value: string) {
    setLogs((prev) => {
      const next = prev.map((arr) => [...arr]);
      next[exerciseIndex][setIdx] = { ...next[exerciseIndex][setIdx], [field]: value };
      return next;
    });
  }

  function completeSet(setIdx: number) {
    const justCompleted = !currentLogs[setIdx].completed;
    setLogs((prev) => {
      const next = prev.map((arr) => [...arr]);
      const wasCompleted = next[exerciseIndex][setIdx].completed;
      const set = next[exerciseIndex][setIdx];
      next[exerciseIndex][setIdx] = { ...set, completed: !wasCompleted };

      // When completing a set, pre-fill the NEXT set with the same weight and
      // reps as a starting point (only if that next set is still empty). This
      // saves typing and gives the user last set's numbers to beat or match.
      if (!wasCompleted) {
        const nextIdx = setIdx + 1;
        const nextSet = next[exerciseIndex][nextIdx];
        if (nextSet && !nextSet.completed && !nextSet.weight && !nextSet.reps) {
          next[exerciseIndex][nextIdx] = {
            ...nextSet,
            weight: set.weight,
            reps: set.reps,
          };
        }
      }
      return next;
    });
    if (justCompleted) {
      setSecondsLeft(restFor(exerciseIndex));
      setResting(true);
    }
  }

  function goToExercise(i: number) {
    setResting(false);
    setExerciseIndex(Math.max(0, Math.min(i, exercises.length - 1)));
  }

  // Swap the current exercise for an alternative that hits the same muscle,
  // keeping the same sets/reps target. Useful when a machine is taken.
  function swapExercise(newExercise: typeof current.exercise) {
    setExercises((prev) => {
      const next = [...prev];
      next[exerciseIndex] = { ...next[exerciseIndex], exercise: newExercise };
      return next;
    });
    setShowSwap(false);
    toast.success(`Swapped to ${newExercise.name}.`);
  }

  function finishWorkout() {
    // Show a quick check-in first (feeds the real Recovery score).
    setShowCheckIn(true);
  }

  function saveAndFinish() {
    const durationMinutes = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
    const totalVolume = logs.reduce(
      (sum, sets) =>
        sum +
        sets.reduce((s, set) => s + (set.completed ? (parseFloat(set.weight) || 0) * (parseFloat(set.reps) || 0) : 0), 0),
      0
    );
    const totalReps = logs.reduce(
      (sum, sets) => sum + sets.reduce((s, set) => s + (set.completed ? parseFloat(set.reps) || 0 : 0), 0),
      0
    );

    // Per-exercise volume (for the share-image chart).
    const exerciseVolumes = logs.map((sets) =>
      Math.round(sets.reduce((s, set) => s + (set.completed ? (parseFloat(set.weight) || 0) * (parseFloat(set.reps) || 0) : 0), 0))
    ).filter((v) => v > 0);

    const summary = {
      dayName: day.day_name,
      focus: day.focus,
      durationMinutes,
      totalVolume: Math.round(totalVolume),
      totalSets: completedSets,
      totalReps,
      exerciseCount: exercises.length,
      exerciseVolumes,
    };
    try {
      sessionStorage.setItem("gymtrack:lastSummary", JSON.stringify(summary));
    } catch {
      // sin sessionStorage; el resumen usará datos de respaldo
    }

    // Persist to Supabase (best-effort) so the AI coach can learn from it.
    const payload = {
      focus: day.focus,
      durationMinutes,
      totalVolume: Math.round(totalVolume),
      totalSets: completedSets,
      totalReps,
      // Post-workout check-in (scaled 1-5 → 1-10). Feeds the Recovery score.
      fatigue: (checkIn.difficulty || checkIn.energy || checkIn.recovery)
        ? {
            difficulty: checkIn.difficulty ? checkIn.difficulty * 2 : undefined,
            energy: checkIn.energy ? checkIn.energy * 2 : undefined,
            recovery: checkIn.recovery ? checkIn.recovery * 2 : undefined,
          }
        : undefined,
      logs: exercises.map((ex, i) => ({
        exerciseId: ex.exercise?.id,
        sets: logs[i].map((set) => ({
          weight: parseFloat(set.weight) || 0,
          reps: parseFloat(set.reps) || 0,
          rir: set.rir ? parseFloat(set.rir) : null,
          completed: set.completed,
        })),
      })),
    };
    // Save now, or queue it offline and sync later so gym dead-zones don't lose data.
    saveSessionOrQueue(payload).then((result) => {
      if (result && typeof result === "object" && "prs" in result && Array.isArray(result.prs) && result.prs.length > 0) {
        // Store PR names for the summary celebration.
        const prNames = (result.prs as { exerciseId: string; weight: number; reps: number }[])
          .map((pr) => {
            const ex = exercises.find((e) => e.exercise.id === pr.exerciseId);
            return ex ? `${ex.exercise.name} · ${pr.weight}kg × ${pr.reps}` : null;
          })
          .filter(Boolean);
        try { sessionStorage.setItem("gymtrack:lastPRs", JSON.stringify(prNames)); } catch { /* ignore */ }
      } else {
        try { sessionStorage.removeItem("gymtrack:lastPRs"); } catch { /* ignore */ }
      }
      if (result === false) {
        toast("Saved offline. It will sync when you're back online.");
      }
    });

    router.push("/session/summary");
  }

  const progressPct = (completedSets / totalSets) * 100;
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  const isLast = exerciseIndex === exercises.length - 1;
  const allDone = completedSets === totalSets;

  // For the pre-workout summary: unique muscles worked and a rough time estimate.
  const musclesWorked = [...new Set(exercises.flatMap((e) => [e.exercise.main_muscle, ...(e.exercise.secondary_muscles ?? [])]))];
  const estMinutes = Math.round(
    exercises.reduce((sum, e) => sum + e.sets * ((e.rest_seconds || REST_SECONDS_DEFAULT) + 40), 0) / 60
  );

  // Alternatives for the Swap sheet: same main muscle, from the real exercise
  // library (falls back to mock), excluding ones already in this workout.
  const exercisePool = library.length > 0 ? library : mockExercises;
  const inWorkoutIds = new Set(exercises.map((e) => e.exercise.id));
  const swapOptions = exercisePool.filter(
    (ex) => ex.main_muscle === current.exercise.main_muscle && !inWorkoutIds.has(ex.id)
  );

  // ---- Pre-workout summary screen (shown before the user starts) ----
  if (!started) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5">
        <div className="flex items-center justify-between py-3">
          <button onClick={() => router.back()} className="rounded-full p-1.5 text-muted hover:bg-surface-2" aria-label="Back">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <p className="font-display text-sm font-bold">Ready to train</p>
          <span className="w-8" />
        </div>

        <div className="mt-2">
          <span className="inline-block rounded-full bg-volt/15 px-3 py-1 text-xs font-semibold text-volt">Next workout</span>
          <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight">{day.focus}</h1>
        </div>

        {/* Quick stats */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-surface-2 p-3 text-center">
            <p className="font-score text-xl font-bold">{exercises.length}</p>
            <p className="text-[11px] text-muted">exercises</p>
          </div>
          <div className="rounded-2xl bg-surface-2 p-3 text-center">
            <p className="font-score text-xl font-bold">{totalSets}</p>
            <p className="text-[11px] text-muted">sets</p>
          </div>
          <div className="rounded-2xl bg-surface-2 p-3 text-center">
            <p className="font-score text-xl font-bold">~{estMinutes}</p>
            <p className="text-[11px] text-muted">minutes</p>
          </div>
        </div>

        {/* Muscles worked */}
        {musclesWorked.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Muscles worked</p>
            <div className="flex flex-wrap gap-2">
              {musclesWorked.map((m) => (
                <span key={m} className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium">
                  {muscleLabels[m] ?? m}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Exercise list */}
        <div className="mt-5 flex-1">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">The plan</p>
          <div className="flex flex-col gap-2">
            {exercises.map((e, i) => (
              <div key={e.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-2.5">
                <ExerciseImage src={e.exercise.image_url} alt={e.exercise.name} muscle={e.exercise.main_muscle} className="h-12 w-12 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{e.exercise.name}</p>
                  <p className="text-xs text-muted">{e.sets} sets · {e.reps} reps</p>
                </div>
                <span className="font-score text-xs text-muted-2">{i + 1}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="sticky bottom-0 bg-bg py-4">
          <Button size="lg" className="w-full pressable" onClick={() => setStarted(true)}>
            Start workout
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5">
      {/* Header */}
      <div className="flex items-center justify-between py-3">
        <button onClick={() => setShowExitConfirm(true)} className="rounded-full p-1.5 text-muted hover:bg-surface-2" aria-label="Exit">
          <X className="h-5 w-5" />
        </button>
        <div className="text-center">
          <p className="text-xs font-semibold text-muted">{day.focus}</p>
          <p className="font-score text-sm font-bold">{mm}:{ss}</p>
        </div>
        {/* Rest chip: the planned rest, counting down live once a set is done. */}
        <div
          className={
            "flex h-8 items-center gap-1.5 rounded-full px-2.5 transition-colors " +
            (resting ? "bg-volt/15 text-volt" : "bg-surface-2 text-muted")
          }
        >
          <Timer className="h-3.5 w-3.5" />
          <span className="font-score text-xs font-bold">
            {resting ? formatRest(secondsLeft) : formatRest(restFor(exerciseIndex))}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between px-1 pb-1">
        <span className="font-score text-[11px] text-muted-2">{completedSets}/{totalSets} sets</span>
      </div>
      <Progress value={progressPct} />

      {/* Exercise carousel: see what's done, what's next, and jump around. */}
      <div className="-mx-5 mt-4 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex gap-2">
          {exercises.map((ex, i) => {
            const done = logs[i].every((s) => s.completed);
            const active = i === exerciseIndex;
            return (
              <button
                key={ex.id}
                onClick={() => goToExercise(i)}
                aria-label={ex.exercise.name}
                aria-current={active}
                className={
                  "relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-2 transition-all " +
                  (active
                    ? "border-volt scale-105"
                    : done
                      ? "border-volt/30 opacity-60"
                      : "border-border opacity-80")
                }
              >
                <ExerciseImage
                  src={ex.exercise.image_url}
                  alt={ex.exercise.name}
                  muscle={ex.exercise.main_muscle}
                  className="h-full w-full"
                />
                {done && !active && (
                  <span className="absolute inset-0 flex items-center justify-center bg-bg/60">
                    <Check className="h-5 w-5 text-volt" strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Exercise */}
      <div className="mt-4 flex-1">
        <ExerciseImage
          src={current.exercise.image_url}
          alt={current.exercise.name}
          muscle={current.exercise.main_muscle}
          className="h-44 w-full rounded-3xl"
        />
        <div className="mt-4 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-muted">Exercise {exerciseIndex + 1} of {exercises.length}</p>
            <h1 className="font-display text-2xl font-extrabold leading-tight">{current.exercise.name}</h1>
            {current.exercise.equipment?.length > 0 && (
              <p className="mt-0.5 text-sm text-muted">
                {current.exercise.equipment
                  .slice(0, 2)
                  .map((e) => equipmentLabels[e as keyof typeof equipmentLabels] ?? e)
                  .join(" · ")}
              </p>
            )}
          </div>
          <div className="mt-1 flex shrink-0 gap-2">
            <button
              onClick={() => setShowSwap(true)}
              className="flex h-9 items-center gap-1 rounded-full bg-surface-2 px-3 text-xs font-semibold text-muted"
              aria-label="Swap exercise"
            >
              <Repeat className="h-4 w-4" /> Swap
            </button>
            <button
              onClick={() => setShowInfo(true)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-muted"
              aria-label="Show instructions"
            >
              <Info className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Badge variant="outline">Target: {current.reps} reps</Badge>
          <Badge variant="default">{currentLogs.length} sets</Badge>
        </div>
        {suggestion && (
          <div className="mt-3 flex items-start gap-2 rounded-2xl border border-volt/25 bg-volt/5 p-3">
            <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-volt" />
            <p className="text-sm">{suggestion}</p>
          </div>
        )}

        {/* Rest timer */}
        {resting && (
          <div className="mt-4 rounded-2xl border border-volt/30 bg-volt/10 px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-volt">Resting</p>
                <p className="font-score text-3xl font-bold">{formatRest(secondsLeft)}</p>
              </div>
              {/* 44px targets: this gets tapped with sweaty hands, mid-set. */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => adjustRest(-REST_STEP_SECONDS)}
                  aria-label="Rest 10 seconds less"
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-muted active:scale-95"
                >
                  <Minus className="h-5 w-5" />
                </button>
                <button
                  onClick={() => adjustRest(REST_STEP_SECONDS)}
                  aria-label="Rest 10 seconds more"
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-muted active:scale-95"
                >
                  <Plus className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setResting(false)}
                  className="flex h-11 items-center rounded-full bg-surface-2 px-4 text-sm font-semibold text-muted active:scale-95"
                >
                  Skip
                </button>
              </div>
            </div>
            <div className="mt-3 border-t border-volt/20 pt-3">
              <p className="text-xs text-muted">
                <span className="font-semibold text-foreground">Up next:</span>{" "}
                {currentLogs.some((s) => !s.completed)
                  ? `Set ${currentLogs.findIndex((s) => !s.completed) + 1} of ${current.exercise.name}`
                  : exerciseIndex < exercises.length - 1
                    ? exercises[exerciseIndex + 1].exercise.name
                    : "Last set, finish strong!"}
              </p>
              <p className="mt-1 text-xs italic text-muted">{REST_TIPS[secondsLeft % REST_TIPS.length]}</p>
              {effortHint && (
                <p className="mt-2 flex items-start gap-1.5 rounded-xl bg-volt/10 p-2 text-xs text-foreground">
                  <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-volt" />
                  {effortHint}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Sets */}
        <div className="mt-4 flex flex-col gap-2">
          <div className="grid grid-cols-[1.5rem_1fr_1fr_3rem_3rem] items-center gap-2 px-1 text-xs font-semibold text-muted">
            <span>#</span>
            <span className="text-center">KG <span className="font-normal text-muted-2">bar + plates</span></span>
            <span className="text-center">Reps</span>
            <span className="text-center">RIR</span>
            <span />
          </div>
          {currentLogs.map((set, idx) => {
            const load = usesBarbell ? calculatePlates(Number(set.weight)) : null;
            const plates = load && !load.belowBar ? formatPlates(load.perSide) : "";
            return (
              <div
                key={idx}
                className={
                  "rounded-2xl border p-2 transition-colors " +
                  (set.completed ? "border-volt/40 bg-volt/5" : "border-border bg-surface")
                }
              >
                <div className="grid grid-cols-[1.5rem_1fr_1fr_3rem_3rem] items-center gap-2">
                  <span className="font-score text-center text-sm font-bold text-muted">{idx + 1}</span>
                  <SetInput value={set.weight} onChange={(v) => updateSet(idx, "weight", v)} />
                  <SetInput value={set.reps} onChange={(v) => updateSet(idx, "reps", v)} />
                  {/* RIR is picked, not typed: no keyboard, no stray digits, and
                      the meaning of each number is shown when you tap. */}
                  <button
                    onClick={() => setRirPicker(idx)}
                    aria-label="Reps in reserve"
                    className={
                      "flex h-11 w-full items-center justify-center rounded-xl text-base font-bold active:scale-95 " +
                      (set.rir ? RIR_COLORS[set.rir] ?? "bg-surface-3 text-foreground" : "bg-surface-2 text-muted-2")
                    }
                  >
                    {set.rir || "–"}
                  </button>
                  <button
                    onClick={() => completeSet(idx)}
                    className={
                      "flex h-11 w-10 items-center justify-center rounded-xl transition-colors active:scale-95 " +
                      (set.completed ? "bg-volt text-volt-foreground" : "bg-surface-2 text-muted")
                    }
                    aria-label="Complete set"
                  >
                    <Check className="h-5 w-5" strokeWidth={2.5} />
                  </button>
                </div>
                {/* What to actually put on the bar, per side. */}
                {plates && (
                  <p className="mt-1 pl-8 text-[11px] text-muted-2">
                    {plates} per side
                    {load && load.remainder > 0 && ` · ${load.achieved}kg with these plates`}
                  </p>
                )}
              </div>
            );
          })}

          {/* Add or drop a set, like the − / + in a real logbook. */}
          <div className="mt-1 flex gap-2">
            <button
              onClick={removeSet}
              disabled={currentLogs.length <= 1}
              className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-surface-2 text-sm font-semibold text-muted active:scale-[0.98] disabled:opacity-40"
            >
              <Minus className="h-4 w-4" /> Remove set
            </button>
            <button
              onClick={addSet}
              className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-surface-2 text-sm font-semibold text-muted active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" /> Add set
            </button>
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="sticky bottom-0 flex gap-2 bg-bg py-4">
        {exerciseIndex > 0 && (
          <Button variant="secondary" size="lg" onClick={() => goToExercise(exerciseIndex - 1)} className="shrink-0">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
        {!isLast ? (
          <Button size="lg" className="flex-1" onClick={() => goToExercise(exerciseIndex + 1)}>
            Next exercise <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button size="lg" className="flex-1" onClick={finishWorkout}>
            {allDone ? "Finish workout" : "Finish anyway"}
          </Button>
        )}
      </div>

      {/* Instructions sheet */}
      <Sheet open={showInfo} onOpenChange={setShowInfo}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{current.exercise.name}</SheetTitle>
          </SheetHeader>

          <ol className="flex flex-col gap-2">
            {current.exercise.instructions.map((step, i) => (
              <li key={i} className="flex gap-3 rounded-2xl border border-border bg-surface-2 p-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface font-score text-xs font-bold text-volt">
                  {i + 1}
                </span>
                <p className="text-sm">{step}</p>
              </li>
            ))}
          </ol>
        </SheetContent>
      </Sheet>

      {/* Swap exercise sheet */}
      <Sheet open={showSwap} onOpenChange={setShowSwap}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Swap exercise</SheetTitle>
          </SheetHeader>
          <p className="mb-3 text-sm text-muted">
            Replace {current.exercise.name} with another {muscleLabels[current.exercise.main_muscle] ?? "exercise"} movement. Your sets and reps stay the same.
          </p>
          <div className="flex flex-col gap-2">
            {swapOptions.length === 0 ? (
              <p className="text-sm text-muted-2">No alternatives found for this muscle.</p>
            ) : (
              swapOptions.map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => swapExercise(ex)}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-2.5 text-left pressable"
                >
                  <ExerciseImage src={ex.image_url} alt={ex.name} muscle={ex.main_muscle} className="h-11 w-11 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{ex.name}</p>
                    <p className="text-xs text-muted">{ex.equipment?.[0] ?? "Bodyweight"}</p>
                  </div>
                  <Repeat className="h-4 w-4 text-muted-2" />
                </button>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Post-workout check-in (feeds the Recovery fitness score) */}
      <Sheet open={showCheckIn} onOpenChange={setShowCheckIn}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>How did that feel?</SheetTitle>
          </SheetHeader>
          <p className="mb-4 text-sm text-muted">Quick check-in. It helps track your recovery and tune your plan. You can skip it.</p>
          <div className="flex flex-col gap-5">
            <ScaleRow label="How hard was it?" lowLabel="Easy" highLabel="Brutal" value={checkIn.difficulty} onChange={(v) => setCheckIn((c) => ({ ...c, difficulty: v }))} />
            <ScaleRow label="Energy level" lowLabel="Drained" highLabel="Great" value={checkIn.energy} onChange={(v) => setCheckIn((c) => ({ ...c, energy: v }))} />
            <ScaleRow label="How recovered do you feel?" lowLabel="Sore" highLabel="Fresh" value={checkIn.recovery} onChange={(v) => setCheckIn((c) => ({ ...c, recovery: v }))} />
          </div>
          <div className="mt-6 flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={saveAndFinish}>Skip</Button>
            <Button className="flex-1 pressable" onClick={saveAndFinish}>Save & finish</Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={rirPicker !== null} onOpenChange={(o) => !o && setRirPicker(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>How many more reps could you have done?</SheetTitle>
          </SheetHeader>
          <div className="mt-4 flex flex-col gap-2 pb-4">
            {RIR_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => {
                  if (rirPicker !== null) updateSet(rirPicker, "rir", o.value);
                  setRirPicker(null);
                }}
                className="flex h-14 items-center gap-3 rounded-2xl bg-surface-2 px-3 active:scale-[0.98]"
              >
                <span className={"flex h-10 w-10 items-center justify-center rounded-full text-base font-bold " + o.color}>
                  {o.value === "4" ? "4+" : o.value}
                </span>
                <span className="text-left">
                  <span className="block text-sm font-semibold">{o.label}</span>
                  <span className="block text-xs text-muted">
                    {o.value === "0" ? "Nothing left in the tank" : `${o.value}${o.value === "4" ? " or more" : ""} more rep${o.value === "1" ? "" : "s"} in reserve`}
                  </span>
                </span>
              </button>
            ))}
            <button
              onClick={() => { if (rirPicker !== null) updateSet(rirPicker, "rir", ""); setRirPicker(null); }}
              className="mt-1 h-12 rounded-2xl text-sm font-semibold text-muted"
            >
              Skip, I'm not sure
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave this workout?</DialogTitle>
            <DialogDescription>You&apos;ll lose this session&apos;s progress if you leave now.</DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setShowExitConfirm(false)}>
              Keep training
            </Button>
            <Button variant="destructive" className="flex-1" onClick={() => router.push("/home")}>
              Leave
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SetInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  // Just a field. People type the number, no plus/minus dance. Big, centred,
  // and it opens the number pad on phones.
  return (
    <input
      inputMode="decimal"
      value={value}
      placeholder={placeholder || "0"}
      onChange={(e) => onChange(e.target.value)}
      className="font-score h-12 w-full min-w-0 rounded-xl bg-surface-2 text-center text-lg font-bold outline-none placeholder:text-muted-2 focus:ring-2 focus:ring-volt/40"
    />
  );
}

// A 1-to-5 scale selector for the post-workout check-in. 0 means "not answered".
function ScaleRow({
  label, lowLabel, highLabel, value, onChange,
}: {
  label: string; lowLabel: string; highLabel: string;
  value: number; onChange: (v: number) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold">{label}</p>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => onChange(n === value ? 0 : n)}
            className={
              "flex h-11 flex-1 items-center justify-center rounded-xl text-sm font-bold transition-colors " +
              (value === n ? "bg-volt text-volt-foreground" : "bg-surface-2 text-muted")
            }
          >
            {n}
          </button>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-muted-2">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}
