"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Lead, PipelineStage } from "@prisma/client";
import { LeadCard } from "./lead-card";
import { STAGE_LABELS } from "@/types";
import { cn } from "@/lib/utils";
import { Users, MessageSquare, Package, RefreshCcw, Archive } from "lucide-react";

interface KanbanColumnProps {
  stage: PipelineStage;
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
}

const COLUMN_CONFIG: Record<PipelineStage, {
  color: string;
  bgGlow: string;
  borderColor: string;
  icon: React.ReactNode;
  gradient: string;
}> = {
  NOVOS: {
    color: "text-blue-400",
    bgGlow: "glow-novos",
    borderColor: "border-t-blue-500",
    icon: <Users className="w-4 h-4" />,
    gradient: "from-blue-500/20 to-blue-500/0",
  },
  EM_CONTATO: {
    color: "text-amber-400",
    bgGlow: "glow-contato",
    borderColor: "border-t-amber-500",
    icon: <MessageSquare className="w-4 h-4" />,
    gradient: "from-amber-500/20 to-amber-500/0",
  },
  VENDIDO_UNICO: {
    color: "text-emerald-400",
    bgGlow: "glow-vendido-unico",
    borderColor: "border-t-emerald-500",
    icon: <Package className="w-4 h-4" />,
    gradient: "from-emerald-500/20 to-emerald-500/0",
  },
  VENDIDO_MENSAL: {
    color: "text-brand-accent",
    bgGlow: "glow-vendido-mensal",
    borderColor: "border-t-brand-accent",
    icon: <RefreshCcw className="w-4 h-4" />,
    gradient: "from-brand-accent/20 to-brand-accent/0",
  },
  PERDIDO: {
    color: "text-red-400",
    bgGlow: "glow-perdido",
    borderColor: "border-t-red-500",
    icon: <Archive className="w-4 h-4" />,
    gradient: "from-red-500/20 to-red-500/0",
  },
};

export function KanbanColumn({ stage, leads, onLeadClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage,
    data: {
      type: "column",
      stage,
    },
  });

  const config = COLUMN_CONFIG[stage];

  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl min-w-[320px] w-[320px] max-h-[calc(100vh-240px)]",
        "bg-brand-card/50 backdrop-blur-sm",
        "border border-white/[0.04] border-t-2",
        config.borderColor,
        "transition-all duration-300",
        isOver && [config.bgGlow, "scale-[1.01] border-white/[0.1]"]
      )}
    >
      {/* Header */}
      <div className={cn(
        "p-4 relative overflow-hidden",
        "border-b border-white/[0.04]"
      )}>
        {/* Background gradient */}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-b opacity-50",
          config.gradient
        )} />

        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center",
              "bg-white/[0.05] border border-white/[0.08]",
              config.color
            )}>
              {config.icon}
            </div>
            <div>
              <h2 className="font-semibold text-text-primary text-sm">
                {STAGE_LABELS[stage]}
              </h2>
              <p className="text-xs text-text-tertiary mt-0.5">
                {leads.length === 0
                  ? "Nenhum lead"
                  : leads.length === 1
                  ? "1 lead"
                  : `${leads.length} leads`}
              </p>
            </div>
          </div>

          {/* Count badge */}
          <div className={cn(
            "min-w-[32px] h-8 px-2.5 rounded-lg flex items-center justify-center",
            "font-bold text-sm font-mono",
            "bg-white/[0.05] border border-white/[0.08]",
            config.color
          )}>
            {leads.length}
          </div>
        </div>
      </div>

      {/* Cards container */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 p-3 space-y-3 overflow-y-auto scrollbar-thin",
          "transition-colors duration-300",
          isOver && "bg-white/[0.02]"
        )}
      >
        <SortableContext
          items={leads.map((l) => l.id)}
          strategy={verticalListSortingStrategy}
        >
          {leads.map((lead, index) => (
            <div
              key={lead.id}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <LeadCard
                lead={lead}
                onClick={() => onLeadClick(lead)}
              />
            </div>
          ))}
        </SortableContext>

        {leads.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center mb-3",
              "bg-white/[0.03] border border-white/[0.06]",
              config.color,
              "opacity-50"
            )}>
              {config.icon}
            </div>
            <p className="text-sm text-text-tertiary">
              Arraste leads para cá
            </p>
          </div>
        )}
      </div>

      {/* Drop indicator */}
      {isOver && (
        <div className="absolute inset-x-3 bottom-3 h-16 rounded-xl border-2 border-dashed border-brand-accent/30 bg-brand-accent/5 flex items-center justify-center">
          <span className="text-xs text-brand-accent font-medium">
            Solte aqui
          </span>
        </div>
      )}
    </div>
  );
}
