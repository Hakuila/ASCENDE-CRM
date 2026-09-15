import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getTaskById } from "@/lib/tasks/queries";
import { getOrgMembers } from "@/lib/leads/queries";
import { updateTaskAction } from "@/lib/tasks/actions";
import { TaskForm } from "@/components/tasks/task-form";

export default async function EditarTarefaPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.organization) redirect("/login");

  const [task, members] = await Promise.all([
    getTaskById(session.organization.id, params.id),
    getOrgMembers(session.organization.id),
  ]);

  if (!task) notFound();

  const boundAction = updateTaskAction.bind(null, task.id);

  return (
    <div>
      <Link href="/tasks" className="text-sm text-gray-500 hover:text-brand">
        ← Voltar para tarefas
      </Link>

      <h1 className="mt-2 text-2xl font-semibold text-gray-900">Editar tarefa</h1>

      <div className="mt-6">
        <TaskForm
          action={boundAction}
          members={members}
          defaults={{
            title: task.title,
            description: task.description,
            dueDate: task.due_date,
            priority: task.priority,
            assignedTo: (task.assignee as any)?.id,
            leadId: (task.lead as any)?.id,
          }}
          submitLabel="Salvar alterações"
        />
      </div>
    </div>
  );
}
