import Link from "next/link";
import { Badge, stageTone } from "@/components/ui/badge";

type LeadRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  value: number | null;
  created_at: string;
  stage: { id: string; name: string; kind: "open" | "won" | "lost" } | null;
  owner: { id: string; name: string } | null;
};

function formatCurrency(value: number | null) {
  if (value == null) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function LeadsTable({ leads }: { leads: LeadRow[] }) {
  if (leads.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-white p-12 text-center">
        <p className="text-sm text-gray-500">Você ainda não possui leads.</p>
        <Link
          href="/leads/novo"
          className="mt-3 inline-block text-sm font-medium text-brand hover:underline"
        >
          + Adicionar primeiro lead
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-100 bg-gray-50 text-gray-500">
          <tr>
            <th className="px-4 py-3 font-medium">Nome</th>
            <th className="px-4 py-3 font-medium">Contato</th>
            <th className="px-4 py-3 font-medium">Etapa</th>
            <th className="px-4 py-3 font-medium">Responsável</th>
            <th className="px-4 py-3 font-medium">Valor</th>
            <th className="px-4 py-3 font-medium">Criado em</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
              <td className="px-4 py-3">
                <Link
                  href={`/leads/${lead.id}`}
                  className="font-medium text-gray-900 hover:text-brand"
                >
                  {lead.name}
                </Link>
              </td>
              <td className="px-4 py-3 text-gray-500">
                {lead.email || lead.phone || "—"}
              </td>
              <td className="px-4 py-3">
                {lead.stage ? (
                  <Badge tone={stageTone(lead.stage.kind)}>{lead.stage.name}</Badge>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-3 text-gray-500">{lead.owner?.name ?? "—"}</td>
              <td className="px-4 py-3 text-gray-500">{formatCurrency(lead.value)}</td>
              <td className="px-4 py-3 text-gray-500">
                {new Date(lead.created_at).toLocaleDateString("pt-BR")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
