import { getSession } from "@/lib/auth/get-session";
import { getPlatformAdmins } from "@/lib/agency/queries";
import { StaffList } from "@/components/agency/staff-list";
import { StaffForm } from "@/components/agency/staff-form";

export default async function UsuariosAgenciaPage() {
  const session = await getSession();
  const staff = await getPlatformAdmins();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Usuários da agência</h1>
      <p className="mt-1 text-sm text-gray-500">
        Quem está aqui enxerga todos os clientes — diferente da equipe de cada
        cliente, que só vê a própria organização.
      </p>

      <div className="mt-6">
        <StaffList staff={staff} currentUserId={session!.userId} />
      </div>

      <div className="mt-4">
        <StaffForm />
      </div>
    </div>
  );
}
