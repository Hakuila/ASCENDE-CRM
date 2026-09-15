import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getKanbanBoard } from "@/lib/pipeline/queries";
import { KanbanBoard } from "@/components/pipeline/kanban-board";
import { isOrgAdmin } from "@/lib/permissions";

export default async function PipelinePage() {
  const session = await getSession();
  if (!session?.organization) redirect("/login");

  const stages = await getKanbanBoard(session.organization.id);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Pipeline</h1>
          <p className="mt-1 text-sm text-gray-500">
            Arraste os cards entre as etapas para atualizar o lead.
          </p>
        </div>
        {isOrgAdmin(session) && (
          <Link
            href="/pipeline/etapas"
            className="text-sm font-medium text-brand hover:underline"
          >
            Editar etapas
          </Link>
        )}
      </div>

      <div className="mt-6">
        <KanbanBoard initialStages={stages} />
      </div>
    </div>
  );
}
