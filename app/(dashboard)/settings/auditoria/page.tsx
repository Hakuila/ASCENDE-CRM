import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { isOrgAdmin } from "@/lib/permissions";
import { getAuditLogs, getAuditLogFilterOptions } from "@/lib/audit/queries";
import { AuditLogFiltersForm } from "@/components/audit/audit-log-filters-form";
import { AUDIT_ACTION_LABELS, AUDIT_ENTITY_LABELS } from "@/lib/audit/labels";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: { action?: string; entityType?: string; from?: string; to?: string; page?: string };
}) {
  const session = await getSession();
  if (!session?.organization) redirect("/login");

  // Auditoria é coisa de admin — mesma regra de quem pode editar dados da
  // empresa (isOrgAdmin já cobre platform_admin atuando na organização).
  if (!isOrgAdmin(session)) redirect("/settings");

  const organizationId = session.organization.id;
  const page = Number(searchParams.page ?? "1") || 1;
  const filters = {
    action: searchParams.action,
    entityType: searchParams.entityType,
    from: searchParams.from,
    to: searchParams.to,
  };

  const [filterOptions, { logs, total, pageSize }] = await Promise.all([
    getAuditLogFilterOptions(organizationId),
    getAuditLogs(organizationId, filters, page),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (filters.action) params.set("action", filters.action);
    if (filters.entityType) params.set("entityType", filters.entityType);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    params.set("page", String(p));
    return `/settings/auditoria?${params.toString()}`;
  };

  return (
    <div>
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Auditoria</h1>
        <p className="mt-1 text-sm text-gray-500">
          Histórico de alterações administrativas — organização, equipe, pipeline e integrações.
          Para o histórico de vendas/leads, veja a timeline de cada lead.
        </p>
      </div>

      <div className="mt-4">
        <AuditLogFiltersForm filterOptions={filterOptions} current={filters} />
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50 text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Quando</th>
              <th className="px-4 py-3 font-medium">Ação</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Quem</th>
              <th className="px-4 py-3 font-medium">Detalhes</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  Nenhum registro encontrado com esses filtros.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-b border-gray-50 align-top last:border-0">
                  <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                    {formatDateTime(log.created_at)}
                  </td>
                  <td className="px-4 py-3 text-gray-900">
                    {AUDIT_ACTION_LABELS[log.action as keyof typeof AUDIT_ACTION_LABELS] ?? log.action}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {AUDIT_ENTITY_LABELS[log.entity_type as keyof typeof AUDIT_ENTITY_LABELS] ??
                      log.entity_type}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{log.actor?.name ?? "Sistema"}</td>
                  <td className="px-4 py-3">
                    {log.before || log.after ? (
                      <details>
                        <summary className="cursor-pointer text-brand">Ver</summary>
                        <div className="mt-2 space-y-2">
                          {log.before ? (
                            <div>
                              <p className="text-xs font-medium text-gray-400">Antes</p>
                              <pre className="mt-1 max-w-xs overflow-x-auto rounded-lg bg-gray-50 p-2 text-xs text-gray-600">
                                {JSON.stringify(log.before, null, 2)}
                              </pre>
                            </div>
                          ) : null}
                          {log.after ? (
                            <div>
                              <p className="text-xs font-medium text-gray-400">Depois</p>
                              <pre className="mt-1 max-w-xs overflow-x-auto rounded-lg bg-gray-50 p-2 text-xs text-gray-600">
                                {JSON.stringify(log.after, null, 2)}
                              </pre>
                            </div>
                          ) : null}
                        </div>
                      </details>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-sm text-gray-500">
            <span>
              Página {page} de {totalPages} ({total} registros)
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <a href={pageHref(page - 1)} className="text-brand hover:underline">
                  Anterior
                </a>
              )}
              {page < totalPages && (
                <a href={pageHref(page + 1)} className="text-brand hover:underline">
                  Próxima
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
