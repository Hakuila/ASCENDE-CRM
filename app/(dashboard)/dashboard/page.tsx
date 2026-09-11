import { getSession } from "@/lib/auth/get-session";

export default async function DashboardPage() {
  const session = await getSession();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">
        Olá, {session?.name?.split(" ")[0]} 👋
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        Você está logado como <strong>{session?.role === "client_admin" ? "administrador" : "vendedor"}</strong> em{" "}
        <strong>{session?.organization?.name}</strong>.
      </p>

      <div className="mt-8 rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
        Os indicadores de leads, oportunidades, vendas e receita entram na
        Fase 5 (Dashboard). Por enquanto, esta tela confirma que autenticação
        e multi-tenancy estão funcionando de ponta a ponta.
      </div>
    </div>
  );
}
