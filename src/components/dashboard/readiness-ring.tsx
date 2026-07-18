"use client";

// Circular readiness gauge — SVG ring with animated fill.
export function ReadinessRing({ score, size = 116 }: { score: number; size?: number }) {
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color = score >= 70 ? "var(--volt)" : score >= 45 ? "var(--warning)" : "var(--danger)";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset}
          style={{ ["--ring-circumference" as string]: c, animation: "ring-fill 1.1s cubic-bezier(0.22,1,0.36,1) both" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-score text-3xl font-bold leading-none">{score}</span>
        <span className="mt-0.5 text-[10px] font-medium uppercase tracking-widest text-muted">ready</span>
      </div>
    </div>
  );
}
