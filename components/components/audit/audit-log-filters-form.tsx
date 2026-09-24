import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AUDIT_ACTION_LABELS, AUDIT_ENTITY_LABELS } from "@/lib/audit/labels";

export function AuditLogFiltersForm({
  filterOptions,
  current,
}: {
  filterOptions: { actions: string[]; entityTypes: string[] };
  current: { action?: string; entityType?: string; from?: string; to?: string };
}) {
  return (
    <form
      method="GET"
      action="/settings/auditoria"
      className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-100 bg-white p-4"
    >
      <div>
        <label className="mb-1.5 block text-xs font-medium text-gray-500">Ação</label>
        <Select name="action" defaultValue={current.action ?? ""} className="w-56">
          <option value="">Todas</option>
          {filterOptions.actions.map((a) => (
            <option key={a} value={a}>
              {AUDIT_ACTION_LABELS[a] ?? a}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-gray-500">Tipo</label>
        <Select name="entityType" defaultValue={current.entityType ?? ""} className="w-44">
          <option value="">Todos</option>
          {filterOptions.entityTypes.map((t) => (
            <option key={t} value={t}>
              {AUDIT_ENTITY_LABELS[t] ?? t}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-gray-500">De</label>
        <input
          type="date"
          name="from"
          defaultValue={current.from ?? ""}
          className="w-40 rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-gray-500">Até</label>
        <input
          type="date"
          name="to"
          defaultValue={current.to ?? ""}
          className="w-40 rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </div>

      <Button type="submit" variant="secondary">
        Filtrar
      </Button>
    </form>
  );
}
