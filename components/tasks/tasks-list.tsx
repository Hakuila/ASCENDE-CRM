"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { toggleTaskCompleteAction, deleteTaskAction } from "@/lib/tasks/actions";

type Task = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: "low" | "medium" | "high";
  completed: boolean;
  lead: { id: string; name: string } | null;
  assignee: { id: string; name: string } | null;
};

const priorityLabel = { low: "Baixa", medium: "Média", high: "Alta" } as const;
const priorityTone = { low: "neutral", medium: "neutral", high: "danger" } as const;

function isOverdue(task: Task) {
  return !task.completed && !!task.due_date && new Date(task.due_date) < new Date();
}

function TaskRow({ task }: { task: Task }) {
  const [isPending, startTransition] = useTransition();
  const overdue = isOverdue(task);

  return (
    <div
      className={`flex items-start gap-3 border-b border-gray-50 px-4 py-3 last:border-0 ${
        task.completed ? "opacity-60" : ""
      }`}
    >
      <input
        type="checkbox"
        checked={task.completed}
        disabled={isPending}
        onChange={(e) =>
          startTransition(() => toggleTaskCompleteAction(task.id, e.target.checked))
        }
        className="mt-1 h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
      />

      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium text-gray-900 ${task.completed ? "line-through" : ""}`}>
            {task.title}
          </span>
          <Badge tone={priorityTone[task.priority]}>{priorityLabel[task.priority]}</Badge>
          {overdue && <Badge tone="danger">Atrasada</Badge>}
        </div>
        {task.description && <p className="mt-1 text-sm text-gray-500">{task.description}</p>}
        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-400">
          {task.due_date && <span>{new Date(task.due_date).toLocaleString("pt-BR")}</span>}
          {task.assignee && <span>Responsável: {task.assignee.name}</span>}
          {task.lead && (
            <Link href={`/leads/${task.lead.id}`} className="text-brand hover:underline">
              {task.lead.name}
            </Link>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Link href={`/tasks/${task.id}/editar`} className="text-xs text-brand hover:underline">
          Editar
        </Link>
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            if (confirm("Excluir esta tarefa?")) {
              startTransition(() => deleteTaskAction(task.id));
            }
          }}
          className="text-xs text-gray-400 hover:text-red-600"
        >
          Excluir
        </button>
      </div>
    </div>
  );
}

export function TasksList({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-white p-12 text-center text-sm text-gray-400">
        Nenhuma tarefa encontrada.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
      {tasks.map((task) => (
        <TaskRow key={task.id} task={task} />
      ))}
    </div>
  );
}
