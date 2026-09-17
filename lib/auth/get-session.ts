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
 *
 * P0-08: a regra de "uma organização por usuário" agora é garantida por
 * uma constraint UNIQUE(user_id) em memberships (migration 0007), então
 * esta query nunca deveria retornar mais de uma linha. Mesmo assim,
 * evitamos usar .maybeSingle() aqui: se a invariante for violada por
 * qualquer motivo (ex.: a constraint remover no futuro sem atualizar este
 * código, ou uma janela de inconsistência antes da migration ser aplicada
 * em todos os ambientes), .maybeSingle() lançaria uma exceção e derrubaria
 * a sessão de QUALQUER página para esse usuário. Preferimos degradar bem:
 * pegar a membership mais antiga e registrar um aviso para investigação.
 */
export async function getSession(): Promise<Session | null> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ data: profile }, { data: platformAdmin }, { data: memberships }] =
    await Promise.all([
      supabase.from("profiles").select("name, email").eq("id", user.id).maybeSingle(),
      supabase
        .from("platform_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("memberships")
        .select("role, created_at, organization:organizations(id, name)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
    ]);

  if ((memberships?.length ?? 0) > 1) {
    // Não deveria acontecer com a constraint memberships_one_org_per_user
    // em vigor — se acontecer, é sinal de dado inconsistente (ex.: criado
    // antes da migration 0007). Loga para investigação e segue com a
    // organização mais antiga em vez de quebrar a sessão do usuário.
    console.error(
      `Usuário ${user.id} tem ${memberships?.length} memberships — violação da regra de uma organização por usuário (P0-08).`
    );
  }

  const membership = memberships?.[0] ?? null;

  return {
    userId: user.id,
    name: profile?.name ?? user.email ?? "",
    email: profile?.email ?? user.email ?? "",
    isPlatformAdmin: Boolean(platformAdmin),
    organization: membership?.organization ?? null,
    role: (membership?.role as MembershipRole | undefined) ?? null,
  };
}