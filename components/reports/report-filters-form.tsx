import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { PeriodPreset } from "@/lib/dashboard/date-range";

const periodOptions: { label: string; value: PeriodPreset }[] = [
  { label: "Hoje", value: "today" },
  { label: "7 dias", value: "7d" },
  { label: "30 dias", value: "30d" },
  { label: "Este mês", value: "this_month" },
  { label: "Mês anterior", value: "last_month" },
];

export function ReportFiltersForm({
  filterOptions,
  current,
}: {
  filterOptions: {
    campaigns: { id: string; name: string }[];
    members: { id: string; name: string }[];
    stages: { id: string; name: string }[];
    sources: string[];
  };
  current: {
    period: PeriodPreset;
    campaignId?: string;
    source?: string;
    ownerId?: string;
    stageId?: string;
  };
}) {
  return (
    <form
      method="GET"
      action="/reports"
      className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-100 bg-white p-4"
    >
      <div>
        <label className="mb-1.5 block text-xs font-medium text-gray-500">Período</label>
        <Select name="period" defaultValue={current.period} className="w-40">
          {periodOptions.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-gray-500">Campanha</label>
        <Select name="campaignId" defaultValue={current.campaignId ?? ""} className="w-44">
          <option value="">Todas</option>
          {filterOptions.campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-gray-500">Origem</label>
        <Select name="source" defaultValue={current.source ?? ""} className="w-40">
          <option value="">Todas</option>
          {filterOptions.sources.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-gray-500">Vendedor</label>
        <Select name="ownerId" defaultValue={current.ownerId ?? ""} className="w-44">
          <option value="">Todos</option>
          {filterOptions.members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-gray-500">Etapa</label>
        <Select name="stageId" defaultValue={current.stageId ?? ""} className="w-40">
          <option value="">Todas</option>
          {filterOptions.stages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </div>

      <Button type="submit" variant="secondary">
        Filtrar
      </Button>
    </form>
  );
}
