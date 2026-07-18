import { Card, CardContent } from "@/components/ui/card";
import { getFitnessScore } from "@/lib/fitness-score";
import { Activity, TrendingUp } from "lucide-react";

// Server component: computes the score from real data. Shows an empty state
// when there isn't enough data yet (never invents numbers).
export async function FitnessScoreCard() {
  const score = await getFitnessScore();

  if (!score.hasEnoughData) {
    return (
      <Card className="animate-fade-up">
        <CardContent className="flex items-center gap-3 p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-muted">
            <Activity className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Fitness score</p>
            <p className="mt-0.5 text-sm text-muted">Not enough data yet — log a few workouts and meals to unlock it.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const bars: [string, number][] = [
    ["Strength", score.breakdown.strength],
    ["Consistency", score.breakdown.consistency],
    ["Nutrition", score.breakdown.nutrition],
    ["Recovery", score.breakdown.recovery],
  ];

  // Actionable tip for whichever component is holding the score back the most.
  const TIPS: Record<string, string> = {
    Strength: "Add a little weight or one more rep when a set feels easy. Progressive overload is what moves this up.",
    Consistency: "Complete your planned workouts in the app this week. Even short sessions count.",
    Nutrition: "Aim for more protein, around 1.6g per kg of bodyweight. Log your meals so this reflects reality.",
    Recovery: "Fill in the quick check-in after each workout, and prioritize sleep on rest days.",
  };
  const lowest = [...bars].sort((a, b) => a[1] - b[1])[0];
  const tip = lowest && lowest[1] < 70 ? TIPS[lowest[0]] : null;

  return (
    <Card className="animate-fade-up">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Fitness score</p>
          <span className="font-score text-3xl font-bold text-volt">{score.total}</span>
        </div>
        <p className="mt-1 text-sm text-muted">{score.note}</p>
        <div className="mt-4 space-y-2.5">
          {bars.map(([label, val]) => (
            <div key={label}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-muted">{label}</span>
                <span className="font-score">{val}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                <div className="h-full rounded-full bg-volt transition-all" style={{ width: `${val}%` }} />
              </div>
            </div>
          ))}
        </div>
        {tip && (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-volt/10 p-3">
            <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-volt" />
            <p className="text-xs text-foreground"><span className="font-semibold">To raise your {lowest[0].toLowerCase()}:</span> {tip}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
