"use client";

import { useState, useCallback, useMemo, useReducer, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { LayoutDashboard, Columns3, Calendar as CalendarIcon, FileText, Wallet, BarChart3, Menu, User, Plus, ChevronLeft, ChevronRight, ScrollText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Header } from "../layout/header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PlainUser, PlainLead } from "@/types";
import { PlainContract } from "@/components/contracts/contracts-table";
import type { PlainFixedCost } from "@/app/actions/fixed-costs";
import { MonthSelector } from "./month-selector";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CustomerDetailModal } from "@/components/pessoas/customer-detail-modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Debtor } from "../debtors/debtors-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatPhone } from "@/lib/utils";

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

// Tab Components
import { OverviewTab } from "./overview-tab";
import { FinancialTab } from "./financial-tab";
import { SellerDashboard } from "./seller-dashboard";
import { AdminOverview } from "./admin-overview";

const ContractsCountChart = dynamic(() => import("./contracts-count-chart").then(mod => ({ default: mod.ContractsCountChart })), {
  loading: () => <ChartSkeleton className="col-span-4" />,
  ssr: false, // PERF: Evita renderização no servidor
});

const ContractsTable = dynamic(() => import("../contracts/contracts-table").then(mod => ({ default: mod.ContractsTable })), {
  loading: () => <div className="flex items-center justify-center h-96"><Skeleton className="h-full w-full" /></div>,
  ssr: false, // PERF: Evita renderização no servidor
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

const DebtorsTable = dynamic(() => import("../debtors/debtors-table").then(mod => ({ default: mod.DebtorsTable })), {
  loading: () => <div className="flex items-center justify-center h-96"><Skeleton className="h-full w-full" /></div>,
});

const NewDebtorModal = dynamic(() => import("../modals/new-debtor-modal").then(mod => ({ default: mod.NewDebtorModal })), {
  ssr: false,
});

const WebhookLogsView = dynamic(() => import("../webhook-logs/webhook-logs-view").then(mod => ({ default: mod.WebhookLogsView })), {
  loading: () => <div className="flex items-center justify-center h-96"><Skeleton className="h-full w-full" /></div>,
});

export interface ContractMetricsData {
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

export interface PlainAppointmentData {
  id: string;
  scheduledAt: string;
  status: string;
  duration: number;
  canceledAt: string | null;
  createdAt: string;
  userId?: string; // Para filtrar por vendedor
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
  pessoasData: import("@/app/actions/pessoas").PessoaData[];
  debtors: Debtor[];
}

// PERF: Reducer para consolidar estados de modais (reduz re-renders de 8+ para 1)
type ModalState = {
  newLead: boolean;
  search: boolean;
  schedule: boolean;
  newContract: boolean;
  newFixedCost: boolean;
  newDebtor: boolean;
  customerDetail: boolean;
  selectedLead: PlainLead | null;
  selectedAppointmentId: string | null;
  selectedCustomer: import("@/app/actions/pessoas").PessoaData | null;
};

type ModalAction =
  | { type: 'OPEN_MODAL'; modal: keyof Omit<ModalState, 'selectedLead' | 'selectedAppointmentId' | 'selectedCustomer'> }
  | { type: 'CLOSE_MODAL'; modal: keyof Omit<ModalState, 'selectedLead' | 'selectedAppointmentId' | 'selectedCustomer'> }
  | { type: 'SET_SELECTED_LEAD'; lead: PlainLead | null }
  | { type: 'SET_SELECTED_APPOINTMENT'; id: string | null }
  | { type: 'SET_SELECTED_CUSTOMER'; customer: import("@/app/actions/pessoas").PessoaData | null }
  | { type: 'CLOSE_ALL' };

const modalInitialState: ModalState = {
  newLead: false,
  search: false,
  schedule: false,
  newContract: false,
  newFixedCost: false,
  newDebtor: false,
  customerDetail: false,
  selectedLead: null,
  selectedAppointmentId: null,
  selectedCustomer: null,
};

function modalReducer(state: ModalState, action: ModalAction): ModalState {
  switch (action.type) {
    case 'OPEN_MODAL':
      return { ...state, [action.modal]: true };
    case 'CLOSE_MODAL':
      return { ...state, [action.modal]: false };
    case 'SET_SELECTED_LEAD':
      return { ...state, selectedLead: action.lead };
    case 'SET_SELECTED_APPOINTMENT':
      return { ...state, selectedAppointmentId: action.id };
    case 'SET_SELECTED_CUSTOMER':
      return { ...state, selectedCustomer: action.customer, customerDetail: action.customer !== null };
    case 'CLOSE_ALL':
      return modalInitialState;
    default:
      return state;
  }
}

export function DashboardView({ user, leads, contracts, fixedCosts, appointments, dashboardData: _dashboardData, contractMetrics, pessoasData, debtors }: DashboardViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // PERF: Estado consolidado de modais usando reducer
  const [modals, dispatch] = useReducer(modalReducer, modalInitialState);

  // Aliases para compatibilidade (evita refatorar todo o componente)
  const isNewLeadModalOpen = modals.newLead;
  const setIsNewLeadModalOpen = useCallback((open: boolean) => dispatch({ type: open ? 'OPEN_MODAL' : 'CLOSE_MODAL', modal: 'newLead' }), []);
  const isSearchOpen = modals.search;
  const setIsSearchOpen = useCallback((open: boolean) => dispatch({ type: open ? 'OPEN_MODAL' : 'CLOSE_MODAL', modal: 'search' }), []);
  const isScheduleModalOpen = modals.schedule;
  const setIsScheduleModalOpen = useCallback((open: boolean) => dispatch({ type: open ? 'OPEN_MODAL' : 'CLOSE_MODAL', modal: 'schedule' }), []);
  const selectedLead = modals.selectedLead;
  const setSelectedLead = useCallback((lead: PlainLead | null) => dispatch({ type: 'SET_SELECTED_LEAD', lead }), []);
  const selectedAppointmentId = modals.selectedAppointmentId;
  const setSelectedAppointmentId = useCallback((id: string | null) => dispatch({ type: 'SET_SELECTED_APPOINTMENT', id }), []);
  const isNewContractModalOpen = modals.newContract;
  const setIsNewContractModalOpen = useCallback((open: boolean) => dispatch({ type: open ? 'OPEN_MODAL' : 'CLOSE_MODAL', modal: 'newContract' }), []);
  const isNewFixedCostModalOpen = modals.newFixedCost;
  const setIsNewFixedCostModalOpen = useCallback((open: boolean) => dispatch({ type: open ? 'OPEN_MODAL' : 'CLOSE_MODAL', modal: 'newFixedCost' }), []);
  const isNewDebtorModalOpen = modals.newDebtor;
  const setIsNewDebtorModalOpen = useCallback((open: boolean) => dispatch({ type: open ? 'OPEN_MODAL' : 'CLOSE_MODAL', modal: 'newDebtor' }), []);

  // Estado para modal de detalhe de cliente
  const selectedCustomer = modals.selectedCustomer;
  const isCustomerDetailOpen = modals.customerDetail;
  const setSelectedCustomer = useCallback((customer: import("@/app/actions/pessoas").PessoaData | null) => dispatch({ type: 'SET_SELECTED_CUSTOMER', customer }), []);
  const setIsCustomerDetailOpen = useCallback((open: boolean) => {
    if (!open) dispatch({ type: 'SET_SELECTED_CUSTOMER', customer: null });
  }, []);

  // PERF FIX: Estado controlado da aba para desmontagem seletiva de componentes
  // Lê a aba inicial da URL (query param ?tab=xxx)
  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTabState] = useState<string>(tabFromUrl || "kanban");

  // Função para mudar de aba e atualizar a URL
  const setActiveTab = useCallback((tab: string) => {
    setActiveTabState(tab);
    // Atualiza a URL sem recarregar a página
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.pushState({}, "", url.toString());
  }, []);

  // Sincroniza o estado com a URL quando o usuário navega (back/forward)
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab) {
        setActiveTabState(tab);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

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
  const shouldRenderPeople = useMemo(() => activeTab === "people", [activeTab]);
  const shouldRenderDebtors = useMemo(() => activeTab === "debtors", [activeTab]);
  const shouldRenderLogs = useMemo(() => activeTab === "logs", [activeTab]);

  // ===========================================
  // TAB VISIBILITY CONTROL
  // ===========================================
  // Mapping between activeTab values and allowedTabs values
  const TAB_PERMISSION_MAP: Record<string, string> = {
    "kanban": "kanban",
    "calendar": "kanban", // Calendar is part of kanban workflow
    "overview": "dashboard",
    "dashboards": "dashboard",
    "people": "pessoas",
    "contracts": "contratos",
    "fixed-costs": "custos",
    "debtors": "devedores",
    "logs": "logs",
  };

  // Helper to check if user can view a specific tab
  const canViewTab = useCallback((tabValue: string): boolean => {
    if (user.role === "ADMIN") return true;
    const permission = TAB_PERMISSION_MAP[tabValue];
    return permission ? user.allowedTabs.includes(permission) : false;
  }, [user.role, user.allowedTabs]);

  // Estado para ordenação da tabela Pessoas
  const [pessoasSortColumn, setPessoasSortColumn] = useState<"name" | "tags" | "ltv" | "lastContractDate">("lastContractDate");
  const [pessoasSortDirection, setPessoasSortDirection] = useState<"asc" | "desc">("desc");

  // Função para alternar ordenação
  const handlePessoasSort = useCallback((column: typeof pessoasSortColumn) => {
    if (pessoasSortColumn === column) {
      setPessoasSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setPessoasSortColumn(column);
      // Definir direção inicial baseada na coluna
      if (column === "name") {
        setPessoasSortDirection("asc"); // A-Z primeiro
      } else if (column === "ltv") {
        setPessoasSortDirection("desc"); // Maior primeiro
      } else if (column === "lastContractDate") {
        setPessoasSortDirection("asc"); // Mais antigo primeiro
      } else {
        setPessoasSortDirection("asc");
      }
    }
  }, [pessoasSortColumn]);

  // Dados ordenados de Pessoas
  const sortedPessoasData = useMemo(() => {
    const sorted = [...pessoasData];
    sorted.sort((a, b) => {
      let comparison = 0;
      switch (pessoasSortColumn) {
        case "name":
          comparison = a.name.localeCompare(b.name, "pt-BR");
          break;
        case "tags":
          comparison = 0; // Todos são CLIENTE_ATIVO, então sem diferença
          break;
        case "ltv":
          comparison = a.ltv - b.ltv;
          break;
        case "lastContractDate":
          const dateA = a.lastContractDate ? new Date(a.lastContractDate).getTime() : 0;
          const dateB = b.lastContractDate ? new Date(b.lastContractDate).getTime() : 0;
          comparison = dateA - dateB;
          break;
      }
      return pessoasSortDirection === "asc" ? comparison : -comparison;
    });
    return sorted;
  }, [pessoasData, pessoasSortColumn, pessoasSortDirection]);

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const totalPages = Math.ceil(sortedPessoasData.length / itemsPerPage);
  const paginatedPessoas = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedPessoasData.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedPessoasData, currentPage, itemsPerPage]);

  // Resetar para página 1 quando mudar filtros ou ordenação (opcional, mas bom UX)
  // useEffect(() => setCurrentPage(1), [itemsPerPage]); // Já incluso na lógica de render se precisar, mas vamos manter simples.

  // Helper para verificar se uma data esta dentro dos meses selecionados
  const isDateInSelectedMonths = useCallback((date: Date | string, selectedMonths: string[]) => {
    if (selectedMonths.length === 0) return true; // Sem filtro = mostra tudo
    const dateObj = typeof date === "string" ? new Date(date) : date;
    const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}`;
    return selectedMonths.includes(monthKey);
  }, []);

  const handleSelectLead = useCallback((lead: PlainLead) => {
    setSelectedLead(lead);
  }, []);

  const handleUpdateLead = useCallback((_updatedLead: PlainLead) => {
    setSelectedLead(null);
    router.refresh();
  }, [router, setSelectedLead]);

  const handleDeleteLead = useCallback(() => {
    setSelectedLead(null);
    router.refresh();
  }, [router, setSelectedLead]);

  const STAGE_LABELS_MAP: Record<string, string> = {
    NOVO_LEAD: "Novo Lead",
    EM_NEGOCIACAO: "Em Negociação",
    AGENDADO: "Agendado",
    EM_ATENDIMENTO: "Em Atendimento",
    POS_VENDA: "Pós-Venda",
    FINALIZADO: "Finalizado",
  };

  const STAGE_COLORS_MAP: Record<string, string> = {
    NOVO_LEAD: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    EM_NEGOCIACAO: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    AGENDADO: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    EM_ATENDIMENTO: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    POS_VENDA: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
    FINALIZADO: "bg-green-500/10 text-green-500 border-green-500/20",
  };



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
            <h2 className="text-3xl font-bold tracking-tight">
              {activeTab === 'kanban' && 'Kanban'}
              {activeTab === 'calendar' && 'Calendário'}
              {activeTab === 'overview' && 'Visão Geral'}
              {activeTab === 'dashboards' && 'Dashboards'}
              {activeTab === 'people' && 'Pessoas'}
              {activeTab === 'people' && 'Pessoas'}
              {activeTab === 'contracts' && 'Contratos'}
              {activeTab === 'fixed-costs' && 'Custos Fixos'}
              {activeTab === 'debtors' && 'Devedores'}
              {activeTab === 'logs' && 'Webhook Logs'}
            </h2>
            <p className="text-muted-foreground">
              {activeTab === 'people' ? 'Gerencie sua base de clientes e leads' : 'Gerencie seu pipeline e atividades'}
            </p>
          </div>
        </div>

        {/* PERF FIX: Tabs controladas para desmontagem seletiva */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="w-full flex items-center gap-2 mb-4 bg-transparent p-0">
            {/* TABS PRINCIPAIS VISIVEIS - Filtradas por permissão */}
            <TabsList className="flex items-center gap-2 p-1 bg-muted rounded-lg w-auto h-auto">
              {canViewTab("kanban") && (
                <TabsTrigger value="kanban" className="flex items-center gap-2 px-4 py-3 min-h-[44px]">
                  <Columns3 className="h-4 w-4" />
                  <span className="whitespace-nowrap">Kanban</span>
                </TabsTrigger>
              )}
              {canViewTab("calendar") && (
                <TabsTrigger value="calendar" className="flex items-center gap-2 px-4 py-3 min-h-[44px]">
                  <CalendarIcon className="h-4 w-4" />
                  <span className="whitespace-nowrap">Calendário</span>
                </TabsTrigger>
              )}
            </TabsList>

            {/* MENU MULTIMIDIA (Hamburger) - Itens filtrados por permissão */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 bg-muted border-none hover:bg-muted/80 ml-auto">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {canViewTab("overview") && (
                  <DropdownMenuItem onClick={() => setActiveTab("overview")} className="cursor-pointer gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    Visão Geral
                  </DropdownMenuItem>
                )}
                {canViewTab("dashboards") && (
                  <DropdownMenuItem onClick={() => setActiveTab("dashboards")} className="cursor-pointer gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Dashboards
                  </DropdownMenuItem>
                )}
                {(canViewTab("overview") || canViewTab("dashboards")) && <DropdownMenuSeparator />}
                {canViewTab("people") && (
                  <DropdownMenuItem onClick={() => setActiveTab("people")} className="cursor-pointer gap-2">
                    <User className="h-4 w-4" />
                    Pessoas
                  </DropdownMenuItem>
                )}
                {canViewTab("fixed-costs") && (
                  <DropdownMenuItem onClick={() => setActiveTab("fixed-costs")} className="cursor-pointer gap-2">
                    <Wallet className="h-4 w-4" />
                    Custos Fixos
                  </DropdownMenuItem>
                )}
                {canViewTab("contracts") && (
                  <DropdownMenuItem onClick={() => setActiveTab("contracts")} className="cursor-pointer gap-2">
                    <FileText className="h-4 w-4" />
                    Contratos
                  </DropdownMenuItem>
                )}
                {canViewTab("debtors") && (
                  <DropdownMenuItem onClick={() => setActiveTab("debtors")} className="cursor-pointer gap-2">
                    <Wallet className="h-4 w-4" />
                    Devedores
                  </DropdownMenuItem>
                )}
                {canViewTab("logs") && (
                  <DropdownMenuItem onClick={() => setActiveTab("logs")} className="cursor-pointer gap-2">
                    <ScrollText className="h-4 w-4" />
                    Logs
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* PERF FIX: Renderização condicional - componentes são DESMONTADOS quando não visíveis */}
          <TabsContent value="overview" className="space-y-4">
            {shouldRenderCharts && (
              <>
                {user.role === "VENDEDOR" ? (
                  <SellerDashboard userId={user.id} />
                ) : (
                  <AdminOverview />
                )}
                <OverviewTab
                  user={user}
                  leads={leads}
                  appointments={appointments}
                  contracts={contracts}
                  selectedMonths={selectedMonthsOverview}
                  onSelectionChange={setSelectedMonthsOverview}
                />
              </>
            )}
          </TabsContent>

          <TabsContent value="dashboards" className="space-y-4">
            {shouldRenderDashboards && (
              <FinancialTab
                contracts={contracts}
                contractMetrics={contractMetrics}
                selectedMonths={selectedMonthsDashboards}
                onSelectionChange={setSelectedMonthsDashboards}
              />
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

          <TabsContent value="people" className="space-y-4">
            {shouldRenderPeople && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Lista de Pessoas</h3>
                    <Button onClick={() => setIsNewLeadModalOpen(true)} className="bg-brand-accent text-white">
                      <Plus className="w-4 h-4 mr-2" /> Novo Lead
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Mobile Card View */}
                  <div className="md:hidden space-y-3">
                    {paginatedPessoas.length === 0 ? (
                      <p className="text-center py-8 text-muted-foreground">
                        Nenhuma pessoa encontrada.
                      </p>
                    ) : (
                      paginatedPessoas.map((pessoa) => (
                        <div
                          key={pessoa.id}
                          className="p-4 rounded-lg border border-white/[0.08] bg-brand-card/50 space-y-3 cursor-pointer active:bg-white/[0.05]"
                          onClick={() => {
                            setSelectedCustomer(pessoa);
                            setIsCustomerDetailOpen(true);
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold text-text-primary">{pessoa.name}</p>
                              <p className="text-sm text-muted-foreground font-mono">{formatPhone(pessoa.phone)}</p>
                            </div>
                            <Badge
                              variant="outline"
                              className={pessoa.tag === "CLIENTE_ATIVO"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-normal text-xs"
                                : "bg-blue-500/10 text-blue-400 border-blue-500/20 font-normal text-xs"
                              }
                            >
                              {pessoa.tag === "CLIENTE_ATIVO" ? "Ativo" : "Lead"}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <div>
                              <span className="text-muted-foreground">LTV:</span>{" "}
                              <span className="text-emerald-400 font-semibold">
                                {pessoa.ltv.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Última:</span>{" "}
                              <span>{pessoa.lastContractDate ? new Date(pessoa.lastContractDate).toLocaleDateString("pt-BR") : "-"}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.06]">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-10 px-3"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(`https://wa.me/55${pessoa.phone.replace(/\D/g, "")}`, "_blank");
                              }}
                            >
                              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current text-green-500 mr-2">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                              </svg>
                              WhatsApp
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden md:block rounded-md border border-white/[0.08]">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/[0.08] hover:bg-transparent">
                          <TableHead
                            className="cursor-pointer hover:text-white transition-colors"
                            onClick={() => handlePessoasSort("name")}
                          >
                            <div className="flex items-center gap-1">
                              Nome
                              {pessoasSortColumn === "name" && (
                                <span className="text-xs">{pessoasSortDirection === "asc" ? "↑" : "↓"}</span>
                              )}
                            </div>
                          </TableHead>
                          <TableHead
                            className="cursor-pointer hover:text-white transition-colors"
                            onClick={() => handlePessoasSort("tags")}
                          >
                            <div className="flex items-center gap-1">
                              Tags
                              {pessoasSortColumn === "tags" && (
                                <span className="text-xs">{pessoasSortDirection === "asc" ? "↑" : "↓"}</span>
                              )}
                            </div>
                          </TableHead>
                          <TableHead
                            className="cursor-pointer hover:text-white transition-colors"
                            onClick={() => handlePessoasSort("ltv")}
                          >
                            <div className="flex items-center gap-1">
                              LTV
                              {pessoasSortColumn === "ltv" && (
                                <span className="text-xs">{pessoasSortDirection === "asc" ? "↑" : "↓"}</span>
                              )}
                            </div>
                          </TableHead>
                          <TableHead
                            className="cursor-pointer hover:text-white transition-colors"
                            onClick={() => handlePessoasSort("lastContractDate")}
                          >
                            <div className="flex items-center gap-1">
                              Última Compra
                              {pessoasSortColumn === "lastContractDate" && (
                                <span className="text-xs">{pessoasSortDirection === "asc" ? "↑" : "↓"}</span>
                              )}
                            </div>
                          </TableHead>
                          <TableHead>Observações</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedPessoasData.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                              Nenhuma pessoa encontrada.
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedPessoas.map((pessoa) => (
                            <TableRow
                              key={pessoa.id}
                              className="border-white/[0.04] hover:bg-white/[0.02] cursor-pointer"
                              onClick={() => {
                                setSelectedCustomer(pessoa);
                                setIsCustomerDetailOpen(true);
                              }}
                            >
                              <TableCell>
                                <div>
                                  <div className="font-medium">{pessoa.name}</div>
                                  <div className="text-xs text-muted-foreground font-mono">{formatPhone(pessoa.phone)}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={pessoa.tag === "CLIENTE_ATIVO"
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-normal"
                                    : "bg-blue-500/10 text-blue-400 border-blue-500/20 font-normal"
                                  }
                                >
                                  {pessoa.tag === "CLIENTE_ATIVO" ? "Cliente Ativo" : "Lead"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <span className="text-emerald-400 font-semibold">
                                  {pessoa.ltv.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm">
                                  {pessoa.lastContractDate ? new Date(pessoa.lastContractDate).toLocaleDateString("pt-BR") : "-"}
                                </span>
                              </TableCell>
                              <TableCell className="max-w-[200px]">
                                <div className="text-xs text-muted-foreground whitespace-pre-line line-clamp-2" title={pessoa.observacoes}>
                                  {pessoa.observacoes}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.open(`https://wa.me/55${pessoa.phone.replace(/\D/g, "")}`, "_blank");
                                    }}
                                    title="WhatsApp"
                                  >
                                    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current text-green-500">
                                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                    </svg>
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Paginação */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
                    <div className="text-sm text-gray-500">
                      Página {currentPage} de {totalPages} ({sortedPessoasData.length} registros)
                    </div>
                    <div className="flex items-center gap-4">

                      {/* Seletor de Página */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500 hidden sm:inline">Ir para:</span>
                        <input
                          type="number"
                          min={1}
                          max={totalPages}
                          className="h-10 w-[60px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 text-center"
                          value={currentPage}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (!isNaN(val)) {
                              setCurrentPage(Math.min(Math.max(1, val), totalPages));
                            }
                          }}
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500 hidden sm:inline">Itens:</span>
                        <select
                          className="h-10 w-[70px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 bg-zinc-950"
                          value={itemsPerPage}
                          onChange={(e) => {
                            setItemsPerPage(Number(e.target.value));
                            setCurrentPage(1);
                          }}
                        >
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-10"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-10"
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
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

          <TabsContent value="debtors" className="space-y-4">
            {shouldRenderDebtors && (
              <DebtorsTable
                debtors={debtors}
                onNewDebtor={() => setIsNewDebtorModalOpen(true)}
              />
            )}
          </TabsContent>

          <TabsContent value="logs" className="space-y-4">
            {shouldRenderLogs && <WebhookLogsView />}
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

      <NewDebtorModal
        open={isNewDebtorModalOpen}
        onOpenChange={setIsNewDebtorModalOpen}
        people={pessoasData}
      />

      {/* Modal de Detalhe do Cliente */}
      <CustomerDetailModal
        open={isCustomerDetailOpen}
        onOpenChange={setIsCustomerDetailOpen}
        customer={selectedCustomer}
      />

      <Footer />
    </div>
  );
}
