"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, FormError } from "@/components/ui/input";
import {
  saveMetaIntegrationAction,
  toggleMetaIntegrationAction,
  type IntegrationFormState,
} from "@/lib/integrations/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" isLoading={pending}>
      Salvar
    </Button>
  );
}

export function MetaIntegrationForm({
  webhookUrl,
  isActive,
  pageId,
}: {
  webhookUrl: string;
  isActive: boolean;
  pageId?: string;
}) {
  const [state, formAction] = useFormState<IntegrationFormState, FormData>(
    saveMetaIntegrationAction,
    null
  );
  const [isPending, startTransition] = useTransition();

  return (
    <div className="max-w-xl space-y-6">
      <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
        <p className="text-xs font-medium text-gray-500">
          URL do webhook (configurar uma vez no App do Meta, em Webhooks → Page)
        </p>
        <code className="mt-1 block break-all text-sm text-gray-900">{webhookUrl}</code>
      </div>

      {isActive && (
        <div className="flex items-center justify-between rounded-lg border border-green-100 bg-green-50 px-4 py-3">
          <span className="text-sm text-green-700">Integração ativa (Página: {pageId})</span>
          <button
            type="button"
            disabled={isPending}
            onClick={() => startTransition(() => toggleMetaIntegrationAction(false))}
            className="text-sm font-medium text-red-600 hover:underline"
          >
            Desativar
          </button>
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <FormError message={state?.error} />
        {state?.success && (
          <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
            Integração salva e ativada.
          </p>
        )}

        <div>
          <Label htmlFor="pageId">ID da Página do Facebook</Label>
          <Input id="pageId" name="pageId" defaultValue={pageId} required />
        </div>

        <div>
          <Label htmlFor="pageAccessToken">Token de acesso da Página</Label>
          <Input id="pageAccessToken" name="pageAccessToken" type="password" required />
          <p className="mt-1 text-xs text-gray-400">
            Gerado no Meta Business Suite / Graph API Explorer, com permissão
            leads_retrieval. Fica guardado só no backend, nunca aparece de novo aqui.
          </p>
        </div>

        <SubmitButton />
      </form>
    </div>
  );
}
