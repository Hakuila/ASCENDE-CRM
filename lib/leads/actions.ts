"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/get-session";
import { leadSchema } from "@/lib/validations/leads";
import { canDeleteLead } from "@/lib/permissions";
import { getDefaultPipelineStages } from "@/lib/leads/queries";

export type LeadFormState = { error?: string } | null;

/**
 * FormData.get() retorna `null` (não `undefined`) para um campo que não
 * existe no DOM no momento do submit — seja porque o formulário nunca teve
 * esse input (ex.: "Novo lead" não tem campo de companyId/campaignId hoje),
 * seja porque ele está dentro de uma seção recolhida (ex.: acordeon
 * "Origem / UTMs"). O schema Zod usa `.optional().or(z.literal(""))`, que
 * aceita `undefined` ou `""`, mas NÃO `null` — daí o "Invalid input" mesmo
 * preenchendo os campos visíveis corretamente. Este helper normaliza para
 * `undefined` antes do parse.
 */
function field(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  return value === null ? undefined : String(value);
}

function parseLeadForm(formData: FormData) {
  return leadSchema.safeParse({
    name: field(formData, "name"),
    email: field(formData, "email"),
    phone: field(formData, "phone"),
    whatsapp: field(formData, "whatsapp"),
    source: field(formData, "source"),
    medium: field(formData, "medium"),
    campaign: field(formData, "campaign"),
    value: field(formData, "value"),
    notes: field(formData, "notes"),
    ownerId: field(formData, "ownerId"),
    stageId: field(formData, "stageId"),
    companyId: field(formData, "companyId"),
    campaignId: field(formData, "campaignId"),
  });
}

function toNullable(v: string | undefined) {
  return v && v.length > 0 ? v : null;
}

/**
 * P1-09: confirma que a etapa escolhida no formulário pertence ao pipeline
 * padrão da organização atual antes de gravar. As triggers de banco
 * (migration 0007, P0-05) já garantem que o stage é da MESMA ORGANIZAÇÃO,
 * mas não que é do MESMO PIPELINE — um stage de outro pipeline da mesma
 * org passaria pela trigger. Hoje o produto só tem um pipeline padrão por
 * organização, mas essa checagem evita quebrar silenciosamente se isso
 * mudar.
 */
async function assertStageBelongsToPipeline(stageId: string, pipelineId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("pipeline_stages")
    .select("id")
    .eq("id", stageId)
    .eq("pipeline_id", pipelineId)
    .maybeSingle();
  return !!data;
}

// ---------------------------------------------------------------------------
// CRIAR LEAD
// ---------------------------------------------------------------------------
export async function createLeadAction(
  _prevState: LeadFormState,
  formData: FormData
): Promise<LeadFormState> {
  const session = await getSession();
  if (!session?.organization) {
    return { error: "Sessão inválida. Faça login novamente." };
  }

  const parsed = parseLeadForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { name, email, phone, whatsapp, source, medium, campaign, value, notes, ownerId, stageId, companyId, campaignId } =
    parsed.data;

  const supabase = createClient();
  const organizationId = session.organization.id;

  // Se a etapa não vier escolhida, cai na primeira etapa do pipeline padrão.
  let finalStageId = toNullable(stageId);
  const { pipelineId: defaultPipelineId, stages } = await getDefaultPipelineStages(organizationId);
  const pipelineId: string | null = defaultPipelineId || null;

  if (finalStageId && pipelineId) {
    const belongsToPipeline = await assertStageBelongsToPipeline(finalStageId, pipelineId);
    if (!belongsToPipeline) {
      return { error: "A etapa selecionada não pertence ao pipeline desta organização." };
    }
  }
  if (!finalStageId) {
    finalStageId = stages[0]?.id ?? null;
  }

  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      organization_id: organizationId,
      name,
      email: toNullable(email),
      phone: toNullable(phone),
      whatsapp: toNullable(whatsapp),
      source: toNullable(source),
      medium: toNullable(medium),
      campaign: toNullable(campaign),
      value: value ? Number(value.replace(",", ".")) : null,
      notes: toNullable(notes),
      owner_id: toNullable(ownerId) ?? session.userId,
      pipeline_id: pipelineId,
      stage_id: finalStageId,
      company_id: toNullable(companyId),
      campaign_id: toNullable(campaignId),
    })
    .select("id")
    .single();

  if (error || !lead) {
    return { error: "Não foi possível criar o lead. Tente novamente." };
  }

  const { error: activityError } = await supabase.from("activities").insert({
    organization_id: organizationId,
    lead_id: lead.id,
    author_id: session.userId,
    type: "created",
    description: `Lead criado${source ? ` via ${source}` : ""}.`,
  });
  if (activityError) {
    console.error("Falha ao registrar activity de criação de Lead:", activityError);
  }

  revalidatePath("/leads");
  redirect(`/leads/${lead.id}`);
}

// ---------------------------------------------------------------------------
// EDITAR LEAD
// ---------------------------------------------------------------------------
export async function updateLeadAction(
  leadId: string,
  _prevState: LeadFormState,
  formData: FormData
): Promise<LeadFormState> {
  const session = await getSession();
  if (!session?.organization) {
    return { error: "Sessão inválida. Faça login novamente." };
  }

  const parsed = parseLeadForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { name, email, phone, whatsapp, source, medium, campaign, value, notes, ownerId, stageId, companyId, campaignId } =
    parsed.data;

  const supabase = createClient();
  const organizationId = session.organization.id;

  const finalStageId = toNullable(stageId);
  if (finalStageId) {
    const { pipelineId: defaultPipelineId } = await getDefaultPipelineStages(organizationId);
    if (defaultPipelineId) {
      const belongsToPipeline = await assertStageBelongsToPipeline(finalStageId, defaultPipelineId);
      if (!belongsToPipeline) {
        return { error: "A etapa selecionada não pertence ao pipeline desta organização." };
      }
    }
  }

  const { error } = await supabase
    .from("leads")
    .update({
      name,
      email: toNullable(email),
      phone: toNullable(phone),
      whatsapp: toNullable(whatsapp),
      source: toNullable(source),
      medium: toNullable(medium),
      campaign: toNullable(campaign),
      value: value ? Number(value.replace(",", ".")) : null,
      notes: toNullable(notes),
      owner_id: toNullable(ownerId),
      stage_id: finalStageId,
      company_id: toNullable(companyId),
      campaign_id: toNullable(campaignId),
    })
    .eq("id", leadId)
    .eq("organization_id", organizationId); // defesa em profundidade — RLS já cobre isso

  if (error) {
    return { error: "Não foi possível salvar as alterações." };
  }

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  redirect(`/leads/${leadId}`);
}

// ---------------------------------------------------------------------------
// MUDAR ETAPA (usado na página individual e no Kanban de arrastar)
// ---------------------------------------------------------------------------
export type ChangeStageResult = { error?: string } | null;

/**
 * P1-01: agora retorna { error } em vez de void, para que quem chama (ex.:
 * o Kanban com atualização otimista) saiba se precisa desfazer a mudança
 * feita na UI antes da resposta do servidor.
 */
export async function changeLeadStageAction(
  leadId: string,
  newStageId: string
): Promise<ChangeStageResult> {
  const session = await getSession();
  if (!session?.organization) return { error: "Sessão inválida." };

  const supabase = createClient();

  const { data: stage, error: stageError } = await supabase
    .from("pipeline_stages")
    .select("name")
    .eq("id", newStageId)
    .maybeSingle();

  if (stageError) {
    return { error: "Não foi possível verificar a etapa de destino." };
  }
  if (!stage) {
    return { error: "Etapa de destino não encontrada." };
  }

  const { error } = await supabase
    .from("leads")
    .update({ stage_id: newStageId })
    .eq("id", leadId)
    .eq("organization_id", session.organization.id);

  if (error) {
    return { error: "Não foi possível mover o lead. Tente novamente." };
  }

  const { error: activityError } = await supabase.from("activities").insert({
    organization_id: session.organization.id,
    lead_id: leadId,
    author_id: session.userId,
    type: "status_change",
    description: `Movido para "${stage.name}".`,
  });
  if (activityError) {
    console.error("Falha ao registrar activity de mudança de etapa:", activityError);
  }

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  return null;
}

// ---------------------------------------------------------------------------
// EXCLUIR LEAD (só client_admin / platform_admin — RLS também garante isso)
// ---------------------------------------------------------------------------
export async function deleteLeadAction(leadId: string) {
  const session = await getSession();
  if (!session) return;

  if (!canDeleteLead(session)) {
    throw new Error("Você não tem permissão para excluir leads.");
  }

  const supabase = createClient();
  await supabase.from("leads").delete().eq("id", leadId);

  revalidatePath("/leads");
  redirect("/leads");
}

// ---------------------------------------------------------------------------
// NOVA NOTA/OBSERVAÇÃO NO HISTÓRICO
// ---------------------------------------------------------------------------
export async function addLeadNoteAction(
  leadId: string,
  _prevState: LeadFormState,
  formData: FormData
): Promise<LeadFormState> {
  const session = await getSession();
  if (!session?.organization) {
    return { error: "Sessão inválida." };
  }

  const note = String(formData.get("note") ?? "").trim();
  if (!note) return { error: "Escreva algo antes de salvar." };

  const supabase = createClient();
  const { error } = await supabase.from("activities").insert({
    organization_id: session.organization.id,
    lead_id: leadId,
    author_id: session.userId,
    type: "note",
    description: note,
  });
  if (error) {
    return { error: "Não foi possível salvar a nota." };
  }

  revalidatePath(`/leads/${leadId}`);
  return null;
}