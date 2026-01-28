"use client";

import { useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { PlainLead } from "@/types";
import { useRefreshManager } from "./use-refresh-manager";

type SetLeads = React.Dispatch<React.SetStateAction<PlainLead[]>>;

export function useRealtimeLeads(setLeads: SetLeads, onRefresh?: () => void) {
  const supabaseRef = useRef(createClient());

  // Callback memoizado para o refresh manager
  const handleRefresh = useCallback(() => {
    if (onRefresh) {
      onRefresh();
    }
  }, [onRefresh]);

  // Usa o refresh manager centralizado para polling
  useRefreshManager("leads", handleRefresh, { enabled: !!onRefresh });

  useEffect(() => {
    const supabase = supabaseRef.current;

    // Realtime subscription para updates otimistas locais
    const channel = supabase
      .channel("leads-realtime-local")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads" },
        (payload) => {
          console.log("[Realtime] Lead change detected:", payload.eventType);

          if (payload.eventType === "INSERT") {
            const newLead = payload.new as PlainLead;
            // Só adiciona se não for soft deleted
            if (!newLead.deletedAt) {
              setLeads((prev) => {
                // Evita duplicatas
                if (prev.some((l) => l.id === newLead.id)) return prev;
                return [newLead, ...prev];
              });
            }
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as PlainLead;
            if (updated.deletedAt) {
              // Soft delete - remove da lista
              setLeads((prev) => prev.filter((l) => l.id !== updated.id));
            } else {
              setLeads((prev) =>
                prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l))
              );
            }
          } else if (payload.eventType === "DELETE") {
            setLeads((prev) => prev.filter((l) => l.id !== payload.old.id));
          }
        }
      )
      .subscribe((status) => {
        console.log("[Realtime] Leads subscription status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [setLeads]);
}
