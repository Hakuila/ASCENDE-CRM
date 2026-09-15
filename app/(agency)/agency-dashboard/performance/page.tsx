import Link from "next/link";
import { getCrossOrgPerformance } from "@/lib/agency/queries";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function PerformanceAgenciaPage() {
  const orgs = await getCrossOrgPerformance();

  const totals = orgs.reduce(
    (acc, o) => ({
      leads: acc.leads + o.leadsCount,
      sales: acc.sales + o.salesCount,
      revenue: acc.revenue + o.revenue,
    }),
    { leads: 0, sales: 0, revenue: 0 }
  );

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Performance</h1>
      <p className="mt-1 text-sm text-gray-500">Visão consolidada de todos os clientes.</p>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Leads (todos)</p>
          <p className="mt-1 text-xl font-semibold text-gray-900">{totals.leads}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Vendas (todas)</p>
          <p className="mt-1 text-xl font-semibold text-gray-900">{totals.sales}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Receita (toda)</p>
          <p className="mt-1 text-xl font-semibold text-gray-900">{formatCurrency(totals.revenue)}</p>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50 text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Leads</th>
              <th className="px-4 py-3 font-medium">Oportunidades</th>
              <th className="px-4 py-3 font-medium">Vendas</th>
              <th className="px-4 py-3 font-medium">Receita</th>
            </tr>
          </thead>
          <tbody>
            {orgs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  Nenhum cliente cadastrado ainda.
                </td>
              </tr>
            ) : (
              orgs.map((org) => (
                <tr key={org.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/agency-dashboard/clientes`}
                      className="font-medium text-gray-900 hover:text-brand"
                    >
                      {org.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{org.leadsCount}</td>
                  <td className="px-4 py-3 text-gray-500">{org.dealsCount}</td>
                  <td className="px-4 py-3 text-gray-500">{org.salesCount}</td>
                  <td className="px-4 py-3 text-gray-500">{formatCurrency(org.revenue)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
