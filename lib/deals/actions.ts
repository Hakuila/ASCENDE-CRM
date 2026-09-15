"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/get-session";
import { dealSchema } from "@/lib/validations/deals";

export type DealFormState = { error?: string } | null;

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

  const { data: lead } = await supabase
    .from("leads")
    .select("pipeline_id, stage_id, owner_id")
    .eq("id", leadId)
    .maybeSingle();

  const { error } = await supabase.from("deals").insert({
    organization_id: session.organization.id,
    lead_id: leadId,
    pipeline_id: lead?.pipeline_id ?? null,
    stage_id: lead?.stage_id ?? null,
    owner_id: lead?.owner_id ?? session.userId,
    title,
    value: value ? Number(value.replace(",", ".")) : null,
    expected_close_date: expectedCloseDate || null,
  });

  if (error) return { error: "Não foi possível criar a oportunidade." };

  await supabase.from("activities").insert({
    organization_id: session.organization.id,
    lead_id: leadId,
    author_id: session.userId,
    type: "proposal",
    description: `Oportunidade "${title}" criada.`,
  });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/deals");
  return null;
}

export async function markDealStatusAction(
  dealId: string,
  leadId: string,
  status: "won" | "lost"
) {
  const session = await getSession();
  if (!session?.organization) return;

  const supabase = createClient();
  const { data: deal } = await supabase
    .from("deals")
    .select("title, value")
    .eq("id", dealId)
    .maybeSingle();

  await supabase.from("deals").update({ status }).eq("id", dealId);

  await supabase.from("activities").insert({
    organization_id: session.organization.id,
    lead_id: leadId,
    author_id: session.userId,
    type: status === "won" ? "sale" : "note",
    description:
      status === "won"
        ? `Venda registrada${deal?.value ? ` — R$ ${deal.value}` : ""}.`
        : `Oportunidade "${deal?.title}" marcada como perdida.`,
  });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/deals");
}
