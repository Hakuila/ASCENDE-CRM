import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { resolveDateRange, type PeriodPreset } from "@/lib/dashboard/date-range";
import { getReportFilterOptions, getReportLeads, getReportSummary } from "@/lib/reports/queries";
import { ReportFiltersForm } from "@/components/reports/report-filters-form";
import { KpiCard } from "@/components/dashboard/kpi-card";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const CAMPAIGN_ONLY_MESSAGE = "Selecione uma campanha específica para ver este indicador.";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: {
    period?: PeriodPreset;
    from?: string;
    to?: string;
    campaignId?: string;
    source?: string;
    ownerId?: string;
    stageId?: string;
  };
}) {
  const session = await getSession();
  if (!session?.organization) redirect("/login");

  const organizationId = session.organization.id;
  const period = searchParams.period ?? "30d";
  const range = resolveDateRange(period, { from: searchParams.from, to: searchParams.to });

  const filters = {
    range,
    campaignId: searchParams.campaignId,
    source: searchParams.source,
    ownerId: searchParams.ownerId,
    stageId: searchParams.stageId,
  };

  const [filterOptions, summary, leads] = await Promise.all([
    getReportFilterOptions(organizationId),
    getReportSummary(organizationId, filters),
    getReportLeads(organizationId, filters),
  ]);

  const exportParams = new URLSearchParams();
  exportParams.set("period", period);
  if (searchParams.from) exportParams.set("from", searchParams.from);
  if (searchParams.to) exportParams.set("to", searchParams.to);
  if (searchParams.campaignId) exportParams.set("campaignId", searchParams.campaignId);
  if (searchParams.source) exportParams.set("source", searchParams.source);
  if (searchParams.ownerId) exportParams.set("ownerId", searchParams.ownerId);
  if (searchParams.stageId) exportParams.set("stageId", searchParams.stageId);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Relatórios</h1>
          <p className="mt-1 text-sm text-gray-500">{range.label}</p>
        </div>
        <a
          href={`/api/reports/export?${exportParams.toString()}`}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Exportar CSV
        </a>
      </div>

      <div className="mt-4">
        <ReportFiltersForm filterOptions={filterOptions} current={{ period, ...filters }} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="Leads" value={summary.leadsCount} />
        <KpiCard label="Oportunidades" value={summary.opportunities} />
        <KpiCard label="Vendas" value={summary.sales} />
        <KpiCard
          label="Conversão"
          value={summary.conversionRate != null ? `${summary.conversionRate.toFixed(1)}%` : null}
        />
        <KpiCard label="Receita" value={formatCurrency(summary.revenue)} />
        <KpiCard
          label="Investimento"
          value={summary.investment != null ? formatCurrency(summary.investment) : null}
          insufficientMessage={CAMPAIGN_ONLY_MESSAGE}
        />
        <KpiCard
          label="CPL"
          value={summary.cpl != null ? formatCurrency(summary.cpl) : null}
          insufficientMessage={CAMPAIGN_ONLY_MESSAGE}
        />
        <KpiCard
          label="CAC"
          value={summary.cac != null ? formatCurrency(summary.cac) : null}
          insufficientMessage={CAMPAIGN_ONLY_MESSAGE}
        />
        <KpiCard
          label="ROAS"
          value={summary.roas != null ? `${summary.roas.toFixed(2)}x` : null}
          insufficientMessage={CAMPAIGN_ONLY_MESSAGE}
        />
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50 text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Origem</th>
              <th className="px-4 py-3 font-medium">Campanha</th>
              <th className="px-4 py-3 font-medium">Etapa</th>
              <th className="px-4 py-3 font-medium">Responsável</th>
              <th className="px-4 py-3 font-medium">Valor</th>
              <th className="px-4 py-3 font-medium">Criado em</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  Nenhum lead encontrado com esses filtros.
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr key={lead.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-3 text-gray-900">{lead.name}</td>
                  <td className="px-4 py-3 text-gray-500">{lead.source ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{lead.campaign?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{lead.stage?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{lead.owner?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {lead.value != null ? formatCurrency(lead.value) : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(lead.created_at).toLocaleDateString("pt-BR")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {leads.length === 1000 && (
          <p className="border-t border-gray-100 px-4 py-2 text-xs text-gray-400">
            Mostrando os 1.000 mais recentes. Use "Exportar CSV" para ver todos (até 5.000).
          </p>
        )}
      </div>
    </div>
  );
}
