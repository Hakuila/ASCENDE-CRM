"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/input";
import { addLeadNoteAction, type LeadFormState } from "@/lib/leads/actions";

type Activity = {
  id: string;
  type: string;
  description: string | null;
  created_at: string;
  author: { name: string } | null;
};

const typeLabels: Record<string, string> = {
  created: "Criação",
  status_change: "Mudança de etapa",
  call: "Ligação",
  whatsapp: "WhatsApp",
  email: "E-mail",
  meeting: "Reunião",
  proposal: "Proposta",
  sale: "Venda",
  note: "Observação",
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" isLoading={pending}>
      Adicionar
    </Button>
  );
}

export function LeadActivityTimeline({
  leadId,
  activities,
}: {
  leadId: string;
  activities: Activity[];
}) {
  const boundAction = addLeadNoteAction.bind(null, leadId);
  const [state, formAction] = useFormState<LeadFormState, FormData>(boundAction, null);

  return (
    <div>
      <form action={formAction} className="space-y-2">
        <FormError message={state?.error} />
        <Textarea name="note" rows={2} placeholder="Adicionar uma observação..." />
        <SubmitButton />
      </form>

      <ol className="mt-6 space-y-4 border-l border-gray-100 pl-4">
        {activities.length === 0 && (
          <li className="text-sm text-gray-400">Nenhuma atividade registrada ainda.</li>
        )}
        {activities.map((activity) => (
          <li key={activity.id} className="relative">
            <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-brand" />
            <p className="text-sm text-gray-900">{activity.description}</p>
            <p className="text-xs text-gray-400">
              {typeLabels[activity.type] ?? activity.type} ·{" "}
              {new Date(activity.created_at).toLocaleString("pt-BR")}
              {activity.author?.name ? ` · ${activity.author.name}` : ""}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
