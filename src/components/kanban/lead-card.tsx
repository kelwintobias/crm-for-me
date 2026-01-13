"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Lead } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, GripVertical, Clock } from "lucide-react";
import { SOURCE_LABELS, SOURCE_BADGE_VARIANTS, PLAN_LABELS } from "@/types";
import { getWhatsAppLink, formatPhone } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface LeadCardProps {
  lead: Lead;
  onClick: () => void;
}

export function LeadCard({ lead, onClick }: LeadCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: lead.id,
    data: {
      type: "lead",
      lead,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleWhatsAppClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(getWhatsAppLink(lead.phone), "_blank");
  };

  // Calculate time since creation
  const daysSinceCreation = Math.floor(
    (Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative glass-card rounded-xl overflow-hidden animate-card-enter",
        "hover:border-white/[0.12]",
        isDragging && "opacity-60 scale-105 shadow-2xl ring-2 ring-brand-accent/50 z-50"
      )}
    >
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-accent/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      {/* Card content */}
      <div className="relative p-4">
        {/* Header row */}
        <div className="flex items-start gap-3">
          {/* Drag handle */}
          <div
            {...attributes}
            {...listeners}
            className="mt-1 p-1 -ml-1 rounded cursor-grab active:cursor-grabbing text-text-tertiary hover:text-text-secondary hover:bg-white/[0.05] transition-all"
          >
            <GripVertical className="w-4 h-4" />
          </div>

          {/* Main info */}
          <div className="flex-1 min-w-0" onClick={onClick}>
            <h3 className="font-semibold text-text-primary truncate group-hover:text-brand-accent transition-colors cursor-pointer">
              {lead.name}
            </h3>
            <p className="text-sm text-text-secondary mt-0.5 font-mono">
              {formatPhone(lead.phone)}
            </p>
          </div>

          {/* WhatsApp button */}
          <button
            onClick={handleWhatsAppClick}
            className={cn(
              "shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
              "bg-brand-accent/10 text-brand-accent border border-brand-accent/20",
              "hover:bg-brand-accent hover:text-text-dark hover:shadow-glow",
              "transition-all duration-300 hover:scale-105"
            )}
          >
            <MessageCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Tags row */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <Badge variant={SOURCE_BADGE_VARIANTS[lead.source]} className="text-xs">
            {SOURCE_LABELS[lead.source]}
          </Badge>

          {lead.plan !== "INDEFINIDO" && (
            <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-400">
              {PLAN_LABELS[lead.plan]}
            </Badge>
          )}
        </div>

        {/* Notes preview */}
        {lead.notes && (
          <p className="mt-3 text-xs text-text-tertiary line-clamp-2 italic border-l-2 border-white/10 pl-2">
            {lead.notes}
          </p>
        )}

        {/* Footer */}
        <div className="mt-3 pt-3 border-t border-white/[0.04] flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
            <Clock className="w-3 h-3" />
            <span>
              {daysSinceCreation === 0
                ? "Hoje"
                : daysSinceCreation === 1
                ? "Ontem"
                : `${daysSinceCreation}d atrás`}
            </span>
          </div>

          {/* Quick action hint */}
          <span className="text-xs text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity">
            Clique para editar
          </span>
        </div>
      </div>

      {/* Hover glow effect */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-brand-accent/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}
