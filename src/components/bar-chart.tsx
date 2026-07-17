/** Gráfico de barras minimalista en SVG, sin dependencias. */
export interface Bar {
  label: string;
  value: number;
}

export function BarChart({
  data,
  colorVar = '--cat-delivery',
  height = 120,
}: {
  data: Bar[];
  colorVar?: string;
  height?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const gap = 6;
  const barW = 100 / data.length;

  return (
    <div className="rounded-2xl p-4" style={{ background: 'rgb(var(--surface))' }}>
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
        {data.map((d, i) => {
          const h = (d.value / max) * (height - 20);
          const x = i * barW + gap / 2;
          const w = barW - gap;
          return (
            <g key={i}>
              <rect
                x={x}
                y={height - 16 - h}
                width={w}
                height={Math.max(0, h)}
                rx={2}
                fill={`rgb(var(${colorVar}))`}
                opacity={d.value > 0 ? 1 : 0.15}
              />
              <text x={x + w / 2} y={height - 4} fontSize="5" textAnchor="middle" fill="rgb(var(--muted))">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
