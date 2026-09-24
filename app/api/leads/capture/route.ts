import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { logLeadStageChange } from "@/lib/leads/history";

/**
 * POST /api/leads/capture
 *
 * Endpoint público (sem sessão de usuário) para qualquer landing page ou
 * formulário externo da agência enviar um lead pro CRM, já com as UTMs
 * capturadas da URL. Autenticado pela `public_api_key` da organização
 * (gerada automaticamente na criação dela, visível/regenerável em
 * /integrations) — não dá acesso de leitura a nada, só cria leads.
 *
 * P1-07: createServiceRoleClient agora mora em lib/supabase/admin (não
 * mais em lib/supabase/server) — só o import mudou, comportamento igual.
 *
 * P1-02: rate limiting em duas camadas —
 *   1) por IP, ANTES de qualquer consulta ao banco: barra flood genérico
 *      de quem nem sequer tem uma api_key válida;
 *   2) por organização (depois de validar a api_key): protege um tenant
 *      específico caso a própria key dele vaze ou seja usada indevidamente,
 *      sem penalizar outras organizações que dividem o mesmo IP de origem
 *      (ex.: uma mesma landing page builder usada por vários clientes).
 *
 * Exemplo de payload:
 * {
 *   "api_key": "abc123...",
 *   "name": "Maria Souza",
 *   "email": "maria@exemplo.com",
 *   "phone": "11912345678",
 *   "utm_source": "google",
 *   "utm_medium": "cpc",
 *   "utm_campaign": "black-friday",
 *   "external_id": "id-do-seu-formulario" // opcional, evita duplicar em reenvio
 * }
 */
const captureSchema = z.object({
  api_key: z.string().min(10),
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  value: z.number().optional(),
  notes: z.string().optional(),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_content: z.string().optional(),
  utm_term: z.string().optional(),
  external_id: z.string().optional(),
});

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(request: NextRequest) {
  // Camada 1: por IP, antes de tocar no banco para validar a api_key.
  const ip = getClientIp(request.headers);
  const ipLimit = await checkRateLimit(`leads-capture-ip:${ip}`, 60, 30);
  if (!ipLimit.allowed) {
    return NextResponse.json(
      { error: "Muitas requisições. Tente novamente em instantes." },
      { status: 429, headers: { ...corsHeaders(), "Retry-After": "60" } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400, headers: corsHeaders() });
  }

  const parsed = captureSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400, headers: corsHeaders() }
    );
  }

  const { api_key, external_id, ...leadFields } = parsed.data;
  const supabase = createServiceRoleClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("public_api_key", api_key)
    .maybeSingle();

  if (!org) {
    // Não revela se a chave existe ou não pertence a ninguém — só "inválida".
    return NextResponse.json({ error: "Chave de API inválida." }, { status: 401, headers: corsHeaders() });
  }

  // Camada 2: por organização, agora que sabemos qual é.
  const orgLimit = await checkRateLimit(`leads-capture-org:${org.id}`, 60, 60);
  if (!orgLimit.allowed) {
    return NextResponse.json(
      { error: "Limite de envios desta integração atingido. Tente novamente em instantes." },
      { status: 429, headers: { ...corsHeaders(), "Retry-After": "60" } }
    );
  }

  const { data: pipeline } = await supabase
    .from("pipelines")
    .select("id")
    .eq("organization_id", org.id)
    .eq("is_default", true)
    .maybeSingle();

  let stageId: string | null = null;
  if (pipeline) {
    const { data: firstStage } = await supabase
      .from("pipeline_stages")
      .select("id")
      .eq("pipeline_id", pipeline.id)
      .order("order_index", { ascending: true })
      .limit(1)
      .maybeSingle();
    stageId = firstStage?.id ?? null;
  }

  const { data: lead, error } = await supabase
    .from("leads")
    .upsert(
      {
        organization_id: org.id,
        external_lead_id: external_id ?? null,
        name: leadFields.name,
        email: leadFields.email ?? null,
        phone: leadFields.phone ?? null,
        whatsapp: leadFields.whatsapp ?? null,
        value: leadFields.value ?? null,
        notes: leadFields.notes ?? null,
        source: leadFields.utm_source ?? "Landing page",
        medium: leadFields.utm_medium ?? null,
        campaign: leadFields.utm_campaign ?? null,
        utm_source: leadFields.utm_source ?? null,
        utm_medium: leadFields.utm_medium ?? null,
        utm_campaign: leadFields.utm_campaign ?? null,
        utm_content: leadFields.utm_content ?? null,
        utm_term: leadFields.utm_term ?? null,
        pipeline_id: pipeline?.id ?? null,
        stage_id: stageId,
      },
      external_id
        ? { onConflict: "organization_id,external_lead_id", ignoreDuplicates: true }
        : undefined
    )
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[leads/capture] falha ao criar lead:", error.message);
    return NextResponse.json({ error: "Não foi possível registrar o lead." }, { status: 500, headers: corsHeaders() });
  }

  if (lead) {
    await supabase.from("activities").insert({
      organization_id: org.id,
      lead_id: lead.id,
      type: "created",
      description: `Lead recebido via API pública${leadFields.utm_source ? ` (${leadFields.utm_source})` : ""}.`,
    });

    // P2-03: entrada inicial no histórico de etapas. changedBy null — a
    // API pública não tem usuário autenticado por trás.
    await logLeadStageChange(supabase, {
      organizationId: org.id,
      leadId: lead.id,
      fromStageId: null,
      toStageId: stageId,
      changedBy: null,
    });
  }

  return NextResponse.json({ ok: true, duplicate: !lead }, { status: 200, headers: corsHeaders() });
}