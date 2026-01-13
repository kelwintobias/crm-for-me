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

  const leads = leadsResult.data || [];

  // Dados padrao caso a query falhe
  const dashboardData = dashboardResult.data || {
    kpis: {
      totalRevenue: 0,
      mrr: 0,
      pipeline: 0,
      averageTicket: 0,
    },
    charts: {
      distribution: [],
      revenueEvolution: [],
    },
  };

  return <DashboardView user={user} leads={leads} dashboardData={dashboardData} />;
}
