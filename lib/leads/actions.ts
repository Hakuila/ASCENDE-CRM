"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/get-session";
import { leadSchema } from "@/lib/validations/leads";
import { canDeleteLead } from "@/lib/permissions";
import { getDefaultPipelineStages } from "@/lib/leads/queries";

export type LeadFormState = { error?: string } | null;

function parseLeadForm(formData: FormData) {
  return leadSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    whatsapp: formData.get("whatsapp"),
    source: formData.get("source"),
    medium: formData.get("medium"),
    campaign: formData.get("campaign"),
    value: formData.get("value"),
    notes: formData.get("notes"),
    ownerId: formData.get("ownerId"),
    stageId: formData.get("stageId"),
  });
}

function toNullable(v: string | undefined) {
  return v && v.length > 0 ? v : null;
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

  const { name, email, phone, whatsapp, source, medium, campaign, value, notes, ownerId, stageId } =
    parsed.data;

  const supabase = createClient();
  const organizationId = session.organization.id;

  // Se a etapa não vier escolhida, cai na primeira etapa do pipeline padrão.
  let finalStageId = toNullable(stageId);
  let pipelineId: string | null = null;
  const { pipelineId: defaultPipelineId, stages } = await getDefaultPipelineStages(organizationId);
  pipelineId = defaultPipelineId || null;
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
    })
    .select("id")
    .single();

  if (error || !lead) {
    return { error: "Não foi possível criar o lead. Tente novamente." };
  }

  await supabase.from("activities").insert({
    organization_id: organizationId,
    lead_id: lead.id,
    author_id: session.userId,
    type: "created",
    description: `Lead criado${source ? ` via ${source}` : ""}.`,
  });

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

  const { name, email, phone, whatsapp, source, medium, campaign, value, notes, ownerId, stageId } =
    parsed.data;

  const supabase = createClient();

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
      stage_id: toNullable(stageId),
    })
    .eq("id", leadId)
    .eq("organization_id", session.organization.id); // defesa em profundidade — RLS já cobre isso

  if (error) {
    return { error: "Não foi possível salvar as alterações." };
  }

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  redirect(`/leads/${leadId}`);
}

// ---------------------------------------------------------------------------
// MUDAR ETAPA (usado na página individual — Kanban de arrastar vem na Fase 3)
// ---------------------------------------------------------------------------
export async function changeLeadStageAction(leadId: string, newStageId: string) {
  const session = await getSession();
  if (!session?.organization) return;

  const supabase = createClient();

  const { data: stage } = await supabase
    .from("pipeline_stages")
    .select("name")
    .eq("id", newStageId)
    .maybeSingle();

  const { error } = await supabase
    .from("leads")
    .update({ stage_id: newStageId })
    .eq("id", leadId)
    .eq("organization_id", session.organization.id);

  if (!error) {
    await supabase.from("activities").insert({
      organization_id: session.organization.id,
      lead_id: leadId,
      author_id: session.userId,
      type: "status_change",
      description: stage ? `Movido para "${stage.name}".` : "Etapa alterada.",
    });
  }

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
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
  await supabase.from("activities").insert({
    organization_id: session.organization.id,
    lead_id: leadId,
    author_id: session.userId,
    type: "note",
    description: note,
  });

  revalidatePath(`/leads/${leadId}`);
  return null;
}
