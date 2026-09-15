import Link from "next/link";
import type { PeriodPreset } from "@/lib/dashboard/date-range";

const presets: { label: string; value: PeriodPreset }[] = [
  { label: "Hoje", value: "today" },
  { label: "7 dias", value: "7d" },
  { label: "30 dias", value: "30d" },
  { label: "Este mês", value: "this_month" },
  { label: "Mês anterior", value: "last_month" },
];

export function PeriodFilter({
  current,
  customFrom,
  customTo,
}: {
  current: PeriodPreset;
  customFrom?: string;
  customTo?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {presets.map((p) => (
        <Link
          key={p.value}
          href={`/dashboard?period=${p.value}`}
          className={`rounded-full px-3 py-1.5 text-sm ${
            current === p.value ? "bg-brand text-white" : "bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          {p.label}
        </Link>
      ))}

      <form method="GET" action="/dashboard" className="flex items-center gap-2">
        <input type="hidden" name="period" value="custom" />
        <input
          type="date"
          name="from"
          defaultValue={customFrom}
          className="rounded-full border border-gray-200 px-3 py-1.5 text-sm"
        />
        <span className="text-sm text-gray-400">até</span>
        <input
          type="date"
          name="to"
          defaultValue={customTo}
          className="rounded-full border border-gray-200 px-3 py-1.5 text-sm"
        />
        <button
          type="submit"
          className={`rounded-full px-3 py-1.5 text-sm ${
            current === "custom" ? "bg-brand text-white" : "bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          Aplicar
        </button>
      </form>
    </div>
  );
}
