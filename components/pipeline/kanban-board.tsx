"use client";

import { useState } from "react";
import Link from "next/link";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Badge, stageTone } from "@/components/ui/badge";
import { changeLeadStageAction } from "@/lib/leads/actions";
import type { KanbanStage } from "@/lib/pipeline/queries";

function formatCurrency(value: number | null) {
  if (value == null) return null;
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function KanbanCard({ lead }: { lead: KanbanStage["leads"][number] }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={
        transform
          ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
          : undefined
      }
      className={`mb-2 cursor-grab rounded-lg border border-gray-100 bg-white p-3 shadow-sm active:cursor-grabbing ${
        isDragging ? "z-10 opacity-70 shadow-md" : ""
      }`}
    >
      <Link
        href={`/leads/${lead.id}`}
        onClick={(e) => isDragging && e.preventDefault()}
        className="text-sm font-medium text-gray-900 hover:text-brand"
      >
        {lead.name}
      </Link>
      <div className="mt-1 flex items-center justify-between text-xs text-gray-400">
        <span>{lead.owner?.name ?? "Sem responsável"}</span>
        {formatCurrency(lead.value) && <span>{formatCurrency(lead.value)}</span>}
      </div>
    </div>
  );
}

function KanbanColumn({ stage }: { stage: KanbanStage }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const total = stage.leads.reduce((sum, l) => sum + (l.value ?? 0), 0);

  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 flex-shrink-0 flex-col rounded-xl border p-3 ${
        isOver ? "border-brand bg-brand/5" : "border-gray-100 bg-gray-50"
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge tone={stageTone(stage.kind)}>{stage.name}</Badge>
          <span className="text-xs text-gray-400">{stage.leads.length}</span>
        </div>
        {total > 0 && <span className="text-xs text-gray-400">{formatCurrency(total)}</span>}
      </div>

      <div className="min-h-[60px] flex-1">
        {stage.leads.map((lead) => (
          <KanbanCard key={lead.id} lead={lead} />
        ))}
      </div>
    </div>
  );
}

export function KanbanBoard({ initialStages }: { initialStages: KanbanStage[] }) {
  const [stages, setStages] = useState(initialStages);
  const [error, setError] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const leadId = String(active.id);
    const newStageId = String(over.id);

    // P1-01: snapshot do estado ANTES do update otimista, para poder
    // desfazer exatamente essa mudança se a action falhar — sem isso, um
    // erro de rede ou de RLS deixava o card "flutuando" numa coluna que o
    // banco nunca reconheceu.
    const previousStages = stages;

    const currentStage = previousStages.find((s) => s.leads.some((l) => l.id === leadId));
    if (!currentStage || currentStage.id === newStageId) return;

    const lead = currentStage.leads.find((l) => l.id === leadId)!;

    setError(null);

    // Atualização otimista: move o card na hora, sem esperar o servidor.
    setStages((prev) =>
      prev.map((s) => {
        if (s.id === currentStage.id) {
          return { ...s, leads: s.leads.filter((l) => l.id !== leadId) };
        }
        if (s.id === newStageId) {
          return { ...s, leads: [...s.leads, lead] };
        }
        return s;
      })
    );

    try {
      const result = await changeLeadStageAction(leadId, newStageId);
      if (result?.error) {
        setStages(previousStages);
        setError(result.error);
      }
    } catch {
      // Erro de rede/exceção inesperada — mesmo tratamento: desfaz e avisa.
      setStages(previousStages);
      setError("Não foi possível mover o lead. Tente novamente.");
    }
  }

  if (stages.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-white p-12 text-center text-sm text-gray-400">
        Nenhuma etapa configurada ainda.
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-3 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-3 shrink-0 text-red-400 hover:text-red-600"
            aria-label="Fechar aviso"
          >
            ×
          </button>
        </div>
      )}
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => (
            <KanbanColumn key={stage.id} stage={stage} />
          ))}
        </div>
      </DndContext>
    </div>
  );
}
