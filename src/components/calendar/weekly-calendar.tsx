"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppointmentCard } from "./appointment-card";
import { getWeekAppointments } from "@/app/actions/appointments";
import { toast } from "sonner";
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay, isWeekend } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn, toBRT } from "@/lib/utils";
import { useRealtimeAppointments } from "@/hooks/use-realtime-appointments";

interface WeekAppointment {
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

interface WeeklyCalendarProps {
  onAppointmentClick: (appointmentId: string) => void;
}

export function WeeklyCalendar({ onAppointmentClick }: WeeklyCalendarProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    // Começa na segunda-feira da semana atual
    const todayBRT = toBRT(new Date());
    return startOfWeek(todayBRT, { weekStartsOn: 1 });
  });

  const [appointments, setAppointments] = useState<WeekAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Carrega agendamentos da semana
  const loadAppointments = useCallback(async () => {
    setIsLoading(true);
    try {
      const startDateStr = format(currentWeekStart, "yyyy-MM-dd");
      const result = await getWeekAppointments(startDateStr);

      if (result.success && result.data) {
        setAppointments(result.data);
      } else {
        toast.error(result.error || "Erro ao carregar agendamentos");
        setAppointments([]);
      }
    } catch {
      toast.error("Erro ao carregar agendamentos");
      setAppointments([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentWeekStart]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  // Realtime sync - atualiza quando houver mudanças em appointments
  useRealtimeAppointments(loadAppointments);

  // Navegação de semana
  const goToPreviousWeek = () => {
    setCurrentWeekStart((prev) => subWeeks(prev, 1));
  };

  const goToNextWeek = () => {
    setCurrentWeekStart((prev) => addWeeks(prev, 1));
  };

  const goToCurrentWeek = () => {
    const todayBRT = toBRT(new Date());
    setCurrentWeekStart(startOfWeek(todayBRT, { weekStartsOn: 1 }));
  };

  // Dias da semana (seg-dom - semana completa)
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  // Agrupa agendamentos por dia
  const appointmentsByDay = weekDays.map((day) => ({
    date: day,
    appointments: appointments.filter((apt) =>
      isSameDay(toBRT(apt.scheduledAt), day)
    ),
  }));

  return (
    <div className="space-y-6">
      {/* Header com navegação */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPreviousWeek}
            disabled={isLoading}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-brand-accent" />
            <h2 className="text-lg font-semibold text-text-primary">
              {format(currentWeekStart, "d 'de' MMMM", { locale: ptBR })} -{" "}
              {format(addDays(currentWeekStart, 6), "d 'de' MMMM 'de' yyyy", {
                locale: ptBR,
              })}
            </h2>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={goToNextWeek}
            disabled={isLoading}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={goToCurrentWeek}
          disabled={isLoading}
        >
          Hoje
        </Button>
      </div>

      {/* Grid de dias */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-brand-accent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-3 overflow-x-auto">
          {appointmentsByDay.map(({ date, appointments: dayAppointments }) => {
            const isToday = isSameDay(date, toBRT(new Date()));
            const isWeekendDay = isWeekend(date);

            return (
              <div
                key={date.toISOString()}
                className={cn(
                  "rounded-lg border overflow-hidden min-w-[140px]",
                  isToday && "ring-2 ring-brand-accent/50",
                  isWeekendDay
                    ? "border-white/[0.04] bg-brand-card/30"
                    : "border-white/[0.08] bg-brand-card/50"
                )}
              >
                {/* Cabeçalho do dia */}
                <div
                  className={cn(
                    "p-3 border-b",
                    isToday
                      ? "bg-brand-accent/10 border-brand-accent/20"
                      : isWeekendDay
                        ? "bg-white/[0.01] border-white/[0.04]"
                        : "bg-white/[0.02] border-white/[0.08]"
                  )}
                >
                  <p className={cn(
                    "text-xs uppercase font-semibold",
                    isWeekendDay ? "text-text-tertiary/60" : "text-text-tertiary"
                  )}>
                    {format(date, "EEE", { locale: ptBR })}
                  </p>
                  <p
                    className={cn(
                      "text-lg font-bold mt-1",
                      isToday
                        ? "text-brand-accent"
                        : isWeekendDay
                          ? "text-text-secondary"
                          : "text-text-primary"
                    )}
                  >
                    {format(date, "dd", { locale: ptBR })}
                  </p>
                </div>

                {/* Lista de agendamentos */}
                <div className={cn(
                  "p-2 space-y-2 min-h-[150px] max-h-[400px] overflow-y-auto",
                  isWeekendDay && "opacity-80"
                )}>
                  {dayAppointments.length === 0 ? (
                    <p className="text-center text-text-tertiary text-xs py-6">
                      {isWeekendDay ? "-" : "Sem agendamentos"}
                    </p>
                  ) : (
                    dayAppointments.map((apt) => (
                      <AppointmentCard
                        key={apt.id}
                        id={apt.id}
                        leadName={apt.leadName}
                        leadPhone={apt.leadPhone}
                        vendedora={apt.vendedora}
                        scheduledAt={apt.scheduledAt}
                        duration={apt.duration}
                        isOwner={apt.isOwner}
                        onClick={() => onAppointmentClick(apt.id)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Legenda */}
      <div className="flex items-center justify-center gap-6 text-sm text-text-secondary">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-brand-accent/30 border border-brand-accent" />
          <span>Meus agendamentos</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm border border-white/[0.08]" />
          <span>Outros agendamentos</span>
        </div>
      </div>
    </div>
  );
}
