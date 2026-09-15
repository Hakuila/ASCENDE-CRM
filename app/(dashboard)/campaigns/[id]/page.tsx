import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getCampaignById, getCampaignPerformance } from "@/lib/campaigns/queries";
import { isOrgAdmin } from "@/lib/permissions";
import { Badge, stageTone } from "@/components/ui/badge";
import { KpiCard } from "@/components/dashboard/kpi-card";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function CampaignDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.organization) redirect("/login");

  const campaign = await getCampaignById(session.organization.id, params.id);
  if (!campaign) notFound();

  const { leads, sales, revenue } = await getCampaignPerformance(session.organization.id, params.id);
  const cpl = campaign.spend > 0 && leads.length > 0 ? campaign.spend / leads.length : null;
  const cac = campaign.spend > 0 && sales > 0 ? campaign.spend / sales : null;
  const roas = campaign.spend > 0 && revenue > 0 ? revenue / campaign.spend : null;

  return (
    <div>
      <Link href="/campaigns" className="text-sm text-gray-500 hover:text-brand">
        ← Voltar para campanhas
      </Link>

      <div className="mt-2 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{campaign.name}</h1>
          <p className="mt-1 text-sm text-gray-500">{campaign.platform}</p>
        </div>
        {isOrgAdmin(session) && (
          <Link href={`/campaigns/${campaign.id}/editar`} className="text-sm font-medium text-brand hover:underline">
            Editar
          </Link>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="Investimento" value={formatCurrency(campaign.spend)} />
        <KpiCard label="Impressões" value={campaign.impressions} />
        <KpiCard label="Cliques" value={campaign.clicks} />
        <KpiCard label="Leads" value={leads.length} />
        <KpiCard label="Vendas" value={sales} />
        <KpiCard label="Receita" value={formatCurrency(revenue)} />
        <KpiCard label="CPL" value={cpl != null ? formatCurrency(cpl) : null} />
        <KpiCard label="CAC" value={cac != null ? formatCurrency(cac) : null} />
        <KpiCard label="ROAS" value={roas != null ? `${roas.toFixed(2)}x` : null} />
      </div>

      <div className="mt-6 rounded-xl border border-gray-100 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">Leads gerados ({leads.length})</h2>
        {leads.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhum lead vinculado a essa campanha ainda.</p>
        ) : (
          <ul className="space-y-2">
            {leads.map((lead: any) => (
              <li key={lead.id} className="flex items-center justify-between border-b border-gray-50 pb-2 last:border-0">
                <Link href={`/leads/${lead.id}`} className="text-sm font-medium text-gray-900 hover:text-brand">
                  {lead.name}
                </Link>
                {lead.stage && <Badge tone={stageTone(lead.stage.kind)}>{lead.stage.name}</Badge>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
