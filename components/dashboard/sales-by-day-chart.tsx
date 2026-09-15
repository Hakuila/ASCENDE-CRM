"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { ChartCard } from "./chart-card";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function SalesByDayChart({ data }: { data: { date: string; value: number }[] }) {
  return (
    <ChartCard title="Vendas por período" isEmpty={data.length === 0}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            tickFormatter={(d) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
          />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${v}`} />
          <Tooltip
            labelFormatter={(d) => new Date(d as string).toLocaleDateString("pt-BR")}
            formatter={(v) => [formatCurrency(v as number), "Vendido"]}
          />
          <Bar dataKey="value" fill="#A7D668" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
