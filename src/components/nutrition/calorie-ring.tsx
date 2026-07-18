"use client";

import { useEffect, useState } from "react";
import { CountUp } from "@/components/ui/count-up";

// Circular "calories left today" ring. Premium GymKynex style: volt-green arc on
// a dark track, calories remaining in the center. Turns orange when over goal.
// Signature motion: the arc draws on and the number counts up on mount, like an
// instrument powering on. Respects prefers-reduced-motion.

const SIZE = 184;
const STROKE = 14;

export function CalorieRing({ consumed, goal }: { consumed: number; goal: number }) {
  const r = (SIZE - STROKE) / 2;
  const circ = 2 * Math.PI * r;
  const pct = goal > 0 ? consumed / goal : 0;
  const over = consumed > goal;
  const clamped = Math.min(Math.max(pct, 0), 1);

  const [reduce, setReduce] = useState(false);
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const r2 = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    setReduce(r2);
    if (r2) {
      setDrawn(true);
      return;
    }
    const id = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const offset = reduce || drawn ? circ * (1 - clamped) : circ;

  const left = Math.max(0, Math.round(goal - consumed));
  const overBy = Math.round(consumed - goal);
  const color = over ? "#f97316" : "var(--volt)";
  const status = over
    ? "Over goal"
    : pct >= 0.9
    ? "On target"
    : pct >= 0.5
    ? "On track"
    : "Getting started";

  return (
    <div className="relative mx-auto" style={{ width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} className="-rotate-90">
        <circle cx={SIZE / 2} cy={SIZE / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={STROKE} />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: reduce ? "none" : "stroke-dashoffset 0.9s cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-[11px] font-semibold uppercase tracking-wide"
          style={{ color: over ? "#f97316" : "var(--muted)" }}
        >
          {status}
        </span>
        <CountUp value={over ? overBy : left} className="font-score text-4xl font-bold leading-none tabular-nums" />
        <span className="mt-1 text-xs text-muted">{over ? "kcal over" : "kcal left"}</span>
      </div>
    </div>
  );
}
