"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { Calendar as CalendarIcon, Clock, Loader2, User, Phone } from "lucide-react";
import { PlainLead, TimeSlot } from "@/types";
import { createAppointment, getAvailableSlots } from "@/app/actions/appointments";
import { cn, formatPhone } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface QuickScheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: PlainLead | null;
  onSuccess?: () => void;
}

export function QuickScheduleModal({ open, onOpenChange, lead, onSuccess }: QuickScheduleModalProps) {
  const router = useRouter();

  // Estado de agendamento
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  // Loading states
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset ao abrir/fechar
  useEffect(() => {
    if (!open) {
      setSelectedDate(undefined);
      setTimeSlots([]);
      setSelectedSlot(null);
    }
  }, [open]);

  const loadTimeSlots = useCallback(async () => {
    if (!selectedDate) return;

    setIsLoadingSlots(true);
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const result = await getAvailableSlots(dateStr);

      if (result.success && result.data) {
        setTimeSlots(result.data);
      } else {
        toast.error(result.error || "Erro ao carregar horários");
        setTimeSlots([]);
      }
    } catch {
      toast.error("Erro ao carregar horários disponíveis");
      setTimeSlots([]);
    } finally {
      setIsLoadingSlots(false);
    }
  }, [selectedDate]);

  // Carregar horários disponíveis quando selecionar data
  useEffect(() => {
    if (selectedDate) {
      loadTimeSlots();
    } else {
      setTimeSlots([]);
      setSelectedSlot(null);
    }
  }, [selectedDate, loadTimeSlots]);

  const handleSubmit = async () => {
    if (!lead || !selectedSlot) {
      toast.error("Selecione um horário");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createAppointment({
        leadId: lead.id,
        scheduledAt: selectedSlot.scheduledAt,
        duration: 60, // 1 hora
      });

      if (result.success) {
        toast.success("Lead agendado com sucesso!", {
          description: `${lead.name} agendado para ${format(
            new Date(selectedSlot.scheduledAt),
            "dd/MM/yyyy 'às' HH:mm",
            { locale: ptBR }
          )}`,
        });

        if (onSuccess) {
          onSuccess();
        } else {
          router.refresh();
        }
        onOpenChange(false);
      } else {
        toast.error(result.error || "Erro ao criar agendamento");
      }
    } catch {
      toast.error("Erro ao criar agendamento");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Desabilitar apenas datas no passado
  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-brand-accent" />
            Agendar Lead
          </DialogTitle>
          <DialogDescription>
            Selecione data e horário para agendar a análise.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Lead Selecionado */}
          <div className="flex items-center justify-between p-3 bg-brand-accent/10 border border-brand-accent/20 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-accent/20 flex items-center justify-center">
                <User className="w-5 h-5 text-brand-accent" />
              </div>
              <div>
                <p className="font-medium text-text-primary">{lead.name}</p>
                <p className="text-sm text-text-secondary flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {formatPhone(lead.phone)}
                </p>
              </div>
            </div>
          </div>

          {/* Selecionar Data */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              Selecione a Data
            </Label>
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={isDateDisabled}
                className="rounded-md border border-white/[0.08]"
              />
            </div>
          </div>

          {/* Selecionar Horário */}
          {selectedDate && (
            <div className="space-y-4">
              <Label className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Selecione o Horário
              </Label>

              {isLoadingSlots ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-brand-accent" />
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {timeSlots.map((slot) => (
                    <button
                      key={slot.time}
                      onClick={() => slot.available && setSelectedSlot(slot)}
                      disabled={!slot.available}
                      className={cn(
                        "p-2 rounded-md text-sm font-medium transition-all",
                        "border disabled:cursor-not-allowed",
                        slot.available
                          ? selectedSlot?.time === slot.time
                            ? "bg-brand-accent text-text-dark border-brand-accent"
                            : "bg-brand-card text-text-primary border-white/[0.08] hover:border-brand-accent/50 hover:bg-brand-accent/10"
                          : "bg-brand-card/50 text-text-tertiary border-white/[0.04] opacity-50"
                      )}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedSlot || isSubmitting}
            className="min-w-[120px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Agendando...
              </>
            ) : (
              "Confirmar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
