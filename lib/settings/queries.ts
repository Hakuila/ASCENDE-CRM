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
      name: (m.profile as any).name,
      email: (m.profile as any).email,
      role: m.role as TeamMember["role"],
    }));
}
