"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/get-session";
import { canManageIntegrations } from "@/lib/permissions";
import { metaIntegrationSchema } from "@/lib/validations/integrations";

export type IntegrationFormState = { error?: string; success?: boolean } | null;

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
  const { error } = await supabase.from("integrations").upsert(
    {
      organization_id: session.organization.id,
      provider: "meta_ads",
      is_active: true,
      config: { page_id: parsed.data.pageId, page_access_token: parsed.data.pageAccessToken },
    },
    { onConflict: "organization_id,provider" }
  );

  if (error) return { error: "Não foi possível salvar a integração." };

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
