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

/**
 * P1-09: confirma explicitamente que a etapa pertence à organização da
 * sessão atual antes de qualquer update/delete. RLS já bloqueia o acesso
 * cross-tenant no banco, mas essa checagem evita depender apenas disso e
 * permite retornar um erro claro (em vez de um erro genérico de RLS) para
 * a UI.
 */
async function getOwnedStage(stageId: string, organizationId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("pipeline_stages")
    .select("id, pipeline_id, organization_id")
    .eq("id", stageId)
    .maybeSingle();

  if (!data || data.organization_id !== organizationId) return null;
  return data;
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
  const session = await requireAdminSession();
  const parsed = stageSchema.safeParse({
    name: formData.get("name"),
    kind: formData.get("kind"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const organizationId = session.organization!.id;
  const stage = await getOwnedStage(stageId, organizationId);
  if (!stage) return { error: "Etapa não encontrada." };

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

/**
 * P1-04: bloqueia a exclusão de etapas que ainda têm Leads ou Deals
 * vinculados. Antes, o "ON DELETE SET NULL" deixava esses registros sem
 * etapa silenciosamente. Agora a ação falha com uma mensagem explicando o
 * motivo, exigindo que o usuário mova os registros antes de excluir.
 *
 * IMPORTANTE: a assinatura foi mantida como `(stageId: string)` para não
 * quebrar quem já chama esta action, mas ela passou a retornar
 * `StageFormState` em vez de `void`. Se o componente que chama esta action
 * hoje ignora o retorno (ex.: `onClick={() => deleteStageAction(id)}`),
 * ele vai continuar funcionando, mas o erro não será exibido ao usuário —
 * vale atualizar esse componente para tratar `{ error }` quando ele vier
 * (me envie o arquivo, ex. da página /pipeline/etapas, que eu ajusto).
 */
export async function deleteStageAction(stageId: string): Promise<StageFormState> {
  const session = await requireAdminSession();
  const organizationId = session.organization!.id;

  const stage = await getOwnedStage(stageId, organizationId);
  if (!stage) return { error: "Etapa não encontrada." };

  const supabase = createClient();

  const [{ count: leadsCount, error: leadsError }, { count: dealsCount, error: dealsError }] =
    await Promise.all([
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("stage_id", stageId),
      supabase
        .from("deals")
        .select("id", { count: "exact", head: true })
        .eq("stage_id", stageId),
    ]);

  if (leadsError || dealsError) {
    return { error: "Não foi possível verificar os vínculos da etapa." };
  }

  if ((leadsCount ?? 0) > 0 || (dealsCount ?? 0) > 0) {
    return {
      error:
        "Não é possível excluir esta etapa: existem Leads ou Oportunidades vinculados a ela. Mova-os para outra etapa antes de excluir.",
    };
  }

  const { error } = await supabase.from("pipeline_stages").delete().eq("id", stageId);
  if (error) return { error: "Não foi possível excluir a etapa." };

  revalidatePath("/pipeline/etapas");
  revalidatePath("/pipeline");
  return null;
}

/**
 * P0-01: a troca de order_index agora acontece inteira dentro de uma
 * transação de banco (RPC `reorder_pipeline_stage`), eliminando a colisão
 * com a constraint UNIQUE (pipeline_id, order_index) que existia ao fazer
 * dois updates sequenciais a partir do client. Ver migration 0007.
 */
export async function reorderStageAction(
  stageId: string,
  direction: "up" | "down"
): Promise<StageFormState> {
  const session = await requireAdminSession();
  const organizationId = session.organization!.id;

  const stage = await getOwnedStage(stageId, organizationId);
  if (!stage) return { error: "Etapa não encontrada." };

  const supabase = createClient();
  const { error } = await supabase.rpc("reorder_pipeline_stage", {
    p_stage_id: stageId,
    p_direction: direction,
  });

  if (error) return { error: "Não foi possível reordenar as etapas." };

  revalidatePath("/pipeline/etapas");
  revalidatePath("/pipeline");
  return null;
}