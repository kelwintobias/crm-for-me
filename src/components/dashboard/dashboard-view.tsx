"use client";

import { useState } from "react";
import type { Lead } from "@prisma/client";
import type { User } from "@supabase/supabase-js";
import type { DashboardMetrics } from "@/types";
import { Header } from "@/components/layout/header";
import { MetricsHeader } from "./metrics-header";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { NewLeadModal } from "@/components/modals/new-lead-modal";
import { useRouter } from "next/navigation";

interface DashboardViewProps {
  user: User;
  leads: Lead[];
  metrics: DashboardMetrics;
}

export function DashboardView({ user, leads, metrics }: DashboardViewProps) {
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const router = useRouter();

  const handleNewLeadSuccess = () => {
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-brand-bg">
      <Header user={user} onNewLead={() => setIsNewLeadModalOpen(true)} />

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Métricas */}
        <MetricsHeader metrics={metrics} />

        {/* Kanban */}
        <div className="overflow-x-auto">
          <KanbanBoard initialLeads={leads} />
        </div>
      </main>

      {/* Modal Novo Lead */}
      <NewLeadModal
        open={isNewLeadModalOpen}
        onOpenChange={setIsNewLeadModalOpen}
        onSuccess={handleNewLeadSuccess}
      />
    </div>
  );
}
