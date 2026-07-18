"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";

export function WeeklyVolumeChart({ data }: { data: { week: string; volumen: number }[] }) {
  return (
    <div className="mt-3 h-40">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="week"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--chart-axis)", fontSize: 11 }}
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
            formatter={(value) => [`${Number(value).toLocaleString()} kg`, "Volume"]}
          />
          <Bar dataKey="volumen" fill="var(--volt)" radius={[6, 6, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
