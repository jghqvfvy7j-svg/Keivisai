"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

/**
 * Logs the recipe as today's meal, with the exact macros the recipe was built
 * from. No typing, no estimating: the numbers were computed from the grams.
 */
export function LogRecipeButton({
  name,
  calories,
  protein,
  carbs,
  fat,
}: {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function log() {
    setSaving(true);
    try {
      const res = await fetch("/api/nutrition/log", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          meal_name: name,
          calories,
          protein_g: protein,
          carbs_g: carbs,
          fats_g: fat,
          source: "manual",
        }),
      });
      if (!res.ok) throw new Error();
      setDone(true);
      toast.success("Logged. Your macros are updated.");
      router.refresh();
    } catch {
      toast.error("Could not log it. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      onClick={log}
      disabled={saving || done}
      className={
        "flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-base font-bold transition-colors active:scale-[0.99] " +
        (done ? "bg-volt/15 text-volt" : "bg-volt text-volt-foreground")
      }
    >
      {saving ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : done ? (
        <>
          <Check className="h-5 w-5" /> Logged today
        </>
      ) : (
        <>
          <Plus className="h-5 w-5" /> Log this meal
        </>
      )}
    </button>
  );
}
