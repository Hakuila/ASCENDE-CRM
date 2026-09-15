"use client";

import { useState, useTransition } from "react";
import { regeneratePublicApiKeyAction } from "@/lib/integrations/actions";

export function PublicApiKeyCard({ apiKey, captureUrl }: { apiKey: string; captureUrl: string }) {
  const [copied, setCopied] = useState<"key" | "snippet" | null>(null);
  const [isPending, startTransition] = useTransition();

  const snippet = `fetch("${captureUrl}", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    api_key: "${apiKey}",
    name: "Nome do lead",
    email: "lead@exemplo.com",
    utm_source: "google",
    utm_medium: "cpc",
    utm_campaign: "nome-da-campanha"
  })
});`;

  function copy(text: string, which: "key" | "snippet") {
    navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5">
      <h2 className="mb-1 text-sm font-semibold text-gray-700">API pública de captura (UTMs)</h2>
      <p className="mb-4 text-sm text-gray-500">
        Use essa chave em landing pages e formulários externos da agência para
        os leads caírem direto no CRM, já com a origem/campanha certas.
      </p>

      <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
        <p className="text-xs font-medium text-gray-500">Sua chave de API</p>
        <div className="mt-1 flex items-center gap-2">
          <code className="flex-1 break-all text-sm text-gray-900">{apiKey}</code>
          <button
            type="button"
            onClick={() => copy(apiKey, "key")}
            className="rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:bg-white"
          >
            {copied === "key" ? "Copiado!" : "Copiar"}
          </button>
        </div>
      </div>

      <details className="mt-4">
        <summary className="cursor-pointer text-sm font-medium text-brand">
          Ver exemplo de uso
        </summary>
        <div className="relative mt-2">
          <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-xs text-gray-100">
            {snippet}
          </pre>
          <button
            type="button"
            onClick={() => copy(snippet, "snippet")}
            className="absolute right-2 top-2 rounded-md bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20"
          >
            {copied === "snippet" ? "Copiado!" : "Copiar"}
          </button>
        </div>
      </details>

      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          if (
            confirm(
              "Gerar uma nova chave? A chave atual para de funcionar imediatamente — formulários que já usam ela precisam ser atualizados."
            )
          ) {
            startTransition(() => regeneratePublicApiKeyAction());
          }
        }}
        className="mt-4 text-sm font-medium text-red-600 hover:underline disabled:opacity-60"
      >
        Gerar nova chave
      </button>
    </div>
  );
}
