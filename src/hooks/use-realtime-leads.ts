"use client";

import { useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { PlainLead } from "@/types";

const CHANNEL_NAME = "crm-webhook-signals";
const DEBOUNCE_MS = 300;
const POLL_INTERVAL_MS = 15000; // 15 segundos

type SetLeads = React.Dispatch<React.SetStateAction<PlainLead[]>>;

export function useRealtimeLeads(setLeads: SetLeads, onRefresh?: () => void) {
  const supabaseRef = useRef(createClient());
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedRefresh = useCallback(() => {
    if (!onRefresh) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      console.log("[Realtime] Broadcast: refreshing leads");
      onRefresh();
    }, DEBOUNCE_MS);
  }, [onRefresh]);

  useEffect(() => {
    if (!onRefresh) return;

    const supabase = supabaseRef.current;

    // Broadcast subscription - recebe sinais dos webhooks
    const channel = supabase
      .channel(CHANNEL_NAME)
      .on("broadcast", { event: "db-change" }, (message) => {
        const { table } = message.payload || {};
        if (table === "leads") {
          console.log("[Realtime] Broadcast: lead change detected");
          debouncedRefresh();
        }
      })
      .subscribe((status) => {
        console.log("[Realtime] Broadcast subscription status:", status);
      });

    // Polling fallback (15s)
    const pollInterval = setInterval(() => {
      onRefresh();
    }, POLL_INTERVAL_MS);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [onRefresh, debouncedRefresh]);
}
