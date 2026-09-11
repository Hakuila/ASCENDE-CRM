import Link from "next/link";
import { signOutAction } from "@/lib/auth/actions";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/leads", label: "Leads" },
  { href: "/pipeline", label: "Pipeline" },
  { href: "/companies", label: "Empresas" },
  { href: "/tasks", label: "Tarefas" },
  { href: "/campaigns", label: "Campanhas" },
  { href: "/reports", label: "Relatórios" },
  { href: "/integrations", label: "Integrações" },
  { href: "/settings", label: "Configurações" },
];

export function DashboardSidebar({ orgName }: { orgName: string }) {
  return (
    <aside className="flex h-screen w-60 flex-col border-r border-gray-100 bg-white">
      <div className="border-b border-gray-100 px-5 py-4">
        <p className="text-xs uppercase tracking-wide text-gray-400">Organização</p>
        <p className="truncate text-sm font-semibold text-gray-900">{orgName}</p>
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
  );
}
