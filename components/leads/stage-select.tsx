"use client";

import { useTransition } from "react";
import { Select } from "@/components/ui/select";
import { changeLeadStageAction } from "@/lib/leads/actions";
import type { Stage } from "@/lib/leads/queries";

export function StageSelect({
  leadId,
  currentStageId,
  stages,
}: {
  leadId: string;
  currentStageId: string | null;
  stages: Stage[];
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      defaultValue={currentStageId ?? ""}
      disabled={isPending}
      className="w-56"
      onChange={(e) => {
        const newStageId = e.target.value;
        startTransition(() => {
          changeLeadStageAction(leadId, newStageId);
        });
      }}
    >
      {stages.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </Select>
  );
}
