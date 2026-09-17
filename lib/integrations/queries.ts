import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

/**
 * P0-07: page_access_token não vive mais aqui — foi movido para o Supabase
 * Vault (ver access_token_secret_id na tabela integrations e as funções
 * set_integration_secret/get_integration_secret). config só guarda
 * metadados não sensíveis.
 */
export type MetaConfig = { page_id?: string };

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

