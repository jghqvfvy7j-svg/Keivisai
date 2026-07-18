"use client";

import { useState } from "react";
import { Scale, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { lbsToKg } from "@/lib/units";

// Quick body-weight logger. Opens a small dialog so the user can record their
// weight without leaving Home. Stores metric internally; accepts kg or lb.
export function QuickWeightLog() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState<"kg" | "lb">("lb");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function save() {
    const num = Number(value);
    if (!num || num <= 0) { toast.error("Enter a valid weight."); return; }
    setSaving(true);
    try {
      const weightKg = unit === "kg" ? num : lbsToKg(num);
      const res = await fetch("/api/body/log", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ weight_kg: Math.round(weightKg * 10) / 10 }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error();
      toast.success("Weight logged.");
      setOpen(false);
      setValue("");
      router.refresh();
    } catch {
      toast.error("Couldn't save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Card className="liftable pressable h-full cursor-pointer">
          <CardContent className="flex items-center gap-3 p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2">
              <Scale className="h-4 w-4 text-volt" />
            </span>
            <div>
              <p className="text-sm font-semibold">Log weight</p>
              <p className="text-xs text-muted">Quick entry</p>
            </div>
          </CardContent>
        </Card>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log your weight</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2">
          <Input
            type="number"
            inputMode="decimal"
            step="0.1"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={unit === "lb" ? "e.g. 160" : "e.g. 72.5"}
            autoFocus
          />
          <div className="flex overflow-hidden rounded-lg border border-border">
            {(["kg", "lb"] as const).map((u) => (
              <button
                key={u}
                onClick={() => setUnit(u)}
                className={`px-3 text-sm font-semibold ${unit === u ? "bg-volt text-volt-foreground" : "bg-surface-2 text-muted"}`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
        <Button onClick={save} disabled={saving} className="pressable mt-2 w-full">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save
        </Button>
      </DialogContent>
    </Dialog>
  );
}
