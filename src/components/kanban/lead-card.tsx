"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Lead } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { SOURCE_LABELS, SOURCE_BADGE_VARIANTS } from "@/types";
import { getWhatsAppLink, formatPhone } from "@/lib/utils";

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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        bg-brand-bg rounded-lg p-4 border border-border
        cursor-grab active:cursor-grabbing
        card-hover
        ${isDragging ? "opacity-50 shadow-xl ring-2 ring-brand-accent" : ""}
      `}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-text-primary truncate">{lead.name}</h3>
          <p className="text-sm text-text-secondary mt-1">
            {formatPhone(lead.phone)}
          </p>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 text-brand-accent hover:bg-brand-accent/20"
          onClick={handleWhatsAppClick}
        >
          <MessageCircle className="h-5 w-5" />
        </Button>
      </div>

      <div className="mt-3">
        <Badge variant={SOURCE_BADGE_VARIANTS[lead.source]}>
          {SOURCE_LABELS[lead.source]}
        </Badge>
      </div>
    </div>
  );
}
