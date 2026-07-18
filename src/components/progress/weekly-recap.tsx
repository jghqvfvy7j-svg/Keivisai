"use client";

import { Share2, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { CountUp } from "@/components/ui/count-up";

// A shareable weekly summary — "Your week in GymTrack Pro". Drives organic
// sharing and gives the user a sense of accomplishment.
export function WeeklyRecap({
  workouts,
  volume,
  streak,
  caloriesAvg,
}: {
  workouts: number;
  volume: number;
  streak: number;
  caloriesAvg: number;
}) {
  async function share() {
    const text =
      `📊 My week on GymTrack Pro:\n` +
      `🏋️ ${workouts} workouts\n` +
      `💪 ${Math.round(volume).toLocaleString()} kg lifted\n` +
      `🔥 ${streak}-day streak\n` +
      (caloriesAvg > 0 ? `🍎 ~${Math.round(caloriesAvg)} kcal/day tracked\n` : "") +
      `\ngymtrackpro.xyz`;
    try {
      if (navigator.share) await navigator.share({ title: "My week on GymTrack Pro", text });
      else { await navigator.clipboard.writeText(text); toast.success("Recap copied!"); }
    } catch { /* cancelled */ }
  }

  const stats: { label: string; value: number; format?: (n: number) => string }[] = [
    { label: "Workouts", value: workouts },
    { label: "kg lifted", value: volume, format: (n) => Math.round(n).toLocaleString() },
    { label: "Day streak", value: streak },
  ];

  return (
    <Card className="relative overflow-hidden border-volt/20 bg-gradient-to-br from-surface to-surface-2">
      {/* Signature: hairline "signal" line, matching the primary card on Home. */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-volt to-transparent opacity-70" />
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-volt" />
            <p className="font-display text-sm font-bold">Your week</p>
          </div>
          <button
            onClick={share}
            className="pressable flex items-center gap-1.5 rounded-full bg-volt/15 px-3 py-1.5 text-xs font-semibold text-volt"
          >
            <Share2 className="h-3.5 w-3.5" /> Share
          </button>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl bg-surface p-3 text-center">
              <p className="font-score text-xl font-bold text-foreground">
                <CountUp value={s.value} format={s.format} />
              </p>
              <p className="mt-0.5 text-[10px] text-muted">{s.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
