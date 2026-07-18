import Link from "next/link";
import { Suspense } from "react";
import {
  Play, ChevronRight, Flame, Droplets, Trophy, Sparkles, Scale,
  Dumbbell, Calendar, TrendingUp, TrendingDown, Zap, Target, Battery,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ReadinessRing } from "@/components/dashboard/readiness-ring";
import { CountUp } from "@/components/ui/count-up";
import { WeeklyVolumeChart } from "@/components/dashboard/weekly-volume-chart";
import { TodayMacros } from "@/components/dashboard/today-macros";
import { FitnessScoreCard } from "@/components/dashboard/fitness-score-card";
import { ExerciseImage } from "@/components/exercises/exercise-image";
import { getProfile, getHomeStats, getActiveRoutine, getProfileCompletion, displayName } from "@/lib/data";
import { Greeting } from "@/components/dashboard/greeting";
import { ProfileCompletionCard } from "@/components/dashboard/profile-completion";
import { QuickWeightLog } from "@/components/dashboard/quick-weight-log";
import { computeNutritionGoal } from "@/lib/nutrition-targets";
import { goalLabels } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [profile, stats, routine] = await Promise.all([
    getProfile(),
    getHomeStats(),
    getActiveRoutine(),
  ]);

  const completion = getProfileCompletion(profile);

  // Today's focus comes from the user's real active plan; if none, no card.
  const dow = new Date().getDay();
  const today = routine && routine.days.length > 0
    ? routine.days[dow % routine.days.length]
    : null;

  const weekGoal = profile.training_days ?? 4;
  const sessionsThisWeek = stats.hasRealData ? stats.sessionsThisWeek : 0;
  const lastMinutes = stats.lastSessionMinutes;

  // Readiness composite (rule-based; wearables could feed this later)
  const consistency = Math.min(1, sessionsThisWeek / weekGoal);
  const readiness = Math.round(58 + consistency * 34 - (lastMinutes && lastMinutes > 75 ? 8 : 0));

  // Volume trend %
  const volDelta = stats.prevWeekVolume > 0
    ? Math.round(((stats.weekVolume - stats.prevWeekVolume) / stats.prevWeekVolume) * 100)
    : null;

  const nutritionGoal = computeNutritionGoal(profile);

  const firstName = displayName(profile).split(" ")[0];
  const goalLabel = goalLabels[profile.goal] ?? "Improve health";

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="animate-fade-up flex items-center justify-between pt-2">
        <div className="min-w-0">
          <Greeting />
          <h1 className="font-display text-[1.7rem] font-bold leading-tight">{firstName}</h1>
        </div>
      </div>

      {/* Goal + streak strip */}
      <div className="animate-fade-up delay-1 flex gap-3">
        <div className="flex flex-1 items-center gap-2.5 rounded-2xl border border-border bg-surface px-4 py-3">
          <Target className="h-4 w-4 shrink-0 text-volt" />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Goal</p>
            <p className="truncate text-sm font-semibold">{goalLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-2xl border border-border bg-surface px-4 py-3">
          <Zap className="h-4 w-4 shrink-0 text-coral" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Streak</p>
            <p className="font-score text-sm font-bold"><CountUp value={stats.streakDays} format={(n) => `${Math.round(n)}d`} /></p>
          </div>
        </div>
      </div>

      {/* Readiness + insight, only when there are real WORKOUTS (not just meals) */}
      {stats.sessionsThisWeek > 0 || stats.streakDays > 0 ? (
        <Card className="animate-fade-up delay-2 overflow-hidden">
          <CardContent className="flex items-center gap-5 p-5">
            <ReadinessRing score={readiness} />
            <div className="min-w-0 flex-1">
              <p className="font-display text-base font-semibold">
                {readiness >= 70 ? "You're primed to train." : readiness >= 45 ? "Train, but keep it moderate." : "Consider an easy day."}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                {sessionsThisWeek}/{weekGoal} sessions this week
                {lastMinutes ? ` · last workout ${lastMinutes} min` : ""}.
                {readiness >= 70 ? " Push your working sets today." : " Focus on quality reps over load."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="animate-fade-up delay-2 overflow-hidden border-volt/20">
          <CardContent className="flex items-center gap-4 p-5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-volt/15 text-volt">
              <Sparkles className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-base font-semibold">Let&apos;s get started</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                Log your first workout and meal to unlock your readiness score, trends and PR predictions.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Nutrition remaining */}
      <div className="animate-fade-up delay-2">
        <TodayMacros
          meals={stats.todayMeals}
          goalCalories={nutritionGoal.calories}
          goalProtein={nutritionGoal.protein_g}
        />
      </div>

      {/* Profile completion nudge */}
      <ProfileCompletionCard completion={completion} />

      {/* Deload suggestion — appears after 5+ solid training weeks */}
      {stats.deloadSuggested && (
        <Link href="/coach" className="animate-fade-up block">
          <Card className="liftable pressable border-coral/30 bg-coral/5">
            <CardContent className="flex items-center gap-3 p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-coral/15 text-coral">
                <Battery className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Time for a deload?</p>
                <p className="text-xs text-muted">
                  You&apos;ve trained hard for weeks. Ask your coach about a lighter recovery week.
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
            </CardContent>
          </Card>
        </Link>
      )}

      {/* Today's focus */}
      {today ? (
        <Card className="animate-fade-up delay-3 relative overflow-hidden border-volt/25 bg-gradient-to-br from-surface to-surface-2">
          {/* Signature: a hairline "signal" line marks the primary, active card. */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-volt to-transparent opacity-70" />
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <Badge variant="volt">Today&apos;s focus</Badge>
              <span className="text-xs text-muted">{today.exercises.length} exercises · ~{profile.session_duration_minutes ?? 60} min</span>
            </div>
            <p className="mt-3 font-display text-xl font-bold">{today.focus}</p>
            <div className="mt-3 flex gap-2">
              {today.exercises.slice(0, 5).map((re) => (
                <ExerciseImage
                  key={re.id}
                  src={re.exercise.image_url}
                  alt={re.exercise.name}
                  muscle={re.exercise.main_muscle as never}
                  className="h-12 w-12 rounded-xl"
                />
              ))}
            </div>
            <Button asChild size="lg" className="pressable mt-4 w-full">
              <Link href="/session">
                <Play className="h-4 w-4" /> Start workout
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="animate-fade-up delay-3 border-volt/25">
          <CardContent className="p-5 text-center">
            <p className="font-display text-lg font-bold">No active plan yet</p>
            <p className="mt-1 text-sm text-muted">
              Create your first plan and it&apos;ll show up here with today&apos;s workout.
            </p>
            <Button asChild size="lg" className="pressable mt-4 w-full">
              <Link href="/workouts/create">
                <Play className="h-4 w-4" /> Create a plan
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Fitness score (real data, streamed) */}
      <Suspense fallback={null}>
        <FitnessScoreCard />
      </Suspense>

      {/* Week overview — 3 stat tiles */}
      <div className="animate-fade-up delay-3 grid grid-cols-3 gap-3">
        <Card className="liftable">
          <CardContent className="p-4">
            <Calendar className="h-4 w-4 text-volt" />
            <p className="font-score mt-2 text-2xl font-bold"><CountUp value={sessionsThisWeek} /></p>
            <p className="text-[11px] text-muted">workouts</p>
          </CardContent>
        </Card>
        <Card className="liftable">
          <CardContent className="p-4">
            <Dumbbell className="h-4 w-4 text-volt" />
            <p className="font-score mt-2 text-2xl font-bold">
              <CountUp
                value={stats.weekVolume}
                format={(n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(Math.round(n)))}
              />
            </p>
            <p className="text-[11px] text-muted">kg volume</p>
          </CardContent>
        </Card>
        <Card className="liftable">
          <CardContent className="p-4">
            {volDelta !== null && volDelta < 0 ? (
              <TrendingDown className="h-4 w-4 text-danger" />
            ) : (
              <TrendingUp className="h-4 w-4 text-volt" />
            )}
            <p className="font-score mt-2 text-2xl font-bold">
              {volDelta !== null ? (
                <CountUp value={volDelta} format={(n) => `${n > 0 ? "+" : ""}${Math.round(n)}%`} />
              ) : (
                "—"
              )}
            </p>
            <p className="text-[11px] text-muted">vs last wk</p>
          </CardContent>
        </Card>
      </div>

      {/* Next PR prediction — only when there's real training data */}
      {stats.hasRealData && stats.prPrediction && (
        <Card className="animate-fade-up delay-4 liftable">
          <CardContent className="flex items-start gap-3 p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-volt/15 text-volt">
              <Trophy className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Next PR prediction</p>
              <p className="mt-0.5 text-sm">
                {stats.prPrediction.exercise}{" "}
                <span className="font-score font-semibold">
                  {stats.prPrediction.current} kg → {stats.prPrediction.target} kg
                </span>{" "}
                within ~{stats.prPrediction.weeks} weeks at your current progression rate.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Coach insight */}
      <Link href="/coach" className="animate-fade-up delay-4 block">
        <Card className="liftable pressable border-volt/20">
          <CardContent className="flex items-start gap-3 p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-volt/15 text-volt">
              <Sparkles className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Coach</p>
              <p className="mt-0.5 text-sm">
                {sessionsThisWeek >= weekGoal
                  ? "You hit your weekly target with great consistency. Ask me how to progress next week."
                  : "Ask me to build or adjust your plan, or check your form on any lift."}
              </p>
            </div>
            <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-muted" />
          </CardContent>
        </Card>
      </Link>

      {/* Weekly volume chart — only when the user has real sessions */}
      {stats.hasRealData && stats.weekVolume > 0 && (
        <Card className="animate-fade-up delay-5">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="font-display text-sm font-semibold">Weekly volume</p>
              <Link href="/progress" className="flex items-center text-xs font-semibold text-volt">
                Insights <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <WeeklyVolumeChart
              data={[
                { week: "Prev", volumen: stats.prevWeekVolume },
                { week: "This wk", volumen: stats.weekVolume },
              ]}
            />
          </CardContent>
        </Card>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 pb-2">
        <QuickWeightLog />
        <Link href="/nutrition">
          <Card className="liftable pressable h-full">
            <CardContent className="flex items-center gap-3 p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2">
                <Flame className="h-4 w-4 text-coral" />
              </span>
              <div>
                <p className="text-sm font-semibold">Log a meal</p>
                <p className="text-xs text-muted">AI nutrition</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/achievements" className="col-span-2">
          <Card className="liftable pressable h-full">
            <CardContent className="flex items-center gap-3 p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2">
                <Trophy className="h-4 w-4 text-volt" />
              </span>
              <div>
                <p className="text-sm font-semibold">Achievements</p>
                <p className="text-xs text-muted">See what you&apos;ve unlocked</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
