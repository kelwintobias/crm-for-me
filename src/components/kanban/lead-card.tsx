"use client";

import { memo, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, GripVertical, Calendar, CalendarPlus, UserCircle, CheckCircle2 } from "lucide-react";
import { SOURCE_LABELS, SOURCE_BADGE_VARIANTS, PLAN_LABELS, PlainLead } from "@/types";
import { ShoppingBag } from "lucide-react";
import { getWhatsAppLink, formatPhone } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LeadCardProps {
  lead: PlainLead;
  onClick: () => void;
  isOverlay?: boolean;
  isDragging?: boolean;
  onDragStart: (lead: PlainLead, e: React.MouseEvent | React.TouchEvent) => void;
  onScheduleClick?: (lead: PlainLead) => void;
}

function LeadCardInner({ lead, onClick, isOverlay, isDragging, onDragStart, onScheduleClick }: LeadCardProps) {
  const handleWhatsAppClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(getWhatsAppLink(lead.phone), "_blank");
  }, [lead.phone]);

  const handleScheduleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onScheduleClick) {
      onScheduleClick(lead);
    }
  }, [lead, onScheduleClick]);

  // Mostra botão agendar para leads que não estão em AGENDADO ou FINALIZADO
  const showScheduleButton = !["AGENDADO", "FINALIZADO", "PERDIDO"].includes(lead.stage) && onScheduleClick;

  // PERF: Handler de drag nativo - instantâneo
  const handleDragHandleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDragStart(lead, e);
  }, [lead, onDragStart]);

  const handleDragHandleTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    onDragStart(lead, e);
  }, [lead, onDragStart]);

  // Placeholder quando está sendo arrastado
  if (isDragging) {
    return (
      <div className="h-[88px] rounded-lg bg-zinc-800/30 border-2 border-dashed border-zinc-600 opacity-50" />
    );
  }

  return (
    <div
      className={cn(
        "group relative rounded-lg overflow-hidden select-none",
        !isOverlay && "bg-[#1E1E1E] border border-zinc-800",
        isOverlay && "bg-[#252525] border-2 border-brand-accent shadow-2xl"
      )}
    >
      <div className="relative p-3">
        {/* Linha Principal */}
        <div className="flex items-center gap-3">
          {/* PERF: Handle de drag - evento nativo, sem biblioteca */}
          <div
            onMouseDown={handleDragHandleMouseDown}
            onTouchStart={handleDragHandleTouchStart}
            className={cn(
              "p-2.5 -ml-1 rounded cursor-grab active:cursor-grabbing",
              "text-zinc-500 hover:text-zinc-300 hover:bg-white/5 active:bg-white/10",
              "select-none min-w-[44px] min-h-[44px] flex items-center justify-center",
              "active:scale-110 transition-transform duration-100"
            )}
            style={{ touchAction: 'none' }}
          >
            <GripVertical className="w-6 h-6 pointer-events-none" />
          </div>

          {/* Info Principal */}
          <div className="flex-1 min-w-0 cursor-pointer" onClick={onClick}>
            <h3 className="font-semibold text-zinc-100 truncate text-sm">
              {lead.name}
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5 font-mono">
              {formatPhone(lead.phone)}
            </p>
          </div>

          {/* Botões de ação */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Botão Agendar - apenas para leads não agendados */}
            {showScheduleButton && (
              <button
                onClick={handleScheduleClick}
                className="p-2.5 rounded-md bg-purple-500/10 text-purple-400 hover:bg-purple-500 hover:text-white active:bg-purple-600 min-w-[40px] min-h-[40px] flex items-center justify-center transition-colors"
                title="Agendar"
              >
                <CalendarPlus className="w-4 h-4" />
              </button>
            )}

            {/* Botão WhatsApp */}
            <button
              onClick={handleWhatsAppClick}
              className="p-2.5 rounded-md bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white active:bg-green-600 min-w-[40px] min-h-[40px] flex items-center justify-center transition-colors"
              title="WhatsApp"
            >
              <MessageCircle className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Agendamento - exibe quando tem appointmentInfo */}
        {lead.appointmentInfo && (
          <div className="flex items-center gap-2 mt-2 p-2 rounded-md bg-purple-500/10 border border-purple-500/20">
            <Calendar className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <p className="text-xs text-purple-300 font-medium">
              {format(new Date(lead.appointmentInfo.scheduledAt), "dd/MM 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>
        )}

        {/* Data de finalização */}
        {lead.stage === "FINALIZADO" && (
          <div className="flex items-center gap-2 mt-2 p-2 rounded-md bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <p className="text-xs text-emerald-300 font-medium">
              Finalizado em {format(new Date(lead.updatedAt), "dd/MM/yyyy", { locale: ptBR })}
            </p>
          </div>
        )}

        {/* Tags */}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <Badge variant={SOURCE_BADGE_VARIANTS[lead.source]} className="text-[10px] h-5 px-1.5">
            {SOURCE_LABELS[lead.source]}
          </Badge>

          {lead.plan !== "INDEFINIDO" && (
            <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-emerald-500/30 text-emerald-400">
              {PLAN_LABELS[lead.plan]}
            </Badge>
          )}
        </div>

        {/* Atendido por */}
        {lead.owner && (
          <div className="flex items-center gap-1.5 mt-2 text-[10px] text-zinc-500">
            <UserCircle className="w-3 h-3 shrink-0" />
            <span>Atendido por <span className="text-zinc-400">{lead.owner.name || lead.owner.email.split('@')[0]}</span></span>
          </div>
        )}

        {/* Observações */}
        {lead.notes && (
          <p className="mt-2 text-xs text-zinc-500 line-clamp-2">{lead.notes}</p>
        )}

        {/* Histórico de compras */}
        {lead.contractHistory && (
          <div className="mt-2 pt-2 border-t border-zinc-700/50 flex items-center gap-2">
            <ShoppingBag className="w-3 h-3 text-amber-400 shrink-0" />
            <p className="text-[10px] text-amber-400">
              Cliente recorrente — {lead.contractHistory.contractCount} {lead.contractHistory.contractCount === 1 ? "compra" : "compras"} · LTV {lead.contractHistory.ltv.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
          </div>
        )}

        {/* Adicionais */}
        {lead.addOns && (
          <div className="mt-2 pt-2 border-t border-zinc-700/50">
            <p className="text-[10px] text-zinc-500 mb-0.5">Adicionais</p>
            <p className="text-xs text-zinc-400 truncate">{lead.addOns}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// PERF: Memo - compara apenas campos que afetam visual
export const LeadCard = memo(LeadCardInner, (prev, next) => {
  return (
    prev.lead.id === next.lead.id &&
    prev.lead.name === next.lead.name &&
    prev.lead.phone === next.lead.phone &&
    prev.lead.source === next.lead.source &&
    prev.lead.plan === next.lead.plan &&
    prev.lead.stage === next.lead.stage &&
    prev.lead.notes === next.lead.notes &&
    prev.lead.addOns === next.lead.addOns &&
    prev.lead.contractHistory?.contractCount === next.lead.contractHistory?.contractCount &&
    prev.lead.appointmentInfo?.scheduledAt === next.lead.appointmentInfo?.scheduledAt &&
    prev.lead.owner?.id === next.lead.owner?.id &&
    prev.isOverlay === next.isOverlay &&
    prev.isDragging === next.isDragging
  );
});
