"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/get-session";
import { canManagePipelineSettings } from "@/lib/permissions";
import { stageSchema } from "@/lib/validations/pipeline";

export type StageFormState = { error?: string } | null;

async function requireAdminSession() {
  const session = await getSession();
  if (!session?.organization || !canManagePipelineSettings(session)) {
    throw new Error("Você não tem permissão para editar o pipeline.");
  }
  return session;
}

async function getDefaultPipelineId(organizationId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("pipelines")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("is_default", true)
    .maybeSingle();
  return data?.id ?? null;
}

export async function createStageAction(
  _prevState: StageFormState,
  formData: FormData
): Promise<StageFormState> {
  const session = await requireAdminSession();
  const parsed = stageSchema.safeParse({
    name: formData.get("name"),
    kind: formData.get("kind"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = createClient();
  const organizationId = session.organization!.id;
  const pipelineId = await getDefaultPipelineId(organizationId);
  if (!pipelineId) return { error: "Pipeline padrão não encontrado." };

  const { data: last } = await supabase
    .from("pipeline_stages")
    .select("order_index")
    .eq("pipeline_id", pipelineId)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("pipeline_stages").insert({
    organization_id: organizationId,
    pipeline_id: pipelineId,
    name: parsed.data.name,
    kind: parsed.data.kind,
    order_index: (last?.order_index ?? 0) + 1,
  });

  if (error) return { error: "Não foi possível criar a etapa." };

  revalidatePath("/pipeline/etapas");
  revalidatePath("/pipeline");
  return null;
}

export async function updateStageAction(
  stageId: string,
  _prevState: StageFormState,
  formData: FormData
): Promise<StageFormState> {
  await requireAdminSession();
  const parsed = stageSchema.safeParse({
    name: formData.get("name"),
    kind: formData.get("kind"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("pipeline_stages")
    .update({ name: parsed.data.name, kind: parsed.data.kind })
    .eq("id", stageId);

  if (error) return { error: "Não foi possível salvar a etapa." };

  revalidatePath("/pipeline/etapas");
  revalidatePath("/pipeline");
  return null;
}

export async function deleteStageAction(stageId: string) {
  await requireAdminSession();
  const supabase = createClient();
  // leads/deals nessa etapa ficam com stage_id = null (ON DELETE SET NULL).
  await supabase.from("pipeline_stages").delete().eq("id", stageId);

  revalidatePath("/pipeline/etapas");
  revalidatePath("/pipeline");
}

export async function reorderStageAction(stageId: string, direction: "up" | "down") {
  const session = await requireAdminSession();
  const supabase = createClient();
  const organizationId = session.organization!.id;
  const pipelineId = await getDefaultPipelineId(organizationId);
  if (!pipelineId) return;

  const { data: stages } = await supabase
    .from("pipeline_stages")
    .select("id, order_index")
    .eq("pipeline_id", pipelineId)
    .order("order_index", { ascending: true });

  if (!stages) return;

  const index = stages.findIndex((s) => s.id === stageId);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swapIndex < 0 || swapIndex >= stages.length) return;

  const current = stages[index];
  const swapWith = stages[swapIndex];

  await supabase
    .from("pipeline_stages")
    .update({ order_index: swapWith.order_index })
    .eq("id", current.id);
  await supabase
    .from("pipeline_stages")
    .update({ order_index: current.order_index })
    .eq("id", swapWith.id);

  revalidatePath("/pipeline/etapas");
  revalidatePath("/pipeline");
}
