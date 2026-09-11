import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

/**
 * Cliente Supabase para uso em Client Components.
 * Usa a anon key — RLS é a única camada de proteção real, o que é
 * esperado: nunca confiar no frontend, sempre no banco (ver migration 0001).
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
