"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input, Label, FormError } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { CompanyFormState } from "@/lib/companies/actions";

type CompanyFormAction = (state: CompanyFormState, formData: FormData) => Promise<CompanyFormState>;

type Defaults = {
  name?: string;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  notes?: string | null;
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" isLoading={pending}>
      {label}
    </Button>
  );
}

export function CompanyForm({
  action,
  defaults,
  submitLabel,
}: {
  action: CompanyFormAction;
  defaults?: Defaults;
  submitLabel: string;
}) {
  const [state, formAction] = useFormState<CompanyFormState, FormData>(action, null);

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <FormError message={state?.error} />

      <div>
        <Label htmlFor="name">Nome *</Label>
        <Input id="name" name="name" required defaultValue={defaults?.name} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="document">CNPJ / Documento</Label>
          <Input id="document" name="document" defaultValue={defaults?.document ?? ""} />
        </div>
        <div>
          <Label htmlFor="website">Site</Label>
          <Input id="website" name="website" defaultValue={defaults?.website ?? ""} placeholder="https://" />
        </div>
        <div>
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" defaultValue={defaults?.email ?? ""} />
        </div>
        <div>
          <Label htmlFor="phone">Telefone</Label>
          <Input id="phone" name="phone" defaultValue={defaults?.phone ?? ""} />
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Observações</Label>
        <Textarea id="notes" name="notes" rows={4} defaultValue={defaults?.notes ?? ""} />
      </div>

      <SubmitButton label={submitLabel} />
    </form>
  );
}
