"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/get-session";
import { dealSchema } from "@/lib/validations/deals";

export type DealFormState = { error?: string } | null;

/**
 * P1-10: regra adotada — um Lead tem no máximo um Deal aberto por vez
 * (a interface já trabalha com uma "oportunidade principal"). O RPC criado
 * na migration 0007 garante isso via índice único parcial
 * (deals.lead_id where status = 'open'); aqui verificamos antes, de forma
 * antecipada, para devolver uma mensagem amigável em vez de deixar o
 * usuário receber um erro genérico de constraint.
 */
export async function createDealAction(
  leadId: string,
  _prevState: DealFormState,
  formData: FormData
): Promise<DealFormState> {
  const session = await getSession();
  if (!session?.organization) return { error: "Sessão inválida." };

  const parsed = dealSchema.safeParse({
    title: formData.get("title"),
    value: formData.get("value"),
    expectedCloseDate: formData.get("expectedCloseDate"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = createClient();
  const { title, value, expectedCloseDate } = parsed.data;
  const organizationId = session.organization.id;

  // P0-05: confirma explicitamente que o Lead pertence à organização da
  // sessão antes de criar um Deal vinculado a ele (reforçado no banco pela
  // trigger enforce_same_organization_deals_leads, ver migration 0007).
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("pipeline_id, stage_id, owner_id, organization_id")
    .eq("id", leadId)
    .maybeSingle();

  if (leadError) return { error: "Não foi possível carregar o Lead." };
  if (!lead || lead.organization_id !== organizationId) {
    return { error: "Lead não encontrado." };
  }

  // P1-10: impede criar um segundo Deal aberto para o mesmo Lead.
  const { count: openDealsCount, error: openDealsError } = await supabase
    .from("deals")
    .select("id", { count: "exact", head: true })
    .eq("lead_id", leadId)
    .eq("status", "open");

  if (openDealsError) {
    return { error: "Não foi possível verificar oportunidades existentes." };
  }
  if ((openDealsCount ?? 0) > 0) {
    return {
      error:
        "Este Lead já tem uma oportunidade em aberto. Feche ou cancele a atual antes de criar outra.",
    };
  }

  const { error } = await supabase.from("deals").insert({
    organization_id: organizationId,
    lead_id: leadId,
    pipeline_id: lead.pipeline_id ?? null,
    stage_id: lead.stage_id ?? null,
    owner_id: lead.owner_id ?? session.userId,
    status: "open",
    title,
    value: value ? Number(value.replace(",", ".")) : null,
    expected_close_date: expectedCloseDate || null,
  });

  if (error) {
    // 23505 = violação de unique constraint (rede de segurança do índice
    // parcial da migration 0007, caso duas requisições concorrentes passem
    // pela checagem acima ao mesmo tempo).
    if ((error as { code?: string }).code === "23505") {
      return {
        error: "Este Lead já tem uma oportunidade em aberto.",
      };
    }
    return { error: "Não foi possível criar a oportunidade." };
  }

  const { error: activityError } = await supabase.from("activities").insert({
    organization_id: organizationId,
    lead_id: leadId,
    author_id: session.userId,
    type: "proposal",
    description: `Oportunidade "${title}" criada.`,
  });
  if (activityError) {
    // Não bloqueia o fluxo principal (o Deal já foi criado), mas registra
    // para investigação — P1-03 exige não ignorar erros silenciosamente.
    console.error("Falha ao registrar activity de criação de Deal:", activityError);
  }

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/deals");
  return null;
}

/**
 * P0-02: agora preenche closed_at com o timestamp real do fechamento.
 * P0-04: ao fechar o Deal, move o Lead (e o próprio Deal) para a etapa do
 * pipeline com kind = 'won' | 'lost', mantendo Lead e Deal sincronizados.
 * P0-05: valida que o Deal pertence à organização da sessão e que
 * realmente está vinculado ao leadId informado antes de qualquer alteração.
 * P1-03: erros de update deixam de ser ignorados — a action agora retorna
 * DealFormState em vez de void.
 */
export async function markDealStatusAction(
  dealId: string,
  leadId: string,
  status: "won" | "lost"
): Promise<DealFormState> {
  const session = await getSession();
  if (!session?.organization) return { error: "Sessão inválida." };

  const supabase = createClient();
  const organizationId = session.organization.id;

  const { data: deal, error: dealError } = await supabase
    .from("deals")
    .select("title, value, status, lead_id, pipeline_id, organization_id")
    .eq("id", dealId)
    .maybeSingle();

  if (dealError) return { error: "Não foi possível carregar a oportunidade." };
  if (!deal || deal.organization_id !== organizationId || deal.lead_id !== leadId) {
    return { error: "Oportunidade não encontrada." };
  }
  if (deal.status !== "open") {
    return { error: "Esta oportunidade já foi fechada anteriormente." };
  }

  // P0-04: busca a etapa do pipeline correspondente a won/lost para
  // sincronizar Lead e Deal com o estado comercial real.
  let targetStageId: string | null = null;
  if (deal.pipeline_id) {
    const { data: targetStage, error: stageError } = await supabase
      .from("pipeline_stages")
      .select("id")
      .eq("pipeline_id", deal.pipeline_id)
      .eq("kind", status)
      .maybeSingle();

    if (stageError) {
      return { error: "Não foi possível localizar a etapa de destino do pipeline." };
    }
    targetStageId = targetStage?.id ?? null;
  }

  const closedAt = new Date().toISOString();

  const { error: updateDealError } = await supabase
    .from("deals")
    .update({
      status,
      closed_at: closedAt,
      ...(targetStageId ? { stage_id: targetStageId } : {}),
    })
    .eq("id", dealId);

  if (updateDealError) {
    return { error: "Não foi possível atualizar a oportunidade." };
  }

  if (targetStageId) {
    const { error: updateLeadError } = await supabase
      .from("leads")
      .update({ stage_id: targetStageId })
      .eq("id", leadId);

    if (updateLeadError) {
      // O Deal já mudou de status; registramos o erro para correção manual
      // em vez de deixar a falha passar despercebida (P1-03).
      console.error("Falha ao sincronizar etapa do Lead após fechar Deal:", updateLeadError);
      return {
        error:
          "A oportunidade foi fechada, mas não foi possível mover o Lead para a etapa correspondente. Ajuste manualmente.",
      };
    }
  }

  const { error: activityError } = await supabase.from("activities").insert({
    organization_id: organizationId,
    lead_id: leadId,
    author_id: session.userId,
    type: status === "won" ? "sale" : "note",
    description:
      status === "won"
        ? `Venda registrada${deal.value ? ` — R$ ${deal.value}` : ""}.`
        : `Oportunidade "${deal.title}" marcada como perdida.`,
  });
  if (activityError) {
    console.error("Falha ao registrar activity de fechamento de Deal:", activityError);
  }

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/deals");
  return null;
}