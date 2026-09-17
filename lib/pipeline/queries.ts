import "server-only";
import { createClient } from "@/lib/supabase/server";

export type KanbanLead = {
  id: string;
  name: string;
  value: number | null;
  owner: { id: string; name: string } | null;
};

export type KanbanStage = {
  id: string;
  name: string;
  kind: "open" | "won" | "lost";
  order_index: number;
  leads: KanbanLead[];
};

export async function getKanbanBoard(organizationId: string): Promise<KanbanStage[]> {
  const supabase = createClient();

  const { data: pipeline } = await supabase
    .from("pipelines")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("is_default", true)
    .maybeSingle();

  if (!pipeline) return [];

  const { data: stages } = await supabase
    .from("pipeline_stages")
    .select("id, name, kind, order_index")
    .eq("pipeline_id", pipeline.id)
    .order("order_index", { ascending: true });

  if (!stages || stages.length === 0) return [];

  const { data: leads } = await supabase
    .from("leads")
    .select("id, name, value, stage_id, owner:profiles(id, name)")
    .eq("organization_id", organizationId)
    .in("stage_id", stages.map((s) => s.id))
    .order("created_at", { ascending: true });

  return stages.map((stage) => ({
    ...stage,
    leads: (leads ?? [])
      .filter((l) => l.stage_id === stage.id)
      .map((l) => ({ id: l.id, name: l.name, value: l.value, owner: l.owner })),
  }));
}
