"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export function useRealtimeAppointments(onRefresh: () => void) {
  const supabaseRef = useRef(createClient());

  useEffect(() => {
    const supabase = supabaseRef.current;

    const channel = supabase
      .channel("appointments-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        () => {
          // Recarrega dados quando qualquer mudança acontece
          onRefresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onRefresh]);
}
