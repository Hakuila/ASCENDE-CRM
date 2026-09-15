"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { ChartCard } from "./chart-card";

export function LeadsByDayChart({ data }: { data: { date: string; count: number }[] }) {
  return (
    <ChartCard title="Leads por período" isEmpty={data.length === 0}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            tickFormatter={(d) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
          />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip
            labelFormatter={(d) => new Date(d as string).toLocaleDateString("pt-BR")}
            formatter={(v) => [v, "Leads"]}
          />
          <Line type="monotone" dataKey="count" stroke="#1C2A5A" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
