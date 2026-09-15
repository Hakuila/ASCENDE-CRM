import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { resolveDateRange, type PeriodPreset } from "@/lib/dashboard/date-range";
import {
  getDashboardMetrics,
  getLeadsByDay,
  getLeadsBySource,
  getSalesByDay,
  getRevenueBySource,
} from "@/lib/dashboard/queries";
import { PeriodFilter } from "@/components/dashboard/period-filter";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { LeadsByDayChart } from "@/components/dashboard/leads-by-day-chart";
import { LeadsBySourceChart } from "@/components/dashboard/leads-by-source-chart";
import { SalesByDayChart } from "@/components/dashboard/sales-by-day-chart";
import { RevenueBySourceChart } from "@/components/dashboard/revenue-by-source-chart";
import { FunnelChart } from "@/components/dashboard/funnel-chart";
import { ChartCard } from "@/components/dashboard/chart-card";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const INSUFFICIENT_INTEGRATIONS =
  "Configure suas integrações de campanha para visualizar este indicador.";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { period?: PeriodPreset; from?: string; to?: string };
}) {
  const session = await getSession();
  if (!session?.organization) redirect("/login");

  const period = searchParams.period ?? "30d";
  const range = resolveDateRange(period, { from: searchParams.from, to: searchParams.to });
  const organizationId = session.organization.id;

  const [metrics, leadsByDay, leadsBySource, salesByDay, revenueBySource] = await Promise.all([
    getDashboardMetrics(organizationId, range),
    getLeadsByDay(organizationId, range),
    getLeadsBySource(organizationId, range),
    getSalesByDay(organizationId, range),
    getRevenueBySource(organizationId, range),
  ]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">{session.organization.name}</p>
        </div>
        <PeriodFilter current={period} customFrom={searchParams.from} customTo={searchParams.to} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="Leads (total)" value={metrics.leadsTotal} />
        <KpiCard label="Leads novos" value={metrics.leadsNew} />
        <KpiCard label="Oportunidades" value={metrics.opportunities} />
        <KpiCard label="Vendas" value={metrics.sales} />
        <KpiCard
          label="Taxa de conversão"
          value={metrics.conversionRate != null ? `${metrics.conversionRate.toFixed(1)}%` : null}
        />
        <KpiCard label="Valor em aberto" value={formatCurrency(metrics.potentialValue)} />
        <KpiCard label="Faturamento" value={formatCurrency(metrics.revenue)} />
        <KpiCard label="Investimento" value={metrics.investment} insufficientMessage={INSUFFICIENT_INTEGRATIONS} />
        <KpiCard label="CPL" value={metrics.cpl != null ? formatCurrency(metrics.cpl) : null} insufficientMessage={INSUFFICIENT_INTEGRATIONS} />
        <KpiCard label="CAC" value={metrics.cac != null ? formatCurrency(metrics.cac) : null} insufficientMessage={INSUFFICIENT_INTEGRATIONS} />
        <KpiCard label="ROAS" value={metrics.roas != null ? `${metrics.roas.toFixed(2)}x` : null} insufficientMessage={INSUFFICIENT_INTEGRATIONS} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <LeadsByDayChart data={leadsByDay} />
        <LeadsBySourceChart data={leadsBySource} />
        <FunnelChart leads={metrics.leadsNew} opportunities={metrics.opportunities} sales={metrics.sales} />
        <SalesByDayChart data={salesByDay} />
        <RevenueBySourceChart data={revenueBySource} />
        <ChartCard title="Performance de campanhas" isEmpty emptyMessage="Configure suas integrações de campanha (Fase 6) para ver este gráfico.">
          <div />
        </ChartCard>
      </div>
    </div>
  );
}
