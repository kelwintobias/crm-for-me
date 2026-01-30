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
import { Search, Calendar as CalendarIcon, Clock, Loader2, User, Phone } from "lucide-react";
import { PlainLead } from "@/types";
import { createAppointment } from "@/app/actions/appointments";
import { getLeads } from "@/app/actions/leads";
import { cn, formatPhone, normalizePhone, createDateBRT, toBRT } from "@/lib/utils";
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
  const [selectedTime, setSelectedTime] = useState("");

  // Loading states
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
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
      setSelectedTime("");
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

  // Filtrar leads conforme busca (normaliza telefone para comparação)
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredLeads(allLeads);
    } else {
      const query = searchQuery.toLowerCase();
      const queryNormalized = normalizePhone(searchQuery);
      const filtered = allLeads.filter(
        (lead) =>
          lead.name.toLowerCase().includes(query) ||
          normalizePhone(lead.phone).includes(queryNormalized)
      );
      setFilteredLeads(filtered);
    }
  }, [searchQuery, allLeads]);

  const handleLeadSelect = (lead: PlainLead) => {
    setSelectedLead(lead);
    setSearchQuery(""); // Limpa busca após selecionar
  };

  const handleSubmit = async () => {
    if (!selectedLead || !selectedDate || !selectedTime) {
      toast.error("Selecione um lead, data e horário");
      return;
    }

    const [hours, minutes] = selectedTime.split(":").map(Number);
    const scheduledAt = createDateBRT(selectedDate, hours, minutes);

    setIsSubmitting(true);

    try {
      const result = await createAppointment({
        leadId: selectedLead.id,
        scheduledAt: scheduledAt.toISOString(),
        duration: 60, // 1 hora
      });

      if (result.success) {
        toast.success("Lead agendado com sucesso!", {
          description: `${selectedLead.name} agendado para ${format(
            toBRT(scheduledAt),
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

  // Desabilitar apenas datas no passado (permite qualquer dia da semana)
  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Desabilita apenas datas no passado
    return date < today;
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
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedLead || !selectedDate || !selectedTime || isSubmitting}
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
