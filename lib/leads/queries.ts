import "server-only";
import { createClient } from "@/lib/supabase/server";

export type OrgMember = { id: string; name: string; role: "client_admin" | "salesperson" };
export type Stage = { id: string; name: string; kind: "open" | "won" | "lost"; order_index: number };

/**
 * Membros da organização (para o seletor de "responsável").
 * A RLS já restringe a leitura à organização do usuário logado — o filtro
 * explícito por organization_id abaixo é só defesa em profundidade.
 */
export async function getOrgMembers(organizationId: string): Promise<OrgMember[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("memberships")
    .select("role, profile:profiles(id, name)")
    .eq("organization_id", organizationId);

  return (data ?? [])
    .filter((m) => m.profile)
    .map((m) => ({
      // Non-null: já filtramos as linhas sem profile acima — ver mesma
      // observação em lib/settings/queries.ts::getTeamMembers.
      id: m.profile!.id,
      name: m.profile!.name,
      role: m.role as OrgMember["role"],
    }));
}

/** Etapas do pipeline padrão da organização, na ordem certa para o select. */
export async function getDefaultPipelineStages(
  organizationId: string
): Promise<{ pipelineId: string; stages: Stage[] }> {
  const supabase = createClient();

  const { data: pipeline } = await supabase
    .from("pipelines")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("is_default", true)
    .maybeSingle();

  if (!pipeline) return { pipelineId: "", stages: [] };

  const { data: stages } = await supabase
    .from("pipeline_stages")
    .select("id, name, kind, order_index")
    .eq("pipeline_id", pipeline.id)
    .order("order_index", { ascending: true });

  return { pipelineId: pipeline.id, stages: stages ?? [] };
}

export type LeadListFilters = {
  search?: string;
  stageId?: string;
  ownerId?: string;
  page?: number;
};

const PAGE_SIZE = 20;

export async function getLeadsList(organizationId: string, filters: LeadListFilters) {
  const supabase = createClient();
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("leads")
    .select(
      "id, name, email, phone, value, created_at, stage:pipeline_stages(id, name, kind), owner:profiles(id, name)",
      { count: "exact" }
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.search) {
    const term = filters.search.replace(/[%,]/g, "");
    query = query.or(`name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`);
  }
  if (filters.stageId) query = query.eq("stage_id", filters.stageId);
  if (filters.ownerId) query = query.eq("owner_id", filters.ownerId);

  const { data, count, error } = await query;

  return {
    leads: data ?? [],
    total: count ?? 0,
    page,
    totalPages: Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE)),
    error: error?.message,
  };
}

export async function getLeadById(organizationId: string, leadId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("leads")
    .select(
      `id, name, email, phone, whatsapp, source, medium, campaign, value, notes,
       company_id, campaign_id,
       created_at, updated_at,
       stage:pipeline_stages(id, name, kind),
       owner:profiles(id, name)`
    )
    .eq("organization_id", organizationId)
    .eq("id", leadId)
    .maybeSingle();

  return data;
}

export async function getLeadActivities(leadId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("activities")
    .select("id, type, description, created_at, author:profiles(name)")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  return data ?? [];
}
