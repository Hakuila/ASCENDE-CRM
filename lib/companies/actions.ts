"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/get-session";
import { companySchema } from "@/lib/validations/companies";
import { canDeleteLead } from "@/lib/permissions"; // mesma regra: client_admin/platform_admin

export type CompanyFormState = { error?: string } | null;

function toNullable(v: string | undefined) {
  return v && v.length > 0 ? v : null;
}

function parseCompanyForm(formData: FormData) {
  return companySchema.safeParse({
    name: formData.get("name"),
    document: formData.get("document"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    website: formData.get("website"),
    notes: formData.get("notes"),
  });
}

export async function createCompanyAction(
  _prevState: CompanyFormState,
  formData: FormData
): Promise<CompanyFormState> {
  const session = await getSession();
  if (!session?.organization) return { error: "Sessão inválida." };

  const parsed = parseCompanyForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { name, document, email, phone, website, notes } = parsed.data;
  const supabase = createClient();

  const { data: company, error } = await supabase
    .from("companies")
    .insert({
      organization_id: session.organization.id,
      name,
      document: toNullable(document),
      email: toNullable(email),
      phone: toNullable(phone),
      website: toNullable(website),
      notes: toNullable(notes),
    })
    .select("id")
    .single();

  if (error || !company) return { error: "Não foi possível criar a empresa." };

  revalidatePath("/companies");
  redirect(`/companies/${company.id}`);
}

export async function updateCompanyAction(
  companyId: string,
  _prevState: CompanyFormState,
  formData: FormData
): Promise<CompanyFormState> {
  const session = await getSession();
  if (!session?.organization) return { error: "Sessão inválida." };

  const parsed = parseCompanyForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { name, document, email, phone, website, notes } = parsed.data;
  const supabase = createClient();

  const { error } = await supabase
    .from("companies")
    .update({
      name,
      document: toNullable(document),
      email: toNullable(email),
      phone: toNullable(phone),
      website: toNullable(website),
      notes: toNullable(notes),
    })
    .eq("id", companyId)
    .eq("organization_id", session.organization.id);

  if (error) return { error: "Não foi possível salvar as alterações." };

  revalidatePath(`/companies/${companyId}`);
  revalidatePath("/companies");
  redirect(`/companies/${companyId}`);
}

/**
 * P2-02: soft delete — em vez de remover a linha, marca deleted_at. A
 * policy de SELECT em companies já esconde linhas com deleted_at
 * preenchido, então leads que referenciam essa empresa simplesmente param
 * de ver o embed (sem quebrar) — não precisa de um cleanup manual de
 * company_id.
 */
export async function deleteCompanyAction(companyId: string) {
  const session = await getSession();
  if (!session) return;
  if (!canDeleteLead(session)) {
    throw new Error("Você não tem permissão para excluir empresas.");
  }

  const supabase = createClient();
  await supabase
    .from("companies")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", companyId);

  revalidatePath("/companies");
  redirect("/companies");
}