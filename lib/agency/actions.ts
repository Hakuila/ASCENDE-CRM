"use server";

import { randomInt } from "crypto";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/get-session";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { inviteClientSchema } from "@/lib/validations/agency";
import { logAuditEvent } from "@/lib/audit/log";

export type InviteClientState =
  | { error: string; success?: undefined }
  | { error?: undefined; success: true; email: string; tempPassword: string }
  | null;

/**
 * Gera uma senha temporária legível o suficiente para digitar/copiar, mas
 * forte o bastante para não ser um risco (letras, números, símbolo).
 *
 * P1-06: Math.random() é um PRNG comum, não criptográfico — previsível o
 * suficiente para não ser apropriado para gerar credenciais, mesmo
 * temporárias. crypto.randomInt() usa a fonte de aleatoriedade segura do
 * sistema operacional.
 */
function generateTempPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let base = "";
  for (let i = 0; i < 10; i++) {
    base += alphabet[randomInt(0, alphabet.length)];
  }
  return `${base}!9`;
}

/**
 * P1-08: desfaz a criação do usuário no Auth quando a etapa seguinte do
 * provisionamento falha, para não deixar um usuário órfão (sem
 * organização/sem papel nenhum, mas existindo em auth.users). Usada tanto
 * por inviteClientAction quanto createStaffAction — mesmo padrão de duas
 * escritas não-transacionais nos dois fluxos.
 *
 * Se o próprio rollback falhar, cai no aviso manual anterior — mas isso
 * agora é o caso excepcional, não o caminho normal de erro.
 */
async function rollbackCreatedUser(
  admin: ReturnType<typeof createServiceRoleClient>,
  userId: string,
  email: string,
  originalErrorMessage: string
): Promise<string> {
  const { error: rollbackError } = await admin.auth.admin.deleteUser(userId);

  if (rollbackError) {
    console.error(`[agency] falha no rollback do usuário ${userId}:`, rollbackError.message);
    return `Conta criada, mas falhou ao concluir o provisionamento (${originalErrorMessage}) e não foi possível desfazer automaticamente. Delete o usuário "${email}" em Authentication → Users e tente de novo.`;
  }

  return `Não foi possível concluir o provisionamento de "${email}". Tente novamente.`;
}

/**
 * Cria a conta do cliente diretamente, com senha temporária — sem passar
 * por e-mail/link de convite. O link por e-mail se mostrou pouco confiável
 * neste ambiente (expira/invalida antes do clique real, provavelmente por
 * pré-varredura de segurança de algum provedor); criar a conta direto pelo
 * backend elimina essa dependência para o fluxo mais importante do
 * produto: colocar um cliente novo pra usar o CRM.
 *
 * Restrito a platform_admin — usa a service role key (Admin API do
 * Supabase Auth + bypassa RLS), então a checagem de permissão PRECISA
 * estar aqui no código, não só na RLS.
 */
export async function inviteClientAction(
  _prevState: InviteClientState,
  formData: FormData
): Promise<InviteClientState> {
  const session = await getSession();

  if (!session?.isPlatformAdmin) {
    return { error: "Apenas administradores da agência podem criar clientes." };
  }

  const parsed = inviteClientSchema.safeParse({
    orgName: formData.get("orgName"),
    adminName: formData.get("adminName"),
    adminEmail: formData.get("adminEmail"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { orgName, adminName, adminEmail } = parsed.data;
  const admin = createServiceRoleClient();
  const tempPassword = generateTempPassword();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: adminEmail,
    password: tempPassword,
    email_confirm: true, // já confirmado — não depende de link nenhum
    user_metadata: { name: adminName },
  });

  if (createError || !created.user) {
    return { error: traduzErroCriacao(createError?.message ?? "erro desconhecido") };
  }

  const { data: newOrgId, error: rpcError } = await admin.rpc("create_organization_for_user", {
    org_name: orgName,
    target_user_id: created.user.id,
  });

  if (rpcError) {
    // P1-08: antes só avisava para deletar manualmente — agora tenta
    // desfazer a criação do usuário primeiro.
    const error = await rollbackCreatedUser(admin, created.user.id, adminEmail, rpcError.message);
    return { error };
  }

  // organizationId aqui é a organização recém-criada (não a de quem está
  // executando a ação — quem chama é platform_admin, sem organização
  // própria), para o log aparecer no histórico do cliente provisionado.
  await logAuditEvent({
    organizationId: newOrgId ?? null,
    action: "agency_client.provisioned",
    entityType: "organization",
    entityId: newOrgId ?? null,
    after: { orgName, adminName, adminEmail },
  });

  return { success: true, email: adminEmail, tempPassword };
}

function traduzErroCriacao(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("already been registered") || lower.includes("already registered")) {
    return "Já existe uma conta com esse e-mail.";
  }
  return `Não foi possível criar a conta: ${message}`;
}

export type CreateStaffState =
  | { error: string; success?: undefined }
  | { error?: undefined; success: true; email: string; tempPassword: string }
  | null;

/**
 * Cria um novo membro do staff da agência (platform_admin) — mesmo padrão
 * de senha temporária usado para clientes, pelo mesmo motivo (link de
 * e-mail se mostrou pouco confiável neste ambiente).
 */
export async function createStaffAction(
  _prevState: CreateStaffState,
  formData: FormData
): Promise<CreateStaffState> {
  const session = await getSession();
  if (!session?.isPlatformAdmin) {
    return { error: "Apenas administradores da agência podem adicionar staff." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  if (name.length < 2) return { error: "Informe o nome." };
  if (!email.includes("@")) return { error: "Informe um e-mail válido." };

  const admin = createServiceRoleClient();
  const tempPassword = generateTempPassword();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { name },
  });

  if (createError || !created.user) {
    return { error: traduzErroCriacao(createError?.message ?? "erro desconhecido") };
  }

  const { error: insertError } = await admin
    .from("platform_admins")
    .insert({ user_id: created.user.id });

  if (insertError) {
    // P1-08: mesmo tratamento — tenta desfazer antes de pedir ação manual.
    const error = await rollbackCreatedUser(admin, created.user.id, email, insertError.message);
    return { error };
  }

  await logAuditEvent({
    organizationId: null, // staff da agência não pertence a uma organização
    action: "agency_staff.created",
    entityType: "platform_admin",
    entityId: created.user.id,
    after: { name, email },
  });

  return { success: true, email, tempPassword };
}

export async function removeStaffAction(userId: string) {
  const session = await getSession();
  if (!session?.isPlatformAdmin) return;
  if (userId === session.userId) return; // não remove a si mesmo

  const admin = createServiceRoleClient();
  await admin.from("platform_admins").delete().eq("user_id", userId);

  await logAuditEvent({
    organizationId: null,
    action: "agency_staff.removed",
    entityType: "platform_admin",
    entityId: userId,
  });

  revalidatePath("/agency-dashboard/usuarios");
}