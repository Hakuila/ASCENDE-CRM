import Link from "next/link";
import { getSession } from "@/lib/auth/get-session";

export default async function ConfiguracoesAgenciaPage() {
  const session = await getSession();

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold text-gray-900">Configurações</h1>

      <section className="mt-6 rounded-xl border border-gray-100 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Sua conta</h2>
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="text-gray-400">Nome</dt>
            <dd className="text-gray-900">{session?.name}</dd>
          </div>
          <div>
            <dt className="text-gray-400">E-mail</dt>
            <dd className="text-gray-900">{session?.email}</dd>
          </div>
        </dl>
        <p className="mt-4 text-sm text-gray-500">
          Quer trocar sua senha?{" "}
          <Link href="/update-password" className="font-medium text-brand hover:underline">
            Definir nova senha
          </Link>
        </p>
      </section>

      <div className="mt-4 rounded-xl border border-dashed border-gray-200 bg-white p-5 text-sm text-gray-400">
        Configurações gerais da plataforma (identidade visual do white-label,
        variáveis de ambiente, chaves de integração compartilhadas) ficam em
        variáveis de ambiente por enquanto — ver README do projeto.
      </div>
    </div>
  );
}
