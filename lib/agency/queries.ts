import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * platform_admins só permite SELECT da própria linha via RLS (por design —
 * ver migration 0001). Pra listar todo o staff da agência, precisa da
 * service role. Isso é seguro porque essas queries só rodam atrás do
 * layout (agency)/layout.tsx, que já barra quem não é platform_admin.
 */
export async function getPlatformAdmins() {
  const supabase = createServiceRoleClient();
  const { data: admins } = await supabase
    .from("platform_admins")
    .select("user_id, created_at")
    .order("created_at", { ascending: true });

  if (!admins || admins.length === 0) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, name, email")
    .in(
      "id",
      admins.map((a) => a.user_id)
    );

  return admins.map((a) => {
    const profile = profiles?.find((p) => p.id === a.user_id);
    return {
      userId: a.user_id,
      name: profile?.name ?? "(perfil não encontrado)",
      email: profile?.email ?? "",
      createdAt: a.created_at,
    };
  });
}

export async function getCrossOrgPerformance() {
  const supabase = createServiceRoleClient();

  const { data: orgs } = await supabase
    .from("organizations")
    .select("id, name, created_at")
    .order("created_at", { ascending: false });

  if (!orgs || orgs.length === 0) return [];

  const orgIds = orgs.map((o) => o.id);

  const [{ data: leads }, { data: deals }] = await Promise.all([
    supabase.from("leads").select("id, organization_id").in("organization_id", orgIds),
    supabase.from("deals").select("organization_id, value, status").in("organization_id", orgIds),
  ]);

  return orgs.map((org) => {
    const orgLeads = (leads ?? []).filter((l) => l.organization_id === org.id);
    const orgDeals = (deals ?? []).filter((d) => d.organization_id === org.id);
    const won = orgDeals.filter((d) => d.status === "won");
    return {
      id: org.id,
      name: org.name,
      createdAt: org.created_at,
      leadsCount: orgLeads.length,
      dealsCount: orgDeals.length,
      salesCount: won.length,
      revenue: won.reduce((sum, d) => sum + (d.value ?? 0), 0),
    };
  });
}

export async function getIntegrationsOverview() {
  const supabase = createServiceRoleClient();

  const { data: orgs } = await supabase
    .from("organizations")
    .select("id, name")
    .order("name", { ascending: true });

  const { data: integrations } = await supabase
    .from("integrations")
    .select("organization_id, provider, is_active");

  return (orgs ?? []).map((org) => ({
    id: org.id,
    name: org.name,
    metaActive: (integrations ?? []).some(
      (i) => i.organization_id === org.id && i.provider === "meta_ads" && i.is_active
    ),
  }));
}
