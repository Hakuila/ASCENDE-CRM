"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createStaffAction, type CreateStaffState } from "@/lib/agency/actions";
import { Button } from "@/components/ui/button";
import { Input, Label, FormError } from "@/components/ui/input";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" isLoading={pending}>
      Adicionar
    </Button>
  );
}

function CopyableField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <code className="flex-1 rounded-md bg-white px-3 py-2 text-sm text-gray-900">{value}</code>
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

export function StaffForm() {
  const [state, formAction] = useFormState<CreateStaffState, FormData>(createStaffAction, null);

  if (state?.success) {
    return (
      <div className="space-y-4 rounded-xl border border-green-100 bg-green-50 p-5">
        <div>
          <h3 className="font-semibold text-green-800">Staff adicionado!</h3>
          <p className="mt-1 text-sm text-green-700">
            Envie essas credenciais por um canal seguro — a senha não aparece de novo.
          </p>
        </div>
        <CopyableField label="E-mail de login" value={state.email} />
        <CopyableField label="Senha temporária" value={state.tempPassword} />
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-100 bg-white p-4">
      <div className="min-w-[160px] flex-1">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" name="name" required />
      </div>
      <div className="min-w-[200px] flex-1">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <SubmitButton />
      <div className="w-full">
        <FormError message={state?.error} />
      </div>
    </form>
  );
}
