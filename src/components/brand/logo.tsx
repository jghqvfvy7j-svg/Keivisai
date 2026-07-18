import { cn } from "@/lib/utils";

/**
 * GymTrack Pro logo mark.
 *
 * Design: three ascending bars (progress / getting stronger over time) where the
 * tallest bar is capped by a horizontal barbell plate — merging the ideas of
 * "tracking progress" and "lifting". Not a generic dumbbell.
 *
 * `variant="mark"` renders just the symbol; `variant="full"` adds the wordmark.
 */
export function Logo({
  variant = "mark",
  className,
  markClassName,
}: {
  variant?: "mark" | "full";
  className?: string;
  markClassName?: string;
}) {
  const mark = (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-full w-full", markClassName)}
      aria-hidden="true"
    >
      {/* ascending bars */}
      <rect x="4" y="20" width="5.5" height="8" rx="2" fill="currentColor" opacity="0.55" />
      <rect x="13.25" y="14" width="5.5" height="14" rx="2" fill="currentColor" opacity="0.8" />
      <rect x="22.5" y="8" width="5.5" height="20" rx="2" fill="currentColor" />
      {/* barbell bar across the top of the tallest column */}
      <rect x="18.5" y="4.5" width="13.5" height="3.4" rx="1.7" fill="currentColor" />
      {/* end plates */}
      <rect x="17" y="2.6" width="3.2" height="7.2" rx="1.4" fill="currentColor" />
      <rect x="26.8" y="2.6" width="3.2" height="7.2" rx="1.4" fill="currentColor" />
    </svg>
  );

  if (variant === "mark") {
    return <span className={cn("inline-block", className)}>{mark}</span>;
  }

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-volt text-volt-foreground">
        <span className="h-5 w-5">{mark}</span>
      </span>
      <span className="font-display text-lg font-bold tracking-tight">
        GymTrack<span className="text-volt"> Pro</span>
      </span>
    </span>
  );
}

/** Just the badge (green rounded square + mark), for compact spots. */
export function LogoBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-xl bg-volt text-volt-foreground",
        className
      )}
    >
      <Logo variant="mark" className="h-5 w-5" />
    </span>
  );
}
