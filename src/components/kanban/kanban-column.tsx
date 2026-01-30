"use client";

import { memo, useCallback, useEffect, useRef } from "react";
import type { PipelineStage } from "@prisma/client";
import { LeadCard } from "./lead-card";
import { STAGE_LABELS } from "@/types";
import { cn } from "@/lib/utils";
import { Users, MessageSquare, Calendar, Headphones, CheckCircle, CheckCheck, XCircle } from "lucide-react";
import { PlainLead } from "@/types";

interface KanbanColumnProps {
  stage: PipelineStage;
  leads: PlainLead[];
  onLeadClick: (lead: PlainLead) => void;
  onDragStart: (lead: PlainLead, e: React.MouseEvent | React.TouchEvent) => void;
  registerRef: (stage: PipelineStage, el: HTMLDivElement | null) => void;
  onScheduleClick?: (lead: PlainLead) => void;
  onTemperatureChange?: (lead: PlainLead, temperature: string | null) => void;
}

// PERF: Config estática fora do componente
const COLUMN_CONFIG: Record<PipelineStage, {
  color: string;
  borderColor: string;
  icon: React.ReactNode;
  gradient: string;
}> = {
  NOVO_LEAD: {
    color: "text-blue-400",
    borderColor: "border-t-blue-500",
    icon: <Users className="w-4 h-4" />,
    gradient: "from-blue-500/20 to-blue-500/0",
  },
  EM_NEGOCIACAO: {
    color: "text-amber-400",
    borderColor: "border-t-amber-500",
    icon: <MessageSquare className="w-4 h-4" />,
    gradient: "from-amber-500/20 to-amber-500/0",
  },
  AGENDADO: {
    color: "text-purple-400",
    borderColor: "border-t-purple-500",
    icon: <Calendar className="w-4 h-4" />,
    gradient: "from-purple-500/20 to-purple-500/0",
  },
  EM_ATENDIMENTO: {
    color: "text-emerald-400",
    borderColor: "border-t-emerald-500",
    icon: <Headphones className="w-4 h-4" />,
    gradient: "from-emerald-500/20 to-emerald-500/0",
  },
  POS_VENDA: {
    color: "text-cyan-400",
    borderColor: "border-t-cyan-500",
    icon: <CheckCircle className="w-4 h-4" />,
    gradient: "from-cyan-500/20 to-cyan-500/0",
  },
  PERDIDO: {
    color: "text-red-400",
    borderColor: "border-t-red-500",
    icon: <XCircle className="w-4 h-4" />,
    gradient: "from-red-500/20 to-red-500/0",
  },
  FINALIZADO: {
    color: "text-green-400",
    borderColor: "border-t-green-500",
    icon: <CheckCheck className="w-4 h-4" />,
    gradient: "from-green-500/20 to-green-500/0",
  },
};

function KanbanColumnInner({ stage, leads, onLeadClick, onDragStart, registerRef, onScheduleClick, onTemperatureChange }: KanbanColumnProps) {
  const columnRef = useRef<HTMLDivElement>(null);
  const config = COLUMN_CONFIG[stage];

  // Registra ref na montagem
  useEffect(() => {
    registerRef(stage, columnRef.current);
    return () => registerRef(stage, null);
  }, [stage, registerRef]);

  // Factory de handlers
  const getClickHandler = useCallback(
    (lead: PlainLead) => () => onLeadClick(lead),
    [onLeadClick]
  );

  return (
    <div
      ref={columnRef}
      className={cn(
        "group flex flex-col rounded-2xl min-w-[320px] w-[320px] max-h-[calc(100vh-240px)]",
        "bg-brand-card/80",
        "border border-white/[0.04] border-t-2",
        config.borderColor,
        // PERF: Estilos de hover via data-attribute (setado pelo JS no board)
        "data-[drag-over=true]:border-white/20",
        "data-[drag-over=true]:bg-white/[0.02]"
      )}
    >
      {/* Header */}
      <div className={cn(
        "p-4 relative overflow-hidden",
        "border-b border-white/[0.04]"
      )}>
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

      {/* Cards container - PERF: contain para isolar repaints */}
      <div className="flex-1 p-3 space-y-3 overflow-y-auto scrollbar-thin" style={{ contain: 'layout paint' }}>
        {leads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            onClick={getClickHandler(lead)}
            onDragStart={onDragStart}
            onScheduleClick={onScheduleClick}
            onTemperatureChange={onTemperatureChange}
          />
        ))}

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

        {/* Indicador de drop - sempre visível, opacidade controlada por CSS */}
        <div className={cn(
          "h-14 rounded-xl border-2 border-dashed flex items-center justify-center",
          "opacity-0 group-data-[drag-over=true]:opacity-100",
          "transition-opacity duration-75",
          "border-brand-accent/40 bg-brand-accent/5"
        )}>
          <span className="text-xs text-brand-accent font-medium">
            Solte aqui
          </span>
        </div>
      </div>
    </div>
  );
}

// PERF: Memo otimizado - Compara referencias dos leads (funciona pq atualizamos leads imutavelmente)
export const KanbanColumn = memo(KanbanColumnInner, (prevProps, nextProps) => {
  if (prevProps.stage !== nextProps.stage) return false;
  if (prevProps.onLeadClick !== nextProps.onLeadClick) return false;
  if (prevProps.onDragStart !== nextProps.onDragStart) return false;
  if (prevProps.onScheduleClick !== nextProps.onScheduleClick) return false;
  if (prevProps.onTemperatureChange !== nextProps.onTemperatureChange) return false;
  if (prevProps.leads.length !== nextProps.leads.length) return false;

  // Compara referencia dos objetos (muito mais rapido que deep equals)
  for (let i = 0; i < prevProps.leads.length; i++) {
    if (prevProps.leads[i] !== nextProps.leads[i]) return false;
  }

  return true;
});
