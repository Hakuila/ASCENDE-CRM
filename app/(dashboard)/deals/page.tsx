import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getDealsList } from "@/lib/deals/queries";
import { Badge } from "@/components/ui/badge";

function formatCurrency(value: number | null) {
  if (value == null) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const statusLabel = { open: "Em aberto", won: "Ganha", lost: "Perdida" } as const;
const statusTone = { open: "neutral", won: "success", lost: "danger" } as const;

export default async function DealsPage({
  searchParams,
}: {
  searchParams: { status?: "open" | "won" | "lost" };
}) {
  const session = await getSession();
  if (!session?.organization) redirect("/login");

  const deals = await getDealsList(session.organization.id, { status: searchParams.status });

  const totals = deals.reduce(
    (acc, d) => {
      if (d.status === "won") acc.won += d.value ?? 0;
      if (d.status === "open") acc.open += d.value ?? 0;
      return acc;
    },
    { open: 0, won: 0 }
  );

  const tabs: { label: string; value?: "open" | "won" | "lost" }[] = [
    { label: "Todas" },
    { label: "Em aberto", value: "open" },
    { label: "Ganhas", value: "won" },
    { label: "Perdidas", value: "lost" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Oportunidades</h1>
      <p className="mt-1 text-sm text-gray-500">
        Em aberto: {formatCurrency(totals.open)} · Ganhas: {formatCurrency(totals.won)}
      </p>

      <div className="mt-4 flex gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            href={tab.value ? `/deals?status=${tab.value}` : "/deals"}
            className={`rounded-full px-3 py-1.5 text-sm ${
              searchParams.status === tab.value
                ? "bg-brand text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-gray-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50 text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Título</th>
              <th className="px-4 py-3 font-medium">Lead</th>
              <th className="px-4 py-3 font-medium">Responsável</th>
              <th className="px-4 py-3 font-medium">Valor</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Previsão</th>
            </tr>
          </thead>
          <tbody>
            {deals.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Nenhuma oportunidade encontrada.
                </td>
              </tr>
            ) : (
              deals.map((deal: any) => (
                <tr key={deal.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-3 text-gray-900">{deal.title}</td>
                  <td className="px-4 py-3">
                    {deal.lead ? (
                      <Link href={`/leads/${deal.lead.id}`} className="text-brand hover:underline">
                        {deal.lead.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{deal.owner?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{formatCurrency(deal.value)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone[deal.status as keyof typeof statusTone]}>
                      {statusLabel[deal.status as keyof typeof statusLabel]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {deal.expected_close_date
                      ? new Date(deal.expected_close_date).toLocaleDateString("pt-BR")
                      : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
