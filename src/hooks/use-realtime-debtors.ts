"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export function useRealtimeDebtors(onRefresh: () => void) {
  const supabaseRef = useRef(createClient());

  useEffect(() => {
    const supabase = supabaseRef.current;

    const channel = supabase
      .channel("debtors-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "debtors" },
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
