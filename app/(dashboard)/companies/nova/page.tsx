import Link from "next/link";
import { createCompanyAction } from "@/lib/companies/actions";
import { CompanyForm } from "@/components/companies/company-form";

export default function NovaEmpresaPage() {
  return (
    <div>
      <Link href="/companies" className="text-sm text-gray-500 hover:text-brand">
        ← Voltar para empresas
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-gray-900">Nova empresa</h1>
      <div className="mt-6">
        <CompanyForm action={createCompanyAction} submitLabel="Criar empresa" />
      </div>
    </div>
  );
}
