"use client";

import { useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

type TableName = "leads" | "appointments" | "contracts" | "debtors" | "fixed_costs";

interface RefreshCallback {
  table: TableName;
  callback: () => void;
}

// Singleton para gerenciar subscriptions globais
let globalSubscriptionActive = false;
const callbacks = new Map<string, RefreshCallback>();
let lastRefreshTime = Date.now();
let debounceTimer: NodeJS.Timeout | null = null;

const DEBOUNCE_MS = 500;
const POLL_INTERVAL_MS = 60000; // 60 segundos (aumentado de 30s)

function triggerCallbacks(table?: TableName) {
  // Debounce para evitar cascata de refreshes
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    lastRefreshTime = Date.now();

    callbacks.forEach((entry) => {
      // Se table específica, só chama callbacks dessa table
      // Se não especificou table, chama todos
      if (!table || entry.table === table) {
        try {
          entry.callback();
        } catch (error) {
          console.error(`[RefreshManager] Error in callback for ${entry.table}:`, error);
        }
      }
    });
  }, DEBOUNCE_MS);
}

export function useRefreshManager(
  table: TableName,
  onRefresh: () => void,
  options?: { enabled?: boolean }
) {
  const supabaseRef = useRef(createClient());
  const callbackIdRef = useRef<string>(`${table}-${Math.random().toString(36).slice(2)}`);
  const enabled = options?.enabled ?? true;

  // Registra callback
  useEffect(() => {
    if (!enabled) return;

    const id = callbackIdRef.current;
    callbacks.set(id, { table, callback: onRefresh });

    return () => {
      callbacks.delete(id);
    };
  }, [table, onRefresh, enabled]);

  // Inicia subscription global (apenas uma vez)
  useEffect(() => {
    if (!enabled || globalSubscriptionActive) return;

    globalSubscriptionActive = true;
    const supabase = supabaseRef.current;

    // Canal único para todas as tabelas
    const channel = supabase
      .channel("crm-realtime-unified")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads" },
        (payload) => {
          console.log("[RefreshManager] Lead change:", payload.eventType);
          triggerCallbacks("leads");
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        (payload) => {
          console.log("[RefreshManager] Appointment change:", payload.eventType);
          triggerCallbacks("appointments");
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contracts" },
        (payload) => {
          console.log("[RefreshManager] Contract change:", payload.eventType);
          triggerCallbacks("contracts");
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "debtors" },
        (payload) => {
          console.log("[RefreshManager] Debtor change:", payload.eventType);
          triggerCallbacks("debtors");
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fixed_costs" },
        (payload) => {
          console.log("[RefreshManager] Fixed cost change:", payload.eventType);
          triggerCallbacks("fixed_costs");
        }
      )
      .subscribe((status) => {
        console.log("[RefreshManager] Unified subscription status:", status);
      });

    // Fallback polling com intervalo aumentado (60s)
    const pollInterval = setInterval(() => {
      const timeSinceLastRefresh = Date.now() - lastRefreshTime;
      if (timeSinceLastRefresh > POLL_INTERVAL_MS) {
        console.log("[RefreshManager] Polling fallback triggered");
        triggerCallbacks();
      }
    }, POLL_INTERVAL_MS);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
      globalSubscriptionActive = false;
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [enabled]);

  // Função para forçar refresh manualmente
  const forceRefresh = useCallback(() => {
    triggerCallbacks(table);
  }, [table]);

  return { forceRefresh };
}
