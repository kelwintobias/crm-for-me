"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { PlainLead } from "@/types";

type SetLeads = React.Dispatch<React.SetStateAction<PlainLead[]>>;

export function useRealtimeLeads(setLeads: SetLeads) {
  const supabaseRef = useRef(createClient());

  useEffect(() => {
    const supabase = supabaseRef.current;

    const channel = supabase
      .channel("leads-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads" },
        (payload) => {
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [setLeads]);
}
