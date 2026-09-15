"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/get-session";

export async function markNotificationReadAction(notificationId: string) {
  const session = await getSession();
  if (!session) return;

  const supabase = createClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", session.userId); // defesa em profundidade — RLS já cobre isso

  revalidatePath("/", "layout");
}

export async function markAllNotificationsReadAction() {
  const session = await getSession();
  if (!session) return;

  const supabase = createClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", session.userId)
    .is("read_at", null);

  revalidatePath("/", "layout");
}
