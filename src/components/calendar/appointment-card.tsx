"use client";

import { Clock, User, Phone } from "lucide-react";
import { cn, formatPhone, toBRT } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AppointmentCardProps {
  id: string;
  leadName: string;
  leadPhone: string;
  vendedora: string;
  scheduledAt: string;
  duration: number;
  isOwner: boolean;
  onClick: () => void;
}

export function AppointmentCard({
  leadName,
  leadPhone,
  vendedora,
  scheduledAt,
  duration,
  isOwner,
  onClick,
}: AppointmentCardProps) {
  const startTime = toBRT(scheduledAt);
  const endTime = new Date(startTime.getTime() + duration * 60000);

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-3 rounded-lg text-left transition-all",
        "border border-white/[0.08] hover:border-brand-accent/50",
        "bg-brand-card hover:bg-brand-card/80",
        "group relative overflow-hidden",
        isOwner && "border-brand-accent/30"
      )}
    >
      {/* Indicador de propriedade */}
      {isOwner && (
        <div className="absolute top-0 left-0 w-1 h-full bg-brand-accent" />
      )}

      <div className={cn("space-y-2", isOwner && "pl-2")}>
        {/* Horário */}
        <div className="flex items-center gap-2 text-brand-accent">
          <Clock className="w-3 h-3" />
          <span className="text-xs font-mono font-semibold">
            {format(startTime, "HH:mm", { locale: ptBR })} -{" "}
            {format(endTime, "HH:mm", { locale: ptBR })}
          </span>
        </div>

        {/* Nome do Lead */}
        <div className="flex items-center gap-2">
          <User className="w-3 h-3 text-text-tertiary shrink-0" />
          <p className="font-medium text-text-primary text-sm truncate">
            {leadName}
          </p>
        </div>

        {/* Telefone */}
        <div className="flex items-center gap-2">
          <Phone className="w-3 h-3 text-text-tertiary shrink-0" />
          <p className="text-xs text-text-secondary">
            {formatPhone(leadPhone)}
          </p>
        </div>

        {/* Vendedora */}
        {!isOwner && (
          <div className="pt-1 border-t border-white/[0.04]">
            <p className="text-xs text-text-tertiary">
              Agendado por: {vendedora}
            </p>
          </div>
        )}
      </div>

      {/* Hover indicator */}
      <div className="absolute inset-0 bg-gradient-to-r from-brand-accent/0 via-brand-accent/5 to-brand-accent/0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}
