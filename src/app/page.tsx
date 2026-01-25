import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLeads, getCurrentUser } from "./actions/leads";
import { getDashboardMetrics } from "./actions/dashboard";
import { getContracts } from "./actions/contracts";
import { getFixedCosts } from "./actions/fixed-costs";
import { getContractMetrics } from "./actions/contract-metrics";
import { getAllAppointments } from "./actions/appointments";
import { getPessoasData } from "./actions/pessoas";
import { getDebtors } from "./actions/debtors";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export default async function HomePage() {
  // Verificação primária: Supabase auth (sincronizado com middleware)
  const supabase = await createClient();
  const { data: { user: supabaseUser } } = await supabase.auth.getUser();

  if (!supabaseUser) {
    redirect("/login");
  }

  // Obtem o usuario do Prisma (cria se não existir)
  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    // Log do erro para debug, mas não redireciona para evitar loop
    console.error("Erro ao obter usuário do Prisma:", error);
    // Fallback: usar dados do Supabase diretamente
    user = {
      id: supabaseUser.id,
      email: supabaseUser.email!,
      name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split("@")[0] || "Usuário",
      role: "VENDEDOR" as const,
      commissionRate: 0,
      allowedTabs: ["kanban", "pessoas"],
      mustChangePassword: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  // Busca paralela de dados para performance
  const [leadsResult, dashboardResult, contractsResult, fixedCostsResult, contractMetricsResult, appointmentsResult, pessoasData, debtorsResult] = await Promise.all([
    getLeads(),
    getDashboardMetrics(),
    getContracts(),
    getFixedCosts(),
    getContractMetrics(),
    getAllAppointments(),
    getPessoasData(),
    getDebtors(),
  ]);

  const rawLeads = leadsResult.data || [];
  const appointments = appointmentsResult.data || [];

  const contracts = contractsResult.data || [];

  // OTIMIZAÇÃO: Criar Map de contratos por telefone para O(1) lookup
  // Antes: O(n²) com filter() para cada lead
  // Agora: O(n) para criar Map + O(1) para cada lookup
  const contractsByPhone = new Map<string, typeof contracts>();
  for (const contract of contracts) {
    const phone = contract.whatsapp.replace(/\D/g, "");
    const existing = contractsByPhone.get(phone) || [];
    existing.push(contract);
    contractsByPhone.set(phone, existing);
  }

  // CONVERSÃO DE DADOS (Decimal -> Number) + Enriquecimento com histórico de contratos
  const leads = rawLeads.map((lead) => {
    const leadPhone = lead.phone.replace(/\D/g, "");
    const leadContracts = contractsByPhone.get(leadPhone) || []; // O(1) lookup

    return {
      ...lead,
      value: Number(lead.value),
      ...(leadContracts.length > 0 && {
        contractHistory: {
          contractCount: leadContracts.length,
          ltv: leadContracts.reduce((sum, c) => sum + Number(c.totalValue), 0),
          lastPackage: leadContracts[0].package,
          lastContractDate: String(leadContracts[0].contractDate),
        },
      }),
    };
  });
  const fixedCosts = fixedCostsResult.data || [];
  const debtors = "data" in debtorsResult ? debtorsResult.data || [] : [];

  const plainUser = {
    ...user,
    commissionRate: Number(user.commissionRate),
  };

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

  return (
    <DashboardView
      user={plainUser}
      leads={leads}
      contracts={contracts}
      fixedCosts={fixedCosts}
      appointments={appointments}
      dashboardData={dashboardData}
      contractMetrics={contractMetrics}
      pessoasData={pessoasData}
      debtors={debtors}
    />
  );
}

