"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

export function ExerciseProgressChart({ data }: { data: { date: string; topWeight: number }[] }) {
  return (
    <div className="mt-3 h-44">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
          <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: "var(--chart-axis)", fontSize: 11 }} />
          <YAxis
            domain={["dataMin - 5", "dataMax + 5"]}
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
            formatter={(value) => [`${value} kg`, "Top set"]}
          />
          <Line type="monotone" dataKey="topWeight" stroke="var(--volt)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--volt)" }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
