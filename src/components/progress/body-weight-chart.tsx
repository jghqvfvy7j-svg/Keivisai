"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

export function BodyWeightChart({ data }: { data: { date: string; peso: number }[] }) {
  return (
    <div className="mt-3 h-44">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
          <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: "var(--chart-axis)", fontSize: 11 }} />
          <YAxis
            domain={["dataMin - 1", "dataMax + 1"]}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--chart-axis)", fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{
              background: "var(--surface-2)",
              border: "1px solid var(--border-strong)",
              borderRadius: 12,
              fontSize: 12,
              color: "var(--foreground)",
            }}
            labelStyle={{ color: "var(--muted)" }}
            itemStyle={{ color: "var(--foreground)" }}
            formatter={(value) => [`${value} kg`, "Weight"]}
          />
          <Line type="monotone" dataKey="peso" stroke="var(--volt)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--volt)" }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
