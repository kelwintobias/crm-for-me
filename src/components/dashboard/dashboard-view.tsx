"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Header } from "../layout/header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KPICards } from "./kpi-cards";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { LayoutDashboard, Columns3, Calendar as CalendarIcon, FileText, Wallet, BarChart3 } from "lucide-react";
import { PlainUser, PlainLead } from "@/types";
import { PlainContract } from "@/components/contracts/contracts-table";
import type { PlainFixedCost } from "@/app/actions/fixed-costs";
import { MonthSelector } from "./month-selector";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

const DailyStatsCards = dynamic(() => import("./daily-stats-cards").then(mod => ({ default: mod.DailyStatsCards })), {
  loading: () => <Skeleton className="h-24 w-full" />,
});

const AppointmentsChart = dynamic(() => import("./appointments-chart").then(mod => ({ default: mod.AppointmentsChart })), {
  loading: () => <ChartSkeleton />,
});

const WeeklyPerformanceChart = dynamic(() => import("./weekly-performance-chart").then(mod => ({ default: mod.WeeklyPerformanceChart })), {
  loading: () => <ChartSkeleton />,
});

// Novos gráficos baseados em contratos
const ContractRevenueChart = dynamic(() => import("./contract-revenue-chart").then(mod => ({ default: mod.ContractRevenueChart })), {
  loading: () => <ChartSkeleton className="col-span-4" />,
});

const PackageDistributionChart = dynamic(() => import("./package-distribution-chart").then(mod => ({ default: mod.PackageDistributionChart })), {
  loading: () => <ChartSkeleton className="col-span-3" />,
});

const AddonsAnalysisCard = dynamic(() => import("./addons-analysis-card").then(mod => ({ default: mod.AddonsAnalysisCard })), {
  loading: () => <ChartSkeleton className="col-span-4" />,
});

const ContractKPICards = dynamic(() => import("./contract-kpi-cards").then(mod => ({ default: mod.ContractKPICards })), {
  loading: () => <Skeleton className="h-40 w-full" />,
});

const ContractSourceChart = dynamic(() => import("./contract-source-chart").then(mod => ({ default: mod.ContractSourceChart })), {
  loading: () => <ChartSkeleton className="col-span-3" />,
});

const FinancialInsightsCard = dynamic(() => import("./financial-insights-card").then(mod => ({ default: mod.FinancialInsightsCard })), {
  loading: () => <ChartSkeleton className="col-span-4" />,
});

const ContractsCountChart = dynamic(() => import("./contracts-count-chart").then(mod => ({ default: mod.ContractsCountChart })), {
  loading: () => <ChartSkeleton className="col-span-4" />,
});

const ContractsTable = dynamic(() => import("../contracts/contracts-table").then(mod => ({ default: mod.ContractsTable })), {
  loading: () => <div className="flex items-center justify-center h-96"><Skeleton className="h-full w-full" /></div>,
});

const NewContractModal = dynamic(() => import("../modals/new-contract-modal").then(mod => ({ default: mod.NewContractModal })), {
  ssr: false,
});

const Footer = dynamic(() => import("../layout/footer").then(mod => ({ default: mod.Footer })), {
  ssr: false,
});

const FixedCostsTable = dynamic(() => import("../fixed-costs/fixed-costs-table").then(mod => ({ default: mod.FixedCostsTable })), {
  loading: () => <div className="flex items-center justify-center h-96"><Skeleton className="h-full w-full" /></div>,
});

const NewFixedCostModal = dynamic(() => import("../modals/new-fixed-cost-modal").then(mod => ({ default: mod.NewFixedCostModal })), {
  ssr: false,
});

interface ContractMetricsData {
  kpis: {
    totalRevenue: number;
    monthlyRevenue: number;
    prevMonthRevenue: number;
    revenueGrowth: number;
    totalContracts: number;
    monthlyContracts: number;
    prevMonthContracts: number;
    contractsGrowth: number;
    avgTicket: number;
    prevAvgTicket: number;
    todayRevenue: number;
    todayContracts: number;
  };
  charts: {
    revenueEvolution: Array<{ month: string; receita: number; contratos: number }>;
    packageDistribution: Array<{ name: string; value: number; revenue: number; package: string }>;
    sourceDistribution: Array<{ name: string; value: number; revenue: number; source: string }>;
    addonDistribution: Array<{ name: string; value: number; addon: string }>;
  };
  analysis: {
    addonPercentage: number;
    contractsWithAddons: number;
    packageRanking: Array<{ package: string; name: string; count: number; revenue: number; avgTicket: number }>;
    bestSource: { name: string; value: number; revenue: number } | null;
    bestPackage: { name: string; count: number; revenue: number } | null;
  };
}

interface PlainAppointmentData {
  id: string;
  scheduledAt: string;
  status: string;
  duration: number;
  canceledAt: string | null;
  createdAt: string;
}

interface DashboardViewProps {
  user: PlainUser;
  leads: PlainLead[];
  contracts: PlainContract[];
  fixedCosts: PlainFixedCost[];
  appointments: PlainAppointmentData[];
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
      appointmentsByStatus: Array<{ name: string; value: number; status: string; color: string }>;
      weeklyPerformance: Array<{ day: string; atendimentos: number }>;
    };
    metrics: {
      totalLeads: number;
      vendidos: number;
      taxaConversao: number;
      leadsEmContato: number;
      leadsPerdidos: number;
      leadsAguardando: number;
      taxaConclusao: number;
      taxaCancelamento: number;
      taxaNoShow: number;
    };
    dailyStats: {
      completedToday: number;
      scheduledToday: number;
      canceledToday: number;
      noShowToday: number;
    };
  };
  contractMetrics: ContractMetricsData;
}

export function DashboardView({ user, leads, contracts, fixedCosts, appointments, dashboardData: _dashboardData, contractMetrics }: DashboardViewProps) {
  const router = useRouter();
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<PlainLead | null>(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [isNewContractModalOpen, setIsNewContractModalOpen] = useState(false);
  const [isNewFixedCostModalOpen, setIsNewFixedCostModalOpen] = useState(false);

  // PERF FIX: Estado controlado da aba para desmontagem seletiva de componentes
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Estado para filtro de meses (Visao Geral e Dashboards)
  const [selectedMonthsOverview, setSelectedMonthsOverview] = useState<string[]>([]);
  const [selectedMonthsDashboards, setSelectedMonthsDashboards] = useState<string[]>([]);

  // PERF FIX: Memoizar flags para evitar renderização de componentes em abas inativas
  const shouldRenderCharts = useMemo(() => activeTab === "overview", [activeTab]);
  const shouldRenderKanban = useMemo(() => activeTab === "kanban", [activeTab]);
  const shouldRenderCalendar = useMemo(() => activeTab === "calendar", [activeTab]);
  const shouldRenderContracts = useMemo(() => activeTab === "contracts", [activeTab]);
  const shouldRenderFixedCosts = useMemo(() => activeTab === "fixed-costs", [activeTab]);
  const shouldRenderDashboards = useMemo(() => activeTab === "dashboards", [activeTab]);

  // Helper para verificar se uma data esta dentro dos meses selecionados
  const isDateInSelectedMonths = useCallback((date: Date | string, selectedMonths: string[]) => {
    if (selectedMonths.length === 0) return true; // Sem filtro = mostra tudo
    const dateObj = typeof date === "string" ? new Date(date) : date;
    const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}`;
    return selectedMonths.includes(monthKey);
  }, []);

  // Dados filtrados para Visao Geral (baseados em leads)
  const filteredLeadsData = useMemo(() => {
    if (selectedMonthsOverview.length === 0) return leads;
    return leads.filter(lead => isDateInSelectedMonths(lead.createdAt, selectedMonthsOverview));
  }, [leads, selectedMonthsOverview, isDateInSelectedMonths]);

  // Dados filtrados de contratos para Visao Geral (dados financeiros vem de Contratos)
  const filteredContractsOverview = useMemo(() => {
    if (selectedMonthsOverview.length === 0) return contracts;
    return contracts.filter(contract => isDateInSelectedMonths(contract.contractDate, selectedMonthsOverview));
  }, [contracts, selectedMonthsOverview, isDateInSelectedMonths]);

  // Dados filtrados de appointments para Visao Geral
  const filteredAppointmentsData = useMemo(() => {
    if (selectedMonthsOverview.length === 0) return appointments;
    return appointments.filter(apt => isDateInSelectedMonths(apt.scheduledAt, selectedMonthsOverview));
  }, [appointments, selectedMonthsOverview, isDateInSelectedMonths]);

  // Recalcula metricas do dashboard baseado nos CONTRATOS, leads e appointments filtrados
  const filteredDashboardData = useMemo(() => {
    // Usa contratos para dados financeiros, leads para pipeline/funil
    const filteredContracts = filteredContractsOverview;
    const filteredLeads = filteredLeadsData;
    const filteredApts = filteredAppointmentsData;

    // Labels para pacotes de contratos
    const PACKAGE_LABELS: Record<string, string> = {
      INTERMEDIARIO: "Intermediario",
      AVANCADO: "Avancado",
      ELITE: "Elite",
      PRO_PLUS: "Pro Plus",
      ULTRA_PRO: "Ultra Pro",
      EVOLUTION: "Evolution",
    };

    // Labels para origem de contratos
    const CONTRACT_SOURCE_LABELS: Record<string, string> = {
      ANUNCIO: "Anuncio",
      INDICACAO: "Indicacao",
      INFLUENCIADOR: "Influenciador",
      PARCEIRO: "Parceiro",
    };

    // Labels para origem de leads
    const LEAD_SOURCE_LABELS: Record<string, string> = {
      INSTAGRAM: "Instagram",
      INDICACAO: "Indicacao",
      PAGINA_PARCEIRA: "Pagina Parceira",
      INFLUENCER: "Influenciador",
      ANUNCIO: "Anuncio",
      OUTRO: "Outro",
    };

    const STAGE_LABELS: Record<string, string> = {
      NOVO_LEAD: "Novo Lead",
      EM_NEGOCIACAO: "Em Negociacao",
      AGENDADO: "Agendado",
      EM_ATENDIMENTO: "Em Atendimento",
      POS_VENDA: "Pos-Venda",
      FINALIZADO: "Finalizado",
    };

    // ============================================
    // KPIs FINANCEIROS (baseados em CONTRATOS)
    // ============================================
    const totalRevenue = filteredContracts.reduce((sum, c) => sum + c.totalValue, 0);
    const totalContractsCount = filteredContracts.length;
    const averageTicket = totalContractsCount > 0 ? totalRevenue / totalContractsCount : 0;

    // MRR = receita total dos contratos (pode ser ajustado conforme regra de negócio)
    const mrr = totalRevenue;

    // Pipeline = valor potencial dos leads em negociação
    // Usa o ticket médio dos contratos como estimativa de valor por lead
    const emPipeline = filteredLeads.filter(l => ["NOVO_LEAD", "EM_NEGOCIACAO", "AGENDADO"].includes(l.stage));
    const pipelineLeadsCount = emPipeline.length;
    // Se há contratos, usa o ticket médio como estimativa; senão, usa um valor padrão
    const estimatedTicket = averageTicket > 0 ? averageTicket : 75; // Valor padrão R$75 se não há contratos
    const pipeline = pipelineLeadsCount * estimatedTicket;

    // ============================================
    // DISTRIBUICAO DE VENDAS (baseada em CONTRATOS)
    // ============================================
    const packageMap = new Map<string, { count: number; revenue: number }>();
    filteredContracts.forEach(c => {
      const current = packageMap.get(c.package) || { count: 0, revenue: 0 };
      current.count++;
      current.revenue += c.totalValue;
      packageMap.set(c.package, current);
    });

    const distribution = Array.from(packageMap.entries()).map(([pkg, stats]) => ({
      name: PACKAGE_LABELS[pkg] || pkg,
      value: stats.count,
      revenue: stats.revenue,
    })).sort((a, b) => b.revenue - a.revenue);

    // ============================================
    // EVOLUCAO DE RECEITA (baseada em CONTRATOS)
    // ============================================
    const monthlyMap = new Map<string, { unico: number; mensal: number; total: number }>();
    const basicPlans = ["INTERMEDIARIO", "AVANCADO"];
    const premiumPlans = ["ELITE", "PRO_PLUS", "ULTRA_PRO", "EVOLUTION"];

    filteredContracts.forEach(c => {
      const date = new Date(c.contractDate);
      const monthKey = format(date, "MMM", { locale: ptBR }).toUpperCase();
      const current = monthlyMap.get(monthKey) || { unico: 0, mensal: 0, total: 0 };

      if (basicPlans.includes(c.package)) {
        current.unico += c.totalValue;
      } else if (premiumPlans.includes(c.package)) {
        current.mensal += c.totalValue;
      }
      current.total += c.totalValue;
      monthlyMap.set(monthKey, current);
    });

    const revenueEvolution = Array.from(monthlyMap.entries()).map(([name, data]) => ({
      name,
      ...data,
    }));

    // ============================================
    // LEADS POR ORIGEM (baseado em CONTRATOS - origem das vendas)
    // ============================================
    const sourceMap = new Map<string, number>();
    filteredContracts.forEach(c => {
      sourceMap.set(c.source, (sourceMap.get(c.source) || 0) + 1);
    });

    const sourceDistribution = Array.from(sourceMap.entries()).map(([source, count]) => ({
      name: CONTRACT_SOURCE_LABELS[source] || LEAD_SOURCE_LABELS[source] || source,
      value: count,
      source,
    })).sort((a, b) => b.value - a.value);

    // ============================================
    // FUNIL DE CONVERSAO (baseado em LEADS)
    // ============================================
    const stageOrder = ["NOVO_LEAD", "EM_NEGOCIACAO", "AGENDADO", "EM_ATENDIMENTO", "POS_VENDA", "FINALIZADO"];
    const stageMap = new Map<string, number>();
    filteredLeads.forEach(l => {
      stageMap.set(l.stage, (stageMap.get(l.stage) || 0) + 1);
    });

    const funnel = stageOrder.map(stage => ({
      stage,
      name: STAGE_LABELS[stage] || stage,
      value: stageMap.get(stage) || 0,
    }));

    // Metricas gerais de leads
    const totalLeads = filteredLeads.length;
    const vendidosLeads = filteredLeads.filter(l => l.stage === "POS_VENDA" || l.stage === "FINALIZADO").length;
    const taxaConversao = totalLeads > 0 ? Math.round((vendidosLeads / totalLeads) * 100) : 0;
    const leadsEmContato = filteredLeads.filter(l => l.stage === "EM_NEGOCIACAO").length;

    // ============================================
    // METRICAS DE AGENDAMENTOS (filtradas)
    // ============================================
    const STATUS_LABELS: Record<string, string> = {
      SCHEDULED: "Agendado",
      COMPLETED: "Concluido",
      CANCELED: "Cancelado",
      NO_SHOW: "No-Show",
    };
    const STATUS_COLORS: Record<string, string> = {
      SCHEDULED: "#3B82F6",
      COMPLETED: "#10B981",
      CANCELED: "#EF4444",
      NO_SHOW: "#F59E0B",
    };

    // Distribuicao por status de agendamento
    const aptStatusMap = new Map<string, number>();
    filteredApts.forEach(apt => {
      aptStatusMap.set(apt.status, (aptStatusMap.get(apt.status) || 0) + 1);
    });

    const appointmentsByStatus = Array.from(aptStatusMap.entries()).map(([status, count]) => ({
      name: STATUS_LABELS[status] || status,
      value: count,
      status,
      color: STATUS_COLORS[status] || "#6B7280",
    }));

    // Performance semanal (atendimentos por dia da semana)
    const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
    const dayOfWeekCounts = [0, 0, 0, 0, 0, 0, 0];

    filteredApts
      .filter(apt => apt.status === "COMPLETED")
      .forEach(apt => {
        const date = new Date(apt.scheduledAt);
        const dayIndex = date.getDay();
        dayOfWeekCounts[dayIndex]++;
      });

    const weeklyPerformance = DAY_LABELS.map((day, index) => ({
      day,
      atendimentos: dayOfWeekCounts[index],
    }));

    // Taxas de agendamentos
    const totalApts = filteredApts.length;
    const completedApts = filteredApts.filter(a => a.status === "COMPLETED").length;
    const canceledApts = filteredApts.filter(a => a.status === "CANCELED").length;
    const noShowApts = filteredApts.filter(a => a.status === "NO_SHOW").length;

    const taxaConclusao = totalApts > 0 ? Math.round((completedApts / totalApts) * 100) : 0;
    const taxaCancelamento = totalApts > 0 ? Math.round((canceledApts / totalApts) * 100) : 0;
    const taxaNoShow = totalApts > 0 ? Math.round((noShowApts / totalApts) * 100) : 0;

    // Daily stats
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    const aptsToday = filteredApts.filter(apt => {
      const aptDate = apt.scheduledAt.split("T")[0];
      return aptDate === todayStr;
    });

    const completedToday = aptsToday.filter(a => a.status === "COMPLETED").length;
    const scheduledToday = aptsToday.filter(a => a.status === "SCHEDULED").length;
    const canceledToday = aptsToday.filter(a => a.status === "CANCELED").length;
    const noShowToday = aptsToday.filter(a => a.status === "NO_SHOW").length;

    return {
      kpis: {
        totalRevenue,
        totalRevenuePrev: 0,
        mrr,
        mrrPrev: 0,
        pipeline,
        pipelinePrev: 0,
        averageTicket,
        averageTicketPrev: 0,
      },
      charts: {
        distribution,
        revenueEvolution,
        sourceDistribution,
        funnel,
        appointmentsByStatus,
        weeklyPerformance,
      },
      metrics: {
        totalLeads,
        vendidos: totalContractsCount, // Vendidos = total de contratos
        taxaConversao,
        leadsEmContato,
        leadsPerdidos: 0,
        leadsAguardando: filteredLeads.filter(l => l.stage === "EM_NEGOCIACAO").length,
        taxaConclusao,
        taxaCancelamento,
        taxaNoShow,
      },
      dailyStats: {
        completedToday,
        scheduledToday,
        canceledToday,
        noShowToday,
      },
    };
  }, [filteredContractsOverview, filteredLeadsData, filteredAppointmentsData]);

  // Dados filtrados para Dashboards (baseados em contratos)
  const filteredContractsData = useMemo(() => {
    if (selectedMonthsDashboards.length === 0) return contracts;
    return contracts.filter(contract => isDateInSelectedMonths(contract.contractDate, selectedMonthsDashboards));
  }, [contracts, selectedMonthsDashboards, isDateInSelectedMonths]);

  // Recalcula metricas de contratos baseado no filtro
  const filteredContractMetrics = useMemo(() => {
    if (selectedMonthsDashboards.length === 0) return contractMetrics;

    const filtered = filteredContractsData;
    const totalRevenue = filtered.reduce((sum, c) => sum + c.totalValue, 0);
    const totalContracts = filtered.length;
    const avgTicket = totalContracts > 0 ? totalRevenue / totalContracts : 0;

    // Distribuicao por pacote
    const packageMap = new Map<string, { count: number; revenue: number }>();
    filtered.forEach(c => {
      const pkg = c.package;
      const current = packageMap.get(pkg) || { count: 0, revenue: 0 };
      current.count++;
      current.revenue += c.totalValue;
      packageMap.set(pkg, current);
    });

    const PACKAGE_LABELS: Record<string, string> = {
      INTERMEDIARIO: "Intermediario",
      AVANCADO: "Avancado",
      ELITE: "Elite",
      PRO_PLUS: "Pro Plus",
      ULTRA_PRO: "Ultra Pro",
      EVOLUTION: "Evolution",
    };

    const packageDistribution = Array.from(packageMap.entries()).map(([pkg, stats]) => ({
      name: PACKAGE_LABELS[pkg] || pkg,
      value: stats.count,
      revenue: stats.revenue,
      package: pkg,
    })).sort((a, b) => b.revenue - a.revenue);

    // Distribuicao por origem
    const sourceMap = new Map<string, { count: number; revenue: number }>();
    filtered.forEach(c => {
      const src = c.source;
      const current = sourceMap.get(src) || { count: 0, revenue: 0 };
      current.count++;
      current.revenue += c.totalValue;
      sourceMap.set(src, current);
    });

    const SOURCE_LABELS: Record<string, string> = {
      ANUNCIO: "Anuncio",
      INDICACAO: "Indicacao",
      INFLUENCIADOR: "Influenciador",
      PARCEIRO: "Parceiro",
    };

    const sourceDistribution = Array.from(sourceMap.entries()).map(([src, stats]) => ({
      name: SOURCE_LABELS[src] || src,
      value: stats.count,
      revenue: stats.revenue,
      source: src,
    })).sort((a, b) => b.value - a.value);

    // Evolucao por mes
    const monthlyMap = new Map<string, { receita: number; contratos: number }>();
    filtered.forEach(c => {
      const date = new Date(c.contractDate);
      const monthKey = format(date, "MMM/yy", { locale: ptBR });
      const current = monthlyMap.get(monthKey) || { receita: 0, contratos: 0 };
      current.receita += c.totalValue;
      current.contratos++;
      monthlyMap.set(monthKey, current);
    });

    const revenueEvolution = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => {
        const dateA = new Date(a.month.replace("/", " 20"));
        const dateB = new Date(b.month.replace("/", " 20"));
        return dateA.getTime() - dateB.getTime();
      });

    // Analise de adicionais
    const addonMap = new Map<string, number>();
    let contractsWithAddons = 0;
    filtered.forEach(c => {
      if (c.addons && c.addons.length > 0) {
        contractsWithAddons++;
        c.addons.forEach(addon => {
          addonMap.set(addon, (addonMap.get(addon) || 0) + 1);
        });
      }
    });

    const ADDON_LABELS: Record<string, string> = {
      ADICIONAL_FOTOS: "Fotos Extras",
      VIDEO_DRONE: "Video Drone",
      ALBUM_DIGITAL: "Album Digital",
      EDICAO_PREMIUM: "Edicao Premium",
    };

    const addonDistribution = Array.from(addonMap.entries())
      .map(([addon, count]) => ({
        name: ADDON_LABELS[addon] || addon,
        value: count,
        addon,
      }))
      .sort((a, b) => b.value - a.value);

    const addonPercentage = totalContracts > 0
      ? Math.round((contractsWithAddons / totalContracts) * 100)
      : 0;

    return {
      kpis: {
        ...contractMetrics.kpis,
        totalRevenue,
        totalContracts,
        avgTicket,
        monthlyRevenue: totalRevenue,
        monthlyContracts: totalContracts,
      },
      charts: {
        revenueEvolution,
        packageDistribution,
        sourceDistribution,
        addonDistribution,
      },
      analysis: {
        addonPercentage,
        contractsWithAddons,
        packageRanking: packageDistribution.map(p => ({
          package: p.package,
          name: p.name,
          count: p.value,
          revenue: p.revenue,
          avgTicket: p.value > 0 ? p.revenue / p.value : 0,
        })),
        bestSource: sourceDistribution[0] || null,
        bestPackage: packageDistribution[0] ? {
          name: packageDistribution[0].name,
          count: packageDistribution[0].value,
          revenue: packageDistribution[0].revenue,
        } : null,
      },
    };
  }, [contractMetrics, filteredContractsData, selectedMonthsDashboards]);

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
          <TabsList className="grid w-full max-w-[1200px] grid-cols-6">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="dashboards" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboards
            </TabsTrigger>
            <TabsTrigger value="kanban" className="flex items-center gap-2">
              <Columns3 className="h-4 w-4" />
              Kanban
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Calendário
            </TabsTrigger>
            <TabsTrigger value="contracts" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Contratos
            </TabsTrigger>
            <TabsTrigger value="fixed-costs" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Custos Fixos
            </TabsTrigger>
          </TabsList>

          {/* PERF FIX: Renderização condicional - componentes são DESMONTADOS quando não visíveis */}
          <TabsContent value="overview" className="space-y-4">
            {shouldRenderCharts && (
              <>
                {/* Filtro de Meses */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Filtrar por periodo:</span>
                    <MonthSelector
                      selectedMonths={selectedMonthsOverview}
                      onSelectionChange={setSelectedMonthsOverview}
                    />
                  </div>
                  {selectedMonthsOverview.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {filteredLeadsData.length} lead(s) no periodo selecionado
                    </span>
                  )}
                </div>

                {/* KPI Cards */}
                <KPICards metrics={filteredDashboardData.kpis} />

                {/* Metricas do Dia */}
                <DailyStatsCards data={filteredDashboardData.dailyStats} />

                {/* Charts Grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                  <RevenueChart data={filteredDashboardData.charts.revenueEvolution} />
                  <SalesDistributionChart data={filteredDashboardData.charts.distribution} />
                </div>

                {/* Performance de Agendamentos */}
                <div className="grid gap-4 md:grid-cols-2">
                  <AppointmentsChart data={filteredDashboardData.charts.appointmentsByStatus} />
                  <WeeklyPerformanceChart data={filteredDashboardData.charts.weeklyPerformance} />
                </div>

                {/* Funil e Insights */}
                <div className="grid gap-4 lg:grid-cols-7">
                  <ConversionFunnel
                    data={filteredDashboardData.charts.funnel}
                    taxaConversao={filteredDashboardData.metrics.taxaConversao}
                  />
                  <InsightsCard
                    kpis={filteredDashboardData.kpis}
                    metrics={filteredDashboardData.metrics}
                    sourceDistribution={filteredDashboardData.charts.sourceDistribution}
                  />
                </div>

                {/* Leads por Origem */}
                <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
                  <SourceDistributionChart data={filteredDashboardData.charts.sourceDistribution} />
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="dashboards" className="space-y-4">
            {shouldRenderDashboards && (
              <>
                {/* Filtro de Meses */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Filtrar por periodo:</span>
                    <MonthSelector
                      selectedMonths={selectedMonthsDashboards}
                      onSelectionChange={setSelectedMonthsDashboards}
                    />
                  </div>
                  {selectedMonthsDashboards.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {filteredContractsData.length} contrato(s) no periodo selecionado
                    </span>
                  )}
                </div>

                {/* KPIs de Contratos */}
                <ContractKPICards metrics={filteredContractMetrics.kpis} />

                {/* Gráficos principais */}
                <div className="grid gap-4 lg:grid-cols-7">
                  <ContractRevenueChart
                    data={filteredContractMetrics.charts.revenueEvolution}
                    growth={filteredContractMetrics.kpis.revenueGrowth}
                  />
                  <PackageDistributionChart data={filteredContractMetrics.charts.packageDistribution} />
                </div>

                {/* Análise de Adicionais e Origem */}
                <div className="grid gap-4 lg:grid-cols-7">
                  <AddonsAnalysisCard
                    data={filteredContractMetrics.charts.addonDistribution}
                    addonPercentage={filteredContractMetrics.analysis.addonPercentage}
                    contractsWithAddons={filteredContractMetrics.analysis.contractsWithAddons}
                    totalContracts={filteredContractMetrics.kpis.totalContracts}
                  />
                  <ContractSourceChart data={filteredContractMetrics.charts.sourceDistribution} />
                </div>

                {/* Gráfico de Contratos Realizados */}
                <div className="grid gap-4 lg:grid-cols-7">
                  <ContractsCountChart data={filteredContractMetrics.charts.revenueEvolution} />
                  <FinancialInsightsCard
                    kpis={filteredContractMetrics.kpis}
                    analysis={filteredContractMetrics.analysis}
                  />
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

          <TabsContent value="contracts" className="space-y-4">
            {shouldRenderContracts && (
              <ContractsTable
                contracts={contracts}
                onNewContract={() => setIsNewContractModalOpen(true)}
              />
            )}
          </TabsContent>

          <TabsContent value="fixed-costs" className="space-y-4">
            {shouldRenderFixedCosts && (
              <FixedCostsTable
                costs={fixedCosts}
                onNewCost={() => setIsNewFixedCostModalOpen(true)}
              />
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Modal de Novo Contrato */}
      <NewContractModal
        open={isNewContractModalOpen}
        onOpenChange={setIsNewContractModalOpen}
      />

      {/* Modal de Novo Custo Fixo */}
      <NewFixedCostModal
        open={isNewFixedCostModalOpen}
        onOpenChange={setIsNewFixedCostModalOpen}
      />

      <Footer />
    </div>
  );
}
