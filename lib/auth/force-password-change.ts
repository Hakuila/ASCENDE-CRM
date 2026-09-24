import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Marca a conta para exigir troca de senha no próximo login — usado logo
 * após criar um usuário com senha temporária (convite de equipe, cliente
 * ou staff da agência). Precisa do client com service role: a coluna
 * profiles.must_change_password não aceita UPDATE de `authenticated`, só
 * de `service_role` (ver migration 0007) — de propósito, pra ninguém
 * conseguir desligar a própria obrigatoriedade sem realmente trocar a senha.
 *
 * Nunca lança: uma falha aqui não deve impedir a criação da conta em si,
 * só fica sem a obrigatoriedade (loga pra investigação).
 */
export async function forceMustChangePassword(admin: SupabaseClient<Database>, userId: string) {
  const { error } = await admin
    .from("profiles")
    .update({ must_change_password: true })
    .eq("id", userId);

  if (error) {
    console.error(
      `[force-password-change] falha ao marcar must_change_password para ${userId}:`,
      error.message
    );
  }
}
