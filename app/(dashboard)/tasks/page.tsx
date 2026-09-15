import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getTasksList } from "@/lib/tasks/queries";
import { TasksList } from "@/components/tasks/tasks-list";
import { Button } from "@/components/ui/button";

const tabs: { label: string; value: "pending" | "overdue" | "completed" | "all" }[] = [
  { label: "Pendentes", value: "pending" },
  { label: "Atrasadas", value: "overdue" },
  { label: "Concluídas", value: "completed" },
  { label: "Todas", value: "all" },
];

export default async function TasksPage({
  searchParams,
}: {
  searchParams: { view?: "pending" | "overdue" | "completed" | "all" };
}) {
  const session = await getSession();
  if (!session?.organization) redirect("/login");

  const view = searchParams.view ?? "pending";
  const tasks = await getTasksList(session.organization.id, { view });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Tarefas</h1>
        <Link href="/tasks/nova">
          <Button>+ Nova tarefa</Button>
        </Link>
      </div>

      <div className="mt-4 flex gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.value}
            href={`/tasks?view=${tab.value}`}
            className={`rounded-full px-3 py-1.5 text-sm ${
              view === tab.value ? "bg-brand text-white" : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="mt-4">
        <TasksList tasks={tasks as any} />
      </div>
    </div>
  );
}
