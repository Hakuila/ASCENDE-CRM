import { getIntegrationsOverview } from "@/lib/agency/queries";
import { Badge } from "@/components/ui/badge";

export default async function IntegracoesAgenciaPage() {
  const orgs = await getIntegrationsOverview();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Integrações</h1>
      <p className="mt-1 text-sm text-gray-500">
        Cada cliente configura a própria integração com o Meta Ads em
        Configurações → Integrações dentro do painel dele. Aqui você só
        acompanha quem já está com isso ativo.
      </p>

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50 text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Meta Lead Ads</th>
            </tr>
          </thead>
          <tbody>
            {orgs.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-4 py-8 text-center text-gray-400">
                  Nenhum cliente cadastrado ainda.
                </td>
              </tr>
            ) : (
              orgs.map((org) => (
                <tr key={org.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-3 text-gray-900">{org.name}</td>
                  <td className="px-4 py-3">
                    <Badge tone={org.metaActive ? "success" : "neutral"}>
                      {org.metaActive ? "Ativo" : "Não configurado"}
                    </Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 rounded-xl border border-dashed border-gray-200 bg-white p-5 text-sm text-gray-400">
        Google Ads e WhatsApp Business API entram em fases futuras.
      </div>
    </div>
  );
}
