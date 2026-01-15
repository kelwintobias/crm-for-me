"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Header } from "../layout/header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KPICards } from "./kpi-cards";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { LayoutDashboard, Columns3, Calendar as CalendarIcon } from "lucide-react";
import { PlainUser, PlainLead } from "@/types";

// Skeleton para loading de charts
function ChartSkeleton({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[300px] w-full" />
      </CardContent>
    </Card>
  );
}

// Lazy loading de componentes pesados para reduzir bundle inicial
const KanbanBoard = dynamic(() => import("../kanban/kanban-board").then(mod => ({ default: mod.KanbanBoard })), {
  loading: () => <div className="flex items-center justify-center h-96"><Skeleton className="h-full w-full" /></div>,
});

const NewLeadModal = dynamic(() => import("../modals/new-lead-modal").then(mod => ({ default: mod.NewLeadModal })), {
  ssr: false,
});

const EditLeadModal = dynamic(() => import("../modals/edit-lead-modal").then(mod => ({ default: mod.EditLeadModal })), {
  ssr: false,
});

const SearchDialog = dynamic(() => import("../layout/search-dialog").then(mod => ({ default: mod.SearchDialog })), {
  ssr: false,
});

const ScheduleLeadModal = dynamic(() => import("../modals/schedule-lead-modal").then(mod => ({ default: mod.ScheduleLeadModal })), {
  ssr: false,
});

const WeeklyCalendar = dynamic(() => import("../calendar/weekly-calendar").then(mod => ({ default: mod.WeeklyCalendar })), {
  loading: () => <div className="flex items-center justify-center h-96"><Skeleton className="h-full w-full" /></div>,
});

const AppointmentDetailModal = dynamic(() => import("../modals/appointment-detail-modal").then(mod => ({ default: mod.AppointmentDetailModal })), {
  ssr: false,
});

// Charts com lazy loading
const RevenueChart = dynamic(() => import("./revenue-chart").then(mod => ({ default: mod.RevenueChart })), {
  loading: () => <ChartSkeleton className="col-span-4" />,
});

const SalesDistributionChart = dynamic(() => import("./sales-distribution-chart").then(mod => ({ default: mod.SalesDistributionChart })), {
  loading: () => <ChartSkeleton className="col-span-3" />,
});

const SourceDistributionChart = dynamic(() => import("./source-distribution-chart").then(mod => ({ default: mod.SourceDistributionChart })), {
  loading: () => <ChartSkeleton />,
});

const ConversionFunnel = dynamic(() => import("./conversion-funnel").then(mod => ({ default: mod.ConversionFunnel })), {
  loading: () => <ChartSkeleton className="col-span-3" />,
});

const InsightsCard = dynamic(() => import("./insights-card").then(mod => ({ default: mod.InsightsCard })), {
  loading: () => <ChartSkeleton className="col-span-4" />,
});

interface DashboardViewProps {
  user: PlainUser;
  leads: PlainLead[];
  dashboardData: {
    kpis: {
      totalRevenue: number;
      totalRevenuePrev: number;
      mrr: number;
      mrrPrev: number;
      pipeline: number;
      pipelinePrev: number;
      averageTicket: number;
      averageTicketPrev: number;
    };
    charts: {
      distribution: Array<{ name: string; value: number }>;
      revenueEvolution: Array<{ name: string; unico: number; mensal: number }>;
      sourceDistribution: Array<{ name: string; value: number; source: string }>;
      funnel: Array<{ stage: string; name: string; value: number }>;
    };
    metrics: {
      totalLeads: number;
      vendidos: number;
      taxaConversao: number;
      leadsEmContato: number;
      leadsPerdidos: number;
    };
  };
}

export function DashboardView({ user, leads, dashboardData }: DashboardViewProps) {
  const router = useRouter();
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<PlainLead | null>(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);

  // PERF FIX: Estado controlado da aba para desmontagem seletiva de componentes
  const [activeTab, setActiveTab] = useState<string>("overview");

  // PERF FIX: Memoizar flags para evitar renderização de componentes em abas inativas
  const shouldRenderCharts = useMemo(() => activeTab === "overview", [activeTab]);
  const shouldRenderKanban = useMemo(() => activeTab === "kanban", [activeTab]);
  const shouldRenderCalendar = useMemo(() => activeTab === "calendar", [activeTab]);

  const handleSelectLead = useCallback((lead: PlainLead) => {
    setSelectedLead(lead);
  }, []);

  const handleUpdateLead = useCallback((_updatedLead: PlainLead) => {
    setSelectedLead(null);
    // Usa router.refresh() que é muito mais eficiente que window.location.reload()
    // Atualiza apenas os dados do servidor sem recarregar a página inteira
    router.refresh();
  }, [router]);

  const handleDeleteLead = useCallback(() => {
    setSelectedLead(null);
    router.refresh();
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header
        user={user}
        onNewLead={() => setIsNewLeadModalOpen(true)}
        onSearchClick={() => setIsSearchOpen(true)}
        onScheduleClick={() => setIsScheduleModalOpen(true)}
      />

      {/* Modal de Novo Lead */}
      <NewLeadModal
        open={isNewLeadModalOpen}
        onOpenChange={setIsNewLeadModalOpen}
      />

      {/* Dialog de Busca */}
      <SearchDialog
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
        leads={leads}
        onSelectLead={handleSelectLead}
      />

      {/* Modal de Edição (quando selecionado pela busca) */}
      <EditLeadModal
        lead={selectedLead}
        open={selectedLead !== null}
        onOpenChange={(open) => !open && setSelectedLead(null)}
        onUpdate={handleUpdateLead}
        onDelete={handleDeleteLead}
      />

      {/* Modal de Agendamento */}
      <ScheduleLeadModal
        open={isScheduleModalOpen}
        onOpenChange={setIsScheduleModalOpen}
      />

      {/* Modal de Detalhes do Agendamento */}
      <AppointmentDetailModal
        appointmentId={selectedAppointmentId}
        open={selectedAppointmentId !== null}
        onOpenChange={(open) => !open && setSelectedAppointmentId(null)}
        onUpdate={() => router.refresh()}
      />
      <main className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-muted-foreground">
              Visao geral do seu pipeline de vendas
            </p>
          </div>
        </div>

        {/* PERF FIX: Tabs controladas para desmontagem seletiva */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full max-w-[600px] grid-cols-3">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Visao Geral
            </TabsTrigger>
            <TabsTrigger value="kanban" className="flex items-center gap-2">
              <Columns3 className="h-4 w-4" />
              Kanban
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Calendário
            </TabsTrigger>
          </TabsList>

          {/* PERF FIX: Renderização condicional - componentes são DESMONTADOS quando não visíveis */}
          <TabsContent value="overview" className="space-y-4">
            {shouldRenderCharts && (
              <>
                {/* KPI Cards */}
                <KPICards metrics={dashboardData.kpis} />

                {/* Charts Grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                  <RevenueChart data={dashboardData.charts.revenueEvolution} />
                  <SalesDistributionChart data={dashboardData.charts.distribution} />
                </div>

                {/* Funil e Insights */}
                <div className="grid gap-4 lg:grid-cols-7">
                  <ConversionFunnel
                    data={dashboardData.charts.funnel}
                    taxaConversao={dashboardData.metrics.taxaConversao}
                  />
                  <InsightsCard
                    kpis={dashboardData.kpis}
                    metrics={dashboardData.metrics}
                    sourceDistribution={dashboardData.charts.sourceDistribution}
                  />
                </div>

                {/* Leads por Origem */}
                <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
                  <SourceDistributionChart data={dashboardData.charts.sourceDistribution} />
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="kanban" className="space-y-4">
            {shouldRenderKanban && <KanbanBoard initialLeads={leads} />}
          </TabsContent>

          <TabsContent value="calendar" className="space-y-4">
            {shouldRenderCalendar && (
              <WeeklyCalendar onAppointmentClick={(id) => setSelectedAppointmentId(id)} />
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
