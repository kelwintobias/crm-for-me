"use client";

import { useState, useCallback, useOptimistic, useTransition, useMemo, useEffect } from "react";
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
import { Users, Sparkles } from "lucide-react";

const STAGES: PipelineStage[] = [
  "NOVO_LEAD",
  "EM_NEGOCIACAO",
  "AGENDADO",
  "EM_ATENDIMENTO",
  "POS_VENDA",
  "FINALIZADO",
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

  // Sincroniza leads quando initialLeads muda (ex: após criar novo lead)
  useEffect(() => {
    setLeads(initialLeads);
  }, [initialLeads]);

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

  // Memoiza leads por stage para evitar re-renders desnecessarios
  const leadsByStage = useMemo(() => {
    const map: Record<PipelineStage, PlainLead[]> = {
      NOVO_LEAD: [],
      EM_NEGOCIACAO: [],
      AGENDADO: [],
      EM_ATENDIMENTO: [],
      POS_VENDA: [],
      FINALIZADO: [],
    };
    optimisticLeads.forEach((lead) => {
      map[lead.stage].push(lead);
    });
    return map;
  }, [optimisticLeads]);

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

  const handleLeadClick = useCallback((lead: PlainLead) => {
    setSelectedLead(lead);
    setIsEditModalOpen(true);
  }, []);

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

  // Empty state quando não há leads
  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-brand-accent/10 flex items-center justify-center mb-6">
            <Users className="w-10 h-10 text-brand-accent/50" />
          </div>
          <Sparkles className="w-5 h-5 text-brand-accent absolute -top-1 -right-1 animate-pulse" />
        </div>
        <h3 className="text-xl font-semibold text-text-primary mb-2">
          Nenhum lead ainda
        </h3>
        <p className="text-text-secondary text-center max-w-sm mb-1">
          Comece adicionando seu primeiro lead ao pipeline clicando em
        </p>
        <p className="text-brand-accent font-medium">
          &quot;+ Novo Lead&quot;
        </p>
      </div>
    );
  }

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
              leads={leadsByStage[stage]}
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
