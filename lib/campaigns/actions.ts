"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/get-session";
import { canManageIntegrations } from "@/lib/permissions";
import { campaignSchema } from "@/lib/validations/campaigns";

export type CampaignFormState = { error?: string } | null;

function toNullable(v: string | undefined) {
  return v && v.length > 0 ? v : null;
}

function parseCampaignForm(formData: FormData) {
  return campaignSchema.safeParse({
    name: formData.get("name"),
    platform: formData.get("platform"),
    externalId: formData.get("externalId"),
    spend: formData.get("spend"),
    impressions: formData.get("impressions"),
    clicks: formData.get("clicks"),
  });
}

async function requireAdminSession() {
  const session = await getSession();
  if (!session?.organization || !canManageIntegrations(session)) {
    throw new Error("Você não tem permissão para gerenciar campanhas.");
  }
  return session;
}

export async function createCampaignAction(
  _prevState: CampaignFormState,
  formData: FormData
): Promise<CampaignFormState> {
  const session = await requireAdminSession();
  const parsed = parseCampaignForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { name, platform, externalId, spend, impressions, clicks } = parsed.data;
  const supabase = createClient();

  const { data: campaign, error } = await supabase
    .from("campaigns")
    .insert({
      organization_id: session.organization!.id,
      name,
      platform,
      external_id: toNullable(externalId),
      spend: spend ? Number(spend.replace(",", ".")) : 0,
      impressions: impressions ? Number(impressions) : 0,
      clicks: clicks ? Number(clicks) : 0,
    })
    .select("id")
    .single();

  if (error || !campaign) return { error: "Não foi possível criar a campanha." };

  revalidatePath("/campaigns");
  redirect(`/campaigns/${campaign.id}`);
}

export async function updateCampaignAction(
  campaignId: string,
  _prevState: CampaignFormState,
  formData: FormData
): Promise<CampaignFormState> {
  const session = await requireAdminSession();
  const parsed = parseCampaignForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { name, platform, externalId, spend, impressions, clicks } = parsed.data;
  const supabase = createClient();

  const { error } = await supabase
    .from("campaigns")
    .update({
      name,
      platform,
      external_id: toNullable(externalId),
      spend: spend ? Number(spend.replace(",", ".")) : 0,
      impressions: impressions ? Number(impressions) : 0,
      clicks: clicks ? Number(clicks) : 0,
    })
    .eq("id", campaignId)
    .eq("organization_id", session.organization!.id);

  if (error) return { error: "Não foi possível salvar a campanha." };

  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath("/campaigns");
  redirect(`/campaigns/${campaignId}`);
}

export async function deleteCampaignAction(campaignId: string) {
  const session = await requireAdminSession();
  const supabase = createClient();
  // leads dessa campanha ficam com campaign_id = null (ON DELETE SET NULL).
  await supabase.from("campaigns").delete().eq("id", campaignId).eq("organization_id", session.organization!.id);

  revalidatePath("/campaigns");
  redirect("/campaigns");
}
