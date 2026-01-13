import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getLeads, getMetrics } from "./actions/leads";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [leadsResult, metricsResult] = await Promise.all([
    getLeads(),
    getMetrics(),
  ]);

  const leads = leadsResult.data || [];
  const metrics = metricsResult.data || {
    leadsNaEsteira: 0,
    vendasUnicas: 0,
    vendasMensais: 0,
  };

  return <DashboardView user={user} leads={leads} metrics={metrics} />;
}
