"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export function useRealtimeFixedCosts(onRefresh: () => void) {
  const supabaseRef = useRef(createClient());
  const lastRefreshRef = useRef<number>(Date.now());

  useEffect(() => {
    const supabase = supabaseRef.current;

    // Realtime subscription
    const channel = supabase
      .channel("fixed-costs-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fixed_costs" },
        (payload) => {
          console.log("[Realtime] Fixed cost change detected:", payload.eventType);
          lastRefreshRef.current = Date.now();
          onRefresh();
        }
      )
      .subscribe((status) => {
        console.log("[Realtime] Fixed costs subscription status:", status);
      });

    // Fallback: polling a cada 30 segundos caso Realtime não esteja funcionando
    const pollInterval = setInterval(() => {
      const timeSinceLastRefresh = Date.now() - lastRefreshRef.current;
      if (timeSinceLastRefresh > 30000) {
        console.log("[Polling] Refreshing fixed costs...");
        lastRefreshRef.current = Date.now();
        onRefresh();
      }
    }, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [onRefresh]);
}
