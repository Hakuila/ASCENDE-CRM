import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * POST /api/leads/capture
 *
 * Endpoint público (sem sessão de usuário) para qualquer landing page ou
 * formulário externo da agência enviar um lead pro CRM, já com as UTMs
 * capturadas da URL. Autenticado pela `public_api_key` da organização
 * (gerada automaticamente na criação dela, visível/regenerável em
 * /integrations) — não dá acesso de leitura a nada, só cria leads.
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
  }

  return NextResponse.json({ ok: true, duplicate: !lead }, { status: 200, headers: corsHeaders() });
}
