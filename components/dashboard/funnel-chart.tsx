"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { ChartCard } from "./chart-card";

export function FunnelChart({
  leads,
  opportunities,
  sales,
}: {
  leads: number;
  opportunities: number;
  sales: number;
}) {
  const data = [
    { stage: "Leads", value: leads },
    { stage: "Oportunidades", value: opportunities },
    { stage: "Vendas", value: sales },
  ];

  return (
    <ChartCard title="Funil de conversão" isEmpty={leads === 0}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="stage" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="value" fill="#1C2A5A" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
