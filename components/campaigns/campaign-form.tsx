"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input, Label, FormError } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { CampaignFormState } from "@/lib/campaigns/actions";

type CampaignFormAction = (state: CampaignFormState, formData: FormData) => Promise<CampaignFormState>;

type Defaults = {
  name?: string;
  platform?: string;
  external_id?: string | null;
  spend?: number;
  impressions?: number;
  clicks?: number;
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" isLoading={pending}>
      {label}
    </Button>
  );
}

export function CampaignForm({
  action,
  defaults,
  submitLabel,
}: {
  action: CampaignFormAction;
  defaults?: Defaults;
  submitLabel: string;
}) {
  const [state, formAction] = useFormState<CampaignFormState, FormData>(action, null);

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <FormError message={state?.error} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="name">Nome da campanha *</Label>
          <Input id="name" name="name" required defaultValue={defaults?.name} />
        </div>
        <div>
          <Label htmlFor="platform">Plataforma *</Label>
          <Select id="platform" name="platform" defaultValue={defaults?.platform ?? "Meta Ads"}>
            <option value="Meta Ads">Meta Ads</option>
            <option value="Google Ads">Google Ads</option>
            <option value="Outra">Outra</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="externalId">ID externo (opcional)</Label>
          <Input id="externalId" name="externalId" defaultValue={defaults?.external_id ?? ""} />
        </div>
        <div>
          <Label htmlFor="spend">Investimento (R$)</Label>
          <Input id="spend" name="spend" inputMode="decimal" defaultValue={defaults?.spend ?? ""} placeholder="0,00" />
        </div>
        <div>
          <Label htmlFor="impressions">Impressões</Label>
          <Input id="impressions" name="impressions" inputMode="numeric" defaultValue={defaults?.impressions ?? ""} />
        </div>
        <div>
          <Label htmlFor="clicks">Cliques</Label>
          <Input id="clicks" name="clicks" inputMode="numeric" defaultValue={defaults?.clicks ?? ""} />
        </div>
      </div>

      <p className="text-xs text-gray-400">
        Esses números são preenchidos manualmente por enquanto. A Fase 7 traz a
        integração com o Meta Lead Ads para atualizar isso automaticamente.
      </p>

      <SubmitButton label={submitLabel} />
    </form>
  );
}
