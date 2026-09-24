import type { AuditAction, AuditEntityType } from "@/lib/audit/log";

/**
 * Traduz os códigos de ação/tipo (vocabulário fechado em lib/audit/log.ts)
 * para texto legível na tela de auditoria. Se uma ação nova for adicionada
 * lá e esquecerem de adicionar aqui, cai no fallback (mostra o código cru)
 * — não quebra a tela.
 */
export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  "organization.updated": "Dados da empresa atualizados",
  "membership.invited": "Membro convidado",
  "membership.role_changed": "Papel do membro alterado",
  "membership.removed": "Membro removido",
  "pipeline_stage.created": "Etapa criada",
  "pipeline_stage.updated": "Etapa atualizada",
  "pipeline_stage.deleted": "Etapa excluída",
  "pipeline_stage.reordered": "Etapa reordenada",
  "integration.updated": "Integração atualizada",
  "integration.toggled": "Integração ativada/desativada",
  "integration.secret_rotated": "Token da integração rotacionado",
  "public_api_key.regenerated": "Chave de API pública regenerada",
  "agency_client.provisioned": "Cliente provisionado",
  "agency_staff.created": "Staff da agência criado",
  "agency_staff.removed": "Staff da agência removido",
};

export const AUDIT_ENTITY_LABELS: Record<AuditEntityType, string> = {
  organization: "Organização",
  membership: "Membro da equipe",
  pipeline_stage: "Etapa do pipeline",
  integration: "Integração",
  platform_admin: "Staff da agência",
};
