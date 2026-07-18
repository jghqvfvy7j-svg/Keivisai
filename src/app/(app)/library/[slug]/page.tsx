import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, Layers, Repeat, AlertTriangle, Lightbulb, Shuffle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ExerciseCarousel } from "@/components/exercises/exercise-carousel";
import { getExerciseBySlug } from "@/lib/data";
import { BackButton } from "@/components/ui/back-button";
import { ExerciseHistory } from "@/components/exercises/exercise-history";
import { ExerciseAlternatives } from "@/components/exercises/exercise-alternatives";
import { Suspense } from "react";
import { muscleLabels, equipmentLabels, difficultyLabels, exerciseTypeLabels, forceLabel, mechanicLabel, exerciseSubtitle } from "@/lib/labels";

// Render dinámico: siempre lee datos frescos de Supabase por petición.
export const dynamic = "force-dynamic";

export default async function ExerciseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const exercise = await getExerciseBySlug(slug);
  if (!exercise) notFound();

  return (
    <div className="flex flex-col gap-5 pb-6">
<BackButton />

      <ExerciseCarousel images={exercise.images} alt={exercise.name} />

      <div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="signal">{muscleLabels[exercise.main_muscle]}</Badge>
          <Badge variant="outline">{difficultyLabels[exercise.difficulty]}</Badge>
          <Badge variant="default">{exerciseTypeLabels[exercise.type]}</Badge>
          {exercise.force && <Badge variant="outline">{forceLabel(exercise.force)}</Badge>}
          {exercise.mechanic && <Badge variant="outline">{mechanicLabel(exercise.mechanic)}</Badge>}
        </div>
        <h1 className="mt-3 font-display text-2xl font-extrabold">{exercise.name}</h1>
        <p className="mt-2 text-sm text-text-2">
          {exercise.description && !/empuje|tirón|compuesto|aislamiento|ejercicio de/i.test(exercise.description)
            ? exercise.description
            : exerciseSubtitle(exercise.force, exercise.mechanic)}
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="flex flex-col items-center gap-1 p-3 text-center">
            <Layers className="h-4 w-4 text-signal" />
            <p className="metric text-lg font-bold">{exercise.recommended_sets}</p>
            <p className="text-[10px] text-text-2">sets</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center gap-1 p-3 text-center">
            <Repeat className="h-4 w-4 text-signal" />
            <p className="metric text-lg font-bold">{exercise.recommended_reps}</p>
            <p className="text-[10px] text-text-2">reps</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center gap-1 p-3 text-center">
            <Clock className="h-4 w-4 text-signal" />
            <p className="metric text-lg font-bold">{exercise.recommended_rest_seconds}s</p>
            <p className="text-[10px] text-text-2">rest</p>
          </CardContent>
        </Card>
      </div>

      {/* Your history & PR (real data, streamed) */}
      <Suspense fallback={null}>
        <ExerciseHistory exerciseId={exercise.id} />
      </Suspense>

      {/* Musculos */}
      <div className="flex flex-wrap gap-1.5">
        {exercise.secondary_muscles.length > 0 && (
          <>
            <span className="text-xs text-text-2">Secondary muscles:</span>
            {exercise.secondary_muscles.map((m) => (
              <Badge key={m} variant="outline" className="text-[10px]">
                {muscleLabels[m]}
              </Badge>
            ))}
          </>
        )}
      </div>

      {/* Equipment */}
      <div className="flex flex-wrap gap-1.5">
        <span className="text-xs text-text-2">Equipment:</span>
        {exercise.equipment.map((eq) => (
          <Badge key={eq} variant="outline" className="text-[10px]">
            {equipmentLabels[eq]}
          </Badge>
        ))}
      </div>

      {/* Instructions */}
      <section>
        <h2 className="font-display text-base font-bold">How to perform</h2>
        <ol className="mt-2 flex flex-col gap-2">
          {exercise.instructions.map((step, i) => (
            <li key={i} className="flex gap-3 rounded-2xl border border-border bg-surface p-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-2 metric text-xs font-bold text-signal">
                {i + 1}
              </span>
              <p className="text-sm">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Tips */}
      {exercise.tips.length > 0 && (
        <section>
          <h2 className="flex items-center gap-1.5 font-display text-base font-bold">
            <Lightbulb className="h-4 w-4 text-signal" /> Form tips
          </h2>
          <ul className="mt-2 flex flex-col gap-1.5">
            {exercise.tips.map((tip, i) => (
              <li key={i} className="text-sm text-text-2">• {tip}</li>
            ))}
          </ul>
        </section>
      )}

      {/* Common mistakes */}
      {exercise.common_mistakes.length > 0 && (
        <section>
          <h2 className="flex items-center gap-1.5 font-display text-base font-bold">
            <AlertTriangle className="h-4 w-4 text-bad" /> Common mistakes
          </h2>
          <ul className="mt-2 flex flex-col gap-1.5">
            {exercise.common_mistakes.map((mistake, i) => (
              <li key={i} className="text-sm text-text-2">• {mistake}</li>
            ))}
          </ul>
        </section>
      )}

      {/* Alternatives (real, clickable, streamed) */}
      <Suspense fallback={null}>
        <ExerciseAlternatives exerciseId={exercise.id} mainMuscle={exercise.main_muscle} />
      </Suspense>
    </div>
  );
}
