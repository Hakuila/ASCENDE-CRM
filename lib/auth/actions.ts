"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  loginSchema,
  forgotPasswordSchema,
  updatePasswordSchema,
} from "@/lib/validations/auth";

export type ActionState = { error?: string } | null;

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

// ---------------------------------------------------------------------------
// LOGIN
// ---------------------------------------------------------------------------
/**
 * P1-02: rate limit por IP, movido do middleware.ts pra cá. Login é uma
 * Server Action (useFormState) — o middleware interceptando o POST e
 * devolvendo um NextResponse.json() quebrava o protocolo de resposta que
 * o useFormState espera, fazendo o erro simplesmente não aparecer na tela
 * a partir da tentativa limitada. Aqui a resposta já sai no formato certo
 * (`{ error }`), igual a qualquer outro erro desta action.
 */
export async function signInAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const ip = getClientIp(headers());
  const limit = await checkRateLimit(`login:${ip}`, 60, 10);
  if (!limit.allowed) {
    return { error: "Muitas tentativas. Aguarde um minuto e tente novamente." };
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: traduzErroLogin(error.message) };
  }

  redirect("/dashboard");
}

// ---------------------------------------------------------------------------
// LOGOUT
// ---------------------------------------------------------------------------
export async function signOutAction() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// ---------------------------------------------------------------------------
// SOLICITAR RECUPERAÇÃO DE SENHA
// ---------------------------------------------------------------------------
/**
 * P1-02: rate limit mais apertado que o login (5/min) — cada tentativa
 * dispara um e-mail de verdade via Supabase Auth, então o custo de abuso
 * aqui é spam de caixa de entrada, não só tentativa de credencial.
 */
export async function requestPasswordResetAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const ip = getClientIp(headers());
  const limit = await checkRateLimit(`forgot-password:${ip}`, 60, 5);
  if (!limit.allowed) {
    return { error: "Muitas tentativas. Aguarde um minuto e tente novamente." };
  }

  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${appUrl()}/auth/callback?next=/update-password`,
  });

  // Sempre responde como sucesso (não revelar se o e-mail existe ou não)
  redirect("/forgot-password/verifique-seu-email");
}

// ---------------------------------------------------------------------------
// DEFINIR NOVA SENHA (usuário já chegou autenticado via link de recuperação
// OU está sendo forçado a trocar a senha temporária no primeiro acesso)
// ---------------------------------------------------------------------------
export async function updatePasswordAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { error: "Não foi possível atualizar a senha. Peça um novo link." };
  }

  // Só desliga a obrigatoriedade DEPOIS que a senha já mudou de verdade —
  // profiles.must_change_password não aceita UPDATE direto (nem do próprio
  // usuário), só através desta RPC (ver migration 0007).
  const { error: clearError } = await supabase.rpc("clear_must_change_password");
  if (clearError) {
    console.error("[updatePasswordAction] falha ao limpar must_change_password:", clearError.message);
  }

  redirect("/dashboard");
}

function traduzErroLogin(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("email not confirmed")) {
    return "Este e-mail ainda não foi confirmado. Verifique sua caixa de entrada ou peça um novo link de confirmação.";
  }
  if (lower.includes("invalid login credentials")) {
    return "E-mail ou senha incorretos.";
  }
  // Não reconhecido: mostra a mensagem original para facilitar o diagnóstico
  // (trocar por uma mensagem genérica antes de ir para produção).
  return `Não foi possível entrar: ${message}`;
}
