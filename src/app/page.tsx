import { redirect } from "next/navigation";
import { getLeads, getCurrentUser } from "./actions/leads";
import { getDashboardMetrics } from "./actions/dashboard";
import { getContracts } from "./actions/contracts";
import { getFixedCosts } from "./actions/fixed-costs";
import { getContractMetrics } from "./actions/contract-metrics";
import { getAllAppointments } from "./actions/appointments";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export default async function HomePage() {
  // Obtem o usuario autenticado do Prisma
  let user;
  try {
    user = await getCurrentUser();
  } catch {
    redirect("/login");
  }

  // Busca paralela de dados para performance
  const [leadsResult, dashboardResult, contractsResult, fixedCostsResult, contractMetricsResult, appointmentsResult] = await Promise.all([
    getLeads(),
    getDashboardMetrics(),
    getContracts(),
    getFixedCosts(),
    getContractMetrics(),
    getAllAppointments(),
  ]);

  const rawLeads = leadsResult.data || [];
  const appointments = appointmentsResult.data || [];

  // CONVERSÃO DE DADOS (Decimal -> Number)
  // Necessário pois Client Components não aceitam objetos complexos como Decimal
  const leads = rawLeads.map((lead) => ({
    ...lead,
    value: Number(lead.value),
  }));

  const contracts = contractsResult.data || [];
  const fixedCosts = fixedCostsResult.data || [];

  const plainUser = user
    ? {
      ...user,
      commissionRate: Number(user.commissionRate),
    }
    : null;

  // Dados de metricas de contratos
  const contractMetrics = contractMetricsResult.data || {
    kpis: {
      totalRevenue: 0,
      monthlyRevenue: 0,
      prevMonthRevenue: 0,
      revenueGrowth: 0,
      totalContracts: 0,
      monthlyContracts: 0,
      prevMonthContracts: 0,
      contractsGrowth: 0,
      avgTicket: 0,
      prevAvgTicket: 0,
      todayRevenue: 0,
      todayContracts: 0,
    },
    charts: {
      revenueEvolution: [],
      packageDistribution: [],
      sourceDistribution: [],
      addonDistribution: [],
    },
    analysis: {
      addonPercentage: 0,
      contractsWithAddons: 0,
      packageRanking: [],
      bestSource: null,
      bestPackage: null,
    },
  };

  // Dados padrao caso a query falhe
  const dashboardData = dashboardResult.data || {
    kpis: {
      totalRevenue: 0,
      totalRevenuePrev: 0,
      mrr: 0,
      mrrPrev: 0,
      pipeline: 0,
      pipelinePrev: 0,
      averageTicket: 0,
      averageTicketPrev: 0,
    },
    charts: {
      distribution: [],
      revenueEvolution: [],
      sourceDistribution: [],
      funnel: [],
      appointmentsByStatus: [],
      weeklyPerformance: [],
    },
    metrics: {
      totalLeads: 0,
      vendidos: 0,
      taxaConversao: 0,
      leadsEmContato: 0,
      leadsPerdidos: 0,
      leadsAguardando: 0,
      taxaConclusao: 0,
      taxaCancelamento: 0,
      taxaNoShow: 0,
    },
    dailyStats: {
      completedToday: 0,
      scheduledToday: 0,
      canceledToday: 0,
      noShowToday: 0,
    },
  };

  if (!plainUser) {
    // Fallback de segurança, embora o redirect deva ocorrer antes
    redirect("/login");
  }

  return (
    <DashboardView
      user={plainUser}
      leads={leads}
      contracts={contracts}
      fixedCosts={fixedCosts}
      appointments={appointments}
      dashboardData={dashboardData}
      contractMetrics={contractMetrics}
    />
  );
}

