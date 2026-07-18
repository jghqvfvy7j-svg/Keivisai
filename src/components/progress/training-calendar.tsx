"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Dumbbell } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

// A real training calendar: highlights the days the user actually trained,
// pulled from workout_sessions. Users can page through months.
export function TrainingCalendar() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed
  const [trained, setTrained] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) { setLoading(false); return; }
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) { setLoading(false); return; }
        const first = new Date(Date.UTC(year, month, 1)).toISOString();
        const last = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59)).toISOString();
        const { data } = await supabase
          .from("workout_sessions")
          .select("started_at")
          .eq("user_id", user.id)
          .gte("started_at", first)
          .lte("started_at", last);
        if (cancelled) return;
        setTrained(new Set((data ?? []).map((s) => String(s.started_at).slice(0, 10))));
      } catch { /* ignore */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [year, month]);

  // Build the calendar grid. Monday-first.
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // 0 = Monday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  // Today in the user's LOCAL timezone (device timezone), not UTC, so the
  // highlighted "today" is correct wherever they are.
  const localToday = new Date();
  const todayStr = `${localToday.getFullYear()}-${String(localToday.getMonth() + 1).padStart(2, "0")}-${String(localToday.getDate()).padStart(2, "0")}`;
  const trainedCount = trained.size;

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    // Don't go past the current month.
    if (year === now.getFullYear() && month === now.getMonth()) return;
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }
  const atCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  function pad(d: number) {
    const m = String(month + 1).padStart(2, "0");
    const day = String(d).padStart(2, "0");
    return `${year}-${m}-${day}`;
  }

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-volt" />
            <p className="font-display text-sm font-bold">Training calendar</p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={prevMonth} className="pressable flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:text-foreground" aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[110px] text-center text-xs font-semibold">{MONTHS[month]} {year}</span>
            <button onClick={nextMonth} disabled={atCurrentMonth} className="pressable flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:text-foreground disabled:opacity-30" aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS.map((w, i) => (
            <span key={i} className="text-[10px] font-semibold text-muted-2">{w}</span>
          ))}
          {cells.map((d, i) => {
            if (d === null) return <span key={i} />;
            const dateStr = pad(d);
            const didTrain = trained.has(dateStr);
            const isToday = dateStr === todayStr;
            return (
              <div
                key={i}
                className={`flex aspect-square items-center justify-center rounded-lg text-xs ${
                  didTrain ? "bg-volt font-bold text-volt-foreground" : isToday ? "font-bold text-volt" : "text-muted"
                } ${isToday ? "ring-2 ring-volt" : ""}`}
              >
                {d}
              </div>
            );
          })}
        </div>

        <p className="mt-3 text-xs text-muted">
          {loading ? "Loading…" : trainedCount > 0
            ? `${trainedCount} ${trainedCount === 1 ? "day" : "days"} trained in ${MONTHS[month]}.`
            : `No workouts logged in ${MONTHS[month]} yet.`}
        </p>
      </CardContent>
    </Card>
  );
}
