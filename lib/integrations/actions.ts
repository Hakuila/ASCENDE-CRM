"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/get-session";
import { canManageIntegrations } from "@/lib/permissions";
import { metaIntegrationSchema } from "@/lib/validations/integrations";

export type IntegrationFormState = { error?: string; success?: boolean } | null;

/**
 * P0-07: page_access_token nunca mais é gravado em texto puro dentro de
 * integrations.config. O fluxo agora é em duas etapas:
 *
 *   1) upsert de integrations com config = { page_id } (não sensível);
 *   2) RPC set_integration_secret, que grava/rotaciona o token cifrado no
 *      Supabase Vault e guarda só a referência (access_token_secret_id) na
 *      linha da integração.
 *
 * Nenhuma Server Action deste arquivo lê o token de volta para exibir na
 * UI — a função que decifra (get_integration_secret) é restrita à
 * service_role e só deve ser chamada pelo job/webhook que efetivamente
 * fala com a API do Meta (via lib/supabase/admin.ts).
 */
export async function saveMetaIntegrationAction(
  _prevState: IntegrationFormState,
  formData: FormData
): Promise<IntegrationFormState> {
  const session = await getSession();
  if (!session?.organization || !canManageIntegrations(session)) {
    return { error: "Apenas administradores podem configurar integrações." };
  }

  const parsed = metaIntegrationSchema.safeParse({
    pageId: formData.get("pageId"),
    pageAccessToken: formData.get("pageAccessToken"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = createClient();
  const organizationId = session.organization.id;

  const { error: upsertError } = await supabase.from("integrations").upsert(
    {
      organization_id: organizationId,
      provider: "meta_ads",
      is_active: true,
      // Só o page_id (não sensível) vai no JSONB — o token vai para o Vault.
      config: { page_id: parsed.data.pageId },
    },
    { onConflict: "organization_id,provider" }
  );

  if (upsertError) return { error: "Não foi possível salvar a integração." };

  const { error: secretError } = await supabase.rpc("set_integration_secret", {
    p_organization_id: organizationId,
    p_provider: "meta_ads",
    p_secret: parsed.data.pageAccessToken,
  });

  if (secretError) {
    return {
      error:
        "A integração foi salva, mas não foi possível gravar o token com segurança. Tente salvar novamente.",
    };
  }

  revalidatePath("/integrations");
  return { success: true };
}

export async function toggleMetaIntegrationAction(isActive: boolean) {
  const session = await getSession();
  if (!session?.organization || !canManageIntegrations(session)) return;

  const supabase = createClient();
  await supabase
    .from("integrations")
    .update({ is_active: isActive })
    .eq("organization_id", session.organization.id)
    .eq("provider", "meta_ads");

  revalidatePath("/integrations");
}

export async function regeneratePublicApiKeyAction() {
  const session = await getSession();
  if (!session?.organization || !canManageIntegrations(session)) return;

  const newKey = crypto.randomUUID().replace(/-/g, "");
  const supabase = createClient();
  await supabase
    .from("organizations")
    .update({ public_api_key: newKey })
    .eq("id", session.organization.id);

  revalidatePath("/integrations");
}