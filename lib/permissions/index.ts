export type MembershipRole = "client_admin" | "salesperson";

type RoleContext = {
  isPlatformAdmin: boolean;
  role: MembershipRole | null;
};

/** Staff da agência ou client_admin da própria organização. */
export function isOrgAdmin({ isPlatformAdmin, role }: RoleContext): boolean {
  return isPlatformAdmin || role === "client_admin";
}

export function canManageOrgUsers(ctx: RoleContext): boolean {
  return isOrgAdmin(ctx);
}

export function canManagePipelineSettings(ctx: RoleContext): boolean {
  return isOrgAdmin(ctx);
}

export function canManageIntegrations(ctx: RoleContext): boolean {
  return isOrgAdmin(ctx);
}

export function canDeleteLead(ctx: RoleContext): boolean {
  return isOrgAdmin(ctx);
}

/** Todo usuário com sessão válida (client_admin ou salesperson) pode operar leads/pipeline/tarefas. */
export function canManageLeads({ role, isPlatformAdmin }: RoleContext): boolean {
  return isPlatformAdmin || role === "client_admin" || role === "salesperson";
}
