"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppointmentCard } from "./appointment-card";
import { getWeekAppointments } from "@/app/actions/appointments";
import { toast } from "sonner";
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

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
    const today = new Date();
    return startOfWeek(today, { weekStartsOn: 1 });
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
    } catch (error) {
      toast.error("Erro ao carregar agendamentos");
      setAppointments([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentWeekStart]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  // Navegação de semana
  const goToPreviousWeek = () => {
    setCurrentWeekStart((prev) => subWeeks(prev, 1));
  };

  const goToNextWeek = () => {
    setCurrentWeekStart((prev) => addWeeks(prev, 1));
  };

  const goToCurrentWeek = () => {
    const today = new Date();
    setCurrentWeekStart(startOfWeek(today, { weekStartsOn: 1 }));
  };

  // Dias da semana (seg-sex)
  const weekDays = Array.from({ length: 5 }, (_, i) => addDays(currentWeekStart, i));

  // Agrupa agendamentos por dia
  const appointmentsByDay = weekDays.map((day) => ({
    date: day,
    appointments: appointments.filter((apt) =>
      isSameDay(new Date(apt.scheduledAt), day)
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
              {format(addDays(currentWeekStart, 4), "d 'de' MMMM 'de' yyyy", {
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
        <div className="grid grid-cols-5 gap-4">
          {appointmentsByDay.map(({ date, appointments: dayAppointments }) => {
            const isToday = isSameDay(date, new Date());

            return (
              <div
                key={date.toISOString()}
                className={cn(
                  "rounded-lg border border-white/[0.08] bg-brand-card/50 overflow-hidden",
                  isToday && "ring-2 ring-brand-accent/50"
                )}
              >
                {/* Cabeçalho do dia */}
                <div
                  className={cn(
                    "p-3 border-b border-white/[0.08]",
                    isToday ? "bg-brand-accent/10" : "bg-white/[0.02]"
                  )}
                >
                  <p className="text-xs text-text-tertiary uppercase font-semibold">
                    {format(date, "EEEE", { locale: ptBR })}
                  </p>
                  <p
                    className={cn(
                      "text-lg font-bold mt-1",
                      isToday ? "text-brand-accent" : "text-text-primary"
                    )}
                  >
                    {format(date, "dd", { locale: ptBR })}
                  </p>
                </div>

                {/* Lista de agendamentos */}
                <div className="p-3 space-y-2 min-h-[200px] max-h-[600px] overflow-y-auto">
                  {dayAppointments.length === 0 ? (
                    <p className="text-center text-text-tertiary text-sm py-8">
                      Sem agendamentos
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
