"use client";

import { useEffect, useState } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { loadOfflinePlan, type OfflinePlan } from "@/lib/offline-plan";

// Shown by the service worker when a navigation fails because there's no
// connection. Reads the last active plan cached on this device (read-only) so
// you can still follow your workout at the gym. No session, no network needed.
export default function OfflinePage() {
  const [plan, setPlan] = useState<OfflinePlan | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setPlan(loadOfflinePlan());
    setLoaded(true);
  }, []);

  return (
    <div className="min-h-dvh bg-bg px-5 pb-16 pt-safe">
      <div className="mx-auto max-w-md">
        <div className="flex items-center justify-between py-4">
          <Logo variant="full" />
          <span className="flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-muted">
            <WifiOff className="h-3.5 w-3.5" /> Offline
          </span>
        </div>

        <button
          onClick={() => location.reload()}
          className="mb-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-surface p-3 text-sm font-semibold active:scale-[0.99]"
        >
          <RefreshCw className="h-4 w-4" /> Retry connection
        </button>

        {!loaded ? null : plan ? (
          <>
            <div className="mb-4">
              <p className="text-sm text-muted">Your saved plan</p>
              <h1 className="font-display text-2xl font-extrabold">{plan.name}</h1>
              <p className="font-score text-xs text-muted-2">
                {plan.daysPerWeek} days / week · saved {new Date(plan.savedAt).toLocaleDateString()}
              </p>
            </div>

            <div className="flex flex-col gap-4">
              {plan.days.map((d, i) => (
                <div key={i} className="rounded-2xl border border-border bg-surface p-4">
                  <div className="mb-2 flex items-baseline justify-between">
                    <p className="font-display font-bold">{d.dayName}</p>
                    <p className="text-xs text-muted">{d.focus}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {d.exercises.map((e, j) => (
                      <div key={j} className="flex items-center justify-between rounded-xl bg-surface-2 p-2.5">
                        <p className="min-w-0 flex-1 truncate text-sm font-semibold">{e.name}</p>
                        <p className="font-score shrink-0 text-xs text-muted">
                          {e.sets} × {e.reps}
                          {e.weightKg ? ` · ${e.weightKg} kg` : ""} · {e.restSeconds}s
                        </p>
                      </div>
                    ))}
                    {d.exercises.length === 0 && (
                      <p className="text-xs text-muted">No exercises saved for this day.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-6 text-center text-xs text-muted-2">
              This is your saved copy. Logging sets needs a connection.
            </p>
          </>
        ) : (
          <div className="rounded-2xl border border-border bg-surface p-8 text-center">
            <p className="font-semibold">You&apos;re offline</p>
            <p className="mt-1 text-sm text-muted">
              Open your plan once while connected and it&apos;ll be saved here for the next time
              you lose signal.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
