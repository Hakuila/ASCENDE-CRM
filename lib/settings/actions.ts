"use server";

import { randomInt } from "crypto";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/get-session";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { canManageOrgUsers, isOrgAdmin } from "@/lib/permissions";
import { organizationProfileSchema, inviteTeamMemberSchema } from "@/lib/validations/settings";
import { logAuditEvent } from "@/lib/audit/log";

export type SettingsFormState = { error?: string; success?: string } | null;
export type InviteMemberState =
  | { error: string; success?: undefined }
  | { error?: undefined; success: true; email: string; tempPassword: string }
  | null;

function toNullable(v: string | undefined) {
  return v && v.length > 0 ? v : null;
}

/**
 * P1-06: Math.random() não é criptograficamente seguro — é um PRNG
 * previsível (não desenhado para segredos), então uma senha temporária
 * gerada com ele é, em tese, adivinhável por quem conseguir observar
 * amostras suficientes do gerador. crypto.randomInt() usa a fonte de
 * aleatoriedade segura do sistema operacional (CSPRNG), apropriada para
 * credenciais.
 */
function generateTempPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let base = "";
  for (let i = 0; i < 10; i++) base += alphabet[randomInt(0, alphabet.length)];
  return `${base}!9`;
}

// ---------------------------------------------------------------------------
// PERFIL DA ORGANIZAÇÃO
// ---------------------------------------------------------------------------
export async function updateOrganizationAction(
  _prevState: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> {
  const session = await getSession();
  if (!session?.organization || !isOrgAdmin(session)) {
    return { error: "Você não tem permissão para editar os dados da empresa." };
  }

  const parsed = organizationProfileSchema.safeParse({
    name: formData.get("name"),
    legalName: formData.get("legalName"),
    cnpj: formData.get("cnpj"),
    logoUrl: formData.get("logoUrl"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = createClient();

  const { data: before } = await supabase
    .from("organizations")
    .select("name, legal_name, cnpj, logo_url")
    .eq("id", session.organization.id)
    .maybeSingle();

  const after = {
    name: parsed.data.name,
    legal_name: toNullable(parsed.data.legalName),
    cnpj: toNullable(parsed.data.cnpj),
    logo_url: toNullable(parsed.data.logoUrl),
  };

  const { error } = await supabase
    .from("organizations")
    .update(after)
    .eq("id", session.organization.id);

  if (error) return { error: "Não foi possível salvar. Tente novamente." };

  await logAuditEvent({
    organizationId: session.organization.id,
    action: "organization.updated",
    entityType: "organization",
    entityId: session.organization.id,
    before,
    after,
  });

  revalidatePath("/settings");
  return { success: "Dados da empresa atualizados." };
}

// ---------------------------------------------------------------------------
// CONVIDAR MEMBRO DA EQUIPE (mesma organização — senha temporária, sem e-mail)
// ---------------------------------------------------------------------------
/**
 * P1-08 (mesmo padrão do lib/agency/actions.ts): createUser() e o insert em
 * memberships são duas escritas separadas sem transação entre elas — se a
 * segunda falhar, o usuário criado no Auth fica órfão (sem organização,
 * sem como logar em lugar nenhum útil). Antes, a única saída era pedir pro
 * admin apagar manualmente pelo painel do Supabase. Agora, se o insert de
 * membership falhar, tentamos desfazer (deletar o usuário do Auth) antes
 * de responder — o fluxo fica efetivamente tudo-ou-nada.
 */
export async function inviteTeamMemberAction(
  _prevState: InviteMemberState,
  formData: FormData
): Promise<InviteMemberState> {
  const session = await getSession();
  if (!session?.organization || !canManageOrgUsers(session)) {
    return { error: "Você não tem permissão para adicionar pessoas à equipe." };
  }

  const parsed = inviteTeamMemberSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { name, email, role } = parsed.data;
  const admin = createServiceRoleClient();
  const tempPassword = generateTempPassword();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { name },
  });

  if (createError || !created.user) {
    const lower = (createError?.message ?? "").toLowerCase();
    if (lower.includes("already registered")) {
      return { error: "Já existe uma conta com esse e-mail." };
    }
    return { error: `Não foi possível criar a conta: ${createError?.message ?? "erro desconhecido"}` };
  }

  const { data: newMembership, error: membershipError } = await admin
    .from("memberships")
    .insert({
      organization_id: session.organization.id,
      user_id: created.user.id,
      role,
    })
    .select("id")
    .single();

  if (membershipError) {
    // Rollback: desfaz a criação do usuário no Auth para não deixar órfão.
    const { error: rollbackError } = await admin.auth.admin.deleteUser(created.user.id);

    if (rollbackError) {
      // Pior caso: nem a escrita original nem o rollback funcionaram.
      // Aí sim precisa de intervenção manual — mas isso agora é exceção,
      // não o caminho normal de erro.
      console.error(
        `[inviteTeamMemberAction] falha no rollback do usuário ${created.user.id}:`,
        rollbackError.message
      );
      return {
        error: `Conta criada, mas falhou ao adicionar à equipe (${membershipError.message}) e não foi possível desfazer automaticamente. Delete o usuário "${email}" em Authentication → Users e tente de novo.`,
      };
    }

    return { error: `Não foi possível adicionar "${email}" à equipe. Tente novamente.` };
  }

  await logAuditEvent({
    organizationId: session.organization.id,
    action: "membership.invited",
    entityType: "membership",
    entityId: newMembership.id,
    after: { email, role },
  });

  revalidatePath("/settings");
  return { success: true, email, tempPassword };
}

// ---------------------------------------------------------------------------
// MUDAR ROLE DE UM MEMBRO
// ---------------------------------------------------------------------------
export async function updateMemberRoleAction(
  membershipId: string,
  role: "client_admin" | "salesperson"
) {
  const session = await getSession();
  if (!session?.organization || !canManageOrgUsers(session)) return;

  const supabase = createClient();

  const { data: current } = await supabase
    .from("memberships")
    .select("role")
    .eq("id", membershipId)
    .maybeSingle();

  // Não deixa remover o último admin da organização.
  if (role === "salesperson") {
    const { count } = await supabase
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", session.organization.id)
      .eq("role", "client_admin");
    if (current?.role === "client_admin" && (count ?? 0) <= 1) {
      return; // silenciosamente ignora — a UI já avisa antes de chamar
    }
  }

  await supabase.from("memberships").update({ role }).eq("id", membershipId);

  await logAuditEvent({
    organizationId: session.organization.id,
    action: "membership.role_changed",
    entityType: "membership",
    entityId: membershipId,
    before: { role: current?.role ?? null },
    after: { role },
  });

  revalidatePath("/settings");
}

// ---------------------------------------------------------------------------
// REMOVER MEMBRO DA EQUIPE
// ---------------------------------------------------------------------------
export async function removeMemberAction(membershipId: string) {
  const session = await getSession();
  if (!session?.organization || !canManageOrgUsers(session)) return;

  const supabase = createClient();

  const { data: target } = await supabase
    .from("memberships")
    .select("user_id, role")
    .eq("id", membershipId)
    .maybeSingle();

  if (target?.user_id === session.userId) return; // não remove a si mesmo

  if (target?.role === "client_admin") {
    const { count } = await supabase
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", session.organization.id)
      .eq("role", "client_admin");
    if ((count ?? 0) <= 1) return; // não deixa a organização sem nenhum admin
  }

  await supabase.from("memberships").delete().eq("id", membershipId);

  await logAuditEvent({
    organizationId: session.organization.id,
    action: "membership.removed",
    entityType: "membership",
    entityId: membershipId,
    before: { user_id: target?.user_id ?? null, role: target?.role ?? null },
  });

  revalidatePath("/settings");
}