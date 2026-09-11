import { getSession } from "@/lib/auth/get-session";

export default async function AgencyDashboardPage() {
  const session = await getSession();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">
        Olá, {session?.name?.split(" ")[0]} 👋
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        Painel da agência. Use o menu ao lado para gerenciar clientes.
      </p>

      <div className="mt-8 rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
        Indicadores agregados de todos os clientes entram numa fase futura.
        Por enquanto, acesse "Clientes" no menu para criar e ver as organizações.
      </div>
    </div>
  );
}
