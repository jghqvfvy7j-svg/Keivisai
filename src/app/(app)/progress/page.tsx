import Link from "next/link";
import { TrendingDown, TrendingUp, LineChart, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShareProgress } from "@/components/progress/share-progress";
import { RecentSessions } from "@/components/progress/recent-sessions";
import { WeeklyRecap } from "@/components/progress/weekly-recap";
import { TrainingCalendar } from "@/components/progress/training-calendar";
import { BodyWeightChart } from "@/components/progress/body-weight-chart";
import { WeeklyVolumeChart } from "@/components/dashboard/weekly-volume-chart";
import { getProgressData, getHomeStats, getRecentSessions, getWeekNutrition } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const [data, stats, recentSessions, week] = await Promise.all([
    getProgressData(), getHomeStats(), getRecentSessions(8), getWeekNutrition(),
  ]);

  // The weekly recap wants an average per day, not today's total. It was being
  // handed today's calories, which made a light day look like a light week.
  const loggedDays = week.filter((d) => Number(d.calories) > 0);
  const caloriesAvg = loggedDays.length
    ? Math.round(loggedDays.reduce((sum, d) => sum + Number(d.calories), 0) / loggedDays.length)
    : 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between pt-2">
        <div>
          <h1 className="font-display text-2xl font-extrabold">Progress</h1>
          <p className="mt-1 text-sm text-muted">What your numbers mean, not just charts.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {data.hasData && (
            <ShareProgress
              streak={stats.streakDays}
              sessions={stats.sessionsThisWeek}
              volume={stats.weekVolume}
            />
          )}
          <Button asChild size="sm" variant="secondary" className="pressable shrink-0">
            <Link href="/body">
              <Plus className="h-4 w-4" /> Log weight
            </Link>
          </Button>
        </div>
      </div>

      {/* Training calendar always shows — real workout days, even when empty. */}
      <TrainingCalendar />

      {!data.hasData ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-2">
              <LineChart className="h-6 w-6 text-muted" />
            </span>
            <p className="font-display text-base font-semibold">No progress data yet</p>
            <p className="max-w-xs text-sm text-muted">
              Complete a few workouts and log your body weight. Your volume trends,
              weight chart and stats will build up here automatically.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <WeeklyRecap
            workouts={stats.sessionsThisWeek}
            volume={stats.weekVolume}
            streak={stats.streakDays}
            caloriesAvg={caloriesAvg}
          />
          {data.weekDelta !== null && (
            <Card className={data.weekDelta >= 0 ? "border-volt/30 bg-volt/5" : "border-coral/30 bg-coral/5"}>
              <CardContent className="flex items-center gap-3 p-4">
                {data.weekDelta >= 0 ? (
                  <TrendingUp className="h-5 w-5 shrink-0 text-volt" />
                ) : (
                  <TrendingDown className="h-5 w-5 shrink-0 text-coral" />
                )}
                <p className="text-sm">
                  Volume <span className="font-score font-semibold">{data.weekDelta >= 0 ? "+" : ""}{data.weekDelta}%</span> vs last week
                </p>
              </CardContent>
            </Card>
          )}

          {data.bodyWeight.length > 0 && (
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="font-display text-sm font-bold">Body weight</p>
                  {data.latestWeight && (
                    <span className="font-score text-sm font-bold text-volt">{data.latestWeight} kg</span>
                  )}
                </div>
                <BodyWeightChart data={data.bodyWeight} />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-5">
              <p className="font-display text-sm font-bold">Weekly volume</p>
              <WeeklyVolumeChart data={data.weeklyVolume} />
            </CardContent>
          </Card>

          <RecentSessions sessions={recentSessions} />
        </>
      )}
    </div>
  );
}
