import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function getOrganizationProfile(organizationId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("organizations")
    .select("id, name, legal_name, cnpj, logo_url")
    .eq("id", organizationId)
    .maybeSingle();
  return data;
}

export type TeamMember = {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  role: "client_admin" | "salesperson";
};

export async function getTeamMembers(organizationId: string): Promise<TeamMember[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("memberships")
    .select("id, role, user_id, profile:profiles(id, name, email)")
    .eq("organization_id", organizationId);

  return (data ?? [])
    .filter((m) => m.profile)
    .map((m) => ({
      membershipId: m.id,
      userId: m.user_id,
      // Non-null: já filtramos as linhas sem profile na linha acima —
      // com o Database real (P0-06), o embed tipa como objeto único
      // (nunca array) para este relacionamento, então só falta o
      // null-check que o .filter() não propaga automaticamente pro TS.
      name: m.profile!.name,
      email: m.profile!.email,
      role: m.role as TeamMember["role"],
    }));
}
