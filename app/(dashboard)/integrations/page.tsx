import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getMetaIntegration, getPublicApiKey } from "@/lib/integrations/queries";
import { isOrgAdmin } from "@/lib/permissions";
import { MetaIntegrationForm } from "@/components/integrations/meta-integration-form";
import { PublicApiKeyCard } from "@/components/integrations/public-api-key-card";

export default async function IntegrationsPage() {
  const session = await getSession();
  if (!session?.organization) redirect("/login");

  if (!isOrgAdmin(session)) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-500">
        Só administradores podem configurar integrações.
      </div>
    );
  }

  const integration = await getMetaIntegration(session.organization.id);
  const publicApiKey = await getPublicApiKey(session.organization.id);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Integrações</h1>
      <p className="mt-1 text-sm text-gray-500">
        Conecte suas fontes de leads para que eles caiam direto no pipeline.
      </p>

      <div className="mt-6 rounded-xl border border-gray-100 bg-white p-5">
        <h2 className="mb-1 text-sm font-semibold text-gray-700">Meta Lead Ads</h2>
        <p className="mb-4 text-sm text-gray-500">
          Leads de formulários do Facebook/Instagram Ads entram automaticamente
          como novos leads, na primeira etapa do pipeline.
        </p>
        <MetaIntegrationForm
          webhookUrl={`${appUrl}/api/webhooks/meta`}
          isActive={integration?.is_active ?? false}
          pageId={integration?.config?.page_id}
        />
      </div>

      {publicApiKey && (
        <div className="mt-4">
          <PublicApiKeyCard apiKey={publicApiKey} captureUrl={`${appUrl}/api/leads/capture`} />
        </div>
      )}

      <div className="mt-4 rounded-xl border border-dashed border-gray-200 bg-white p-5 text-sm text-gray-400">
        Google Ads e WhatsApp Business API entram em fases futuras.
      </div>
    </div>
  );
}
