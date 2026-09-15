import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function getNotifications(userId: string, limit = 10) {
  const supabase = createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, title, body, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function countUnreadNotifications(userId: string) {
  const supabase = createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
  return count ?? 0;
}
