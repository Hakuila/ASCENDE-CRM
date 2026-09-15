import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export type MetaConfig = { page_id?: string; page_access_token?: string };

export async function getMetaIntegration(organizationId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("integrations")
    .select("id, is_active, config")
    .eq("organization_id", organizationId)
    .eq("provider", "meta_ads")
    .maybeSingle();
  return data as { id: string; is_active: boolean; config: MetaConfig } | null;
}

export async function getPublicApiKey(organizationId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("organizations")
    .select("public_api_key")
    .eq("id", organizationId)
    .maybeSingle();
  return data?.public_api_key ?? null;
}

/**
 * Usado só pelo webhook (backend, sem sessão de usuário) — precisa da
 * service role porque o request do Meta não carrega nenhum cookie/sessão
 * nosso, então não há RLS a favor dele.
 */
export async function findOrganizationByMetaPageId(pageId: string) {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("integrations")
    .select("organization_id, is_active, config")
    .eq("provider", "meta_ads")
    .eq("is_active", true)
    .contains("config", { page_id: pageId })
    .maybeSingle();
  return data as { organization_id: string; is_active: boolean; config: MetaConfig } | null;
}
