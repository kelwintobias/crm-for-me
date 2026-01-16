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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { Search, Calendar as CalendarIcon, Clock, Loader2, User, Phone } from "lucide-react";
import { PlainLead, TimeSlot } from "@/types";
import { createAppointment, getAvailableSlots } from "@/app/actions/appointments";
import { getLeads } from "@/app/actions/leads";
import { cn, formatPhone } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ScheduleLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ScheduleLeadModal({ open, onOpenChange }: ScheduleLeadModalProps) {
  const router = useRouter();

  // Estado de busca de leads
  const [searchQuery, setSearchQuery] = useState("");
  const [allLeads, setAllLeads] = useState<PlainLead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<PlainLead[]>([]);
  const [selectedLead, setSelectedLead] = useState<PlainLead | null>(null);

  // Estado de agendamento
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  // Loading states
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Carregar leads ao abrir o modal
  useEffect(() => {
    if (open) {
      loadLeads();
    } else {
      // Reset ao fechar
      setSearchQuery("");
      setSelectedLead(null);
      setSelectedDate(undefined);
      setTimeSlots([]);
      setSelectedSlot(null);
    }
  }, [open]);

  const loadLeads = async () => {
    setIsLoadingLeads(true);
    try {
      const result = await getLeads();
      if (result.success && result.data) {
        // Filtrar apenas leads que não estão finalizados ou cancelados
        const activeLeads = result.data.filter(
          (lead) => lead.stage !== "FINALIZADO"
        );
        setAllLeads(activeLeads);
        setFilteredLeads(activeLeads);
      }
    } catch {
      toast.error("Erro ao carregar leads");
    } finally {
      setIsLoadingLeads(false);
    }
  };

  // Filtrar leads conforme busca
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredLeads(allLeads);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = allLeads.filter(
        (lead) =>
          lead.name.toLowerCase().includes(query) ||
          lead.phone.includes(query)
      );
      setFilteredLeads(filtered);
    }
  }, [searchQuery, allLeads]);

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

  const handleLeadSelect = (lead: PlainLead) => {
    setSelectedLead(lead);
    setSearchQuery(""); // Limpa busca após selecionar
  };

  const handleSubmit = async () => {
    if (!selectedLead || !selectedSlot) {
      toast.error("Selecione um lead e um horário");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createAppointment({
        leadId: selectedLead.id,
        scheduledAt: selectedSlot.scheduledAt,
        duration: 60, // 1 hora
      });

      if (result.success) {
        toast.success("Lead agendado com sucesso!", {
          description: `${selectedLead.name} agendado para ${format(
            new Date(selectedSlot.scheduledAt),
            "dd/MM/yyyy 'às' HH:mm",
            { locale: ptBR }
          )}`,
        });

        router.refresh();
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

  // Desabilitar datas no passado e fins de semana
  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Desabilita datas no passado
    if (date < today) return true;

    // Desabilita sábado (6) e domingo (0)
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-brand-accent" />
            Agendar Lead
          </DialogTitle>
          <DialogDescription>
            Busque o lead, selecione data e horário para agendar a análise.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Passo 1: Selecionar Lead */}
          {!selectedLead ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="search" className="flex items-center gap-2 mb-2">
                  <Search className="w-4 h-4" />
                  Buscar Lead
                </Label>
                <Input
                  id="search"
                  placeholder="Digite o nome ou telefone do lead..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                  autoFocus
                />
              </div>

              {isLoadingLeads ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-brand-accent" />
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {filteredLeads.length === 0 ? (
                    <p className="text-center text-text-tertiary py-8">
                      {searchQuery ? "Nenhum lead encontrado" : "Nenhum lead disponível"}
                    </p>
                  ) : (
                    filteredLeads.map((lead) => (
                      <button
                        key={lead.id}
                        onClick={() => handleLeadSelect(lead)}
                        className={cn(
                          "w-full p-3 rounded-lg text-left transition-colors",
                          "border border-white/[0.08] hover:border-brand-accent/50",
                          "bg-brand-card hover:bg-brand-card/80",
                          "flex items-center justify-between gap-4"
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-brand-accent shrink-0" />
                            <p className="font-medium text-text-primary truncate">
                              {lead.name}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Phone className="w-3 h-3 text-text-tertiary shrink-0" />
                            <p className="text-sm text-text-secondary">
                              {formatPhone(lead.phone)}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Lead Selecionado */}
              <div className="flex items-center justify-between p-3 bg-brand-accent/10 border border-brand-accent/20 rounded-lg">
                <div>
                  <p className="font-medium text-text-primary">{selectedLead.name}</p>
                  <p className="text-sm text-text-secondary">{formatPhone(selectedLead.phone)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedLead(null)}
                >
                  Trocar
                </Button>
              </div>

              {/* Passo 2: Selecionar Data */}
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

              {/* Passo 3: Selecionar Horário */}
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
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedLead || !selectedSlot || isSubmitting}
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
