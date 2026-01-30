"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MonthSelector } from "./month-selector";
import { KPICards } from "./kpi-cards";
import { DailyStatsCards } from "./daily-stats-cards";
import { RevenueChart } from "./revenue-chart";
import { SalesDistributionChart } from "./sales-distribution-chart";
import { AppointmentsChart } from "./appointments-chart";
import { WeeklyPerformanceChart } from "./weekly-performance-chart";
import { ConversionFunnel } from "./conversion-funnel";
import { InsightsCard } from "./insights-card";
import { SourceDistributionChart } from "./source-distribution-chart";
import { PlainLead, PlainUser } from "@/types";
import { PlainContract } from "@/components/contracts/contracts-table";
import { PlainAppointmentData } from "./dashboard-view";

interface OverviewTabProps {
    user: PlainUser;
    leads: PlainLead[];
    appointments: PlainAppointmentData[];
    contracts: PlainContract[];
    selectedMonths: string[];
    onSelectionChange: (months: string[]) => void;
}

export function OverviewTab({
    user,
    leads,
    appointments,
    contracts,
    selectedMonths,
    onSelectionChange,
}: OverviewTabProps) {

    // 1. Filter Data by Role (Admin vs Seller)
    const isSeller = user.role !== "ADMIN";

    const relevantLeads = useMemo(() => {
        if (isSeller) {
            return leads.filter(l => l.userId === user.id);
        }
        return leads;
    }, [leads, isSeller, user.id]);

    const relevantAppointments = useMemo(() => {
        if (isSeller) {
            return appointments.filter(a => a.userId === user.id);
        }
        return appointments;
    }, [appointments, isSeller, user.id]);

    const relevantContracts = useMemo(() => {
        if (isSeller) {
            return contracts.filter(c => c.userId === user.id);
        }
        return contracts;
    }, [contracts, isSeller, user.id]);

    // 2. Filter Data by Period (Month Selection)
    // 2. Filter Data by Period (Month Selection)
    const isDateInSelectedMonths = useCallback((date: Date | string) => {
        if (selectedMonths.length === 0) return true;
        const dateObj = typeof date === "string" ? new Date(date) : date;
        const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}`;
        return selectedMonths.includes(monthKey);
    }, [selectedMonths]);

    const filteredLeads = useMemo(() => {
        return relevantLeads.filter(lead => isDateInSelectedMonths(lead.createdAt));
    }, [relevantLeads, isDateInSelectedMonths]);

    const filteredContracts = useMemo(() => {
        return relevantContracts.filter(contract => isDateInSelectedMonths(contract.contractDate));
    }, [relevantContracts, isDateInSelectedMonths]);

    const filteredAppointments = useMemo(() => {
        return relevantAppointments.filter(apt => isDateInSelectedMonths(apt.scheduledAt));
    }, [relevantAppointments, isDateInSelectedMonths]);


    // 3. Calculate Metrics (Copied/Adapted from dashboard-view.tsx logic)
    const metricsData = useMemo(() => {
        // Labels constants
        const PACKAGE_LABELS: Record<string, string> = {
            INTERMEDIARIO: "Intermediario", AVANCADO: "Avancado", ELITE: "Elite",
            PRO_PLUS: "Pro Plus", ULTRA_PRO: "Ultra Pro", EVOLUTION: "Evolution",
        };
        const CONTRACT_SOURCE_LABELS: Record<string, string> = {
            ANUNCIO: "Anuncio", INDICACAO: "Indicacao", INFLUENCIADOR: "Influenciador", PARCEIRO: "Parceiro",
        };
        const LEAD_SOURCE_LABELS: Record<string, string> = {
            INSTAGRAM: "Instagram", INDICACAO: "Indicacao", PAGINA_PARCEIRA: "Pagina Parceira",
            INFLUENCER: "Influenciador", ANUNCIO: "Anuncio", OUTRO: "Outro",
        };
        const STAGE_LABELS: Record<string, string> = {
            NOVO_LEAD: "Novo Lead", EM_NEGOCIACAO: "Em Negociacao", AGENDADO: "Agendado",
            EM_ATENDIMENTO: "Em Atendimento", POS_VENDA: "Pos-Venda", FINALIZADO: "Finalizado",
        };

        // KPI Calculations... [Preserving existing KPI logic]
        const totalRevenue = filteredContracts.reduce((sum, c) => sum + c.totalValue, 0);
        const totalContractsCount = filteredContracts.length;
        const averageTicket = totalContractsCount > 0 ? totalRevenue / totalContractsCount : 0;
        const mrr = totalRevenue;

        // Pipeline
        const emPipeline = filteredLeads.filter(l => ["NOVO_LEAD", "EM_NEGOCIACAO", "AGENDADO"].includes(l.stage));
        const estimatedTicket = averageTicket > 0 ? averageTicket : 75;
        const pipeline = emPipeline.length * estimatedTicket;

        // Distribuicao de Vendas
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

        // Evolucao
        const monthlyMap = new Map<string, { sortKey: string; name: string; unico: number; mensal: number; total: number }>();
        const basicPlans = ["INTERMEDIARIO", "AVANCADO"];
        const premiumPlans = ["ELITE", "PRO_PLUS", "ULTRA_PRO", "EVOLUTION"];

        filteredContracts.forEach(c => {
            const date = new Date(c.contractDate);
            const sortKey = format(date, "yyyy-MM");
            const monthName = format(date, "MMM/yy", { locale: ptBR }).toUpperCase();
            const current = monthlyMap.get(sortKey) || { sortKey, name: monthName, unico: 0, mensal: 0, total: 0 };
            if (basicPlans.includes(c.package)) current.unico += c.totalValue;
            else if (premiumPlans.includes(c.package)) current.mensal += c.totalValue;
            current.total += c.totalValue;
            monthlyMap.set(sortKey, current);
        });

        const revenueEvolution = Array.from(monthlyMap.values())
            .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
            .map(({ name, unico, mensal, total }) => ({ name, unico, mensal, total }));

        // Source Distribution
        const sourceMap = new Map<string, number>();
        filteredContracts.forEach(c => {
            sourceMap.set(c.source, (sourceMap.get(c.source) || 0) + 1);
        });
        const sourceDistribution = Array.from(sourceMap.entries()).map(([source, count]) => ({
            name: CONTRACT_SOURCE_LABELS[source] || LEAD_SOURCE_LABELS[source] || source,
            value: count,
            source,
        })).sort((a, b) => b.value - a.value);

        // Funnel
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

        // Metrics
        const totalLeads = filteredLeads.length;
        const convertedLeads = filteredLeads.filter(l =>
            ["AGENDADO", "EM_ATENDIMENTO", "POS_VENDA", "FINALIZADO"].includes(l.stage)
        ).length;
        const taxaConversao = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;
        const leadsEmContato = filteredLeads.filter(l => l.stage === "EM_NEGOCIACAO").length;
        const leadsAguardando = filteredLeads.filter(l => l.stage === "EM_NEGOCIACAO").length;

        // Appointments
        const STATUS_LABELS: Record<string, string> = { SCHEDULED: "Agendado", COMPLETED: "Concluido", CANCELED: "Cancelado", NO_SHOW: "No-Show" };
        const STATUS_COLORS: Record<string, string> = { SCHEDULED: "#3B82F6", COMPLETED: "#10B981", CANCELED: "#EF4444", NO_SHOW: "#F59E0B" };
        const aptStatusMap = new Map<string, number>();
        filteredAppointments.forEach(apt => {
            aptStatusMap.set(apt.status, (aptStatusMap.get(apt.status) || 0) + 1);
        });
        const appointmentsByStatus = Array.from(aptStatusMap.entries()).map(([status, count]) => ({
            name: STATUS_LABELS[status] || status,
            value: count,
            status,
            color: STATUS_COLORS[status] || "#6B7280",
        }));

        // Weekly performance
        const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
        const dayOfWeekCounts = [0, 0, 0, 0, 0, 0, 0];
        filteredAppointments.filter(apt => apt.status === "COMPLETED").forEach(apt => {
            const d = new Date(apt.scheduledAt);
            dayOfWeekCounts[d.getDay()]++;
        });
        const weeklyPerformance = DAY_LABELS.map((day, index) => ({ day, atendimentos: dayOfWeekCounts[index] }));

        // Stats
        const totalApts = filteredAppointments.length;
        const completedApts = filteredAppointments.filter(a => a.status === "COMPLETED").length;
        const canceledApts = filteredAppointments.filter(a => a.status === "CANCELED").length;
        const noShowApts = filteredAppointments.filter(a => a.status === "NO_SHOW").length;
        const taxaConclusao = totalApts > 0 ? Math.round((completedApts / totalApts) * 100) : 0;
        const taxaCancelamento = totalApts > 0 ? Math.round((canceledApts / totalApts) * 100) : 0;
        const taxaNoShow = totalApts > 0 ? Math.round((noShowApts / totalApts) * 100) : 0;

        // Leads Worked
        const leadsWorked = filteredLeads.filter(l => {
            return isDateInSelectedMonths(l.updatedAt);
        }).length;

        return {
            kpis: {
                totalRevenue, totalRevenuePrev: 0, mrr, mrrPrev: 0,
                pipeline, pipelinePrev: 0, averageTicket, averageTicketPrev: 0
            },
            charts: {
                distribution, revenueEvolution, sourceDistribution, funnel, appointmentsByStatus, weeklyPerformance
            },
            metrics: {
                totalLeads, vendidos: convertedLeads, taxaConversao,
                leadsEmContato, leadsPerdidos: 0, leadsAguardando,
                taxaConclusao, taxaCancelamento, taxaNoShow,
                leadsWorked
            },
            appointments: filteredAppointments, // Passar raw para o useEffect
            relevantLeads: relevantLeads // Passar raw para o useEffect
        };
    }, [filteredLeads, filteredAppointments, filteredContracts, relevantLeads, isDateInSelectedMonths]);

    // Calcular estatísticas diárias APENAS no cliente para evitar hydration mismatch
    const [dailyStats, setDailyStats] = useState({
        completedToday: 0,
        scheduledToday: 0,
        canceledToday: 0,
        noShowToday: 0,
        leadsAtendidosHoje: 0,
    });

    useEffect(() => {
        const calculateDailyStats = () => {
            // Importante: new Date() aqui roda no browser, pegando o horário local do usuário
            const todayStr = new Date().toISOString().split("T")[0];
            const aptsToday = metricsData.appointments.filter(apt => apt.scheduledAt.split("T")[0] === todayStr);

            const leadsAtendidosHoje = metricsData.relevantLeads.filter(lead => {
                const updatedDate = typeof lead.updatedAt === "string" ? lead.updatedAt : lead.updatedAt.toISOString();
                return updatedDate.split("T")[0] === todayStr;
            }).length;

            setDailyStats({
                completedToday: aptsToday.filter(a => a.status === "COMPLETED").length,
                scheduledToday: aptsToday.filter(a => a.status === "SCHEDULED").length,
                canceledToday: aptsToday.filter(a => a.status === "CANCELED").length,
                noShowToday: aptsToday.filter(a => a.status === "NO_SHOW").length,
                leadsAtendidosHoje,
            });
        };

        calculateDailyStats();
    }, [metricsData.appointments, metricsData.relevantLeads]);

    return (
        <div className="space-y-4">
            {/* Filtro de Meses */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Filtrar por periodo:</span>
                    <MonthSelector
                        selectedMonths={selectedMonths}
                        onSelectionChange={onSelectionChange}
                    />
                </div>
                {selectedMonths.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                        {filteredLeads.length} lead(s) no periodo selecionado
                    </span>
                )}
            </div>

            {/* KPI Cards */}
            <KPICards
                metrics={metricsData.kpis}
            // If we want to show leadsWorked for Seller instead of generic KPIs?
            // KPICards component might need adjustment or we pass customized metrics.
            // For now using standard.
            />

            {/* Seller Specific: Leads Worked display */}
            {isSeller && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {/* Custom card for leads worked if not using standard KPIs */}
                </div>
            )}

            {/* Consolidado: Metricas do Dia */}
            <DailyStatsCards data={dailyStats} />

            {/* Charts Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <RevenueChart data={metricsData.charts.revenueEvolution} />
                <SalesDistributionChart data={metricsData.charts.distribution} />
            </div>

            {/* Performance de Agendamentos */}
            <div className="grid gap-4 md:grid-cols-2">
                <AppointmentsChart data={metricsData.charts.appointmentsByStatus} />
                <WeeklyPerformanceChart data={metricsData.charts.weeklyPerformance} />
            </div>

            {/* Funil e Insights */}
            <div className="grid gap-4 lg:grid-cols-7">
                <ConversionFunnel
                    data={metricsData.charts.funnel}
                    taxaConversao={metricsData.metrics.taxaConversao}
                />
                <InsightsCard
                    kpis={metricsData.kpis}
                    metrics={metricsData.metrics}
                    sourceDistribution={metricsData.charts.sourceDistribution}
                />
            </div>

            {/* Leads por Origem */}
            <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
                <SourceDistributionChart data={metricsData.charts.sourceDistribution} />
            </div>
        </div>
    );
}
