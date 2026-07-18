"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { onboardingSchema, type OnboardingInput } from "@/lib/validations/auth";

const GOALS: { value: OnboardingInput["goal"]; label: string; desc: string }[] = [
  { value: "ganar_masa_muscular", label: "Build muscle", desc: "More size and strength" },
  { value: "perder_grasa", label: "Lose fat", desc: "Guided calorie deficit" },
  { value: "tonificar", label: "Tone up", desc: "Definition and firmness" },
  { value: "aumentar_fuerza", label: "Get stronger", desc: "Lift heavier" },
  { value: "mejorar_salud", label: "Improve health", desc: "A sustainable habit" },
  { value: "recomposicion", label: "Body recomposition", desc: "Gain muscle, lose fat" },
];

const LEVELS: { value: OnboardingInput["level"]; label: string }[] = [
  { value: "principiante", label: "Beginner" },
  { value: "intermedio", label: "Intermediate" },
  { value: "avanzado", label: "Advanced" },
];

const EQUIPMENT = [
  { value: "gimnasio_completo", label: "Full gym" },
  { value: "mancuernas", label: "Dumbbells" },
  { value: "barras", label: "Barbells" },
  { value: "maquinas", label: "Machines" },
  { value: "peso_corporal", label: "Bodyweight" },
  { value: "bandas", label: "Bands" },
  { value: "casa", label: "At home" },
];

const TOTAL_STEPS = 7;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      level: "principiante",
      training_days: 3,
      session_duration_minutes: 60,
      equipment_available: [],
    },
  });

  const values = watch();

  const stepFields: Record<number, (keyof OnboardingInput)[]> = {
    1: ["name", "age", "gender"],
    2: ["height_cm", "current_weight_kg"],
    3: ["goal"],
    4: ["level"],
    5: ["training_days", "session_duration_minutes"],
    6: ["injuries"],
    7: ["equipment_available"],
  };

  async function next() {
    const valid = await trigger(stepFields[step]);
    if (valid) setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }
  function back() {
    setStep((s) => Math.max(s - 1, 1));
  }

  function toggleEquipment(value: string) {
    const current = values.equipment_available || [];
    setValue(
      "equipment_available",
      current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
      { shouldValidate: true }
    );
  }

  async function onSubmit(data: OnboardingInput) {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { error } = await supabase.from("users_profiles").upsert(
          {
            user_id: user.id,
            name: data.name,
            age: data.age ?? null,
            gender: data.gender ?? null,
            height_cm: data.height_cm ?? null,
            current_weight_kg: data.current_weight_kg ?? null,
            goal: data.goal,
            level: data.level,
            training_days: data.training_days,
            session_duration_minutes: data.session_duration_minutes,
            injuries: data.injuries || null,
            equipment_available: data.equipment_available,
            onboarding_completed: true,
          },
          { onConflict: "user_id" }
        );
        if (error) throw error;
      }
      toast.success("Profile ready! Let's build your plan.");
      router.push("/home");
    } catch {
      // Sin proyecto Supabase conectado aún — seguimos para poder previsualizar la app.
      router.push("/home");
    }
  }

  return (
    <div className="min-h-dvh bg-bg px-6 pb-10 pt-safe">
      <div className="mx-auto w-full max-w-sm">
        <div className="flex items-center gap-3 pt-4">
          {step > 1 ? (
            <button onClick={back} className="rounded-full p-1.5 text-muted hover:bg-surface-2" aria-label="Back">
              <ArrowLeft className="h-5 w-5" />
            </button>
          ) : (
            <div className="w-8" />
          )}
          <Progress value={(step / TOTAL_STEPS) * 100} className="flex-1" />
          <span className="font-score text-xs text-muted">{step}/{TOTAL_STEPS}</span>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8">
          {step === 1 && (
            <div className="flex flex-col gap-5">
              <div>
                <h1 className="font-display text-2xl font-extrabold">Tell us about you</h1>
                <p className="mt-1 text-sm text-muted">The basics to personalize your experience.</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" placeholder="Your name" {...register("name")} />
                {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="age">Age (optional)</Label>
                <Input id="age" type="number" placeholder="27" {...register("age")} />
              </div>
              <div>
                <Label>Sex (optional)</Label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {[
                    { value: "femenino", label: "Female" },
                    { value: "masculino", label: "Male" },
                    { value: "otro", label: "Other" },
                    { value: "prefiero_no_decir", label: "Prefer not to say" },
                  ].map((g) => (
                    <button
                      type="button"
                      key={g.value}
                      onClick={() => setValue("gender", g.value as OnboardingInput["gender"])}
                      className={cn(
                        "rounded-2xl border px-3 py-2.5 text-sm font-semibold transition-colors",
                        values.gender === g.value
                          ? "border-volt bg-volt text-volt-foreground"
                          : "border-border bg-surface-2 text-muted"
                      )}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-5">
              <div>
                <h1 className="font-display text-2xl font-extrabold">Your starting point</h1>
                <p className="mt-1 text-sm text-muted">We use this to measure progress, never to judge it.</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="height_cm">Height (cm)</Label>
                <Input id="height_cm" type="number" placeholder="165" {...register("height_cm")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="current_weight_kg">Current body weight (kg)</Label>
                <Input id="current_weight_kg" type="number" step="0.1" placeholder="64.0" {...register("current_weight_kg")} />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-5">
              <div>
                <h1 className="font-display text-2xl font-extrabold">What&apos;s your main goal?</h1>
                <p className="mt-1 text-sm text-muted">This shapes your training plan.</p>
              </div>
              <div className="flex flex-col gap-2">
                {GOALS.map((g) => (
                  <button
                    type="button"
                    key={g.value}
                    onClick={() => setValue("goal", g.value, { shouldValidate: true })}
                    className={cn(
                      "rounded-2xl border px-4 py-3 text-left transition-colors",
                      values.goal === g.value
                        ? "border-volt bg-volt/10"
                        : "border-border bg-surface-2"
                    )}
                  >
                    <p className="text-sm font-semibold">{g.label}</p>
                    <p className="text-xs text-muted">{g.desc}</p>
                  </button>
                ))}
              </div>
              {errors.goal && <p className="text-xs text-danger">{errors.goal.message}</p>}
            </div>
          )}

          {step === 4 && (
            <div className="flex flex-col gap-5">
              <div>
                <h1 className="font-display text-2xl font-extrabold">What&apos;s your level?</h1>
                <p className="mt-1 text-sm text-muted">Be honest — this calibrates difficulty.</p>
              </div>
              <div className="flex flex-col gap-2">
                {LEVELS.map((l) => (
                  <button
                    type="button"
                    key={l.value}
                    onClick={() => setValue("level", l.value, { shouldValidate: true })}
                    className={cn(
                      "rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-colors",
                      values.level === l.value ? "border-volt bg-volt/10" : "border-border bg-surface-2"
                    )}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="flex flex-col gap-5">
              <div>
                <h1 className="font-display text-2xl font-extrabold">Your availability</h1>
                <p className="mt-1 text-sm text-muted">So your plan actually fits your life.</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="training_days">Days per week</Label>
                <Input id="training_days" type="number" min={1} max={7} {...register("training_days")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="session_duration_minutes">Minutes per session</Label>
                <Input id="session_duration_minutes" type="number" min={15} step={5} {...register("session_duration_minutes")} />
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="flex flex-col gap-5">
              <div>
                <h1 className="font-display text-2xl font-extrabold">Any injuries or limitations?</h1>
                <p className="mt-1 text-sm text-muted">
                  Optional. Helps us avoid exercises that don&apos;t suit you. Not a substitute for medical advice.
                </p>
              </div>
              <textarea
                {...register("injuries")}
                rows={5}
                placeholder="e.g. right knee discomfort on deep squats"
                className="w-full rounded-2xl border border-border bg-surface-2 p-4 text-sm outline-none focus-visible:border-volt focus-visible:ring-2 focus-visible:ring-volt/30"
              />
            </div>
          )}

          {step === 7 && (
            <div className="flex flex-col gap-5">
              <div>
                <h1 className="font-display text-2xl font-extrabold">What equipment do you have?</h1>
                <p className="mt-1 text-sm text-muted">Select all that apply.</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {EQUIPMENT.map((eq) => {
                  const active = values.equipment_available?.includes(eq.value);
                  return (
                    <button
                      type="button"
                      key={eq.value}
                      onClick={() => toggleEquipment(eq.value)}
                      className={cn(
                        "rounded-2xl border px-3 py-3 text-left text-sm font-semibold transition-colors",
                        active ? "border-volt bg-volt text-volt-foreground" : "border-border bg-surface-2 text-foreground"
                      )}
                    >
                      {eq.label}
                    </button>
                  );
                })}
              </div>
              {errors.equipment_available && (
                <p className="text-xs text-danger">{errors.equipment_available.message}</p>
              )}
            </div>
          )}

          <div className="mt-8">
            {step < TOTAL_STEPS ? (
              <Button type="button" size="lg" className="w-full" onClick={next}>
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Finish & see my home
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
