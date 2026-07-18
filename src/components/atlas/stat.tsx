import { cn } from "@/lib/utils";

// A precise metric readout: big tabular number + label + optional delta.
export function Stat({
  value,
  unit,
  label,
  delta,
  tone = "default",
  className,
}: {
  value: string | number;
  unit?: string;
  label: string;
  delta?: { value: string; up?: boolean };
  tone?: "default" | "signal" | "good" | "warn" | "bad";
  className?: string;
}) {
  const toneColor = {
    default: "text-text",
    signal: "text-signal",
    good: "text-good",
    warn: "text-warn",
    bad: "text-bad",
  }[tone];

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex items-baseline gap-1">
        <span className={cn("metric text-3xl font-bold", toneColor)}>{value}</span>
        {unit && <span className="text-sm font-medium text-text-3">{unit}</span>}
      </div>
      <div className="mt-1 flex items-center gap-1.5">
        <span className="text-xs font-medium text-text-2">{label}</span>
        {delta && (
          <span className={cn("text-[11px] font-semibold tabular", delta.up ? "text-good" : "text-bad")}>
            {delta.up ? "↑" : "↓"} {delta.value}
          </span>
        )}
      </div>
    </div>
  );
}
