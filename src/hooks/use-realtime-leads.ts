"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { PlainLead } from "@/types";

type SetLeads = React.Dispatch<React.SetStateAction<PlainLead[]>>;

export function useRealtimeLeads(setLeads: SetLeads, onRefresh?: () => void) {
  const supabaseRef = useRef(createClient());
  const lastRefreshRef = useRef<number>(Date.now());

  useEffect(() => {
    const supabase = supabaseRef.current;

    // Realtime subscription
    const channel = supabase
      .channel("leads-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads" },
        (payload) => {
          console.log("[Realtime] Lead change detected:", payload.eventType);
          lastRefreshRef.current = Date.now();

          if (payload.eventType === "INSERT") {
            const newLead = payload.new as PlainLead;
            // Só adiciona se não for soft deleted
            if (!newLead.deletedAt) {
              setLeads((prev) => [newLead, ...prev]);
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

    // Fallback: polling a cada 30 segundos caso Realtime não esteja funcionando
    const pollInterval = setInterval(() => {
      const timeSinceLastRefresh = Date.now() - lastRefreshRef.current;
      // Se não houve refresh nos últimos 30 segundos e temos callback, faz polling
      if (timeSinceLastRefresh > 30000 && onRefresh) {
        console.log("[Polling] Refreshing leads...");
        lastRefreshRef.current = Date.now();
        onRefresh();
      }
    }, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [setLeads, onRefresh]);
}
