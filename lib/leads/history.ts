import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * P2-03: registra uma mudança de etapa em lead_stage_history.
 *
 * Recebe o client como parâmetro (em vez de criar o seu) porque os pontos
 * que mudam a etapa de um Lead rodam em contextos diferentes: com sessão
 * de usuário (lib/leads/actions.ts, lib/deals/actions.ts) ou com service
 * role, sem sessão nenhuma (webhook do Meta, API pública de captura).
 *
 * Não registra se fromStageId === toStageId (nada mudou de fato) nem se
 * toStageId for null (lead sem pipeline configurado). Nunca lança — uma
 * falha ao registrar histórico não deve impedir a mudança de etapa em si.
 */
export async function logLeadStageChange(
  supabase: SupabaseClient<Database>,
  params: {
    organizationId: string;
    leadId: string;
    fromStageId: string | null;
    toStageId: string | null;
    changedBy: string | null;
  }
) {
  if (!params.toStageId) return;
  if (params.fromStageId === params.toStageId) return;

  const { error } = await supabase.from("lead_stage_history").insert({
    organization_id: params.organizationId,
    lead_id: params.leadId,
    from_stage_id: params.fromStageId,
    to_stage_id: params.toStageId,
    changed_by: params.changedBy,
  });

  if (error) {
    console.error("[lead-stage-history] falha ao registrar mudança de etapa:", error.message);
  }
}