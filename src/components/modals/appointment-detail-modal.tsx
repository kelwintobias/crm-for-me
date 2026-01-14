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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Phone,
  Loader2,
  X,
  Edit,
  History,
} from "lucide-react";
import {
  getWeekAppointments,
  rescheduleAppointment,
  cancelAppointment,
  getAppointmentHistory,
  getAvailableSlots,
} from "@/app/actions/appointments";
import { TimeSlot } from "@/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface AppointmentDetailModalProps {
  appointmentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

interface AppointmentDetails {
  id: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  vendedora: string;
  scheduledAt: string;
  duration: number;
  status: string;
  notes: string | null;
  isOwner: boolean;
}

interface HistoryEntry {
  action: string;
  userName: string;
  previousValue: string | null;
  newValue: string | null;
  createdAt: string;
}

export function AppointmentDetailModal({
  appointmentId,
  open,
  onOpenChange,
  onUpdate,
}: AppointmentDetailModalProps) {
  const router = useRouter();

  const [appointment, setAppointment] = useState<AppointmentDetails | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Estados de remarcação
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  useEffect(() => {
    if (open && appointmentId) {
      loadAppointmentDetails();
      loadHistory();
    } else {
      // Reset ao fechar
      setAppointment(null);
      setHistory([]);
      setIsRescheduling(false);
      setSelectedDate(undefined);
      setTimeSlots([]);
      setSelectedSlot(null);
    }
  }, [open, appointmentId]);

  // Carregar horários quando selecionar nova data
  useEffect(() => {
    if (isRescheduling && selectedDate) {
      loadTimeSlots();
    }
  }, [selectedDate, isRescheduling]);

  const loadAppointmentDetails = async () => {
    if (!appointmentId) return;

    setIsLoading(true);
    try {
      // Busca na semana atual
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay() + 1);

      const result = await getWeekAppointments(format(startOfWeek, "yyyy-MM-dd"));

      if (result.success && result.data) {
        const apt = result.data.find((a) => a.id === appointmentId);
        if (apt) {
          setAppointment(apt as AppointmentDetails);
        }
      }
    } catch (error) {
      toast.error("Erro ao carregar detalhes");
    } finally {
      setIsLoading(false);
    }
  };

  const loadHistory = async () => {
    if (!appointmentId) return;

    try {
      const result = await getAppointmentHistory(appointmentId);
      if (result.success && result.data) {
        setHistory(result.data);
      }
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
    }
  };

  const loadTimeSlots = async () => {
    if (!selectedDate) return;

    setIsLoadingSlots(true);
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const result = await getAvailableSlots(dateStr);

      if (result.success && result.data) {
        setTimeSlots(result.data);
      }
    } catch (error) {
      toast.error("Erro ao carregar horários");
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const handleReschedule = async () => {
    if (!appointmentId || !selectedSlot) {
      toast.error("Selecione uma nova data e horário");
      return;
    }

    setIsLoading(true);
    try {
      const result = await rescheduleAppointment({
        id: appointmentId,
        scheduledAt: selectedSlot.scheduledAt,
      });

      if (result.success) {
        toast.success("Agendamento remarcado com sucesso!");
        router.refresh();
        onUpdate?.();
        onOpenChange(false);
      } else {
        toast.error(result.error || "Erro ao remarcar");
      }
    } catch (error) {
      toast.error("Erro ao remarcar agendamento");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!appointmentId) return;

    setIsCanceling(true);
    try {
      const result = await cancelAppointment({
        id: appointmentId,
      });

      if (result.success) {
        toast.success("Agendamento cancelado");
        router.refresh();
        onUpdate?.();
        onOpenChange(false);
      } else {
        toast.error(result.error || "Erro ao cancelar");
      }
    } catch (error) {
      toast.error("Erro ao cancelar agendamento");
    } finally {
      setIsCanceling(false);
      setShowCancelDialog(false);
    }
  };

  const formatPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    if (digits.length === 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return phone;
  };

  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return true;
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  if (!appointment) {
    return null;
  }

  const scheduledDate = new Date(appointment.scheduledAt);
  const endTime = new Date(scheduledDate.getTime() + appointment.duration * 60000);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-brand-accent" />
              Detalhes do Agendamento
            </DialogTitle>
            <DialogDescription>
              {isRescheduling
                ? "Selecione uma nova data e horário"
                : "Informações do agendamento"}
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-brand-accent" />
            </div>
          ) : isRescheduling ? (
            /* Modo Remarcação */
            <div className="space-y-6 py-4">
              <div className="space-y-4">
                <Label className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  Nova Data
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

              {selectedDate && (
                <div className="space-y-4">
                  <Label className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Novo Horário
                  </Label>

                  {isLoadingSlots ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-brand-accent" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {timeSlots.map((slot) => (
                        <button
                          key={slot.time}
                          onClick={() => slot.available && setSelectedSlot(slot)}
                          disabled={!slot.available}
                          className={cn(
                            "p-3 rounded-md text-sm font-medium transition-all",
                            "border disabled:cursor-not-allowed",
                            slot.available
                              ? selectedSlot?.time === slot.time
                                ? "bg-brand-accent text-text-dark border-brand-accent"
                                : "bg-brand-card text-text-primary border-white/[0.08] hover:border-brand-accent/50"
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
          ) : (
            /* Modo Visualização */
            <div className="space-y-6 py-4">
              {/* Informações do Lead */}
              <div className="p-4 bg-brand-card/50 border border-white/[0.08] rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-brand-accent" />
                  <span className="text-sm text-text-secondary">Lead:</span>
                  <span className="font-medium text-text-primary">{appointment.leadName}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-brand-accent" />
                  <span className="text-sm text-text-secondary">Telefone:</span>
                  <span className="text-text-primary">{formatPhone(appointment.leadPhone)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-brand-accent" />
                  <span className="text-sm text-text-secondary">Data:</span>
                  <span className="text-text-primary">
                    {format(scheduledDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-brand-accent" />
                  <span className="text-sm text-text-secondary">Duração:</span>
                  <span className="text-text-primary">
                    {appointment.duration} minutos ({format(scheduledDate, "HH:mm")} -{" "}
                    {format(endTime, "HH:mm")})
                  </span>
                </div>

                {!appointment.isOwner && (
                  <div className="pt-2 border-t border-white/[0.04]">
                    <span className="text-sm text-text-secondary">
                      Agendado por: <span className="text-text-primary">{appointment.vendedora}</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Histórico */}
              {history.length > 0 && (
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <History className="w-4 h-4" />
                    Histórico
                  </Label>

                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {history.map((entry, index) => (
                      <div
                        key={index}
                        className="p-3 bg-brand-card/30 border border-white/[0.04] rounded-md text-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-text-primary">{entry.action}</span>
                          <span className="text-xs text-text-tertiary">
                            {format(new Date(entry.createdAt), "dd/MM/yyyy HH:mm")}
                          </span>
                        </div>
                        <p className="text-xs text-text-secondary mt-1">
                          Por: {entry.userName}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {isRescheduling ? (
              <>
                <Button variant="outline" onClick={() => setIsRescheduling(false)}>
                  Voltar
                </Button>
                <Button
                  onClick={handleReschedule}
                  disabled={!selectedSlot || isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Remarcando...
                    </>
                  ) : (
                    "Confirmar Remarcação"
                  )}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Fechar
                </Button>
                {appointment.isOwner && appointment.status === "SCHEDULED" && (
                  <>
                    <Button
                      variant="destructive"
                      onClick={() => setShowCancelDialog(true)}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancelar
                    </Button>
                    <Button onClick={() => setIsRescheduling(true)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Remarcar
                    </Button>
                  </>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de cancelamento */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Agendamento?</AlertDialogTitle>
            <AlertDialogDescription>
              O lead será movido de volta para "Em Negociação" e o horário ficará disponível
              para outros agendamentos. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-red-600 hover:bg-red-700"
              disabled={isCanceling}
            >
              {isCanceling ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cancelando...
                </>
              ) : (
                "Sim, cancelar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
