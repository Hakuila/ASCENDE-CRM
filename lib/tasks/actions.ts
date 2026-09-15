"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/get-session";
import { taskSchema } from "@/lib/validations/tasks";

export type TaskFormState = { error?: string } | null;

function toNullable(v: string | undefined) {
  return v && v.length > 0 ? v : null;
}

function parseTaskForm(formData: FormData) {
  return taskSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    dueDate: formData.get("dueDate"),
    priority: formData.get("priority") || "medium",
    assignedTo: formData.get("assignedTo"),
    leadId: formData.get("leadId"),
  });
}

async function notifyAssignee(params: {
  organizationId: string;
  assignedTo: string | null;
  authorId: string;
  title: string;
}) {
  if (!params.assignedTo || params.assignedTo === params.authorId) return;

  const supabase = createClient();
  await supabase.from("notifications").insert({
    organization_id: params.organizationId,
    user_id: params.assignedTo,
    title: "Nova tarefa atribuída a você",
    body: params.title,
  });
}

// ---------------------------------------------------------------------------
// CRIAR TAREFA
// ---------------------------------------------------------------------------
export async function createTaskAction(
  _prevState: TaskFormState,
  formData: FormData
): Promise<TaskFormState> {
  const session = await getSession();
  if (!session?.organization) return { error: "Sessão inválida." };

  const parsed = parseTaskForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { title, description, dueDate, priority, assignedTo, leadId } = parsed.data;
  const supabase = createClient();
  const organizationId = session.organization.id;
  const finalAssignedTo = toNullable(assignedTo) ?? session.userId;

  const { error } = await supabase.from("tasks").insert({
    organization_id: organizationId,
    lead_id: toNullable(leadId),
    assigned_to: finalAssignedTo,
    title,
    description: toNullable(description),
    due_date: toNullable(dueDate),
    priority,
  });

  if (error) return { error: "Não foi possível criar a tarefa." };

  await notifyAssignee({
    organizationId,
    assignedTo: finalAssignedTo,
    authorId: session.userId,
    title,
  });

  revalidatePath("/tasks");
  if (leadId) revalidatePath(`/leads/${leadId}`);
  redirect("/tasks");
}

// ---------------------------------------------------------------------------
// EDITAR TAREFA
// ---------------------------------------------------------------------------
export async function updateTaskAction(
  taskId: string,
  _prevState: TaskFormState,
  formData: FormData
): Promise<TaskFormState> {
  const session = await getSession();
  if (!session?.organization) return { error: "Sessão inválida." };

  const parsed = parseTaskForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { title, description, dueDate, priority, assignedTo, leadId } = parsed.data;
  const supabase = createClient();

  const { data: previous } = await supabase
    .from("tasks")
    .select("assigned_to")
    .eq("id", taskId)
    .maybeSingle();

  const finalAssignedTo = toNullable(assignedTo);

  const { error } = await supabase
    .from("tasks")
    .update({
      title,
      description: toNullable(description),
      due_date: toNullable(dueDate),
      priority,
      assigned_to: finalAssignedTo,
      lead_id: toNullable(leadId),
    })
    .eq("id", taskId)
    .eq("organization_id", session.organization.id);

  if (error) return { error: "Não foi possível salvar a tarefa." };

  // Só notifica se o responsável mudou pra outra pessoa.
  if (finalAssignedTo && finalAssignedTo !== previous?.assigned_to) {
    await notifyAssignee({
      organizationId: session.organization.id,
      assignedTo: finalAssignedTo,
      authorId: session.userId,
      title,
    });
  }

  revalidatePath("/tasks");
  redirect("/tasks");
}

// ---------------------------------------------------------------------------
// CONCLUIR / REABRIR
// ---------------------------------------------------------------------------
export async function toggleTaskCompleteAction(taskId: string, completed: boolean) {
  const session = await getSession();
  if (!session?.organization) return;

  const supabase = createClient();
  await supabase
    .from("tasks")
    .update({ completed })
    .eq("id", taskId)
    .eq("organization_id", session.organization.id);

  revalidatePath("/tasks");
}

// ---------------------------------------------------------------------------
// EXCLUIR
// ---------------------------------------------------------------------------
export async function deleteTaskAction(taskId: string) {
  const session = await getSession();
  if (!session?.organization) return;

  const supabase = createClient();
  await supabase.from("tasks").delete().eq("id", taskId).eq("organization_id", session.organization.id);

  revalidatePath("/tasks");
}
