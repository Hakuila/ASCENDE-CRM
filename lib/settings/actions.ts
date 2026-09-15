"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/get-session";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { canManageOrgUsers, isOrgAdmin } from "@/lib/permissions";
import { organizationProfileSchema, inviteTeamMemberSchema } from "@/lib/validations/settings";

export type SettingsFormState = { error?: string; success?: string } | null;
export type InviteMemberState =
  | { error: string; success?: undefined }
  | { error?: undefined; success: true; email: string; tempPassword: string }
  | null;

function toNullable(v: string | undefined) {
  return v && v.length > 0 ? v : null;
}

function generateTempPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let base = "";
  for (let i = 0; i < 10; i++) base += alphabet[Math.floor(Math.random() * alphabet.length)];
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
  const { error } = await supabase
    .from("organizations")
    .update({
      name: parsed.data.name,
      legal_name: toNullable(parsed.data.legalName),
      cnpj: toNullable(parsed.data.cnpj),
      logo_url: toNullable(parsed.data.logoUrl),
    })
    .eq("id", session.organization.id);

  if (error) return { error: "Não foi possível salvar. Tente novamente." };

  revalidatePath("/settings");
  return { success: "Dados da empresa atualizados." };
}

// ---------------------------------------------------------------------------
// CONVIDAR MEMBRO DA EQUIPE (mesma organização — senha temporária, sem e-mail)
// ---------------------------------------------------------------------------
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

  const { error: membershipError } = await admin.from("memberships").insert({
    organization_id: session.organization.id,
    user_id: created.user.id,
    role,
  });

  if (membershipError) {
    return {
      error: `Conta criada, mas falhou ao adicionar à equipe: ${membershipError.message}. Delete o usuário "${email}" em Authentication → Users e tente de novo.`,
    };
  }

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

  // Não deixa remover o último admin da organização.
  if (role === "salesperson") {
    const { count } = await supabase
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", session.organization.id)
      .eq("role", "client_admin");
    const { data: current } = await supabase
      .from("memberships")
      .select("role")
      .eq("id", membershipId)
      .maybeSingle();
    if (current?.role === "client_admin" && (count ?? 0) <= 1) {
      return; // silenciosamente ignora — a UI já avisa antes de chamar
    }
  }

  await supabase.from("memberships").update({ role }).eq("id", membershipId);
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
  revalidatePath("/settings");
}
