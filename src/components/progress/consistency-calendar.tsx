import { cn } from "@/lib/utils";

export function ConsistencyCalendar({ weeks }: { weeks: number[][] }) {
  const dayLabels = ["L", "M", "X", "J", "V", "S", "D"];
  return (
    <div className="mt-3">
      <div className="grid grid-cols-7 gap-1.5">
        {dayLabels.map((d) => (
          <span key={d} className="text-center text-[10px] font-semibold text-muted-2">
            {d}
          </span>
        ))}
        {weeks.flatMap((week, wi) =>
          week.map((trained, di) => (
            <span
              key={`${wi}-${di}`}
              className={cn(
                "aspect-square w-full rounded-md",
                trained ? "bg-volt" : "bg-surface-2"
              )}
            />
          ))
        )}
      </div>
    </div>
  );
}
