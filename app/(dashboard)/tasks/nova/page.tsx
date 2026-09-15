import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getOrgMembers } from "@/lib/leads/queries";
import { createTaskAction } from "@/lib/tasks/actions";
import { TaskForm } from "@/components/tasks/task-form";

export default async function NovaTarefaPage({
  searchParams,
}: {
  searchParams: { leadId?: string };
}) {
  const session = await getSession();
  if (!session?.organization) redirect("/login");

  const members = await getOrgMembers(session.organization.id);

  return (
    <div>
      <Link href="/tasks" className="text-sm text-gray-500 hover:text-brand">
        ← Voltar para tarefas
      </Link>

      <h1 className="mt-2 text-2xl font-semibold text-gray-900">Nova tarefa</h1>

      <div className="mt-6">
        <TaskForm
          action={createTaskAction}
          members={members}
          defaults={{ assignedTo: session.userId, leadId: searchParams.leadId }}
          leadIdLocked={searchParams.leadId}
          submitLabel="Criar tarefa"
        />
      </div>
    </div>
  );
}
