"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export function useRealtimeAppointments(onRefresh: () => void) {
  const supabaseRef = useRef(createClient());
  const lastRefreshRef = useRef<number>(Date.now());

  useEffect(() => {
    const supabase = supabaseRef.current;

    // Realtime subscription
    const channel = supabase
      .channel("appointments-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        (payload) => {
          console.log("[Realtime] Appointment change detected:", payload.eventType);
          lastRefreshRef.current = Date.now();
          onRefresh();
        }
      )
      .subscribe((status) => {
        console.log("[Realtime] Appointments subscription status:", status);
      });

    // Fallback: polling a cada 30 segundos caso Realtime não esteja funcionando
    const pollInterval = setInterval(() => {
      const timeSinceLastRefresh = Date.now() - lastRefreshRef.current;
      if (timeSinceLastRefresh > 30000) {
        console.log("[Polling] Refreshing appointments...");
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
