"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PartyPopper, Clock, Layers, TrendingUp, Repeat, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShareWorkoutImage } from "@/components/session/share-workout-image";

type Summary = {
  dayName: string;
  focus: string;
  durationMinutes: number;
  totalVolume: number;
  totalSets: number;
  totalReps: number;
  exerciseCount: number;
  exerciseVolumes?: number[];
};

const fallback: Summary = {
  dayName: "Today",
  focus: "Workout",
  durationMinutes: 52,
  totalVolume: 2840,
  totalSets: 14,
  totalReps: 126,
  exerciseCount: 2,
};

function readSummary(): Summary {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = sessionStorage.getItem("gymtrack:lastSummary");
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export default function WorkoutSummaryPage() {
  const router = useRouter();
  const [summary] = useState<Summary>(readSummary);
  const [prs] = useState<string[]>(() => {
    try {
      const raw = sessionStorage.getItem("gymtrack:lastPRs");
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-6 py-10 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-volt text-volt-foreground">
        <PartyPopper className="h-8 w-8" />
      </div>
      <h1 className="mt-5 font-display text-2xl font-extrabold">Workout complete!</h1>
      <p className="mt-1 text-sm text-muted">{summary.focus} · {summary.dayName}</p>

      {prs.length > 0 && (
        <div className="mt-5 rounded-2xl border border-volt/40 bg-volt/10 p-4 text-left">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-volt" />
            <p className="font-display text-sm font-bold">
              New personal record{prs.length > 1 ? "s" : ""}!
            </p>
          </div>
          <div className="mt-2 flex flex-col gap-1">
            {prs.map((pr, i) => (
              <p key={i} className="text-sm text-foreground">{pr}</p>
            ))}
          </div>
        </div>
      )}

      <div className="mt-7 grid grid-cols-2 gap-3 text-left">
        <Card>
          <CardContent className="p-4">
            <Clock className="h-4 w-4 text-volt" />
            <p className="mt-2 font-score text-2xl font-bold">{summary.durationMinutes}m</p>
            <p className="text-[11px] text-muted">duration</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <TrendingUp className="h-4 w-4 text-volt" />
            <p className="mt-2 font-score text-2xl font-bold">{summary.totalVolume.toLocaleString()}</p>
            <p className="text-[11px] text-muted">kg lifted</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Layers className="h-4 w-4 text-volt" />
            <p className="mt-2 font-score text-2xl font-bold">{summary.totalSets}</p>
            <p className="text-[11px] text-muted">total sets</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Repeat className="h-4 w-4 text-volt" />
            <p className="mt-2 font-score text-2xl font-bold">{summary.totalReps}</p>
            <p className="text-[11px] text-muted">total reps</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 flex flex-col gap-2">
        <ShareWorkoutImage summary={summary} />
        <Button size="lg" onClick={() => router.push("/home")}>
          Back to home
        </Button>
        <Button variant="secondary" size="lg" onClick={() => router.push("/progress")}>
          See my progress
        </Button>
      </div>
    </div>
  );
}
