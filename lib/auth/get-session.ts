import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { MembershipRole } from "@/lib/permissions";

export type Session = {
  userId: string;
  name: string;
  email: string;
  isPlatformAdmin: boolean;
  /** organização "ativa" — hoje o usuário pertence a no máximo uma (MVP) */
  organization: { id: string; name: string } | null;
  role: MembershipRole | null;
};

/**
 * Carrega tudo que as telas precisam saber sobre quem está logado:
 * é staff da agência? a qual organização pertence? com qual role?
 *
 * Retorna `null` se não houver usuário autenticado — quem chama decide
 * se redireciona para /login (normalmente feito no layout do grupo de rotas).
 */
export async function getSession(): Promise<Session | null> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ data: profile }, { data: platformAdmin }, { data: membership }] =
    await Promise.all([
      supabase.from("profiles").select("name, email").eq("id", user.id).maybeSingle(),
      supabase
        .from("platform_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("memberships")
        .select("role, organization:organizations(id, name)")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

  return {
    userId: user.id,
    name: profile?.name ?? user.email ?? "",
    email: profile?.email ?? user.email ?? "",
    isPlatformAdmin: Boolean(platformAdmin),
    organization: membership?.organization ?? null,
    role: (membership?.role as MembershipRole | undefined) ?? null,
  };
}
