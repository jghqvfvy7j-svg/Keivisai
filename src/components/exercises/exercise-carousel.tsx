"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";

export function ExerciseCarousel({
  images,
  alt,
}: {
  images: string[];
  alt: string;
}) {
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState<Record<number, boolean>>({});

  const valid = images.filter((_, i) => !failed[i]);
  const hasImages = valid.length > 0;

  if (!hasImages) {
    return (
      <div className="flex h-56 w-full items-center justify-center rounded-3xl bg-surface-2">
        <Dumbbell className="h-12 w-12 text-foreground/40" strokeWidth={1.5} />
      </div>
    );
  }

  const safeIndex = index % images.length;

  return (
    <div className="relative">
      <div className="flex h-56 w-full items-center justify-center overflow-hidden rounded-3xl bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[safeIndex]}
          alt={`${alt} — position ${safeIndex + 1}`}
          onError={() => setFailed((f) => ({ ...f, [safeIndex]: true }))}
          className="h-full w-full object-contain"
        />
      </div>

      {images.length > 1 && (
        <>
          <button
            onClick={() => setIndex((i) => (i - 1 + images.length) % images.length)}
            className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm"
            aria-label="Previous image"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => setIndex((i) => (i + 1) % images.length)}
            className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm"
            aria-label="Next image"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {images.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === safeIndex ? "w-5 bg-volt" : "w-1.5 bg-white/50"
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
