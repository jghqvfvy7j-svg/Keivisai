"use client";

import { useEffect, useState } from "react";

// Signature element: a precision "readiness" dial. Animated sweep on mount,
// tabular number at the center. Reused across Home + Recovery.
export function ReadinessRing({
  value,
  label = "Readiness",
  sublabel,
  size = 200,
  stroke = 14,
}: {
  value: number; // 0-100
  label?: string;
  sublabel?: string;
  size?: number;
  stroke?: number;
}) {
  const [shown, setShown] = useState(0);
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const tone = value >= 75 ? "var(--good)" : value >= 50 ? "var(--volt)" : value >= 30 ? "var(--warn)" : "var(--bad)";

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const dur = 1100;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  const offset = circ - (shown / 100) * circ;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ filter: "drop-shadow(0 0 6px color-mix(in srgb, " + tone + " 50%, transparent))" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="metric text-5xl font-bold" style={{ color: tone }}>{shown}</span>
        <span className="mt-1 text-xs font-semibold uppercase tracking-widest text-text-3">{label}</span>
        {sublabel && <span className="mt-0.5 text-xs text-text-2">{sublabel}</span>}
      </div>
    </div>
  );
}
