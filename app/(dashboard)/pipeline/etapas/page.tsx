import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getDefaultPipelineStages } from "@/lib/leads/queries";
import { isOrgAdmin } from "@/lib/permissions";
import { StageManager } from "@/components/pipeline/stage-manager";

export default async function EtapasPipelinePage() {
  const session = await getSession();
  if (!session?.organization) redirect("/login");

  if (!isOrgAdmin(session)) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-500">
        Só administradores podem editar as etapas do pipeline.
      </div>
    );
  }

  const { stages } = await getDefaultPipelineStages(session.organization.id);

  return (
    <div>
      <Link href="/pipeline" className="text-sm text-gray-500 hover:text-brand">
        ← Voltar para o pipeline
      </Link>

      <h1 className="mt-2 text-2xl font-semibold text-gray-900">Etapas do pipeline</h1>
      <p className="mt-1 text-sm text-gray-500">
        Essas etapas aparecem no Kanban e em todos os leads da organização.
      </p>

      <div className="mt-6">
        <StageManager stages={stages} />
      </div>
    </div>
  );
}
