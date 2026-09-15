import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function getDealForLead(leadId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("deals")
    .select("id, title, value, status, expected_close_date, created_at")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export type DealListFilters = { status?: "open" | "won" | "lost" };

export async function getDealsList(organizationId: string, filters: DealListFilters) {
  const supabase = createClient();
  let query = supabase
    .from("deals")
    .select(
      "id, title, value, status, expected_close_date, created_at, lead:leads(id, name), owner:profiles(id, name)"
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (filters.status) query = query.eq("status", filters.status);

  const { data } = await query;
  return data ?? [];
}
