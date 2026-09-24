import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { AuditAction, AuditEntityType } from "@/lib/audit/log";

export type AuditLogFilters = {
  action?: string;
  entityType?: string;
  from?: string;
  to?: string;
};

export type AuditLogRow = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  before: unknown;
  after: unknown;
  created_at: string;
  actor: { name: string } | null;
};

const PAGE_SIZE = 50;

/**
 * Lista paginada de audit_logs para a organização atual. RLS já garante
 * que só um admin da própria organização (ou platform_admin) enxerga essas
 * linhas (ver migration 0007) — mas a página que chama isso também
 * confere isOrgAdmin antes de renderizar, então o erro de permissão fica
 * claro em vez de "lista vazia sem explicação".
 */
export async function getAuditLogs(organizationId: string, filters: AuditLogFilters, page: number) {
  const supabase = createClient();

  let query = supabase
    .from("audit_logs")
    .select(
      "id, action, entity_type, entity_id, before, after, created_at, actor:profiles(name)",
      { count: "exact" }
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (filters.action) query = query.eq("action", filters.action);
  if (filters.entityType) query = query.eq("entity_type", filters.entityType);
  if (filters.from) query = query.gte("created_at", filters.from);
  if (filters.to) query = query.lte("created_at", filters.to);

  const safePage = Math.max(1, page);
  const from = (safePage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, count, error } = await query.range(from, to);

  if (error) {
    throw new Error("Não foi possível carregar os logs de auditoria.");
  }

  return {
    logs: (data ?? []) as AuditLogRow[],
    total: count ?? 0,
    page: safePage,
    pageSize: PAGE_SIZE,
  };
}

/** Popula os selects de filtro só com ações/tipos que já ocorreram nesta organização. */
export async function getAuditLogFilterOptions(organizationId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("action, entity_type")
    .eq("organization_id", organizationId);

  if (error) {
    throw new Error("Não foi possível carregar os filtros de auditoria.");
  }

  const actions = Array.from(new Set((data ?? []).map((r) => r.action))).sort() as AuditAction[];
  const entityTypes = Array.from(
    new Set((data ?? []).map((r) => r.entity_type))
  ).sort() as AuditEntityType[];

  return { actions, entityTypes };
}
