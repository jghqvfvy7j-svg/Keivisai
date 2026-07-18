import Link from "next/link";
import { Plus, Play, Clock, Dumbbell , Check} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DayTabs } from "@/components/workouts/day-tabs";
import { CachePlan } from "@/components/workouts/cache-plan";
import { ExerciseImage } from "@/components/exercises/exercise-image";
import { getActiveRoutine, getCompletedDaysThisWeek } from "@/lib/data";
import { splitLabel } from "@/lib/ai/routine-builder";
import type { MuscleGroup } from "@/lib/types/database";

export const dynamic = "force-dynamic";

const GOAL_TO_SPLIT: Record<string, string> = {
  full_body: "full_body", push_pull_legs: "push_pull_legs",
  torso_pierna: "upper_lower", hipertrofia: "bro_split",
};

export default async function RoutinePage() {
  const real = await getActiveRoutine();
  const completed = await getCompletedDaysThisWeek();

  // Use ONLY the real active plan. No mock fallback for signed-in users.
  const routine = real
    ? { name: real.name, days_per_week: real.days_per_week, goal: real.goal }
    : null;

  const days = real?.days ?? [];

  // Mark each day done if its focus matches a completed session this week, and
  // find the first not-yet-done day so we can highlight "next up".
  const dayStatus = days.map((d) => ({
    id: d.id,
    done: completed.focuses.includes((d.focus ?? "").toLowerCase().trim()),
  }));
  const nextDayId = dayStatus.find((d) => !d.done)?.id ?? days[0]?.id;
  const doneById = new Map(dayStatus.map((d) => [d.id, d.done]));

  // No active plan yet → clean empty state (no mock, no leaked data).
  if (!routine) {
    return (
      <div className="flex flex-col gap-5">
        <div className="pt-2">
          <h1 className="font-display text-2xl font-extrabold">Workouts</h1>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-2">
              <Plus className="h-6 w-6 text-muted" />
            </span>
            <p className="font-display text-base font-semibold">No active plan yet</p>
            <p className="max-w-xs text-sm text-muted">
              Create your first plan, or ask the Coach to build one, and it&apos;ll appear
              here with 4 to 5 exercises per day.
            </p>
            <Button asChild className="mt-1">
              <Link href="/workouts/create">Create a plan</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const splitBadge = splitLabel((GOAL_TO_SPLIT[routine.goal] ?? "push_pull_legs") as never);

  return (
    <div className="flex flex-col gap-5">
      {/* Cache the active plan on-device so /offline can show it with no signal.
          Pure side-effect; does not change what renders here. */}
      <CachePlan
        plan={{
          name: routine.name,
          daysPerWeek: routine.days_per_week,
          savedAt: new Date().toISOString(),
          days: days.map((d) => ({
            dayName: d.day_name,
            focus: d.focus ?? "",
            exercises: d.exercises.map((re) => ({
              name: re.exercise.name,
              muscle: String(re.exercise.main_muscle ?? ""),
              sets: re.sets,
              reps: String(re.reps),
              weightKg: re.suggested_weight_kg ?? null,
              restSeconds: re.rest_seconds,
            })),
          })),
        }}
      />
      <div className="flex items-center justify-between pt-2">
        <div>
          <p className="text-sm text-muted">Active plan</p>
          <h1 className="font-display text-2xl font-extrabold">{routine.name}</h1>
        </div>
        <Button asChild variant="secondary" size="icon">
          <Link href="/workouts/create" aria-label="Create new plan">
            <Plus className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="volt">{routine.days_per_week} days / week</Badge>
        <Badge variant="outline">{splitBadge}</Badge>
      </div>

      {completed.count > 0 && (
        <p className="text-xs text-muted">
          {completed.count} {completed.count === 1 ? "session" : "sessions"} done this week. Next up is highlighted below.
        </p>
      )}

      <DayTabs days={days.map((d) => ({ id: d.id, day_name: d.day_name }))} fallbackValue={nextDayId}>
        <TabsList className="w-full overflow-x-auto no-scrollbar">
          {days.map((day) => {
            const isDone = doneById.get(day.id);
            const isNext = day.id === nextDayId;
            return (
              <TabsTrigger
                key={day.id}
                value={day.id}
                className={`flex-1 items-center gap-1 whitespace-nowrap ${isNext ? "text-volt" : ""}`}
              >
                {isDone && <Check className="h-3 w-3 text-volt" />}
                {day.day_name}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {days.map((day) => (
          <TabsContent key={day.id} value={day.id}>
            <Card className="mb-4 bg-surface-2">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-semibold">{day.focus}</p>
                  <p className="text-xs text-muted">
                    {doneById.get(day.id) ? "Completed this week" : `${day.exercises.length} exercises`}
                  </p>
                </div>
                <Button asChild variant={doneById.get(day.id) ? "secondary" : "primary"}>
                  <Link href="/session">
                    <Play className="h-4 w-4" /> {doneById.get(day.id) ? "Repeat" : "Start"}
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-3">
              {day.exercises.length === 0 && (
                <Card>
                  <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
                    <Dumbbell className="h-6 w-6 text-muted-2" />
                    <p className="text-sm font-semibold">No exercises in this day yet</p>
                    <p className="text-xs text-muted">
                      Load the exercise library in Supabase (ejercicios_completo.sql),
                      then create a new plan and it&apos;ll fill with 4 to 5 exercises per day.
                    </p>
                    <Button asChild size="sm" variant="secondary" className="mt-1">
                      <Link href="/workouts/create">Create a new plan</Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
              {day.exercises.map((re) => (
                <Link key={re.id} href={`/library/${re.exercise.slug}`}>
                  <Card className="transition-colors hover:border-volt/40">
                    <CardContent className="flex items-center gap-3 p-4">
                      <ExerciseImage
                        src={re.exercise.image_url}
                        alt={re.exercise.name}
                        muscle={re.exercise.main_muscle as MuscleGroup}
                        className="h-12 w-12 shrink-0 rounded-xl"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{re.exercise.name}</p>
                        <p className="font-score text-xs text-muted">
                          {re.sets} sets × {re.reps}
                          {re.suggested_weight_kg ? ` · ${re.suggested_weight_kg} kg` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted">
                        <Clock className="h-3.5 w-3.5" /> {re.rest_seconds}s
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </TabsContent>
        ))}
      </DayTabs>
    </div>
  );
}
