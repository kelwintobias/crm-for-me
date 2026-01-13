"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Lead, PipelineStage } from "@prisma/client";
import { LeadCard } from "./lead-card";
import { STAGE_LABELS } from "@/types";
import { cn } from "@/lib/utils";

interface KanbanColumnProps {
  stage: PipelineStage;
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
}

const COLUMN_COLORS: Record<PipelineStage, string> = {
  NOVOS: "border-t-blue-500",
  EM_CONTATO: "border-t-yellow-500",
  VENDIDO_UNICO: "border-t-green-500",
  VENDIDO_MENSAL: "border-t-emerald-500",
  PERDIDO: "border-t-red-500",
};

export function KanbanColumn({ stage, leads, onLeadClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage,
    data: {
      type: "column",
      stage,
    },
  });

  return (
    <div
      className={cn(
        "flex flex-col bg-brand-card rounded-xl border-t-4 min-w-[300px] w-[300px] max-h-[calc(100vh-220px)]",
        COLUMN_COLORS[stage],
        isOver && "ring-2 ring-brand-accent"
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-text-primary">
            {STAGE_LABELS[stage]}
          </h2>
          <span className="bg-brand-bg text-text-secondary text-sm px-2 py-1 rounded-full">
            {leads.length}
          </span>
        </div>
      </div>

      {/* Cards Container */}
      <div
        ref={setNodeRef}
        className="flex-1 p-3 space-y-3 overflow-y-auto"
      >
        <SortableContext
          items={leads.map((l) => l.id)}
          strategy={verticalListSortingStrategy}
        >
          {leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onClick={() => onLeadClick(lead)}
            />
          ))}
        </SortableContext>

        {leads.length === 0 && (
          <div className="text-center py-8 text-text-secondary text-sm">
            Nenhum lead nesta coluna
          </div>
        )}
      </div>
    </div>
  );
}
