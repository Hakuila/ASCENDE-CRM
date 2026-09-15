import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { DateRange } from "@/lib/dashboard/date-range";

export type DashboardMetrics = {
  leadsTotal: number;
  leadsNew: number;
  opportunities: number;
  sales: number;
  conversionRate: number | null; // null = dados insuficientes
  potentialValue: number;
  revenue: number;
  investment: number | null; // null = sem integrações de campanha configuradas
  cpl: number | null;
  cac: number | null;
  roas: number | null;
};

export async function getDashboardMetrics(
  organizationId: string,
  range: DateRange
): Promise<DashboardMetrics> {
  const supabase = createClient();
  const fromIso = range.from.toISOString();
  const toIso = range.to.toISOString();

  const [
    { count: leadsTotal },
    { count: leadsNew },
    { count: opportunities },
    { data: wonDeals },
    { data: openDeals },
    { data: campaignsSpend },
  ] = await Promise.all([
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .gte("created_at", fromIso)
      .lte("created_at", toIso),
    supabase
      .from("deals")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .gte("created_at", fromIso)
      .lte("created_at", toIso),
    // "Vendas" = deals ganhos cuja última atualização (mudança de status) caiu
    // no período — não temos uma coluna closed_at dedicada no schema atual.
    supabase
      .from("deals")
      .select("value, updated_at")
      .eq("organization_id", organizationId)
      .eq("status", "won")
      .gte("updated_at", fromIso)
      .lte("updated_at", toIso),
    supabase
      .from("deals")
      .select("value")
      .eq("organization_id", organizationId)
      .eq("status", "open"),
    supabase.from("campaigns").select("spend").eq("organization_id", organizationId),
  ]);

  const sales = wonDeals?.length ?? 0;
  const revenue = (wonDeals ?? []).reduce((sum, d) => sum + (d.value ?? 0), 0);
  const potentialValue = (openDeals ?? []).reduce((sum, d) => sum + (d.value ?? 0), 0);

  const totalSpend = (campaignsSpend ?? []).reduce((sum, c) => sum + (c.spend ?? 0), 0);
  const hasSpendData = (campaignsSpend?.length ?? 0) > 0 && totalSpend > 0;

  const conversionRate =
    (leadsNew ?? 0) > 0 ? (sales / (leadsNew ?? 1)) * 100 : null;

  return {
    leadsTotal: leadsTotal ?? 0,
    leadsNew: leadsNew ?? 0,
    opportunities: opportunities ?? 0,
    sales,
    conversionRate,
    potentialValue,
    revenue,
    investment: hasSpendData ? totalSpend : null,
    cpl: hasSpendData && (leadsNew ?? 0) > 0 ? totalSpend / (leadsNew ?? 1) : null,
    cac: hasSpendData && sales > 0 ? totalSpend / sales : null,
    roas: hasSpendData && revenue > 0 ? revenue / totalSpend : null,
  };
}

export async function getLeadsByDay(organizationId: string, range: DateRange) {
  const supabase = createClient();
  const { data } = await supabase
    .from("leads")
    .select("created_at")
    .eq("organization_id", organizationId)
    .gte("created_at", range.from.toISOString())
    .lte("created_at", range.to.toISOString());

  const counts = new Map<string, number>();
  for (const lead of data ?? []) {
    const day = lead.created_at.slice(0, 10);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));
}

export async function getLeadsBySource(organizationId: string, range: DateRange) {
  const supabase = createClient();
  const { data } = await supabase
    .from("leads")
    .select("source")
    .eq("organization_id", organizationId)
    .gte("created_at", range.from.toISOString())
    .lte("created_at", range.to.toISOString());

  const counts = new Map<string, number>();
  for (const lead of data ?? []) {
    const source = lead.source || "Não informado";
    counts.set(source, (counts.get(source) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([source, count]) => ({ source, count }));
}

export async function getSalesByDay(organizationId: string, range: DateRange) {
  const supabase = createClient();
  const { data } = await supabase
    .from("deals")
    .select("value, updated_at")
    .eq("organization_id", organizationId)
    .eq("status", "won")
    .gte("updated_at", range.from.toISOString())
    .lte("updated_at", range.to.toISOString());

  const byDay = new Map<string, number>();
  for (const deal of data ?? []) {
    const day = deal.updated_at.slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + (deal.value ?? 0));
  }
  return Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }));
}

export async function getRevenueBySource(organizationId: string, range: DateRange) {
  const supabase = createClient();
  const { data } = await supabase
    .from("deals")
    .select("value, updated_at, lead:leads(source)")
    .eq("organization_id", organizationId)
    .eq("status", "won")
    .gte("updated_at", range.from.toISOString())
    .lte("updated_at", range.to.toISOString());

  const bySource = new Map<string, number>();
  for (const deal of (data ?? []) as any[]) {
    const source = deal.lead?.source || "Não informado";
    bySource.set(source, (bySource.get(source) ?? 0) + (deal.value ?? 0));
  }
  return Array.from(bySource.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([source, value]) => ({ source, value }));
}
