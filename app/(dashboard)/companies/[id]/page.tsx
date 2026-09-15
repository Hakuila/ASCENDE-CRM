import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getCompanyById, getLeadsByCompany } from "@/lib/companies/queries";
import { canDeleteLead } from "@/lib/permissions";
import { Badge, stageTone } from "@/components/ui/badge";
import { DeleteCompanyButton } from "@/components/companies/delete-company-button";

export default async function CompanyDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.organization) redirect("/login");

  const [company, leads] = await Promise.all([
    getCompanyById(session.organization.id, params.id),
    getLeadsByCompany(params.id),
  ]);

  if (!company) notFound();

  return (
    <div>
      <Link href="/companies" className="text-sm text-gray-500 hover:text-brand">
        ← Voltar para empresas
      </Link>

      <div className="mt-2 flex items-start justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">{company.name}</h1>
        <div className="flex items-center gap-4">
          <Link href={`/companies/${company.id}/editar`} className="text-sm font-medium text-brand hover:underline">
            Editar
          </Link>
          {canDeleteLead(session) && <DeleteCompanyButton companyId={company.id} />}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-gray-100 bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold text-gray-700">
              Leads dessa empresa ({leads.length})
            </h2>
            {leads.length === 0 ? (
              <p className="text-sm text-gray-400">Nenhum lead vinculado ainda.</p>
            ) : (
              <ul className="space-y-2">
                {leads.map((lead) => (
                  <li key={lead.id} className="flex items-center justify-between border-b border-gray-50 pb-2 last:border-0">
                    <Link href={`/leads/${lead.id}`} className="text-sm font-medium text-gray-900 hover:text-brand">
                      {lead.name}
                    </Link>
                    {lead.stage && (
                      <Badge tone={stageTone((lead.stage as any).kind)}>{(lead.stage as any).name}</Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Dados</h2>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-gray-400">Documento</dt>
              <dd className="text-gray-900">{company.document ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-gray-400">E-mail</dt>
              <dd className="text-gray-900">{company.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-gray-400">Telefone</dt>
              <dd className="text-gray-900">{company.phone ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-gray-400">Site</dt>
              <dd className="text-gray-900">{company.website ?? "—"}</dd>
            </div>
          </dl>
          {company.notes && (
            <>
              <h3 className="mb-1 mt-4 text-xs font-semibold uppercase text-gray-400">Observações</h3>
              <p className="whitespace-pre-wrap text-sm text-gray-700">{company.notes}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
