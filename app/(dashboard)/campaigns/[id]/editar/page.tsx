import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { isOrgAdmin } from "@/lib/permissions";
import { getCampaignById } from "@/lib/campaigns/queries";
import { updateCampaignAction } from "@/lib/campaigns/actions";
import { CampaignForm } from "@/components/campaigns/campaign-form";

export default async function EditarCampanhaPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.organization) redirect("/login");
  if (!isOrgAdmin(session)) redirect("/campaigns");

  const campaign = await getCampaignById(session.organization.id, params.id);
  if (!campaign) notFound();

  const boundAction = updateCampaignAction.bind(null, campaign.id);

  return (
    <div>
      <Link href={`/campaigns/${campaign.id}`} className="text-sm text-gray-500 hover:text-brand">
        ← Voltar para a campanha
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-gray-900">Editar campanha</h1>
      <div className="mt-6">
        <CampaignForm
          action={boundAction}
          defaults={{ ...campaign, external_id: campaign.external_id }}
          submitLabel="Salvar alterações"
        />
      </div>
    </div>
  );
}
