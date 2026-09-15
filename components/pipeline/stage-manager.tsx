"use client";

import { useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Badge, stageTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, FormError } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  createStageAction,
  updateStageAction,
  deleteStageAction,
  reorderStageAction,
  type StageFormState,
} from "@/lib/pipeline/actions";

type Stage = { id: string; name: string; kind: "open" | "won" | "lost"; order_index: number };

const kindLabels: Record<Stage["kind"], string> = {
  open: "Em andamento",
  won: "Ganho",
  lost: "Perdido",
};

function EditStageRow({ stage, onDone }: { stage: Stage; onDone: () => void }) {
  const boundAction = updateStageAction.bind(null, stage.id);
  const [state, formAction] = useFormState<StageFormState, FormData>(boundAction, null);

  return (
    <form action={formAction} className="flex flex-1 items-center gap-2">
      <FormError message={state?.error} />
      <Input name="name" defaultValue={stage.name} className="flex-1" />
      <Select name="kind" defaultValue={stage.kind} className="w-40">
        <option value="open">Em andamento</option>
        <option value="won">Ganho</option>
        <option value="lost">Perdido</option>
      </Select>
      <Button type="submit" variant="secondary">
        Salvar
      </Button>
      <button
        type="button"
        onClick={onDone}
        className="text-sm text-gray-400 hover:text-gray-600"
      >
        Cancelar
      </button>
    </form>
  );
}

function StageRow({ stage, isFirst, isLast }: { stage: Stage; isFirst: boolean; isLast: boolean }) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (editing) {
    return (
      <div className="flex items-center gap-2 border-b border-gray-50 px-4 py-3 last:border-0">
        <EditStageRow stage={stage} onDone={() => setEditing(false)} />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between border-b border-gray-50 px-4 py-3 last:border-0">
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <button
            type="button"
            disabled={isFirst || isPending}
            onClick={() => startTransition(() => reorderStageAction(stage.id, "up"))}
            className="text-gray-400 hover:text-gray-700 disabled:opacity-30"
          >
            ▲
          </button>
          <button
            type="button"
            disabled={isLast || isPending}
            onClick={() => startTransition(() => reorderStageAction(stage.id, "down"))}
            className="text-gray-400 hover:text-gray-700 disabled:opacity-30"
          >
            ▼
          </button>
        </div>
        <span className="font-medium text-gray-900">{stage.name}</span>
        <Badge tone={stageTone(stage.kind)}>{kindLabels[stage.kind]}</Badge>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-sm font-medium text-brand hover:underline"
        >
          Editar
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            if (confirm(`Excluir a etapa "${stage.name}"? Leads nela ficam sem etapa.`)) {
              startTransition(() => deleteStageAction(stage.id));
            }
          }}
          className="text-sm font-medium text-red-600 hover:underline disabled:opacity-60"
        >
          Excluir
        </button>
      </div>
    </div>
  );
}

function AddStageButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" isLoading={pending}>
      + Adicionar etapa
    </Button>
  );
}

function NewStageForm() {
  const [state, formAction] = useFormState<StageFormState, FormData>(createStageAction, null);

  return (
    <form action={formAction} className="mt-4 flex items-end gap-2 rounded-xl border border-gray-100 bg-white p-4">
      <div className="flex-1">
        <FormError message={state?.error} />
        <Input name="name" placeholder="Nome da nova etapa" required />
      </div>
      <Select name="kind" defaultValue="open" className="w-40">
        <option value="open">Em andamento</option>
        <option value="won">Ganho</option>
        <option value="lost">Perdido</option>
      </Select>
      <AddStageButton />
    </form>
  );
}

export function StageManager({ stages }: { stages: Stage[] }) {
  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
        {stages.map((stage, i) => (
          <StageRow
            key={stage.id}
            stage={stage}
            isFirst={i === 0}
            isLast={i === stages.length - 1}
          />
        ))}
      </div>
      <NewStageForm />
    </div>
  );
}
