"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input, Label, FormError } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { TaskFormState } from "@/lib/tasks/actions";
import type { OrgMember } from "@/lib/leads/queries";

type TaskFormAction = (state: TaskFormState, formData: FormData) => Promise<TaskFormState>;

type TaskFormDefaults = {
  title?: string;
  description?: string | null;
  dueDate?: string | null;
  priority?: "low" | "medium" | "high";
  assignedTo?: string | null;
  leadId?: string | null;
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" isLoading={pending}>
      {label}
    </Button>
  );
}

function toDateInputValue(value?: string | null) {
  if (!value) return "";
  return value.slice(0, 16); // yyyy-MM-ddTHH:mm para <input type="datetime-local">
}

export function TaskForm({
  action,
  defaults,
  members,
  submitLabel,
  leadIdLocked,
}: {
  action: TaskFormAction;
  defaults?: TaskFormDefaults;
  members: OrgMember[];
  submitLabel: string;
  /** Quando a tarefa é criada a partir de um lead, trava esse campo. */
  leadIdLocked?: string;
}) {
  const [state, formAction] = useFormState<TaskFormState, FormData>(action, null);

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <FormError message={state?.error} />

      {leadIdLocked && <input type="hidden" name="leadId" value={leadIdLocked} />}

      <div>
        <Label htmlFor="title">Título *</Label>
        <Input id="title" name="title" required defaultValue={defaults?.title} />
      </div>

      <div>
        <Label htmlFor="description">Descrição</Label>
        <Textarea id="description" name="description" rows={3} defaultValue={defaults?.description ?? ""} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="dueDate">Prazo</Label>
          <Input
            id="dueDate"
            name="dueDate"
            type="datetime-local"
            defaultValue={toDateInputValue(defaults?.dueDate)}
          />
        </div>

        <div>
          <Label htmlFor="priority">Prioridade</Label>
          <Select id="priority" name="priority" defaultValue={defaults?.priority ?? "medium"}>
            <option value="low">Baixa</option>
            <option value="medium">Média</option>
            <option value="high">Alta</option>
          </Select>
        </div>

        <div>
          <Label htmlFor="assignedTo">Responsável</Label>
          <Select id="assignedTo" name="assignedTo" defaultValue={defaults?.assignedTo ?? ""}>
            <option value="">Sem responsável</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <SubmitButton label={submitLabel} />
    </form>
  );
}
