import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { findOrganizationByMetaPageId } from "@/lib/integrations/queries";
import { fetchMetaLeadData, extractField } from "@/lib/integrations/meta";

/**
 * GET — handshake de verificação do webhook.
 * O Meta chama isso UMA vez, quando você cola essa URL no painel do App
 * (Webhooks → Page → Subscribe). Ele manda hub.verify_token e espera
 * receber de volta exatamente o hub.challenge, só se o token bater com o
 * que você configurou (META_WEBHOOK_VERIFY_TOKEN). Isso é por App inteiro,
 * não por organização — cada organização se identifica depois, no POST,
 * pelo page_id que ela cadastrou em /integrations.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.META_WEBHOOK_VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

/**
 * Confirma que o payload veio mesmo do Meta (e não de alguém forjando um
 * POST pro nosso endpoint), comparando a assinatura HMAC-SHA256 enviada no
 * header com uma calculada aqui usando o App Secret.
 */
function isValidSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader || !process.env.META_APP_SECRET) return false;

  const expected = createHmac("sha256", process.env.META_APP_SECRET)
    .update(rawBody)
    .digest("hex");
  const received = signatureHeader.replace("sha256=", "");

  if (expected.length !== received.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!isValidSignature(rawBody, signature)) {
    console.error("[meta webhook] assinatura inválida — request ignorado");
    return new NextResponse("Invalid signature", { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const supabase = createServiceRoleClient();

  for (const entry of payload.entry ?? []) {
    const pageId = entry.id as string;

    for (const change of entry.changes ?? []) {
      if (change.field !== "leadgen") continue;

      const leadgenId = change.value?.leadgen_id as string | undefined;
      if (!leadgenId) continue;

      await processLeadgenEvent(pageId, leadgenId, supabase);
    }
  }

  // O Meta só considera o webhook "saudável" com um 200 rápido — qualquer
  // erro de organização/config específica é logado, não propagado aqui,
  // senão o Meta desativa a subscription depois de falhas repetidas.
  return new NextResponse("EVENT_RECEIVED", { status: 200 });
}

async function processLeadgenEvent(
  pageId: string,
  leadgenId: string,
  supabase: ReturnType<typeof createServiceRoleClient>
) {
  const org = await findOrganizationByMetaPageId(pageId);
  if (!org) {
    console.error(`[meta webhook] nenhuma organização configurada para a página ${pageId}`);
    return;
  }

  const pageAccessToken = org.config.page_access_token;
  if (!pageAccessToken) {
    console.error(`[meta webhook] organização ${org.organization_id} sem token de acesso configurado`);
    return;
  }

  const leadData = await fetchMetaLeadData(leadgenId, pageAccessToken);
  if (!leadData) return;

  const name = extractField(leadData, "full_name", "nome", "name") ?? "Lead do Meta Ads";
  const email = extractField(leadData, "email", "e-mail");
  const phone = extractField(leadData, "phone_number", "telefone", "phone");

  // Tenta casar com uma campanha já cadastrada (Fase 6) pelo external_id.
  let campaignId: string | null = null;
  let pipelineStageInfo: { pipeline_id: string | null; stage_id: string | null } = {
    pipeline_id: null,
    stage_id: null,
  };

  if (leadData.campaign_id) {
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("id")
      .eq("organization_id", org.organization_id)
      .eq("external_id", leadData.campaign_id)
      .maybeSingle();
    campaignId = campaign?.id ?? null;
  }

  const { data: pipeline } = await supabase
    .from("pipelines")
    .select("id")
    .eq("organization_id", org.organization_id)
    .eq("is_default", true)
    .maybeSingle();

  if (pipeline) {
    const { data: firstStage } = await supabase
      .from("pipeline_stages")
      .select("id")
      .eq("pipeline_id", pipeline.id)
      .order("order_index", { ascending: true })
      .limit(1)
      .maybeSingle();
    pipelineStageInfo = { pipeline_id: pipeline.id, stage_id: firstStage?.id ?? null };
  }

  const { data: lead, error } = await supabase
    .from("leads")
    .upsert(
      {
        organization_id: org.organization_id,
        external_lead_id: leadData.id,
        name,
        email,
        phone,
        source: "Meta Ads",
        medium: "paid_social",
        campaign: leadData.campaign_name ?? null,
        campaign_id: campaignId,
        pipeline_id: pipelineStageInfo.pipeline_id,
        stage_id: pipelineStageInfo.stage_id,
      },
      { onConflict: "organization_id,external_lead_id", ignoreDuplicates: true }
    )
    .select("id")
    .maybeSingle();

  // ignoreDuplicates: true não retorna a linha quando já existia — nesse
  // caso é reenvio do Meta (timeout), não erro; não faz nada de novo.
  if (!lead) {
    if (error) console.error("[meta webhook] falha ao criar lead:", error.message);
    return;
  }

  await supabase.from("activities").insert({
    organization_id: org.organization_id,
    lead_id: lead.id,
    type: "created",
    description: "Lead recebido via Meta Lead Ads.",
  });

  // Notifica os admins da organização (não há "responsável" atribuído
  // ainda — o lead chega sem owner_id, para alguém assumir manualmente).
  const { data: admins } = await supabase
    .from("memberships")
    .select("user_id")
    .eq("organization_id", org.organization_id)
    .eq("role", "client_admin");

  for (const admin of admins ?? []) {
    await supabase.from("notifications").insert({
      organization_id: org.organization_id,
      user_id: admin.user_id,
      title: "Novo lead do Meta Ads",
      body: name,
    });
  }
}
