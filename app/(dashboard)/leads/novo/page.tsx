import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getOrgMembers, getDefaultPipelineStages } from "@/lib/leads/queries";
import { createLeadAction } from "@/lib/leads/actions";
import { LeadForm } from "@/components/leads/lead-form";

export default async function NovoLeadPage() {
  const session = await getSession();
  if (!session?.organization) redirect("/login");

  const organizationId = session.organization.id;
  const [members, { stages }] = await Promise.all([
    getOrgMembers(organizationId),
    getDefaultPipelineStages(organizationId),
  ]);

  return (
    <div>
      <Link href="/leads" className="text-sm text-gray-500 hover:text-brand">
        ← Voltar para leads
      </Link>

      <h1 className="mt-2 text-2xl font-semibold text-gray-900">Novo lead</h1>

      <div className="mt-6">
        <LeadForm
          action={createLeadAction}
          members={members}
          stages={stages}
          defaults={{ ownerId: session.userId, stageId: stages[0]?.id }}
          submitLabel="Criar lead"
        />
      </div>
    </div>
  );
}
