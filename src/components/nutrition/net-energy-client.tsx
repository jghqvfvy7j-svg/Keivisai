"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { localDaysAgo } from "@/lib/local-date";
import { buildIntakeSeries, rollingAvg, rollingTotal, type RawMeal } from "@/lib/energy";
import type { NutritionGoal } from "@/lib/nutrition-targets";

const UNDER = "#30d158"; // volt — at or under goal
const OVER = "#f97316"; // orange — over goal

const RANGES = { "7D": 7, "30D": 30, "3M": 90, "6M": 180 } as const;
type Range = keyof typeof RANGES;

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const shortDate = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${Number(m)}/${Number(d)}`;
};

// Within 10% of goal counts as on target; otherwise under or over.
function status(value: number, goal: number): { label: string; color: string } {
  if (!goal) return { label: "—", color: "var(--muted-2)" };
  const diff = value - goal;
  if (Math.abs(diff) <= goal * 0.1) return { label: "On target", color: UNDER };
  return diff > 0 ? { label: "Over", color: OVER } : { label: "Under", color: "var(--muted-2)" };
}

export function CalorieIntakeClient({ meals, goal }: { meals: RawMeal[]; goal: NutritionGoal }) {
  const [range, setRange] = useState<Range>("30D");
  const [mode, setMode] = useState<"Avg" | "Total">("Avg");

  const full = useMemo(() => buildIntakeSeries(meals, 180), [meals]);

  const chart = useMemo(() => {
    const cutoff = localDaysAgo(RANGES[range] - 1);
    return full
      .filter((d) => d.date >= cutoff)
      .map((d) => ({ date: shortDate(d.date), calories: d.calories }));
  }, [full, range]);

  if (full.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-8 text-center">
        <p className="font-semibold">No meals logged yet</p>
        <p className="mt-1 text-sm text-muted">
          Log a few meals and your intake will show up here, compared against your daily goal.
        </p>
      </div>
    );
  }

  const avgCals = rollingAvg(full, "calories", RANGES[range]);
  const avgProtein = rollingAvg(full, "protein", RANGES[range]);
  const avgCarbs = rollingAvg(full, "carbs", RANGES[range]);
  const avgFat = rollingAvg(full, "fat", RANGES[range]);
  const headStatus = status(avgCals, goal.calories);
  const loggedDays = full.filter((d) => d.date >= localDaysAgo(RANGES[range] - 1)).length;

  const trends = [3, 7, 14, 30].map((n) => {
    const val = mode === "Avg" ? rollingAvg(full, "calories", n) : rollingTotal(full, "calories", n);
    const st = mode === "Avg" ? status(val, goal.calories) : status(rollingAvg(full, "calories", n), goal.calories);
    return { label: `${n}-day`, val, st };
  });

  const macros = [
    { label: "Protein", avg: avgProtein, goal: goal.protein_g },
    { label: "Carbs", avg: avgCarbs, goal: goal.carbs_g },
    { label: "Fat", avg: avgFat, goal: goal.fats_g },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Header: average daily intake vs goal */}
      <div>
        <div className="flex items-baseline gap-2">
          <span className="font-score text-4xl font-bold tracking-tight tabular-nums">{fmt(avgCals)}</span>
          <span className="text-lg font-medium text-muted">kcal / day</span>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-sm text-muted">
            avg over {RANGES[range]}d · goal {fmt(goal.calories)}
          </span>
          <span className="text-sm font-semibold" style={{ color: headStatus.color }}>
            {headStatus.label}
          </span>
        </div>
      </div>

      {/* Chart: daily calories with a dashed goal line */}
      <div className="rounded-2xl border border-border bg-surface p-4">
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                interval={Math.max(0, Math.ceil(chart.length / 6) - 1)}
                tick={{ fill: "var(--chart-axis)", fontSize: 11 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={44}
                tick={{ fill: "var(--chart-axis)", fontSize: 11 }}
                tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}K` : `${v}`)}
              />
              <Tooltip
                cursor={{ fill: "var(--surface-3)" }}
                contentStyle={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border-strong)",
                  borderRadius: 12,
                  fontSize: 12,
                  color: "var(--foreground)",
                }}
                labelStyle={{ color: "var(--muted)" }}
                itemStyle={{ color: "var(--foreground)" }}
                formatter={(value) => [`${fmt(Number(value))} kcal`, "Eaten"]}
              />
              <ReferenceLine
                y={goal.calories}
                stroke="var(--muted)"
                strokeDasharray="4 4"
                strokeWidth={1}
              />
              <Bar dataKey="calories" radius={[3, 3, 0, 0]} maxBarSize={16}>
                {chart.map((d, i) => (
                  <Cell key={i} fill={d.calories > goal.calories ? OVER : UNDER} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex items-center gap-4 pl-1 text-[11px] text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: UNDER }} /> At or under goal
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: OVER }} /> Over goal
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-px w-4" style={{ background: "var(--muted)" }} /> Goal
          </span>
        </div>
      </div>

      {/* Range pills */}
      <div className="flex items-center gap-1 rounded-full border border-border bg-surface p-1">
        {(Object.keys(RANGES) as Range[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`flex-1 rounded-full py-2 text-sm font-medium transition active:scale-[0.98] ${
              range === r ? "bg-foreground text-surface" : "text-muted"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Macros: average per day vs goal */}
      <div className="grid grid-cols-3 gap-3">
        {macros.map((m) => (
          <div key={m.label} className="rounded-2xl border border-border bg-surface p-3 text-center">
            <p className="text-xs text-muted">{m.label}</p>
            <p className="font-score mt-1 text-lg font-bold tabular-nums">{fmt(m.avg)}g</p>
            <p className="font-score text-[11px] text-muted-2">of {fmt(m.goal)}g</p>
          </div>
        ))}
      </div>

      {/* Trends table */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Trends</h2>
            <p className="text-xs text-muted">
              {loggedDays} day{loggedDays === 1 ? "" : "s"} logged in this range
            </p>
          </div>
          <div className="flex rounded-full border border-border bg-surface p-1">
            {(["Avg", "Total"] as const).map((mm) => (
              <button
                key={mm}
                onClick={() => setMode(mm)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                  mode === mm ? "bg-foreground text-surface" : "text-muted"
                }`}
              >
                {mm}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface px-4">
          <div className="grid grid-cols-[1fr_1.3fr_1fr] border-b border-border py-3 text-xs text-muted-2">
            <span>Period</span>
            <span>{mode === "Avg" ? "Avg / day" : "Total"}</span>
            <span className="text-right">vs goal</span>
          </div>
          {trends.map((t, i) => (
            <div
              key={t.label}
              className={`grid grid-cols-[1fr_1.3fr_1fr] items-center py-3.5 ${
                i < trends.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <span className="font-medium">{t.label}</span>
              <span className="font-score font-semibold tabular-nums">
                {fmt(t.val)} <span className="text-xs font-normal text-muted-2">kcal</span>
              </span>
              <span className="text-right text-sm font-semibold" style={{ color: t.st.color }}>
                {t.st.label}
              </span>
            </div>
          ))}
        </div>

        <p className="mt-3 px-1 text-xs text-muted-2">
          All from the meals you logged, grouped by your local day. Goal is {fmt(goal.calories)} kcal
          {goal.personalized ? ", from your profile." : " (a default until your profile is complete)."}
        </p>
      </div>
    </div>
  );
}
