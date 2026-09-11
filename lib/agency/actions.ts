"use server";

import { getSession } from "@/lib/auth/get-session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { inviteClientSchema } from "@/lib/validations/agency";

export type InviteClientState =
  | { error: string; success?: undefined }
  | { error?: undefined; success: true; email: string; tempPassword: string }
  | null;

/**
 * Gera uma senha temporária legível o suficiente para digitar/copiar, mas
 * forte o bastante para não ser um risco (letras, números, símbolo).
 */
function generateTempPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let base = "";
  for (let i = 0; i < 10; i++) {
    base += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `${base}!9`;
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

  const { error: rpcError } = await admin.rpc("create_organization_for_user", {
    org_name: orgName,
    target_user_id: created.user.id,
  });

  if (rpcError) {
    // A conta já foi criada em auth.users; melhor avisar claramente do que
    // deixar um usuário "fantasma" sem organização e sem explicação.
    return {
      error: `Conta criada, mas falhou ao criar a organização: ${rpcError.message}. Delete o usuário "${adminEmail}" em Authentication → Users e tente de novo.`,
    };
  }

  return { success: true, email: adminEmail, tempPassword };
}

function traduzErroCriacao(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("already been registered") || lower.includes("already registered")) {
    return "Já existe uma conta com esse e-mail.";
  }
  return `Não foi possível criar a conta: ${message}`;
}
