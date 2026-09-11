"use client";

import { useRef } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { OrgMember, Stage } from "@/lib/leads/queries";

export function LeadFilters({
  members,
  stages,
  defaults,
}: {
  members: OrgMember[];
  stages: Stage[];
  defaults: { search?: string; stageId?: string; ownerId?: string };
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      method="GET"
      action="/leads"
      className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-100 bg-white p-4"
    >
      <div className="min-w-[220px] flex-1">
        <Input
          name="search"
          placeholder="Buscar por nome, e-mail ou telefone"
          defaultValue={defaults.search}
        />
      </div>

      <Select
        name="stageId"
        defaultValue={defaults.stageId ?? ""}
        className="w-48"
        onChange={() => formRef.current?.requestSubmit()}
      >
        <option value="">Todas as etapas</option>
        {stages.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </Select>

      <Select
        name="ownerId"
        defaultValue={defaults.ownerId ?? ""}
        className="w-48"
        onChange={() => formRef.current?.requestSubmit()}
      >
        <option value="">Todos os responsáveis</option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </Select>

      <Button type="submit" variant="secondary">
        Filtrar
      </Button>
    </form>
  );
}
