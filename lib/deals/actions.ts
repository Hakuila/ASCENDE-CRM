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
 * Item 3.3 da validação pós-auditoria: fechamento agora é uma única
 * chamada à RPC close_deal (migration 0007), que faz tudo — update do
 * Deal, sincronização de etapa do Lead, histórico e activity — dentro de
 * UMA transação no banco. Antes, essas eram 4 chamadas separadas do
 * client; se a 2ª ou 3ª falhasse, o Deal já tinha mudado de status sem
 * jeito de desfazer automaticamente.
 *
 * `leadId` continua no parâmetro só para revalidatePath — não é mais usado
 * em nenhuma query (o lead é sempre lido a partir do próprio Deal dentro
 * da função), o que elimina de vez a possibilidade de um leadId
 * divergente do deal.lead_id (P0-05): antes isso era checado em app,
 * agora é estruturalmente impossível.
 */
export async function markDealStatusAction(
  dealId: string,
  leadId: string,
  status: "won" | "lost"
): Promise<DealFormState> {
  const session = await getSession();
  if (!session?.organization) return { error: "Sessão inválida." };

  const supabase = createClient();
  const { error } = await supabase.rpc("close_deal", {
    p_deal_id: dealId,
    p_status: status,
  });

  if (error) {
    if (error.message.includes("não encontrada")) {
      return { error: "Oportunidade não encontrada." };
    }
    if (error.message.includes("já foi fechada")) {
      return { error: "Esta oportunidade já foi fechada anteriormente." };
    }
    console.error("[markDealStatusAction] falha ao fechar oportunidade:", error.message);
    return { error: "Não foi possível fechar a oportunidade. Tente novamente." };
  }

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/deals");
  return null;
}