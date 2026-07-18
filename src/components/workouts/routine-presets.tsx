"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { generateAndSaveRoutine } from "@/app/(app)/workouts/actions";

// One-tap routine templates for users who don't want to configure everything.
const PRESETS = [
  { id: "fullbody3", name: "Full Body", detail: "3 days · great for beginners", split: "full_body", days: 3 },
  { id: "ppl", name: "Push Pull Legs", detail: "6 days · classic hypertrophy", split: "push_pull_legs", days: 6 },
  { id: "upperlower", name: "Upper / Lower", detail: "4 days · balanced strength", split: "upper_lower", days: 4 },
  { id: "brosplit", name: "Body-part Split", detail: "5 days · one muscle per day", split: "bro_split", days: 5 },
];

export function RoutinePresets() {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const router = useRouter();

  async function pick(preset: typeof PRESETS[number]) {
    if (loadingId) return;
    setLoadingId(preset.id);
    try {
      const res = await generateAndSaveRoutine({ split: preset.split, daysPerWeek: preset.days });
      if (res.ok) {
        toast.success(`${preset.name} plan created!`);
        router.push("/workouts");
        router.refresh();
      } else if (res.error === "no_exercises") {
        toast.error("Add exercises to your database first.");
      } else {
        toast.error("Couldn't create that plan. Try again.");
      }
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Zap className="h-4 w-4 text-volt" />
        <p className="font-display text-sm font-bold">Quick start templates</p>
      </div>
      <p className="mb-3 text-xs text-muted">Tap one to build it instantly — you can tweak it after.</p>
      <div className="grid grid-cols-2 gap-2">
        {PRESETS.map((p) => (
          <Card key={p.id} className="liftable pressable cursor-pointer" onClick={() => pick(p)}>
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{p.name}</p>
                {loadingId === p.id && <Loader2 className="h-3.5 w-3.5 animate-spin text-volt" />}
              </div>
              <p className="mt-0.5 text-[11px] text-muted">{p.detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
