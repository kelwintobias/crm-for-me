"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { PlainLead } from "@/types";

type SetLeads = React.Dispatch<React.SetStateAction<PlainLead[]>>;

export function useRealtimeLeads(setLeads: SetLeads) {
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("kanban-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setLeads((prev) => [payload.new as PlainLead, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setLeads((prev) =>
              prev.map((l) =>
                l.id === payload.new.id ? { ...l, ...payload.new } : l
              )
            );
          } else if (payload.eventType === "DELETE") {
            setLeads((prev) => prev.filter((l) => l.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [setLeads]);
}
