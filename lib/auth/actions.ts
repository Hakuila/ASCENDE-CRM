"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
export async function signInAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
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
export async function requestPasswordResetAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
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
// DEFINIR NOVA SENHA (usuário já chegou autenticado via link de recuperação)
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
