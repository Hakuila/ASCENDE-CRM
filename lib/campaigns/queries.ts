import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function getCampaignsList(organizationId: string) {
  const supabase = createClient();
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, name, platform, spend, impressions, clicks, created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (!campaigns || campaigns.length === 0) return [];

  // Conta leads reais por campanha (mais confiável que manter um contador
  // manual sincronizado) e soma vendas/receita vinda de deals ganhos.
  const { data: leads } = await supabase
    .from("leads")
    .select("campaign_id")
    .eq("organization_id", organizationId)
    .in("campaign_id", campaigns.map((c) => c.id));

  const leadCounts = new Map<string, number>();
  for (const lead of leads ?? []) {
    if (!lead.campaign_id) continue;
    leadCounts.set(lead.campaign_id, (leadCounts.get(lead.campaign_id) ?? 0) + 1);
  }

  return campaigns.map((c) => {
    const leadsCount = leadCounts.get(c.id) ?? 0;
    const cpl = c.spend > 0 && leadsCount > 0 ? c.spend / leadsCount : null;
    return { ...c, leadsCount, cpl };
  });
}

export async function getCampaignById(organizationId: string, campaignId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("campaigns")
    .select("id, name, platform, external_id, spend, impressions, clicks, created_at")
    .eq("organization_id", organizationId)
    .eq("id", campaignId)
    .maybeSingle();
  return data;
}

export async function getCampaignPerformance(organizationId: string, campaignId: string) {
  const supabase = createClient();

  const { data: leads } = await supabase
    .from("leads")
    .select("id, name, created_at, stage:pipeline_stages(name, kind)")
    .eq("organization_id", organizationId)
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false });

  const leadIds = (leads ?? []).map((l) => l.id);
  let sales = 0;
  let revenue = 0;

  if (leadIds.length > 0) {
    const { data: deals } = await supabase
      .from("deals")
      .select("value, status, lead_id")
      .in("lead_id", leadIds)
      .eq("status", "won");
    sales = deals?.length ?? 0;
    revenue = (deals ?? []).reduce((sum, d) => sum + (d.value ?? 0), 0);
  }

  return { leads: leads ?? [], sales, revenue };
}

/** Lista simples para popular o <select> de campanha no formulário de lead. */
export async function getCampaignsForSelect(organizationId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("campaigns")
    .select("id, name")
    .eq("organization_id", organizationId)
    .order("name", { ascending: true });
  return data ?? [];
}
