"use client";

import { memo, useCallback, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MessageCircle, GripVertical, Calendar, CalendarPlus, UserCircle, CheckCircle2, Flame, X, Clock, Loader2 } from "lucide-react";
import { SOURCE_LABELS, SOURCE_BADGE_VARIANTS, PLAN_LABELS, TEMPERATURE_LABELS, TEMPERATURE_COLORS, PlainLead } from "@/types";
import { ShoppingBag } from "lucide-react";
import { getWhatsAppLink, formatPhone, toBRT, createDateBRT } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { rescheduleAppointment } from "@/app/actions/appointments";
import { toast } from "sonner";

interface LeadCardProps {
  lead: PlainLead;
  onClick: () => void;
  isOverlay?: boolean;
  isDragging?: boolean;
  onDragStart: (lead: PlainLead, e: React.MouseEvent | React.TouchEvent) => void;
  onScheduleClick?: (lead: PlainLead) => void;
  onTemperatureChange?: (lead: PlainLead, temperature: string | null) => void;
  onReschedule?: () => void;
}

function LeadCardInner({ lead, onClick, isOverlay, isDragging, onDragStart, onScheduleClick, onTemperatureChange, onReschedule }: LeadCardProps) {
  const [tempPopoverOpen, setTempPopoverOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>();
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [isRescheduling, setIsRescheduling] = useState(false);

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

  // Handler para abrir popover de remarcação
  const handleOpenReschedule = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (lead.appointmentInfo) {
      const brtDate = toBRT(lead.appointmentInfo.scheduledAt);
      setRescheduleDate(brtDate);
      setRescheduleTime(format(brtDate, "HH:mm"));
    }
    setRescheduleOpen(true);
  }, [lead.appointmentInfo]);

  // Handler de confirmação de remarcação
  const handleConfirmReschedule = useCallback(async () => {
    if (!lead.appointmentInfo || !rescheduleDate || !rescheduleTime) return;
    const [hours, minutes] = rescheduleTime.split(":").map(Number);
    const scheduledAt = createDateBRT(rescheduleDate, hours, minutes);

    setIsRescheduling(true);
    try {
      const result = await rescheduleAppointment({
        id: lead.appointmentInfo.appointmentId,
        scheduledAt: scheduledAt.toISOString(),
      });
      if (result.success) {
        toast.success("Horário atualizado!");
        onReschedule?.();
        setRescheduleOpen(false);
      } else {
        toast.error(result.error || "Erro ao remarcar");
      }
    } catch {
      toast.error("Erro ao remarcar agendamento");
    } finally {
      setIsRescheduling(false);
    }
  }, [lead.appointmentInfo, rescheduleDate, rescheduleTime, onReschedule]);

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

            {/* Botão Temperatura */}
            {onTemperatureChange && (
              <Popover open={tempPopoverOpen} onOpenChange={setTempPopoverOpen}>
                <PopoverTrigger asChild>
                  <button
                    onClick={(e) => { e.stopPropagation(); }}
                    className={cn(
                      "p-2.5 rounded-md min-w-[40px] min-h-[40px] flex items-center justify-center transition-colors",
                      lead.temperature
                        ? `${TEMPERATURE_COLORS[lead.temperature].bg} ${TEMPERATURE_COLORS[lead.temperature].text}`
                        : "bg-zinc-500/10 text-zinc-400 hover:bg-zinc-500/20"
                    )}
                    title="Temperatura"
                  >
                    <Flame className="w-4 h-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-2 bg-[#1E1E1E] border-zinc-700"
                  align="end"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex flex-col gap-1">
                    {(["QUENTE", "MORNO", "FRIO"] as const).map((temp) => (
                      <button
                        key={temp}
                        onClick={() => {
                          onTemperatureChange(lead, temp);
                          setTempPopoverOpen(false);
                        }}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                          TEMPERATURE_COLORS[temp].bg,
                          TEMPERATURE_COLORS[temp].text,
                          "hover:opacity-80",
                          lead.temperature === temp && `border ${TEMPERATURE_COLORS[temp].border}`
                        )}
                      >
                        <span className={cn("w-2 h-2 rounded-full", temp === "QUENTE" ? "bg-red-400" : temp === "MORNO" ? "bg-amber-400" : "bg-blue-400")} />
                        {TEMPERATURE_LABELS[temp]}
                      </button>
                    ))}
                    {lead.temperature && (
                      <button
                        onClick={() => {
                          onTemperatureChange(lead, null);
                          setTempPopoverOpen(false);
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium text-zinc-400 hover:bg-zinc-700/50 transition-colors"
                      >
                        <X className="w-3 h-3" />
                        Remover
                      </button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
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

        {/* Agendamento - exibe quando tem appointmentInfo com Popover para edição */}
        {lead.appointmentInfo && (
          <Popover open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
            <PopoverTrigger asChild>
              <button
                onClick={handleOpenReschedule}
                className="flex items-center gap-2 mt-2 p-2 rounded-md bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 transition-colors cursor-pointer w-full"
              >
                <Calendar className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <p className="text-xs text-purple-300 font-medium">
                  {format(toBRT(lead.appointmentInfo.scheduledAt), "dd/MM 'às' HH:mm", { locale: ptBR })}
                </p>
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto p-4 bg-[#1E1E1E] border-zinc-700"
              align="start"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-4">
                <div className="space-y-3">
                  <label className="text-xs font-medium text-zinc-400">Data</label>
                  <CalendarUI
                    mode="single"
                    selected={rescheduleDate}
                    onSelect={setRescheduleDate}
                    className="rounded-md border border-zinc-700"
                  />
                </div>
                {rescheduleDate && (
                  <div className="space-y-2">
                    <label htmlFor="reschedule-time" className="text-xs font-medium text-zinc-400 flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      Horário
                    </label>
                    <Input
                      id="reschedule-time"
                      type="time"
                      value={rescheduleTime}
                      onChange={(e) => setRescheduleTime(e.target.value)}
                      className="w-full"
                    />
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRescheduleOpen(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleConfirmReschedule}
                    disabled={!rescheduleDate || !rescheduleTime || isRescheduling}
                    className="flex-1"
                  >
                    {isRescheduling ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      "Confirmar"
                    )}
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
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

          {lead.temperature && (
            <Badge className={cn("text-[10px] h-5 px-1.5 border", TEMPERATURE_COLORS[lead.temperature].bg, TEMPERATURE_COLORS[lead.temperature].text, TEMPERATURE_COLORS[lead.temperature].border)}>
              {TEMPERATURE_LABELS[lead.temperature]}
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
    prev.lead.temperature === next.lead.temperature &&
    prev.lead.contractHistory?.contractCount === next.lead.contractHistory?.contractCount &&
    prev.lead.appointmentInfo?.scheduledAt === next.lead.appointmentInfo?.scheduledAt &&
    prev.lead.owner?.id === next.lead.owner?.id &&
    prev.isOverlay === next.isOverlay &&
    prev.isDragging === next.isDragging
  );
});
