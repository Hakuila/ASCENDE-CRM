import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getCampaignsList } from "@/lib/campaigns/queries";
import { isOrgAdmin } from "@/lib/permissions";
import { Button } from "@/components/ui/button";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function CampaignsPage() {
  const session = await getSession();
  if (!session?.organization) redirect("/login");

  const campaigns = await getCampaignsList(session.organization.id);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Campanhas</h1>
        {isOrgAdmin(session) && (
          <Link href="/campaigns/nova">
            <Button>+ Nova campanha</Button>
          </Link>
        )}
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-gray-100 bg-white">
        {campaigns.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-400">
            Nenhuma campanha cadastrada ainda.
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Plataforma</th>
                <th className="px-4 py-3 font-medium">Investimento</th>
                <th className="px-4 py-3 font-medium">Leads</th>
                <th className="px-4 py-3 font-medium">CPL</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                  <td className="px-4 py-3">
                    <Link href={`/campaigns/${c.id}`} className="font-medium text-gray-900 hover:text-brand">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{c.platform}</td>
                  <td className="px-4 py-3 text-gray-500">{formatCurrency(c.spend)}</td>
                  <td className="px-4 py-3 text-gray-500">{c.leadsCount}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {c.cpl != null ? formatCurrency(c.cpl) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
