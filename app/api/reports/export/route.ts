import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { resolveDateRange, type PeriodPreset } from "@/lib/dashboard/date-range";
import { createClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/reports/csv";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.organization) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const period = (searchParams.get("period") as PeriodPreset) ?? "30d";
  const range = resolveDateRange(period, {
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
  });

  const supabase = createClient();
  let query = supabase
    .from("leads")
    .select(
      "name, email, phone, source, medium, campaign_ref:campaigns(name), value, created_at, stage:pipeline_stages(name), owner:profiles(name)"
    )
    .eq("organization_id", session.organization.id)
    .gte("created_at", range.from.toISOString())
    .lte("created_at", range.to.toISOString())
    .order("created_at", { ascending: false })
    .limit(5000);

  const campaignId = searchParams.get("campaignId");
  const source = searchParams.get("source");
  const ownerId = searchParams.get("ownerId");
  const stageId = searchParams.get("stageId");

  if (campaignId) query = query.eq("campaign_id", campaignId);
  if (source) query = query.eq("source", source);
  if (ownerId) query = query.eq("owner_id", ownerId);
  if (stageId) query = query.eq("stage_id", stageId);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: "Não foi possível gerar o relatório." }, { status: 500 });
  }

  const headers = ["Nome", "E-mail", "Telefone", "Origem", "Meio", "Campanha", "Etapa", "Responsável", "Valor", "Criado em"];
  const rows = (data ?? []).map((lead: any) => ({
    Nome: lead.name,
    "E-mail": lead.email,
    Telefone: lead.phone,
    Origem: lead.source,
    Meio: lead.medium,
    Campanha: lead.campaign_ref?.name ?? null,
    Etapa: lead.stage?.name ?? null,
    Responsável: lead.owner?.name ?? null,
    Valor: lead.value,
    "Criado em": new Date(lead.created_at).toLocaleString("pt-BR"),
  }));

  const csv = toCsv(rows, headers);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
