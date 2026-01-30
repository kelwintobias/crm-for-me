"use client";

import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { Calendar as CalendarIcon, Clock, Loader2, User, Phone } from "lucide-react";
import { PlainLead } from "@/types";
import { createAppointment } from "@/app/actions/appointments";
import { formatPhone, createDateBRT, toBRT } from "@/lib/utils";
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
  const [selectedTime, setSelectedTime] = useState("");

  // Loading states
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset ao abrir/fechar
  useEffect(() => {
    if (!open) {
      setSelectedDate(undefined);
      setSelectedTime("");
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!lead || !selectedDate || !selectedTime) {
      toast.error("Selecione data e horário");
      return;
    }

    const [hours, minutes] = selectedTime.split(":").map(Number);
    const scheduledAt = createDateBRT(selectedDate, hours, minutes);

    setIsSubmitting(true);

    try {
      const result = await createAppointment({
        leadId: lead.id,
        scheduledAt: scheduledAt.toISOString(),
        duration: 60, // 1 hora
      });

      if (result.success) {
        toast.success("Lead agendado com sucesso!", {
          description: `${lead.name} agendado para ${format(
            toBRT(scheduledAt),
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
              <Label htmlFor="time" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Selecione o Horário
              </Label>
              <Input
                id="time"
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-40"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedDate || !selectedTime || isSubmitting}
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
