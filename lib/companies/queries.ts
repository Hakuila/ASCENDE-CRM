import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function getCompaniesList(organizationId: string, search?: string) {
  const supabase = createClient();
  let query = supabase
    .from("companies")
    .select("id, name, email, phone, document, created_at")
    .eq("organization_id", organizationId)
    .order("name", { ascending: true });

  if (search) {
    const term = search.replace(/[%,]/g, "");
    query = query.or(`name.ilike.%${term}%,email.ilike.%${term}%,document.ilike.%${term}%`);
  }

  const { data } = await query;
  return data ?? [];
}

export async function getCompanyById(organizationId: string, companyId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("companies")
    .select("id, name, document, email, phone, website, notes, created_at")
    .eq("organization_id", organizationId)
    .eq("id", companyId)
    .maybeSingle();
  return data;
}

export async function getLeadsByCompany(companyId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("leads")
    .select("id, name, email, phone, stage:pipeline_stages(name, kind)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

/** Lista simples para popular o <select> de empresa no formulário de lead. */
export async function getCompaniesForSelect(organizationId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("companies")
    .select("id, name")
    .eq("organization_id", organizationId)
    .order("name", { ascending: true });
  return data ?? [];
}
