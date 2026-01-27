"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { PipelineStage } from "@prisma/client";
import { KanbanColumn } from "./kanban-column";
import { LeadCard } from "./lead-card";
import { EditLeadModal } from "../modals/edit-lead-modal";
import { updateLeadStage } from "@/app/actions/leads";
import { toast } from "sonner";
import { PlainLead } from "@/types";
import { Users, Sparkles } from "lucide-react";
import { LostLeadReasonModal } from "../modals/lost-lead-reason-modal";
import { useRealtimeLeads } from "@/hooks/use-realtime-leads";
import { useDataRefresh, useDataUpdateListener } from "@/hooks/use-data-refresh";

const STAGES: PipelineStage[] = [
  "NOVO_LEAD",
  "EM_NEGOCIACAO",
  "AGENDADO",
  "EM_ATENDIMENTO",
  "POS_VENDA",
  "PERDIDO",
  "FINALIZADO",
];

interface KanbanBoardProps {
  initialLeads: PlainLead[];
}

// PERF: Contexto global para drag - evita prop drilling
interface DragState {
  isDragging: boolean;
  leadId: string | null;
  lead: PlainLead | null;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  sourceStage: PipelineStage | null;
}

export function KanbanBoard({ initialLeads }: KanbanBoardProps) {
  const { refreshLeads } = useDataRefresh();
  const [leads, setLeads] = useState<PlainLead[]>(initialLeads);
  const [selectedLead, setSelectedLead] = useState<PlainLead | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLostModalOpen, setIsLostModalOpen] = useState(false);
  const [pendingLostLead, setPendingLostLead] = useState<{ lead: PlainLead, targetStage: PipelineStage } | null>(null);

  // Realtime subscription com fallback de polling
  useRealtimeLeads(setLeads, refreshLeads);

  // Escuta eventos de atualização manual (quando outros componentes fazem mutations)
  useDataUpdateListener("LEADS_UPDATED", useCallback(() => {
    setLeads(initialLeads);
  }, [initialLeads]));

  // PERF: Estado de drag em ref - ZERO re-renders durante arraste
  const dragRef = useRef<DragState>({
    isDragging: false,
    leadId: null,
    lead: null,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    sourceStage: null,
  });

  // Ref para o overlay DOM element
  const overlayRef = useRef<HTMLDivElement | null>(null);

  // Refs para as colunas (para detecção de drop)
  const columnRefs = useRef<Map<PipelineStage, HTMLDivElement>>(new Map());

  // Estado apenas para forçar re-render do overlay quando necessário
  const [dragActive, setDragActive] = useState(false);
  const [overlayPosition, setOverlayPosition] = useState({ x: 0, y: 0 });

  // Sync leads
  useEffect(() => {
    setLeads(initialLeads);
  }, [initialLeads]);

  // PERF: Agrupa leads por stage
  const leadsByStage = useMemo(() => {
    const map: Record<PipelineStage, PlainLead[]> = {
      NOVO_LEAD: [],
      EM_NEGOCIACAO: [],
      AGENDADO: [],
      EM_ATENDIMENTO: [],
      POS_VENDA: [],
      PERDIDO: [],
      FINALIZADO: [],
    };

    const now = new Date();

    leads.forEach((lead) => {
      // Filtra leads finalizados para mostrar apenas os do mês atual
      // Baseado na tabela de Contratos (enriched via contractHistory)
      if (lead.stage === "FINALIZADO") {
        let shouldShow = false;

        // Se tem histórico de contratos, verifica a data do último contrato
        if (lead.contractHistory?.lastContractDate) {
          const contractDate = new Date(lead.contractHistory.lastContractDate);
          if (
            contractDate.getMonth() === now.getMonth() &&
            contractDate.getFullYear() === now.getFullYear()
          ) {
            shouldShow = true;
          }
        }
        // Fallback: Se não tem contrato vinculado mas está em FINALIZADO (ex: movido recentemente)
        // verifica o updatedAt para não sumir da tela imediatamente
        else {
          const updateDate = new Date(lead.updatedAt);
          if (
            updateDate.getMonth() === now.getMonth() &&
            updateDate.getFullYear() === now.getFullYear()
          ) {
            shouldShow = true;
          }
        }

        if (shouldShow) {
          map[lead.stage].push(lead);
        }
      } else if (map[lead.stage]) {
        map[lead.stage].push(lead);
      }
    });
    return map;
  }, [leads]);

  // Handler de click
  const handleLeadClick = useCallback((lead: PlainLead) => {
    // Não abre modal se estava arrastando
    if (dragRef.current.isDragging) return;
    setSelectedLead(lead);
    setIsEditModalOpen(true);
  }, []);

  // PERF: Registra ref de coluna
  const registerColumnRef = useCallback((stage: PipelineStage, el: HTMLDivElement | null) => {
    if (el) {
      columnRefs.current.set(stage, el);
    } else {
      columnRefs.current.delete(stage);
    }
  }, []);

  // PERF: Detecta qual coluna está sob o cursor
  const getColumnUnderCursor = useCallback((x: number, y: number): PipelineStage | null => {
    for (const [stage, el] of columnRefs.current.entries()) {
      const rect = el.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        return stage;
      }
    }
    return null;
  }, []);

  // PERF: Inicia drag - chamado pelo LeadCard
  const handleDragStart = useCallback((lead: PlainLead, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    // Atualiza ref imediatamente (síncrono)
    dragRef.current = {
      isDragging: true,
      leadId: lead.id,
      lead: lead,
      startX: clientX,
      startY: clientY,
      currentX: clientX,
      currentY: clientY,
      sourceStage: lead.stage,
    };

    // Apenas um setState para mostrar overlay
    setDragActive(true);
    setOverlayPosition({ x: clientX, y: clientY });
  }, []);

  // PERF: Ref para armazenar leads iniciais para rollback (evita dependência no useEffect)
  const initialLeadsRef = useRef(initialLeads);
  useEffect(() => {
    initialLeadsRef.current = initialLeads;
  }, [initialLeads]);

  // PERF: Mouse move - atualiza posição do overlay via DOM direto
  // OTIMIZAÇÃO: Removido initialLeads das dependências para evitar vazamento de listeners
  useEffect(() => {
    if (!dragActive) return;

    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!dragRef.current.isDragging) return;

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      dragRef.current.currentX = clientX;
      dragRef.current.currentY = clientY;

      // PERF: Atualiza overlay diretamente no DOM - sem React!
      if (overlayRef.current) {
        overlayRef.current.style.transform = `translate(${clientX - 160}px, ${clientY - 44}px) rotate(3deg)`;
      }

      // Highlight da coluna sob o cursor
      const targetStage = getColumnUnderCursor(clientX, clientY);
      columnRefs.current.forEach((el, stage) => {
        if (stage === targetStage) {
          el.setAttribute('data-drag-over', 'true');
        } else {
          el.removeAttribute('data-drag-over');
        }
      });
    };

    const handleMouseUp = async (e: MouseEvent | TouchEvent) => {
      if (!dragRef.current.isDragging) return;

      const clientX = 'touches' in e ? e.changedTouches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.changedTouches[0].clientY : e.clientY;

      const targetStage = getColumnUnderCursor(clientX, clientY);
      const { lead, sourceStage } = dragRef.current;

      // Limpa highlights
      columnRefs.current.forEach((el) => {
        el.removeAttribute('data-drag-over');
      });

      // Reset drag state
      dragRef.current = {
        isDragging: false,
        leadId: null,
        lead: null,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        sourceStage: null,
      };

      setDragActive(false);

      // Se dropou em uma coluna diferente, atualiza
      if (targetStage && lead && sourceStage && targetStage !== sourceStage) {

        // Se for movido para PERDIDO, abrir modal
        if (targetStage === "PERDIDO") {
          setPendingLostLead({ lead, targetStage });
          setIsLostModalOpen(true);
          return; // Stop optimistic update
        }

        // Atualização otimista
        setLeads((prev) =>
          prev.map((l) =>
            l.id === lead.id ? { ...l, stage: targetStage, updatedAt: new Date() } : l
          )
        );

        // Persiste no servidor
        try {
          const result = await updateLeadStage(lead.id, targetStage);
          if (!result.success) {
            throw new Error("Failed");
          }
          toast.success("Lead movido com sucesso!");
        } catch {
          toast.error("Erro ao mover lead");
          // Usa ref para rollback (evita dependência)
          setLeads(initialLeadsRef.current);
        }
      }
    };

    // Event listeners
    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleMouseMove, { passive: true });
    document.addEventListener('touchend', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleMouseMove);
      document.removeEventListener('touchend', handleMouseUp);
    };
  }, [dragActive, getColumnUnderCursor]); // PERF: Removido initialLeads - usa ref

  const handleLeadUpdate = useCallback((updatedLead: PlainLead) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === updatedLead.id ? updatedLead : l))
    );
    setSelectedLead(null);
    setIsEditModalOpen(false);
  }, []);

  const handleLeadDelete = useCallback((leadId: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== leadId));
    setSelectedLead(null);
  }, []);

  const handleConfirmLost = async (reason: string) => {
    if (!pendingLostLead) return;
    const { lead, targetStage } = pendingLostLead;

    // Optimistic
    setLeads((prev) =>
      prev.map((l) =>
        l.id === lead.id ? { ...l, stage: targetStage, updatedAt: new Date(), lostReason: reason } : l
      )
    );

    try {
      const result = await updateLeadStage(lead.id, targetStage, reason);
      if (!result.success) throw new Error("Failed");
      toast.success("Lead marcado como perdido");
    } catch {
      toast.error("Erro ao mover lead");
      // Usa ref para rollback (evita re-renders desnecessários)
      setLeads(initialLeadsRef.current);
    }
    setPendingLostLead(null);
  };

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-brand-accent/10 flex items-center justify-center mb-6">
            <Users className="w-10 h-10 text-brand-accent/50" />
          </div>
          <Sparkles className="w-5 h-5 text-brand-accent absolute -top-1 -right-1 animate-pulse" />
        </div>
        <h3 className="text-xl font-semibold text-text-primary mb-2">
          Nenhum lead ainda
        </h3>
        <p className="text-text-secondary text-center max-w-sm mb-1">
          Comece adicionando seu primeiro lead ao pipeline clicando em
        </p>
        <p className="text-brand-accent font-medium">
          &quot;+ Novo Lead&quot;
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-4 px-1">
        {STAGES.map((stage) => (
          <KanbanColumn
            key={stage}
            stage={stage}
            leads={leadsByStage[stage]}
            onLeadClick={handleLeadClick}
            onDragStart={handleDragStart}
            registerRef={registerColumnRef}
          />
        ))}
      </div>

      {/* PERF: Overlay renderizado via portal, posição via DOM direto */}
      {dragActive && dragRef.current.lead && createPortal(
        <div
          ref={overlayRef}
          className="fixed top-0 left-0 z-[9999] pointer-events-none will-change-transform"
          style={{
            transform: `translate(${overlayPosition.x - 160}px, ${overlayPosition.y - 44}px) rotate(3deg)`,
          }}
        >
          <div className="w-[320px] opacity-95 shadow-2xl">
            <LeadCard
              lead={dragRef.current.lead}
              onClick={() => { }}
              isOverlay
              onDragStart={() => { }}
            />
          </div>
        </div>,
        document.body
      )}

      <EditLeadModal
        lead={selectedLead}
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        onUpdate={handleLeadUpdate}
        onDelete={handleLeadDelete}
      />

      <LostLeadReasonModal
        open={isLostModalOpen}
        onOpenChange={(open) => {
          setIsLostModalOpen(open);
          if (!open) setPendingLostLead(null);
        }}
        onConfirm={handleConfirmLost}
      />
    </>
  );
}
