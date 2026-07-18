"use client";

import { useState } from "react";
import { Dumbbell } from "lucide-react";
import type { MuscleGroup } from "@/lib/types/database";
import { cn } from "@/lib/utils";

const muscleGradient: Record<MuscleGroup, string> = {
  pecho: "from-coral/30 to-coral/5",
  espalda: "from-volt/30 to-volt/5",
  piernas: "from-sky-400/30 to-sky-400/5",
  gluteos: "from-fuchsia-400/30 to-fuchsia-400/5",
  hombros: "from-amber-400/30 to-amber-400/5",
  biceps: "from-violet-400/30 to-violet-400/5",
  triceps: "from-rose-400/30 to-rose-400/5",
  abdomen: "from-teal-400/30 to-teal-400/5",
  cardio: "from-red-400/30 to-red-400/5",
  full_body: "from-lime-400/30 to-lime-400/5",
};

export function ExerciseImage({
  src,
  alt,
  muscle,
  className,
  imgClassName,
}: {
  src?: string | null;
  alt: string;
  muscle: MuscleGroup;
  className?: string;
  imgClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = src && !failed;

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden bg-surface-3",
        !showImage && "bg-gradient-to-br " + muscleGradient[muscle],
        className
      )}
    >
      {showImage ? (
        // Dataset photos come on a white square. object-cover fills the frame
        // so there's no white band; a subtle zoom crops the empty margins.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className={cn("h-full w-full scale-105 object-cover", imgClassName)}
        />
      ) : (
        <Dumbbell className="h-6 w-6 text-foreground/70" strokeWidth={1.75} />
      )}
    </div>
  );
}
