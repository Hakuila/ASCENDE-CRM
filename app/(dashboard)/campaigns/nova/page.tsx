import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { isOrgAdmin } from "@/lib/permissions";
import { createCampaignAction } from "@/lib/campaigns/actions";
import { CampaignForm } from "@/components/campaigns/campaign-form";

export default async function NovaCampanhaPage() {
  const session = await getSession();
  if (!session?.organization) redirect("/login");
  if (!isOrgAdmin(session)) redirect("/campaigns");

  return (
    <div>
      <Link href="/campaigns" className="text-sm text-gray-500 hover:text-brand">
        ← Voltar para campanhas
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-gray-900">Nova campanha</h1>
      <div className="mt-6">
        <CampaignForm action={createCampaignAction} submitLabel="Criar campanha" />
      </div>
    </div>
  );
}
