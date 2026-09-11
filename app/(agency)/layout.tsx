import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/get-session";
import { signOutAction } from "@/lib/auth/actions";

const links = [
  { href: "/agency-dashboard", label: "Dashboard" },
  { href: "/agency-dashboard/clientes", label: "Clientes" },
  { href: "/agency-dashboard/usuarios", label: "Usuários" },
  { href: "/agency-dashboard/performance", label: "Performance" },
  { href: "/agency-dashboard/integracoes", label: "Integrações" },
  { href: "/agency-dashboard/planos", label: "Planos" },
  { href: "/agency-dashboard/configuracoes", label: "Configurações" },
];

export default async function AgencyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) redirect("/login");
  if (!session.isPlatformAdmin) redirect("/dashboard");

  return (
    <div className="flex">
      <aside className="flex h-screen w-60 flex-col border-r border-gray-100 bg-white">
        <div className="border-b border-gray-100 px-5 py-4">
          <p className="text-xs uppercase tracking-wide text-gray-400">Painel</p>
          <p className="text-sm font-semibold text-gray-900">Agência</p>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-brand/5 hover:text-brand"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <form action={signOutAction} className="border-t border-gray-100 p-3">
          <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-50">
            Sair
          </button>
        </form>
      </aside>

      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
