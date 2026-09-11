import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import {
  getLeadById,
  getLeadActivities,
  getDefaultPipelineStages,
} from "@/lib/leads/queries";
import { canDeleteLead } from "@/lib/permissions";
import { Badge, stageTone } from "@/components/ui/badge";
import { StageSelect } from "@/components/leads/stage-select";
import { DeleteLeadButton } from "@/components/leads/delete-lead-button";
import { LeadActivityTimeline } from "@/components/leads/lead-activity-timeline";

function formatCurrency(value: number | null) {
  if (value == null) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.organization) redirect("/login");

  const organizationId = session.organization.id;

  const [lead, activities, { stages }] = await Promise.all([
    getLeadById(organizationId, params.id),
    getLeadActivities(params.id),
    getDefaultPipelineStages(organizationId),
  ]);

  if (!lead) notFound();

  const whatsappHref = lead.whatsapp
    ? `https://wa.me/55${lead.whatsapp.replace(/\D/g, "")}`
    : null;

  return (
    <div>
      <Link href="/leads" className="text-sm text-gray-500 hover:text-brand">
        ← Voltar para leads
      </Link>

      <div className="mt-2 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{lead.name}</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
            {lead.stage && (
              <Badge tone={stageTone(lead.stage.kind)}>{lead.stage.name}</Badge>
            )}
            <span>Responsável: {lead.owner?.name ?? "—"}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href={`/leads/${lead.id}/editar`}
            className="text-sm font-medium text-brand hover:underline"
          >
            Editar
          </Link>
          {canDeleteLead(session) && <DeleteLeadButton leadId={lead.id} />}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl border border-gray-100 bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold text-gray-700">Histórico</h2>
            <LeadActivityTimeline leadId={lead.id} activities={activities as any} />
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-gray-100 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-gray-700">Etapa</h2>
            <StageSelect leadId={lead.id} currentStageId={lead.stage?.id ?? null} stages={stages} />
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-gray-700">Contato</h2>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-gray-400">E-mail</dt>
                <dd className="text-gray-900">{lead.email ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-gray-400">Telefone</dt>
                <dd className="text-gray-900">{lead.phone ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-gray-400">WhatsApp</dt>
                <dd className="text-gray-900">
                  {lead.whatsapp ?? "—"}
                  {whatsappHref && (
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-2 text-brand hover:underline"
                    >
                      Enviar WhatsApp
                    </a>
                  )}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-gray-700">Origem</h2>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-gray-400">Origem</dt>
                <dd className="text-gray-900">{lead.source ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-gray-400">Meio</dt>
                <dd className="text-gray-900">{lead.medium ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-gray-400">Campanha</dt>
                <dd className="text-gray-900">{lead.campaign ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-gray-400">Valor estimado</dt>
                <dd className="text-gray-900">{formatCurrency(lead.value)}</dd>
              </div>
            </dl>
          </div>

          {lead.notes && (
            <div className="rounded-xl border border-gray-100 bg-white p-5">
              <h2 className="mb-3 text-sm font-semibold text-gray-700">Observações</h2>
              <p className="whitespace-pre-wrap text-sm text-gray-700">{lead.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
