import "server-only";
import { createClient } from "@/lib/supabase/server";

export type TaskListFilters = {
  view?: "pending" | "completed" | "overdue" | "all";
  assignedTo?: string;
};

export async function getTasksList(organizationId: string, filters: TaskListFilters) {
  const supabase = createClient();
  const nowIso = new Date().toISOString();

  let query = supabase
    .from("tasks")
    .select(
      "id, title, description, due_date, priority, completed, created_at, lead:leads(id, name), assignee:profiles(id, name)"
    )
    .eq("organization_id", organizationId)
    .order("due_date", { ascending: true, nullsFirst: false });

  if (filters.view === "pending") query = query.eq("completed", false);
  if (filters.view === "completed") query = query.eq("completed", true);
  if (filters.view === "overdue") {
    query = query.eq("completed", false).lt("due_date", nowIso);
  }
  if (filters.assignedTo) query = query.eq("assigned_to", filters.assignedTo);

  const { data } = await query;
  return data ?? [];
}

export async function getTaskById(organizationId: string, taskId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("tasks")
    .select(
      "id, title, description, due_date, priority, completed, lead:leads(id, name), assignee:profiles(id, name)"
    )
    .eq("organization_id", organizationId)
    .eq("id", taskId)
    .maybeSingle();
  return data;
}

export async function countOverdueTasks(organizationId: string, userId: string) {
  const supabase = createClient();
  const { count } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("assigned_to", userId)
    .eq("completed", false)
    .lt("due_date", new Date().toISOString());
  return count ?? 0;
}
