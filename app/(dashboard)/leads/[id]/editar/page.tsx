import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getLeadById, getOrgMembers, getDefaultPipelineStages } from "@/lib/leads/queries";
import { getCompaniesForSelect } from "@/lib/companies/queries";
import { getCampaignsForSelect } from "@/lib/campaigns/queries";
import { updateLeadAction } from "@/lib/leads/actions";
import { LeadForm } from "@/components/leads/lead-form";

export default async function EditarLeadPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.organization) redirect("/login");

  const organizationId = session.organization.id;

  const [lead, members, { stages }, companies, campaigns] = await Promise.all([
    getLeadById(organizationId, params.id),
    getOrgMembers(organizationId),
    getDefaultPipelineStages(organizationId),
    getCompaniesForSelect(organizationId),
    getCampaignsForSelect(organizationId),
  ]);

  if (!lead) notFound();

  const boundAction = updateLeadAction.bind(null, lead.id);

  return (
    <div>
      <Link href={`/leads/${lead.id}`} className="text-sm text-gray-500 hover:text-brand">
        ← Voltar para o lead
      </Link>

      <h1 className="mt-2 text-2xl font-semibold text-gray-900">Editar lead</h1>

      <div className="mt-6">
        <LeadForm
          action={boundAction}
          members={members}
          stages={stages}
          companies={companies}
          campaigns={campaigns}
          defaults={{
            name: lead.name,
            email: lead.email,
            phone: lead.phone,
            whatsapp: lead.whatsapp,
            source: lead.source,
            medium: lead.medium,
            campaign: lead.campaign,
            value: lead.value,
            notes: lead.notes,
            ownerId: lead.owner?.id,
            stageId: lead.stage?.id,
            companyId: lead.company_id,
            campaignId: lead.campaign_id,
          }}
          submitLabel="Salvar alterações"
        />
      </div>
    </div>
  );
}
