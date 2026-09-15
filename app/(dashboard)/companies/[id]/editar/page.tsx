import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getCompanyById } from "@/lib/companies/queries";
import { updateCompanyAction } from "@/lib/companies/actions";
import { CompanyForm } from "@/components/companies/company-form";

export default async function EditarEmpresaPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.organization) redirect("/login");

  const company = await getCompanyById(session.organization.id, params.id);
  if (!company) notFound();

  const boundAction = updateCompanyAction.bind(null, company.id);

  return (
    <div>
      <Link href={`/companies/${company.id}`} className="text-sm text-gray-500 hover:text-brand">
        ← Voltar para a empresa
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-gray-900">Editar empresa</h1>
      <div className="mt-6">
        <CompanyForm action={boundAction} defaults={company} submitLabel="Salvar alterações" />
      </div>
    </div>
  );
}
