"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { ChartCard } from "./chart-card";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function RevenueBySourceChart({ data }: { data: { source: string; value: number }[] }) {
  return (
    <ChartCard title="Receita por origem" isEmpty={data.length === 0}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${v}`} />
          <YAxis type="category" dataKey="source" tick={{ fontSize: 11 }} width={100} />
          <Tooltip formatter={(v) => [formatCurrency(v as number), "Receita"]} />
          <Bar dataKey="value" fill="#1C2A5A" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
