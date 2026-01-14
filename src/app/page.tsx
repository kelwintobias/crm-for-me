import { redirect } from "next/navigation";
import { getLeads, getCurrentUser } from "./actions/leads";
import { getDashboardMetrics } from "./actions/dashboard";
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
  const [leadsResult, dashboardResult] = await Promise.all([
    getLeads(),
    getDashboardMetrics(),
  ]);

  const rawLeads = leadsResult.data || [];

  // CONVERSÃO DE DADOS (Decimal -> Number)
  // Necessário pois Client Components não aceitam objetos complexos como Decimal
  const leads = rawLeads.map((lead) => ({
    ...lead,
    value: Number(lead.value),
  }));

  const plainUser = user
    ? {
        ...user,
        commissionRate: Number(user.commissionRate),
      }
    : null;

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
    },
    metrics: {
      totalLeads: 0,
      vendidos: 0,
      taxaConversao: 0,
      leadsEmContato: 0,
      leadsPerdidos: 0,
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
      dashboardData={dashboardData}
    />
  );
}
