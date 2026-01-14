"use client";

import { useState, useCallback, useOptimistic, useTransition } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import type { PipelineStage } from "@prisma/client";
import { KanbanColumn } from "./kanban-column";
import { LeadCard } from "./lead-card";
import { EditLeadModal } from "../modals/edit-lead-modal";
import { updateLeadStage } from "@/app/actions/leads";
import { toast } from "sonner";
import { PlainLead } from "@/types";

const STAGES: PipelineStage[] = [
  "NOVOS",
  "EM_CONTATO",
  "VENDIDO_UNICO",
  "VENDIDO_MENSAL",
  "PERDIDO",
];

interface KanbanBoardProps {
  initialLeads: PlainLead[];
}

export function KanbanBoard({ initialLeads }: KanbanBoardProps) {
  const [leads, setLeads] = useState<PlainLead[]>(initialLeads);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<PlainLead | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [, startTransition] = useTransition();

  // Optimistic updates
  const [optimisticLeads, updateOptimisticLeads] = useOptimistic(
    leads,
    (state, { id, stage }: { id: string; stage: PipelineStage }) =>
      state.map((lead) => (lead.id === id ? { ...lead, stage } : lead))
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const activeLead = activeId
    ? optimisticLeads.find((l) => l.id === activeId)
    : null;

  const getLeadsByStage = useCallback(
    (stage: PipelineStage) => {
      return optimisticLeads.filter((lead) => lead.stage === stage);
    },
    [optimisticLeads]
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const leadId = active.id as string;
    const lead = leads.find((l) => l.id === leadId);

    if (!lead) return;

    // Determina o novo stage
    let newStage: PipelineStage;

    if (over.data.current?.type === "column") {
      newStage = over.id as PipelineStage;
    } else if (over.data.current?.type === "lead") {
      const overLead = leads.find((l) => l.id === over.id);
      if (!overLead) return;
      newStage = overLead.stage;
    } else {
      return;
    }

    // Se o stage não mudou, não faz nada
    if (lead.stage === newStage) return;

    // Optimistic update
    startTransition(() => {
      updateOptimisticLeads({ id: leadId, stage: newStage });
    });

    // Atualiza localmente para manter consistência
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, stage: newStage } : l))
    );

    // Persiste no servidor
    const result = await updateLeadStage(leadId, newStage);

    if (!result.success) {
      // Reverte em caso de erro
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, stage: lead.stage } : l))
      );
      toast.error("Erro ao mover lead");
    } else {
      toast.success("Lead movido com sucesso!");
    }
  };

  const handleLeadClick = (lead: PlainLead) => {
    setSelectedLead(lead);
    setIsEditModalOpen(true);
  };

  const handleLeadUpdate = (updatedLead: PlainLead) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === updatedLead.id ? updatedLead : l))
    );
    setSelectedLead(null);
    setIsEditModalOpen(false);
  };

  const handleLeadDelete = (leadId: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== leadId));
    setSelectedLead(null);
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 px-1">
          {STAGES.map((stage) => (
            <KanbanColumn
              key={stage}
              stage={stage}
              leads={getLeadsByStage(stage)}
              onLeadClick={handleLeadClick}
            />
          ))}
        </div>

        <DragOverlay>
          {activeLead && (
            <div className="rotate-3 scale-105">
              <LeadCard lead={activeLead} onClick={() => {}} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <EditLeadModal
        lead={selectedLead}
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        onUpdate={handleLeadUpdate}
        onDelete={handleLeadDelete}
      />
    </>
  );
}
