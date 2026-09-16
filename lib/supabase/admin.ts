import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * P1-07: cliente com a service role key — ignora RLS completamente.
 *
 * Vive isolado neste arquivo (em vez de lib/supabase/server.ts) por dois
 * motivos:
 *
 *   1) "server-only" faz o build FALHAR se qualquer código destinado ao
 *      browser importar este arquivo, mesmo que indiretamente através de
 *      uma cadeia de imports — proteção em tempo de build, não só de code
 *      review.
 *   2) Isolar o arquivo deixa explícito, em qualquer PR, quando uma
 *      mudança está tocando em código com acesso irrestrito ao banco —
 *      "estou importando lib/supabase/admin" chama atenção de um jeito que
 *      "estou importando lib/supabase/server" (usado em todo lugar) não
 *      chama.
 *
 * Uso restrito a: webhooks (ex.: Meta Lead Ads, que não tem sessão de
 * usuário para autenticar via RLS) e jobs internos de backend/scripts
 * administrativos (ex.: provisionamento de clientes). Nunca usar em
 * Server Actions ou Server Components que atendem uma requisição de
 * usuário comum — para esses casos, lib/supabase/server.ts (com RLS) é o
 * client correto.
 *
 * Diferente do client de lib/supabase/server.ts, este não precisa de
 * cookies: a service role não representa uma sessão de usuário, então
 * usamos o client base do @supabase/supabase-js em vez do createServerClient
 * do @supabase/ssr (que existe justamente para gerenciar cookies de sessão).
 */
export function createServiceRoleClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
