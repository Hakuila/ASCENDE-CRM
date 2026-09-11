"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { inviteClientAction, type InviteClientState } from "@/lib/agency/actions";
import { Button } from "@/components/ui/button";
import { Input, Label, FormError } from "@/components/ui/input";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" isLoading={pending}>
      Criar cliente
    </Button>
  );
}

function CopyableField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <code className="flex-1 rounded-md bg-white px-3 py-2 text-sm text-gray-900">
          {value}
        </code>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="rounded-md border border-gray-200 px-2.5 py-2 text-xs text-gray-600 hover:bg-gray-50"
        >
          {copied ? "Copiado!" : "Copiar"}
        </button>
      </div>
    </div>
  );
}

export function InviteClientForm() {
  const [state, formAction] = useFormState<InviteClientState, FormData>(
    inviteClientAction,
    null
  );

  if (state?.success) {
    return (
      <div className="max-w-md space-y-4 rounded-xl border border-green-100 bg-green-50 p-5">
        <div>
          <h2 className="font-semibold text-green-800">Cliente criado!</h2>
          <p className="mt-1 text-sm text-green-700">
            Envie essas credenciais para o cliente por um canal seguro (WhatsApp,
            por exemplo) — essa senha não aparece de novo depois que você sair
            desta tela. Peça para trocarem a senha no primeiro acesso.
          </p>
        </div>
        <CopyableField label="E-mail de login" value={state.email} />
        <CopyableField label="Senha temporária" value={state.tempPassword} />
      </div>
    );
  }

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <FormError message={state?.error} />

      <div>
        <Label htmlFor="orgName">Nome da empresa (cliente)</Label>
        <Input id="orgName" name="orgName" type="text" required />
      </div>

      <div>
        <Label htmlFor="adminName">Nome do administrador</Label>
        <Input id="adminName" name="adminName" type="text" required />
      </div>

      <div>
        <Label htmlFor="adminEmail">E-mail do administrador</Label>
        <Input id="adminEmail" name="adminEmail" type="email" required />
      </div>

      <SubmitButton />
    </form>
  );
}
