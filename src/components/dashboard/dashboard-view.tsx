"use client";

import { Header } from "../layout/header";
import { KanbanBoard } from "../kanban/kanban-board";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KPICards } from "./kpi-cards";
import { RevenueChart } from "./revenue-chart";
import { SalesDistributionChart } from "./sales-distribution-chart";
import { SourceDistributionChart } from "./source-distribution-chart";
import { LayoutDashboard, Columns3 } from "lucide-react";
import { PlainUser, PlainLead } from "@/types";

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
    };
  };
}

export function DashboardView({ user, leads, dashboardData }: DashboardViewProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header user={user} />
      <main className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-muted-foreground">
              Visao geral do seu pipeline de vendas
            </p>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full max-w-[400px] grid-cols-2">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Visao Geral
            </TabsTrigger>
            <TabsTrigger value="kanban" className="flex items-center gap-2">
              <Columns3 className="h-4 w-4" />
              Kanban
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* KPI Cards */}
            <KPICards metrics={dashboardData.kpis} />

            {/* Charts Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <RevenueChart data={dashboardData.charts.revenueEvolution} />
              <SalesDistributionChart data={dashboardData.charts.distribution} />
            </div>

            {/* Leads por Origem */}
            <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
              <SourceDistributionChart data={dashboardData.charts.sourceDistribution} />
            </div>
          </TabsContent>

          <TabsContent value="kanban" className="space-y-4">
            <KanbanBoard initialLeads={leads} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
