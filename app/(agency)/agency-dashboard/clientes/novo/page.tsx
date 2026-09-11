import Link from "next/link";
import { InviteClientForm } from "@/components/agency/invite-client-form";

export default function NovoClientePage() {
  return (
    <div>
      <Link
        href="/agency-dashboard/clientes"
        className="text-sm text-gray-500 hover:text-brand"
      >
        ← Voltar para clientes
      </Link>

      <h1 className="mt-2 text-2xl font-semibold text-gray-900">Novo cliente</h1>
      <p className="mt-1 text-sm text-gray-500">
        A pessoa recebe um e-mail para definir a própria senha. A empresa é
        criada automaticamente quando ela aceitar o convite.
      </p>

      <div className="mt-6">
        <InviteClientForm />
      </div>
    </div>
  );
}
