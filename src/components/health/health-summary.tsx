"use client";

import { useEffect, useState } from "react";
import { Heart, Activity, MapPin, Flame } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

type Workout = {
  id: string;
  activityType: string;
  date: string;
  durationMin: number | null;
  distanceKm: number | null;
  energyKcal: number | null;
  avgHr: number | null;
  maxHr: number | null;
};

// Shows imported Apple Health data: resting heart-rate summary and a list of
// imported workouts. Loads from the browser so it fits inside the client Body
// page. Renders nothing until data exists.
export function HealthSummary({ refreshKey = 0 }: { refreshKey?: number }) {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [resting, setResting] = useState<{ latest: number | null; avg: number | null }>({ latest: null, avg: null });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) { setLoaded(true); return; }
      const supabase = createClient();
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoaded(true); return; }

        const [wRes, hRes] = await Promise.all([
          supabase
            .from("health_workouts")
            .select("id, activity_type, started_at, duration_min, distance_km, active_energy_kcal, avg_heart_rate, max_heart_rate")
            .eq("user_id", user.id)
            .order("started_at", { ascending: false })
            .limit(10),
          supabase
            .from("health_heart_daily")
            .select("day, resting_hr")
            .eq("user_id", user.id)
            .gte("day", new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10))
            .order("day", { ascending: true }),
        ]);

        if (cancelled) return;

        const ws = (Array.isArray(wRes?.data) ? wRes.data : []).map((w) => ({
          id: w.id,
          activityType: w.activity_type ?? "Workout",
          date: new Date(w.started_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          durationMin: w.duration_min ? Math.round(Number(w.duration_min)) : null,
          distanceKm: w.distance_km ? Math.round(Number(w.distance_km) * 100) / 100 : null,
          energyKcal: w.active_energy_kcal ? Math.round(Number(w.active_energy_kcal)) : null,
          avgHr: w.avg_heart_rate,
          maxHr: w.max_heart_rate,
        }));
        setWorkouts(ws);

        const restingVals = (Array.isArray(hRes?.data) ? hRes.data : []).map((h) => h.resting_hr).filter((v): v is number => v != null);
        setResting({
          latest: restingVals.length ? restingVals[restingVals.length - 1] : null,
          avg: restingVals.length ? Math.round(restingVals.reduce((a, b) => a + b, 0) / restingVals.length) : null,
        });
      } catch { /* ignore */ }
      finally { if (!cancelled) setLoaded(true); }
    })();
    return () => { cancelled = true; };
  }, [refreshKey]);

  // Still loading.
  if (!loaded) return null;

  // Loaded but no imported data yet — show a clear placeholder so the user knows
  // where their Apple Health data will appear after importing.
  const hasData = workouts.length > 0 || resting.latest != null || resting.avg != null;
  if (!hasData) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 p-6 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-2 text-muted-2">
            <Activity className="h-5 w-5" />
          </span>
          <p className="text-sm font-semibold">No health data yet</p>
          <p className="text-xs text-muted">
            Import your Apple Health export above and your heart rate and workouts will show up here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {(resting.latest != null || resting.avg != null) && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-coral" />
              <p className="font-display text-sm font-bold">Heart rate</p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-surface-2 p-3 text-center">
                <p className="font-score text-2xl font-bold">{resting.latest ?? "—"}</p>
                <p className="text-[11px] text-muted">Resting (latest)</p>
              </div>
              <div className="rounded-xl bg-surface-2 p-3 text-center">
                <p className="font-score text-2xl font-bold">{resting.avg ?? "—"}</p>
                <p className="text-[11px] text-muted">30-day avg resting</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {workouts.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-volt" />
              <p className="font-display text-sm font-bold">Imported workouts</p>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {workouts.map((w) => (
                <div key={w.id} className="rounded-xl border border-border bg-surface-2 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{w.activityType}</p>
                    <span className="text-[11px] text-muted-2">{w.date}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                    {w.durationMin != null && <span>{w.durationMin} min</span>}
                    {w.distanceKm != null && (
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {w.distanceKm} km</span>
                    )}
                    {w.avgHr != null && (
                      <span className="flex items-center gap-1"><Heart className="h-3 w-3 text-coral" /> {w.avgHr} avg{w.maxHr ? ` · ${w.maxHr} max` : ""}</span>
                    )}
                    {w.energyKcal != null && (
                      <span className="flex items-center gap-1"><Flame className="h-3 w-3 text-coral" /> {w.energyKcal} kcal</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
