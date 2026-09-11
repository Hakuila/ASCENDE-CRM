import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export default async function ClientesPage() {
  const supabase = createClient();
  const { data: organizations } = await supabase
    .from("organizations")
    .select("id, name, is_demo, created_at")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Clientes</h1>
          <p className="mt-1 text-sm text-gray-500">
            Empresas que usam o CRM através da sua agência.
          </p>
        </div>
        <Link href="/agency-dashboard/clientes/novo">
          <Button>+ Novo cliente</Button>
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50 text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Criada em</th>
              <th className="px-4 py-3 font-medium">Demo</th>
            </tr>
          </thead>
          <tbody>
            {organizations?.length ? (
              organizations.map((org) => (
                <tr key={org.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-3 text-gray-900">{org.name}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(org.created_at).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{org.is_demo ? "Sim" : "Não"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                  Nenhum cliente cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
