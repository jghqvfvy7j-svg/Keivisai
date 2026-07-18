"use client";

import { useEffect, useState } from "react";
import { Plus, Loader2, Ruler } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { BodyWeightChart } from "@/components/progress/body-weight-chart";
import { ProgressPhotos } from "@/components/progress/progress-photos";
import { HealthImport } from "@/components/health/health-import";
import { HealthSummary } from "@/components/health/health-summary";
import { createClient } from "@/lib/supabase/client";

type Metric = {
  id: string;
  weight_kg: number | null;
  waist_cm: number | null;
  chest_cm: number | null;
  arm_cm: number | null;
  hip_cm: number | null;
  recorded_at: string;
};

export default function MeasurementsPage() {
  const [open, setOpen] = useState(false);
  const [healthKey, setHealthKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  async function load() {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) { setLoaded(true); return; }
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoaded(true); return; }
      const { data, error } = await supabase
        .from("body_metrics")
        .select("id, weight_kg, waist_cm, chest_cm, arm_cm, hip_cm, recorded_at")
        .eq("user_id", user.id)
        .order("recorded_at", { ascending: false })
        .limit(30);
      // If the query errored (e.g. table not ready), just show an empty state.
      if (!error && Array.isArray(data)) setMetrics(data);
    } catch { /* ignore, show empty */ }
    finally { setLoaded(true); }
  }

  useEffect(() => {
    const t = setTimeout(() => { load(); }, 0);
    return () => clearTimeout(t);
  }, []);

  async function save() {
    if (saving) return;
    const num = (k: string) => (form[k] ? Number(form[k]) : undefined);
    const payload = {
      weight_kg: num("weight_kg"), height_cm: num("height_cm"),
      waist_cm: num("waist_cm"), chest_cm: num("chest_cm"),
      arm_cm: num("arm_cm"), leg_cm: num("leg_cm"), hip_cm: num("hip_cm"),
      notes: form.notes || undefined,
    };
    if (!payload.weight_kg && !payload.waist_cm && !payload.chest_cm && !payload.arm_cm && !payload.hip_cm) {
      toast.error("Add at least your weight or one measurement.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/body/log", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.ok) throw new Error();
      toast.success("Entry saved.");
      setOpen(false);
      setForm({});
      await load();
    } catch {
      toast.error("Couldn't save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  // Build the weight trend from real entries (oldest to newest).
  const trend = [...metrics]
    .filter((m) => m.weight_kg != null)
    .reverse()
    .map((m) => ({
      date: new Date(m.recorded_at).toLocaleDateString("en-US", { day: "2-digit", month: "short" }),
      peso: Number(m.weight_kg),
    }));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="font-display text-2xl font-extrabold">Body & measurements</h1>
          <p className="mt-1 text-sm text-muted">Track your physique week by week.</p>
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button size="icon" aria-label="Log measurement">
              <Plus className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>New entry</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Weight (kg)" k="weight_kg" placeholder="64.0" form={form} setForm={setForm} />
                <Field label="Height (cm)" k="height_cm" placeholder="165" form={form} setForm={setForm} />
                <Field label="Waist (cm)" k="waist_cm" placeholder="71" form={form} setForm={setForm} />
                <Field label="Chest (cm)" k="chest_cm" placeholder="89" form={form} setForm={setForm} />
                <Field label="Arm (cm)" k="arm_cm" placeholder="28" form={form} setForm={setForm} />
                <Field label="Leg (cm)" k="leg_cm" placeholder="55" form={form} setForm={setForm} />
                <Field label="Hip (cm)" k="hip_cm" placeholder="96" form={form} setForm={setForm} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  rows={3}
                  value={form.notes || ""}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="How are you feeling this week?"
                  className="w-full rounded-2xl border border-border bg-surface-2 p-3 text-sm outline-none focus-visible:border-volt focus-visible:ring-2 focus-visible:ring-volt/30"
                />
              </div>
              <Button onClick={save} disabled={saving} size="lg" className="pressable">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save entry
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {trend.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <p className="font-display text-sm font-bold">Weight trend</p>
            <BodyWeightChart data={trend} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-5">
          <ProgressPhotos />
        </CardContent>
      </Card>

      <HealthImport onImported={() => setHealthKey((k) => k + 1)} />
      <HealthSummary refreshKey={healthKey} />

      <div>
        <p className="mb-2 font-display text-sm font-bold">History</p>
        {!loaded ? (
          <div className="skeleton h-24 rounded-2xl" />
        ) : metrics.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-2 text-muted-2">
                <Ruler className="h-5 w-5" />
              </span>
              <p className="text-sm font-semibold">No entries yet</p>
              <p className="text-xs text-muted">Tap the + button to log your first measurement.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {metrics.map((m) => (
              <Card key={m.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-score text-lg font-bold">{m.weight_kg != null ? `${m.weight_kg} kg` : "Measurements"}</p>
                    <p className="text-xs text-muted">
                      {new Date(m.recorded_at).toLocaleDateString("en-US", { day: "2-digit", month: "short" })}
                    </p>
                  </div>
                  {(m.waist_cm || m.chest_cm || m.arm_cm || m.hip_cm) && (
                    <div className="mt-2 grid grid-cols-4 gap-2 text-center text-xs text-muted">
                      <span>Waist<br /><span className="font-score text-foreground">{m.waist_cm ?? "—"}</span></span>
                      <span>Chest<br /><span className="font-score text-foreground">{m.chest_cm ?? "—"}</span></span>
                      <span>Arm<br /><span className="font-score text-foreground">{m.arm_cm ?? "—"}</span></span>
                      <span>Hip<br /><span className="font-score text-foreground">{m.hip_cm ?? "—"}</span></span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, k, placeholder, form, setForm }: {
  label: string; k: string; placeholder: string;
  form: Record<string, string>; setForm: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        step="0.1"
        inputMode="decimal"
        placeholder={placeholder}
        value={form[k] || ""}
        onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
      />
    </div>
  );
}
