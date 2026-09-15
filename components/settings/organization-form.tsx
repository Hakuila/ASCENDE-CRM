"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input, Label, FormError } from "@/components/ui/input";
import { updateOrganizationAction, type SettingsFormState } from "@/lib/settings/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" isLoading={pending}>
      Salvar
    </Button>
  );
}

export function OrganizationForm({
  defaults,
}: {
  defaults: { name: string; legalName: string | null; cnpj: string | null; logoUrl: string | null };
}) {
  const [state, formAction] = useFormState<SettingsFormState, FormData>(
    updateOrganizationAction,
    null
  );

  return (
    <form action={formAction} className="max-w-lg space-y-4">
      <FormError message={state?.error} />
      {state?.success && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{state.success}</p>
      )}

      <div>
        <Label htmlFor="name">Nome da empresa *</Label>
        <Input id="name" name="name" required defaultValue={defaults.name} />
      </div>

      <div>
        <Label htmlFor="legalName">Razão social</Label>
        <Input id="legalName" name="legalName" defaultValue={defaults.legalName ?? ""} />
      </div>

      <div>
        <Label htmlFor="cnpj">CNPJ</Label>
        <Input id="cnpj" name="cnpj" defaultValue={defaults.cnpj ?? ""} placeholder="00.000.000/0000-00" />
      </div>

      <div>
        <Label htmlFor="logoUrl">URL do logo</Label>
        <Input id="logoUrl" name="logoUrl" defaultValue={defaults.logoUrl ?? ""} placeholder="https://..." />
      </div>

      <SubmitButton />
    </form>
  );
}
