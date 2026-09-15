import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getCompaniesList } from "@/lib/companies/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: { search?: string };
}) {
  const session = await getSession();
  if (!session?.organization) redirect("/login");

  const companies = await getCompaniesList(session.organization.id, searchParams.search);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Empresas</h1>
        <Link href="/companies/nova">
          <Button>+ Nova empresa</Button>
        </Link>
      </div>

      <form method="GET" action="/companies" className="mt-4 max-w-sm">
        <Input name="search" placeholder="Buscar por nome, e-mail ou documento" defaultValue={searchParams.search} />
      </form>

      <div className="mt-4 overflow-hidden rounded-xl border border-gray-100 bg-white">
        {companies.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-400">
            Nenhuma empresa cadastrada ainda.
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Contato</th>
                <th className="px-4 py-3 font-medium">Documento</th>
                <th className="px-4 py-3 font-medium">Criada em</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                  <td className="px-4 py-3">
                    <Link href={`/companies/${c.id}`} className="font-medium text-gray-900 hover:text-brand">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{c.email || c.phone || "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{c.document || "—"}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(c.created_at).toLocaleDateString("pt-BR")}
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
