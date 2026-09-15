import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { signOutAction } from "@/lib/auth/actions";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { NotificationBell } from "@/components/layout/notification-bell";
import { getNotifications, countUnreadNotifications } from "@/lib/notifications/queries";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) redirect("/login");

  // Staff da agência não usa este painel — vai para o dele.
  if (session.isPlatformAdmin && !session.organization) {
    redirect("/agency-dashboard");
  }

  // Autenticado, mas sem organização vinculada. Como as contas agora só são
  // criadas por convite (ver Fase de administração da agência), isso não
  // deveria acontecer em uso normal — só se o convite falhou em criar a
  // organização. Mostra uma mensagem em vez de redirecionar, para não achar
  // uma rota "de escape" que vire loop.
  if (!session.organization) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm rounded-xl border border-gray-100 bg-white p-6 text-center shadow-sm">
          <h1 className="mb-2 text-lg font-semibold text-gray-900">
            Sua conta ainda não está vinculada a uma empresa
          </h1>
          <p className="mb-4 text-sm text-gray-500">
            Fale com quem te convidou para o CRM — pode ter havido um problema
            ao configurar sua organização.
          </p>
          <form action={signOutAction}>
            <button className="text-sm font-medium text-brand hover:underline">
              Sair
            </button>
          </form>
        </div>
      </div>
    );
  }

  const [notifications, unreadCount] = await Promise.all([
    getNotifications(session.userId),
    countUnreadNotifications(session.userId),
  ]);

  return (
    <div className="flex">
      <DashboardSidebar orgName={session.organization.name} />
      <div className="flex-1">
        <header className="flex items-center justify-end border-b border-gray-100 bg-white px-6 py-3">
          <NotificationBell notifications={notifications} unreadCount={unreadCount} />
        </header>
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}
