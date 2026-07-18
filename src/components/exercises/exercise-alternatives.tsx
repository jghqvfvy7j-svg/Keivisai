import Link from "next/link";
import { Shuffle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ExerciseImage } from "@/components/exercises/exercise-image";
import { getAlternatives } from "@/lib/data";
import type { MuscleGroup } from "@/lib/types/database";

// Real, clickable alternatives for the same muscle (prefers user's equipment).
export async function ExerciseAlternatives({
  exerciseId,
  mainMuscle,
}: {
  exerciseId: string;
  mainMuscle: string;
}) {
  const alts = await getAlternatives(exerciseId, mainMuscle);
  if (alts.length === 0) return null;

  return (
    <section>
      <h2 className="flex items-center gap-1.5 font-display text-base font-bold">
        <Shuffle className="h-4 w-4 text-muted" /> Swap for an alternative
      </h2>
      <p className="mt-1 text-xs text-muted">Same muscle, matched to your equipment.</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {alts.map((alt) => (
          <Link key={alt.id} href={`/library/${alt.slug}`}>
            <Card className="liftable pressable h-full">
              <CardContent className="flex items-center gap-2.5 p-2.5">
                <ExerciseImage
                  src={alt.image_url}
                  alt={alt.name}
                  muscle={alt.main_muscle as MuscleGroup}
                  className="h-11 w-11 shrink-0 rounded-lg"
                />
                <span className="line-clamp-2 text-xs font-semibold">{alt.name}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
