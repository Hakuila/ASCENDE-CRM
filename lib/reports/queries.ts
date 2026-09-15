import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { DateRange } from "@/lib/dashboard/date-range";

export type ReportFilters = {
  range: DateRange;
  campaignId?: string;
  source?: string;
  ownerId?: string;
  stageId?: string;
};

export async function getReportFilterOptions(organizationId: string) {
  const supabase = createClient();

  const [{ data: campaigns }, { data: members }, { data: stages }, { data: sourcesRaw }] =
    await Promise.all([
      supabase
        .from("campaigns")
        .select("id, name")
        .eq("organization_id", organizationId)
        .order("name", { ascending: true }),
      supabase
        .from("memberships")
        .select("user_id, profile:profiles(id, name)")
        .eq("organization_id", organizationId),
      supabase
        .from("pipeline_stages")
        .select("id, name, order_index")
        .eq("organization_id", organizationId)
        .order("order_index", { ascending: true }),
      supabase
        .from("leads")
        .select("source")
        .eq("organization_id", organizationId)
        .not("source", "is", null),
    ]);

  const sources = Array.from(new Set((sourcesRaw ?? []).map((l) => l.source).filter(Boolean))) as string[];

  return {
    campaigns: campaigns ?? [],
    members: (members ?? []).map((m) => ({ id: (m.profile as any)?.id, name: (m.profile as any)?.name })),
    stages: stages ?? [],
    sources: sources.sort(),
  };
}

function applyLeadFilters(query: any, organizationId: string, filters: ReportFilters) {
  query = query
    .eq("organization_id", organizationId)
    .gte("created_at", filters.range.from.toISOString())
    .lte("created_at", filters.range.to.toISOString());

  if (filters.campaignId) query = query.eq("campaign_id", filters.campaignId);
  if (filters.source) query = query.eq("source", filters.source);
  if (filters.ownerId) query = query.eq("owner_id", filters.ownerId);
  if (filters.stageId) query = query.eq("stage_id", filters.stageId);

  return query;
}

export type ReportLeadRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  value: number | null;
  created_at: string;
  stage: { name: string } | null;
  owner: { name: string } | null;
  campaign: { name: string } | null;
};

export async function getReportLeads(organizationId: string, filters: ReportFilters) {
  const supabase = createClient();
  let query = supabase
    .from("leads")
    .select(
      "id, name, email, phone, source, value, created_at, stage:pipeline_stages(name), owner:profiles(name), campaign:campaigns(name)"
    )
    .order("created_at", { ascending: false })
    .limit(1000); // teto de segurança; export por CSV cobre volumes maiores via streaming futuro

  query = applyLeadFilters(query, organizationId, filters);
  const { data } = await query;
  return (data ?? []) as unknown as ReportLeadRow[];
}

export type ReportSummary = {
  leadsCount: number;
  opportunities: number;
  sales: number;
  revenue: number;
  conversionRate: number | null;
  investment: number | null; // só calculado quando filtrado por UMA campanha específica
  cpl: number | null;
  cac: number | null;
  roas: number | null;
};

export async function getReportSummary(
  organizationId: string,
  filters: ReportFilters
): Promise<ReportSummary> {
  const supabase = createClient();

  let leadsQuery = supabase.from("leads").select("id", { count: "exact", head: true });
  leadsQuery = applyLeadFilters(leadsQuery, organizationId, filters);
  const { count: leadsCount } = await leadsQuery;

  let leadIdsQuery = supabase.from("leads").select("id");
  leadIdsQuery = applyLeadFilters(leadIdsQuery, organizationId, filters);
  const { data: leadRows } = await leadIdsQuery;
  const leadIds = (leadRows ?? []).map((l) => l.id);

  let opportunities = 0;
  let sales = 0;
  let revenue = 0;

  if (leadIds.length > 0) {
    const { data: deals } = await supabase
      .from("deals")
      .select("value, status")
      .in("lead_id", leadIds);

    opportunities = deals?.length ?? 0;
    const won = (deals ?? []).filter((d) => d.status === "won");
    sales = won.length;
    revenue = won.reduce((sum, d) => sum + (d.value ?? 0), 0);
  }

  const conversionRate = (leadsCount ?? 0) > 0 ? (sales / (leadsCount ?? 1)) * 100 : null;

  // Investimento só é confiável quando o relatório está filtrado por UMA
  // campanha específica — sem esse filtro, não dá pra saber quanto do gasto
  // total de cada campanha corresponde só aos leads que passaram no filtro.
  let investment: number | null = null;
  if (filters.campaignId) {
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("spend")
      .eq("id", filters.campaignId)
      .maybeSingle();
    investment = campaign?.spend ?? null;
  }

  return {
    leadsCount: leadsCount ?? 0,
    opportunities,
    sales,
    revenue,
    conversionRate,
    investment,
    cpl: investment != null && (leadsCount ?? 0) > 0 ? investment / (leadsCount ?? 1) : null,
    cac: investment != null && sales > 0 ? investment / sales : null,
    roas: investment != null && investment > 0 && revenue > 0 ? revenue / investment : null,
  };
}
