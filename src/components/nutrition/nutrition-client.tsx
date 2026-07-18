"use client";


import { useState, useRef } from "react";
import { localToday, localDayOf } from "@/lib/local-date";
import Link from "next/link";
import { PrivacyNote } from "@/components/ui/privacy-note";
import { NutritionHistory } from "@/components/nutrition/nutrition-history";
import { CalorieRing } from "@/components/nutrition/calorie-ring";
import { Sparkles, Plus, Loader2, Flame, Check, Pencil, Camera, Image as ImageIcon, Trash2, Target, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { MealLog, NutritionDay } from "@/lib/data";

type Estimate = {
  meal_name: string; calories: number; protein_g: number; carbs_g: number; fats_g: number;
  confidence: "low" | "medium" | "high"; items?: { food: string; qty: string; calories: number }[];
  assumptions?: string; is_food?: boolean; description?: string;
};

// Compute an uncertainty range around an estimated value based on how confident
// the AI was. Lower confidence = wider range. Being honest about estimate
// uncertainty builds trust (a photo can't reveal exact portions or hidden oils).
function estimateRange(value: number, confidence: "low" | "medium" | "high"): [number, number] {
  const pct = confidence === "high" ? 0.1 : confidence === "medium" ? 0.18 : 0.28;
  const lo = Math.round((value * (1 - pct)) / 5) * 5;
  const hi = Math.round((value * (1 + pct)) / 5) * 5;
  return [Math.max(0, lo), hi];
}

export function NutritionClient({
  initialMeals, week, goal, personalized = true,
}: {
  initialMeals: MealLog[];
  week: NutritionDay[];
  goal: { calories: number; protein_g: number; carbs_g: number; fats_g: number };
  personalized?: boolean;
}) {
  // Keep only meals from the user's LOCAL today. The server sends meals filtered
  // by UTC day, which can include yesterday/tomorrow for users far from GMT, so
  // we re-filter here where the device timezone is known.
  const [meals, setMeals] = useState<MealLog[]>(() =>
    initialMeals.filter((m) => localDayOf(m.logged_at) === localToday())
  );
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const eaten = meals.reduce(
    (a, m) => ({
      cal: a.cal + (m.calories ?? 0),
      pro: a.pro + (m.protein_g ?? 0),
      carb: a.carb + (m.carbs_g ?? 0),
      fat: a.fat + (m.fats_g ?? 0),
    }),
    { cal: 0, pro: 0, carb: 0, fat: 0 }
  );

  const weekAvg = week.length
    ? Math.round(week.reduce((s, d) => s + Number(d.calories), 0) / week.length)
    : 0;
  const weekProtein = week.length
    ? Math.round(week.reduce((s, d) => s + Number(d.protein_g), 0) / week.length)
    : 0;

  async function estimateMeal() {
    if (!text.trim() || loading) return;
    setLoading(true);
    setEstimate(null);
    try {
      const res = await fetch("/api/nutrition/estimate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.ok && data.estimate) setEstimate(data.estimate);
      else if (data.error === "no_api_key") toast.error("AI nutrition needs the API key set in Vercel.");
      else if (data.error === "limit_reached") toast.error(data.message);
      else toast.error("Couldn't estimate that. Try rephrasing.");
    } catch {
      toast.error("Connection issue. Try again.");
    } finally {
      setLoading(false);
    }
  }

  // Read a photo, downscale it, and send to the vision endpoint.
  async function analyzePhoto(file: File) {
    if (analyzingPhoto) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image.");
      return;
    }
    setAnalyzingPhoto(true);
    setEstimate(null);
    try {
      const { base64, mediaType } = await downscaleImage(file);
      const res = await fetch("/api/nutrition/photo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mediaType }),
      });
      const data = await res.json();
      if (data.ok && data.estimate) {
        if (data.estimate.is_food === false) {
          toast.error("That doesn't look like food. Try another photo.");
        } else {
          setEstimate(data.estimate);
        }
      } else if (data.error === "no_api_key") {
        toast.error("AI photo needs the API key set in Vercel.");
      } else if (data.error === "limit_reached") {
        toast.error(data.message);
      } else if (data.error === "too_large") {
        toast.error("Image is too large. Try a smaller photo.");
      } else {
        toast.error("Couldn't analyze that photo. Try again.");
      }
    } catch {
      toast.error("Connection issue. Try again.");
    } finally {
      setAnalyzingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  }

  function updateEstimate(field: keyof Estimate, value: number) {
    if (!estimate) return;
    setEstimate({ ...estimate, [field]: value });
  }

  async function deleteMeal(id: string) {
    // Optimistically remove from the UI; roll back if the request fails.
    const prev = meals;
    setMeals((m) => m.filter((x) => x.id !== id));
    try {
      const res = await fetch("/api/nutrition/log", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error();
      toast.success("Meal removed.");
    } catch {
      setMeals(prev);
      toast.error("Couldn't remove that meal.");
    }
  }

  async function saveMeal() {
    if (!estimate || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/nutrition/log", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          meal_name: estimate.meal_name,
          calories: estimate.calories, protein_g: estimate.protein_g,
          carbs_g: estimate.carbs_g, fats_g: estimate.fats_g,
          source: "ai", ai_confidence: estimate.confidence,
          description: estimate.description,
          items: estimate.items,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success("Meal logged.");
        setMeals([
          { id: crypto.randomUUID(), meal_name: estimate.meal_name, calories: estimate.calories,
            protein_g: estimate.protein_g, carbs_g: estimate.carbs_g, fats_g: estimate.fats_g,
            source: "ai", logged_at: new Date().toISOString(),
            notes: estimate.description, items: estimate.items },
          ...meals,
        ]);
        setEstimate(null); setText("");
      } else if (data.error === "unauthorized" || data.error === "not_connected") {
        toast.error("Sign in with Supabase connected to save meals.");
      } else toast.error("Couldn't save the meal.");
    } catch {
      toast.error("Connection issue. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 pb-4">
      <div className="animate-fade-up pt-2">
        <h1 className="font-display text-2xl font-bold">Nutrition</h1>
        <p className="text-sm text-muted">Describe a meal or snap a photo and AI estimates the macros.</p>
      </div>

      {/* Today: calories-left ring + macros vs goal */}
      <Card className="animate-fade-up delay-1">
        <CardContent className="p-5">
          <div className="flex items-center gap-1.5 text-volt">
            <Flame className="h-4 w-4" />
            <span className="text-[11px] font-semibold uppercase tracking-wide">Today</span>
          </div>

          <div className="mt-3">
            <CalorieRing consumed={eaten.cal} goal={goal.calories} />
          </div>

          <div className="mt-4 flex items-center justify-center gap-6 text-center">
            <div>
              <p className="text-[11px] text-muted">Goal</p>
              <p className="font-score text-lg font-bold">{goal.calories.toLocaleString()}</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <p className="text-[11px] text-muted">Consumed</p>
              <p className="font-score text-lg font-bold text-volt">
                {Math.round(eaten.cal).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3">
            {[
              { label: "Protein", val: eaten.pro, target: goal.protein_g, color: "#30D158" },
              { label: "Carbs", val: eaten.carb, target: goal.carbs_g, color: "#3b82f6" },
              { label: "Fat", val: eaten.fat, target: goal.fats_g, color: "#f59e0b" },
            ].map((m) => {
              const pct = m.target > 0 ? Math.min((m.val / m.target) * 100, 100) : 0;
              return (
                <div key={m.label}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-muted">{m.label}</span>
                    <span className="font-score">
                      <span className="font-bold">{Math.round(m.val)}</span>
                      <span className="text-muted-2">/{Math.round(m.target)}g</span>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-3">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: m.color, transition: "width .5s ease" }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {!personalized && (
        <Link href="/profile/settings">
          <Card className="animate-fade-up liftable pressable border-volt/30 bg-volt/5">
            <CardContent className="flex items-center gap-3 p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-volt/15 text-volt">
                <Target className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Get your personalized targets</p>
                <p className="text-xs text-muted">
                  Add your weight and height so we calculate calories and protein for your goal.
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
            </CardContent>
          </Card>
        </Link>
      )}

      {/* AI estimator */}
      <Card className="animate-fade-up delay-2 border-volt/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-1.5 text-volt">
            <Sparkles className="h-4 w-4" />
            <span className="text-[11px] font-semibold uppercase tracking-wide">AI estimate</span>
          </div>
          <div className="mt-3 flex gap-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && estimateMeal()}
              placeholder="e.g. 2 eggs, oatmeal and a banana"
              enterKeyHint="send"
              autoCapitalize="sentences"
              autoCorrect="on"
              spellCheck={true}
            />
            <Button onClick={estimateMeal} disabled={!text.trim() || loading} className="pressable shrink-0">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            </Button>
          </div>

          {/* Photo analysis */}
          <div className="mt-2 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[11px] text-muted">or use a photo</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          {/* Camera capture (rear camera on mobile) */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) analyzePhoto(f);
            }}
          />
          {/* Gallery / file upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) analyzePhoto(f);
            }}
          />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              onClick={() => cameraInputRef.current?.click()}
              disabled={analyzingPhoto}
              className="pressable flex items-center justify-center gap-2 rounded-2xl border border-border bg-surface-2 py-3 text-sm font-semibold disabled:opacity-60"
            >
              {analyzingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4 text-volt" />}
              Take photo
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={analyzingPhoto}
              className="pressable flex items-center justify-center gap-2 rounded-2xl border border-border bg-surface-2 py-3 text-sm font-semibold disabled:opacity-60"
            >
              {analyzingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4 text-volt" />}
              Upload photo
            </button>
          </div>

          <div className="mt-2">
            <PrivacyNote>Meal photos are encrypted and private to your account.</PrivacyNote>
          </div>

          {estimate && (
            <div className="animate-scale-in mt-4 rounded-2xl border border-border bg-surface-2 p-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{estimate.meal_name}</p>
                <Badge variant={estimate.confidence === "high" ? "volt" : "outline"}>
                  {estimate.confidence} confidence
                </Badge>
              </div>
              {estimate.description && (
                <p className="mt-1 text-xs text-muted">{estimate.description}</p>
              )}
              <div className="mt-3 grid grid-cols-4 gap-2">
                {([["calories", "kcal"], ["protein_g", "P"], ["carbs_g", "C"], ["fats_g", "F"]] as const).map(
                  ([field, label]) => {
                    const val = Math.round(estimate[field] as number);
                    const [lo, hi] = estimateRange(val, estimate.confidence);
                    return (
                      <div key={field} className="rounded-xl bg-surface p-2 text-center">
                        <input
                          type="number"
                          value={val}
                          onChange={(e) => updateEstimate(field, Number(e.target.value))}
                          className="font-score w-full bg-transparent text-center text-sm font-bold outline-none"
                        />
                        <p className="text-[10px] text-muted">{label}</p>
                        {val > 0 && (
                          <p className="mt-0.5 text-[9px] leading-tight text-muted-2">{lo}–{hi}</p>
                        )}
                      </div>
                    );
                  }
                )}
              </div>
              <p className="mt-1.5 text-[10px] text-muted-2">
                Ranges show estimate uncertainty. Tap a number to adjust.
              </p>
              {estimate.items && estimate.items.length > 0 && (
                <div className="mt-3 rounded-xl bg-surface p-3">
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">On the plate</p>
                  <div className="flex flex-col gap-1">
                    {estimate.items.map((it, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-foreground">{it.food} <span className="text-muted-2">· {it.qty}</span></span>
                        <span className="font-score text-muted">{Math.round(it.calories)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {estimate.assumptions && (
                <p className="mt-2 text-[11px] italic text-muted">{estimate.assumptions}</p>
              )}
              <p className="mt-2 flex items-center gap-1 text-[11px] text-muted">
                <Pencil className="h-3 w-3" /> Tap any number to edit. Values are estimates.
              </p>
              <Button onClick={saveMeal} disabled={saving} size="sm" className="pressable mt-3 w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Save meal
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weekly summary */}
      {week.length > 0 && (
        <Card className="animate-fade-up delay-3">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">This week (avg/day)</p>
            <div className="mt-2 flex gap-6">
              <div>
                <p className="font-score text-xl font-bold">{weekAvg}</p>
                <p className="text-xs text-muted">calories</p>
              </div>
              <div>
                <p className="font-score text-xl font-bold">{weekProtein}g</p>
                <p className="text-xs text-muted">protein</p>
              </div>
              <div>
                <p className="font-score text-xl font-bold">{week.length}</p>
                <p className="text-xs text-muted">days logged</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's meals */}
      <div className="animate-fade-up delay-4">
        <p className="mb-2 font-display text-sm font-bold">Today&apos;s meals</p>
        {meals.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
              <Plus className="h-6 w-6 text-muted-2" />
              <p className="text-sm text-muted">No meals logged yet. Describe your first meal above.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {meals.map((m) => {
              const isOpen = expandedMeal === m.id;
              const hasDetail = (m.items && m.items.length > 0) || m.notes;
              return (
                <Card key={m.id} className="liftable overflow-hidden">
                  <button
                    onClick={() => hasDetail && setExpandedMeal(isOpen ? null : m.id)}
                    className={`flex w-full items-center justify-between p-3.5 text-left ${hasDetail ? "cursor-pointer" : "cursor-default"}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {m.meal_name}
                        {hasDetail && <ChevronRight className={`ml-1 inline h-3 w-3 text-muted-2 transition-transform ${isOpen ? "rotate-90" : ""}`} />}
                      </p>
                      <p className="text-xs text-muted">
                        {Math.round(m.protein_g ?? 0)}P · {Math.round(m.carbs_g ?? 0)}C · {Math.round(m.fats_g ?? 0)}F
                        {m.source === "ai" && <span className="ml-1 text-volt">· AI</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-score text-sm font-bold text-coral">{Math.round(m.calories ?? 0)}</span>
                      <span
                        onClick={(e) => { e.stopPropagation(); deleteMeal(m.id); }}
                        className="pressable text-muted-2 hover:text-danger"
                        aria-label="Delete meal"
                        role="button"
                      >
                        <Trash2 className="h-4 w-4" />
                      </span>
                    </div>
                  </button>
                  {isOpen && hasDetail && (
                    <div className="animate-scale-in border-t border-border bg-surface-2 px-3.5 py-3">
                      {m.notes && <p className="mb-2 text-xs text-muted">{m.notes}</p>}
                      {m.items && m.items.length > 0 && (
                        <div className="flex flex-col gap-1">
                          <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-2">On the plate</p>
                          {m.items.map((it, i) => (
                            <div key={i} className="flex items-center justify-between text-xs">
                              <span className="text-foreground">
                                {it.food}{it.qty ? <span className="text-muted-2"> · {it.qty}</span> : null}
                              </span>
                              {it.calories != null && <span className="font-score text-muted">{Math.round(it.calories)}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <NutritionHistory />

      <p className="text-center text-[11px] text-muted-2">
        Calories and macros are AI estimates, not medical or dietary advice.
      </p>
    </div>
  );
}

// Downscale an image in the browser to keep the payload small (max ~1024px,
// JPEG). Returns base64 (no data: prefix) and the media type.
async function downscaleImage(file: File): Promise<{ base64: string; mediaType: string }> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });

  const maxDim = 1024;
  let { width, height } = img;
  if (width > maxDim || height > maxDim) {
    if (width > height) {
      height = Math.round((height * maxDim) / width);
      width = maxDim;
    } else {
      width = Math.round((width * maxDim) / height);
      height = maxDim;
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { base64: dataUrl.split(",")[1], mediaType: file.type };
  ctx.drawImage(img, 0, 0, width, height);

  const out = canvas.toDataURL("image/jpeg", 0.85);
  return { base64: out.split(",")[1], mediaType: "image/jpeg" };
}
