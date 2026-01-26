"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export function useRealtimeFixedCosts(onRefresh: () => void) {
  const supabaseRef = useRef(createClient());

  useEffect(() => {
    const supabase = supabaseRef.current;

    const channel = supabase
      .channel("fixed-costs-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fixed_costs" },
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
