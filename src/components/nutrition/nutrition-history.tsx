"use client";

import { useEffect, useState } from "react";
import { ChevronRight, CalendarDays } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { localToday, localDaysAgo, localDayOf } from "@/lib/local-date";

type Meal = {
  id: string; meal_name: string;
  calories: number | null; protein_g: number | null; carbs_g: number | null; fats_g: number | null;
  logged_at: string; notes?: string | null;
  items?: { food: string; qty?: string; calories?: number }[] | null;
};

type DayGroup = { day: string; label: string; meals: Meal[]; cal: number; pro: number };

// Shows the last 7 days of logged meals, grouped by day. Each day is a discreet
// expandable card; tapping a day reveals its meals, and tapping a meal shows the
// scanned plate breakdown. Excludes today (that's shown separately above).
export function NutritionHistory() {
  const [groups, setGroups] = useState<DayGroup[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [openMeal, setOpenMeal] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) { setLoaded(true); return; }
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !active) { setLoaded(true); return; }

        const today = localToday();
        const sevenAgo = localDaysAgo(7) + "T00:00:00";
        const { data } = await supabase
          .from("nutrition_logs")
          .select("id,meal_name,calories,protein_g,carbs_g,fats_g,logged_at,notes,items")
          .eq("user_id", user.id)
          .gte("logged_at", sevenAgo)
          .order("logged_at", { ascending: false });
        if (!active) return;

        // Group by LOCAL day, excluding today.
        const byDay = new Map<string, Meal[]>();
        for (const m of (data ?? []) as Meal[]) {
          const d = localDayOf(m.logged_at);
          if (d === today) continue;
          if (!byDay.has(d)) byDay.set(d, []);
          byDay.get(d)!.push(m);
        }
        const gs: DayGroup[] = [...byDay.entries()].map(([day, meals]) => ({
          day,
          label: new Date(day + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }),
          meals,
          cal: meals.reduce((s, m) => s + Number(m.calories ?? 0), 0),
          pro: meals.reduce((s, m) => s + Number(m.protein_g ?? 0), 0),
        }));
        setGroups(gs);
      } catch { /* ignore */ }
      finally { if (active) setLoaded(true); }
    })();
    return () => { active = false; };
  }, []);

  if (!loaded || groups.length === 0) return null;

  return (
    <div className="mt-6">
      <div className="mb-2 flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-muted" />
        <p className="font-display text-sm font-bold">Previous days</p>
      </div>
      <div className="flex flex-col gap-2">
        {groups.map((g) => {
          const dayOpen = openDay === g.day;
          return (
            <Card key={g.day} className="overflow-hidden">
              <button
                onClick={() => setOpenDay(dayOpen ? null : g.day)}
                className="flex w-full items-center justify-between p-3.5 text-left"
              >
                <div>
                  <p className="text-sm font-semibold">
                    {g.label}
                    <ChevronRight className={`ml-1 inline h-3 w-3 text-muted-2 transition-transform ${dayOpen ? "rotate-90" : ""}`} />
                  </p>
                  <p className="text-xs text-muted">{g.meals.length} {g.meals.length === 1 ? "meal" : "meals"}</p>
                </div>
                <div className="text-right">
                  <p className="font-score text-sm font-bold text-coral">{Math.round(g.cal)}</p>
                  <p className="text-[11px] text-muted">{Math.round(g.pro)}g protein</p>
                </div>
              </button>

              {dayOpen && (
                <div className="animate-scale-in border-t border-border bg-surface-2 p-2.5">
                  <div className="flex flex-col gap-1.5">
                    {g.meals.map((m) => {
                      const mealOpen = openMeal === m.id;
                      const hasDetail = (m.items && m.items.length > 0) || m.notes;
                      return (
                        <div key={m.id} className="rounded-xl bg-surface">
                          <button
                            onClick={() => hasDetail && setOpenMeal(mealOpen ? null : m.id)}
                            className="flex w-full items-center justify-between p-2.5 text-left"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">
                                {m.meal_name}
                                {hasDetail && <ChevronRight className={`ml-1 inline h-3 w-3 text-muted-2 transition-transform ${mealOpen ? "rotate-90" : ""}`} />}
                              </p>
                              <p className="text-xs text-muted">
                                {Math.round(m.protein_g ?? 0)}P · {Math.round(m.carbs_g ?? 0)}C · {Math.round(m.fats_g ?? 0)}F
                              </p>
                            </div>
                            <span className="font-score text-sm font-bold text-coral">{Math.round(m.calories ?? 0)}</span>
                          </button>
                          {mealOpen && hasDetail && (
                            <div className="border-t border-border px-2.5 py-2">
                              {m.notes && <p className="mb-1.5 text-xs text-muted">{m.notes}</p>}
                              {m.items && m.items.length > 0 && (
                                <div className="flex flex-col gap-1">
                                  {m.items.map((it, i) => (
                                    <div key={i} className="flex items-center justify-between text-xs">
                                      <span>{it.food}{it.qty ? <span className="text-muted-2"> · {it.qty}</span> : null}</span>
                                      {it.calories != null && <span className="font-score text-muted">{Math.round(it.calories)}</span>}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
