import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

/**
 * Cliente Supabase para uso em Server Components, Server Actions e
 * Route Handlers. Lê/escreve a sessão via cookies do Next.js.
 * Continua sujeito à RLS (usa a anon key) — é o cliente "como o usuário".
 *
 * Importante: @supabase/ssr >= 0.4 usa a API getAll/setAll (não get/set/remove).
 * Usar a API antiga faz a leitura da sessão falhar silenciosamente.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // chamado a partir de um Server Component sem permissão de escrita;
            // seguro ignorar quando o middleware já cuida de renovar a sessão
          }
        },
      },
    }
  );
}

/**
 * Cliente com a service role key — ignora RLS.
 * Uso restrito a: webhooks (ex.: Meta Lead Ads) e jobs internos de backend.
 * NUNCA importar este arquivo em código que roda no browser.
 */
export function createServiceRoleClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
}
