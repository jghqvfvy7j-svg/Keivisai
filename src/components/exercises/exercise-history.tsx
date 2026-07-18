import { Card, CardContent } from "@/components/ui/card";
import { Trophy, TrendingUp } from "lucide-react";
import { getExerciseHistory } from "@/lib/data";
import { ExerciseProgressChart } from "./exercise-progress-chart";

// Server component: shows the user's real logged history + PR for an exercise.
// Renders nothing distracting when there's no history yet.
export async function ExerciseHistory({ exerciseId }: { exerciseId: string }) {
  const { history, pr } = await getExerciseHistory(exerciseId);

  if (history.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-muted">
            <TrendingUp className="h-4 w-4" />
          </span>
          <p className="text-sm text-muted">
            No history yet. Log this exercise in a workout and your progression will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {pr && (
        <Card className="border-volt/30 bg-volt/5">
          <CardContent className="flex items-center gap-3 p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-volt/15 text-volt">
              <Trophy className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Personal record</p>
              <p className="font-score text-lg font-bold">
                {pr.weight} kg × {pr.reps}
              </p>
              <p className="text-xs text-muted">Est. 1RM ≈ {pr.estimated1RM} kg · {pr.date}</p>
            </div>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardContent className="p-5">
          <p className="font-display text-sm font-bold">Top set over time</p>
          <ExerciseProgressChart data={history} />
        </CardContent>
      </Card>
    </div>
  );
}
