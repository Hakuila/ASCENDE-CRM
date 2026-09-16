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

type MemberProfileRow = {
  user_id: string;
  profile: { id: string; name: string } | null;
};

export async function getReportFilterOptions(organizationId: string) {
  const supabase = createClient();

  const [
    { data: campaigns, error: campaignsError },
    { data: members, error: membersError },
    { data: stages, error: stagesError },
    { data: sourcesRaw, error: sourcesError },
  ] = await Promise.all([
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

  // P1-03: opções de filtro erradas ou incompletas levam a relatórios
  // enganosos sem que ninguém perceba — melhor falhar de forma visível.
  if (campaignsError || membersError || stagesError || sourcesError) {
    throw new Error("Não foi possível carregar as opções de filtro do relatório.");
  }

  const sources = Array.from(new Set((sourcesRaw ?? []).map((l) => l.source).filter(Boolean))) as string[];

  return {
    campaigns: campaigns ?? [],
    members: ((members ?? []) as unknown as MemberProfileRow[]).map((m) => ({
      id: m.profile?.id,
      name: m.profile?.name,
    })),
    stages: stages ?? [],
    sources: sources.sort(),
  };
}

/**
 * Filtros que restringem QUAIS leads pertencem ao escopo do relatório
 * (organização, campanha, origem, dono, etapa) — sem nenhuma restrição de
 * data. Usado como base tanto para a listagem de leads (com data de
 * criação aplicada por cima, ver applyLeadCreatedAtFilters) quanto para
 * localizar Deals relacionados, que têm sua própria semântica de data
 * (P0-03).
 */
function applyLeadScopeFilters(query: any, organizationId: string, filters: ReportFilters) {
  query = query.eq("organization_id", organizationId);
  if (filters.campaignId) query = query.eq("campaign_id", filters.campaignId);
  if (filters.source) query = query.eq("source", filters.source);
  if (filters.ownerId) query = query.eq("owner_id", filters.ownerId);
  if (filters.stageId) query = query.eq("stage_id", filters.stageId);
  return query;
}

/**
 * P0-03: created_at é a data correta para "aquisição" — quando o Lead
 * entrou no CRM. Usado na listagem de leads e na contagem de leads do
 * período.
 */
function applyLeadCreatedAtFilters(query: any, organizationId: string, filters: ReportFilters) {
  query = applyLeadScopeFilters(query, organizationId, filters);
  query = query
    .gte("created_at", filters.range.from.toISOString())
    .lte("created_at", filters.range.to.toISOString());
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

  query = applyLeadCreatedAtFilters(query, organizationId, filters);
  const { data, error } = await query;

  if (error) {
    throw new Error("Não foi possível carregar os leads do relatório.");
  }

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
  const fromIso = filters.range.from.toISOString();
  const toIso = filters.range.to.toISOString();

  // Leads adquiridos NO PERÍODO (created_at) — métrica de aquisição.
  let leadsQuery = supabase.from("leads").select("id", { count: "exact", head: true });
  leadsQuery = applyLeadCreatedAtFilters(leadsQuery, organizationId, filters);
  const { count: leadsCount, error: leadsCountError } = await leadsQuery;
  if (leadsCountError) {
    throw new Error("Não foi possível calcular o total de leads do relatório.");
  }

  // Escopo de leads pelos filtros de negócio (origem/dono/etapa/campanha),
  // SEM restrição de data: um Deal pode ter sido aberto ou fechado num
  // período diferente do período em que o Lead foi criado, e não queremos
  // perder esse Deal do relatório só porque o Lead é "antigo".
  let scopedLeadIdsQuery = supabase.from("leads").select("id");
  scopedLeadIdsQuery = applyLeadScopeFilters(scopedLeadIdsQuery, organizationId, filters);
  const { data: scopedLeadRows, error: scopedLeadIdsError } = await scopedLeadIdsQuery;
  if (scopedLeadIdsError) {
    throw new Error("Não foi possível localizar os leads do relatório.");
  }
  const scopedLeadIds = (scopedLeadRows ?? []).map((l) => l.id);

  let opportunities = 0;
  let sales = 0;
  let revenue = 0;

  if (scopedLeadIds.length > 0) {
    // P0-03: Oportunidades abertas NO PERÍODO -> created_at do Deal, não a
    // data de criação do Lead.
    const { count: opportunitiesCount, error: opportunitiesError } = await supabase
      .from("deals")
      .select("id", { count: "exact", head: true })
      .in("lead_id", scopedLeadIds)
      .gte("created_at", fromIso)
      .lte("created_at", toIso);

    if (opportunitiesError) {
      throw new Error("Não foi possível calcular as oportunidades do relatório.");
    }
    opportunities = opportunitiesCount ?? 0;

    // P0-03: Vendas/receita fechadas NO PERÍODO -> closed_at do Deal.
    // Antes, isso vinha de TODOS os deals dos leads criados no período,
    // sem nenhum filtro de data no próprio Deal — o que distorcia o
    // relatório sempre que um Deal fechava em um período diferente do da
    // criação do Lead.
    const { data: wonDeals, error: wonDealsError } = await supabase
      .from("deals")
      .select("value, closed_at")
      .in("lead_id", scopedLeadIds)
      .eq("status", "won")
      .gte("closed_at", fromIso)
      .lte("closed_at", toIso);

    if (wonDealsError) {
      throw new Error("Não foi possível calcular as vendas do relatório.");
    }

    const wonInRange = (wonDeals ?? []).filter((d) => d.closed_at != null);
    sales = wonInRange.length;
    revenue = wonInRange.reduce((sum, d) => sum + (d.value ?? 0), 0);
  }

  const conversionRate = (leadsCount ?? 0) > 0 ? (sales / (leadsCount ?? 1)) * 100 : null;

  // Investimento só é confiável quando o relatório está filtrado por UMA
  // campanha específica — sem esse filtro, não dá pra saber quanto do gasto
  // total de cada campanha corresponde só aos leads que passaram no filtro.
  let investment: number | null = null;
  if (filters.campaignId) {
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("spend")
      .eq("id", filters.campaignId)
      .maybeSingle();
    if (campaignError) {
      throw new Error("Não foi possível carregar o investimento da campanha.");
    }
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