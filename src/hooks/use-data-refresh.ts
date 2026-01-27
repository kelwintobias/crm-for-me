"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { dataEvents, DATA_EVENTS, emitAllDataUpdate } from "@/lib/events";

type DataType = keyof typeof DATA_EVENTS;

/**
 * Hook para fazer refresh de dados de forma consistente em todo o app.
 * Combina router.refresh() com sistema de eventos para garantir que
 * todos os componentes (Server e Client Components) sejam atualizados.
 */
export function useDataRefresh() {
  const router = useRouter();

  /**
   * Faz refresh de um tipo específico de dados
   */
  const refresh = useCallback(
    (type?: DataType) => {
      // 1. Revalida dados do servidor (Server Components)
      router.refresh();

      // 2. Notifica componentes client-side via eventos
      if (type) {
        dataEvents.emit(DATA_EVENTS[type]);
      } else {
        // Se não especificou tipo, atualiza tudo
        emitAllDataUpdate();
      }
    },
    [router]
  );

  /**
   * Refresh de leads
   */
  const refreshLeads = useCallback(() => {
    router.refresh();
    dataEvents.emit(DATA_EVENTS.LEADS_UPDATED);
  }, [router]);

  /**
   * Refresh de agendamentos
   */
  const refreshAppointments = useCallback(() => {
    router.refresh();
    dataEvents.emit(DATA_EVENTS.APPOINTMENTS_UPDATED);
  }, [router]);

  /**
   * Refresh de contratos
   */
  const refreshContracts = useCallback(() => {
    router.refresh();
    dataEvents.emit(DATA_EVENTS.CONTRACTS_UPDATED);
  }, [router]);

  /**
   * Refresh de devedores
   */
  const refreshDebtors = useCallback(() => {
    router.refresh();
    dataEvents.emit(DATA_EVENTS.DEBTORS_UPDATED);
  }, [router]);

  /**
   * Refresh de custos fixos
   */
  const refreshFixedCosts = useCallback(() => {
    router.refresh();
    dataEvents.emit(DATA_EVENTS.FIXED_COSTS_UPDATED);
  }, [router]);

  /**
   * Refresh de todos os dados
   */
  const refreshAll = useCallback(() => {
    router.refresh();
    emitAllDataUpdate();
  }, [router]);

  return {
    refresh,
    refreshLeads,
    refreshAppointments,
    refreshContracts,
    refreshDebtors,
    refreshFixedCosts,
    refreshAll,
  };
}

/**
 * Hook para ouvir eventos de atualização de dados.
 * Use em componentes que carregam dados por conta própria (ex: WeeklyCalendar).
 */
export function useDataUpdateListener(
  eventType: DataType | "ALL_DATA_UPDATED",
  callback: () => void
) {
  useEffect(() => {
    const event =
      eventType === "ALL_DATA_UPDATED"
        ? DATA_EVENTS.ALL_DATA_UPDATED
        : DATA_EVENTS[eventType];

    // Registra listener
    const cleanup = dataEvents.on(event, callback);

    // Se for ALL_DATA_UPDATED, também ouve o evento específico
    let specificCleanup: (() => void) | undefined;
    if (eventType !== "ALL_DATA_UPDATED") {
      specificCleanup = dataEvents.on(DATA_EVENTS.ALL_DATA_UPDATED, callback);
    }

    return () => {
      cleanup();
      specificCleanup?.();
    };
  }, [eventType, callback]);
}
