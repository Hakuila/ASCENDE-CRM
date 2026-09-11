"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input, Label, FormError } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { LeadFormState } from "@/lib/leads/actions";
import type { OrgMember, Stage } from "@/lib/leads/queries";

type LeadFormAction = (
  state: LeadFormState,
  formData: FormData
) => Promise<LeadFormState>;

type LeadFormDefaults = {
  name?: string;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  source?: string | null;
  medium?: string | null;
  campaign?: string | null;
  value?: number | null;
  notes?: string | null;
  ownerId?: string | null;
  stageId?: string | null;
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" isLoading={pending}>
      {label}
    </Button>
  );
}

export function LeadForm({
  action,
  defaults,
  members,
  stages,
  submitLabel,
}: {
  action: LeadFormAction;
  defaults?: LeadFormDefaults;
  members: OrgMember[];
  stages: Stage[];
  submitLabel: string;
}) {
  const [state, formAction] = useFormState<LeadFormState, FormData>(action, null);

  return (
    <form action={formAction} className="max-w-2xl space-y-5">
      <FormError message={state?.error} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="name">Nome *</Label>
          <Input id="name" name="name" required defaultValue={defaults?.name} />
        </div>

        <div>
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" defaultValue={defaults?.email ?? ""} />
        </div>

        <div>
          <Label htmlFor="phone">Telefone</Label>
          <Input id="phone" name="phone" defaultValue={defaults?.phone ?? ""} placeholder="(11) 91234-5678" />
        </div>

        <div>
          <Label htmlFor="whatsapp">WhatsApp</Label>
          <Input
            id="whatsapp"
            name="whatsapp"
            defaultValue={defaults?.whatsapp ?? ""}
            placeholder="(11) 91234-5678"
          />
        </div>

        <div>
          <Label htmlFor="value">Valor estimado (R$)</Label>
          <Input
            id="value"
            name="value"
            inputMode="decimal"
            defaultValue={defaults?.value ?? ""}
            placeholder="0,00"
          />
        </div>

        <div>
          <Label htmlFor="ownerId">Responsável</Label>
          <Select id="ownerId" name="ownerId" defaultValue={defaults?.ownerId ?? ""}>
            <option value="">Sem responsável</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="stageId">Etapa</Label>
          <Select id="stageId" name="stageId" defaultValue={defaults?.stageId ?? ""}>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <details className="rounded-lg border border-gray-100 bg-gray-50 p-4 open:pb-1">
        <summary className="cursor-pointer text-sm font-medium text-gray-600">
          Origem / UTMs (opcional)
        </summary>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="source">Origem</Label>
            <Input id="source" name="source" defaultValue={defaults?.source ?? ""} placeholder="Meta Ads" />
          </div>
          <div>
            <Label htmlFor="medium">Meio</Label>
            <Input id="medium" name="medium" defaultValue={defaults?.medium ?? ""} placeholder="cpc" />
          </div>
          <div>
            <Label htmlFor="campaign">Campanha</Label>
            <Input id="campaign" name="campaign" defaultValue={defaults?.campaign ?? ""} />
          </div>
        </div>
      </details>

      <div>
        <Label htmlFor="notes">Observações</Label>
        <Textarea id="notes" name="notes" rows={4} defaultValue={defaults?.notes ?? ""} />
      </div>

      <SubmitButton label={submitLabel} />
    </form>
  );
}
