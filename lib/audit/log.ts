import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * P2-01: ações administrativas auditadas. Mantém um vocabulário fechado
 * (em vez de string livre) para os logs ficarem consistentes e
 * filtráveis — se precisar de uma ação nova, adicione aqui.
 */
export type AuditAction =
  | "organization.updated"
  | "membership.invited"
  | "membership.role_changed"
  | "membership.removed"
  | "pipeline_stage.created"
  | "pipeline_stage.updated"
  | "pipeline_stage.deleted"
  | "pipeline_stage.reordered"
  | "integration.updated"
  | "integration.toggled"
  | "integration.secret_rotated"
  | "public_api_key.regenerated"
  | "agency_client.provisioned"
  | "agency_staff.created"
  | "agency_staff.removed";

export type AuditEntityType =
  | "organization"
  | "membership"
  | "pipeline_stage"
  | "integration"
  | "platform_admin";

/**
 * Registra uma alteração administrativa em audit_logs, via a RPC
 * log_audit_event (única forma de escrita — ver migration 0007).
 *
 * Nunca lança: uma falha ao registrar auditoria não deve impedir a ação
 * principal de completar (ex.: não faz sentido bloquear a troca de role
 * de um membro porque o log de auditoria falhou). A falha é logada no
 * console para investigação.
 *
 * `organizationId: null` é válido para ações sem organização (ex.: gestão
 * de staff da agência).
 */
export async function logAuditEvent(params: {
  organizationId: string | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
}) {
  const supabase = createClient();
  const { error } = await supabase.rpc("log_audit_event", {
    p_organization_id: params.organizationId,
    p_action: params.action,
    p_entity_type: params.entityType,
    p_entity_id: params.entityId ?? null,
    p_before: (params.before ?? null) as never,
    p_after: (params.after ?? null) as never,
  });

  if (error) {
    console.error(`[audit] falha ao registrar "${params.action}":`, error.message);
  }
}