"use client";

import { useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, FormError } from "@/components/ui/input";
import { createDealAction, markDealStatusAction, type DealFormState } from "@/lib/deals/actions";

type Deal = {
  id: string;
  title: string;
  value: number | null;
  status: "open" | "won" | "lost";
  expected_close_date: string | null;
};

function formatCurrency(value: number | null) {
  if (value == null) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const statusLabel: Record<Deal["status"], string> = {
  open: "Em aberto",
  won: "Ganha",
  lost: "Perdida",
};

function statusTone(status: Deal["status"]) {
  if (status === "won") return "success" as const;
  if (status === "lost") return "danger" as const;
  return "neutral" as const;
}

function CreateDealButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" isLoading={pending}>
      Criar oportunidade
    </Button>
  );
}

function CreateDealForm({ leadId }: { leadId: string }) {
  const boundAction = createDealAction.bind(null, leadId);
  const [state, formAction] = useFormState<DealFormState, FormData>(boundAction, null);

  return (
    <form action={formAction} className="space-y-3">
      <FormError message={state?.error} />
      <div>
        <Label htmlFor="title">Título</Label>
        <Input id="title" name="title" required placeholder="Ex.: Plano anual" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="value">Valor (R$)</Label>
          <Input id="value" name="value" inputMode="decimal" placeholder="0,00" />
        </div>
        <div>
          <Label htmlFor="expectedCloseDate">Previsão de fechamento</Label>
          <Input id="expectedCloseDate" name="expectedCloseDate" type="date" />
        </div>
      </div>
      <CreateDealButton />
    </form>
  );
}

export function LeadDealCard({ leadId, deal }: { leadId: string; deal: Deal | null }) {
  const [isPending, startTransition] = useTransition();

  if (!deal) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Oportunidade</h2>
        <p className="mb-3 text-sm text-gray-500">
          Esse lead ainda não tem uma oportunidade concreta associada.
        </p>
        <CreateDealForm leadId={leadId} />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">Oportunidade</h2>
        <Badge tone={statusTone(deal.status)}>{statusLabel[deal.status]}</Badge>
      </div>
      <dl className="space-y-2 text-sm">
        <div>
          <dt className="text-gray-400">Título</dt>
          <dd className="text-gray-900">{deal.title}</dd>
        </div>
        <div>
          <dt className="text-gray-400">Valor</dt>
          <dd className="text-gray-900">{formatCurrency(deal.value)}</dd>
        </div>
        {deal.expected_close_date && (
          <div>
            <dt className="text-gray-400">Previsão de fechamento</dt>
            <dd className="text-gray-900">
              {new Date(deal.expected_close_date).toLocaleDateString("pt-BR")}
            </dd>
          </div>
        )}
      </dl>

      {deal.status === "open" && (
        <div className="mt-4 flex gap-2">
          <Button
            type="button"
            isLoading={isPending}
            onClick={() => startTransition(() => markDealStatusAction(deal.id, leadId, "won"))}
          >
            Marcar como ganha
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={() => startTransition(() => markDealStatusAction(deal.id, leadId, "lost"))}
          >
            Marcar como perdida
          </Button>
        </div>
      )}
    </div>
  );
}
