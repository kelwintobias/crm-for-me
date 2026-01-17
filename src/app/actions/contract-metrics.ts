"use server";

import { prisma } from "@/lib/prisma";
import { subMonths, format, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PACKAGE_LABELS, SOURCE_LABELS, ADDON_LABELS } from "@/lib/contract-constants";
import type { ContractPackage, ContractSource } from "@prisma/client";

// ============================================
// AUTENTICAÇÃO
// ============================================



// ============================================
// MÉTRICAS BASEADAS EM CONTRATOS
// ============================================

export async function getContractMetrics() {
    try {
        // Nota: Auth é validada pelo middleware antes da página carregar
        // Dados são compartilhados entre todos os usuários

        const now = new Date();
        const currentMonthStart = startOfMonth(now);
        const currentMonthEnd = endOfMonth(now);
        const lastMonthStart = startOfMonth(subMonths(now, 1));
        const lastMonthEnd = endOfMonth(subMonths(now, 1));
        const todayStart = startOfDay(now);
        const todayEnd = endOfDay(now);
        const sixMonthsAgo = subMonths(now, 6);

        // Executa queries em paralelo
        const [
            // KPIs principais
            totalRevenueResult,
            currentMonthRevenue,
            lastMonthRevenue,
            totalContracts,
            currentMonthContracts,
            lastMonthContracts,
            todayRevenue,
            todayContracts,
            // Distribuições
            packageDistribution,
            sourceDistribution,
            // Dados para gráficos temporais
            contractsLast6Months,
            // Análise de adicionais
            allContracts,
        ] = await Promise.all([
            // 1. Receita total (todos os contratos)
            prisma.contract.aggregate({
                _sum: { totalValue: true },
            }),

            // 2. Receita do mês atual
            prisma.contract.aggregate({
                _sum: { totalValue: true },
                where: {
                    contractDate: { gte: currentMonthStart, lte: currentMonthEnd },
                },
            }),

            // 3. Receita do mês anterior
            prisma.contract.aggregate({
                _sum: { totalValue: true },
                where: {
                    contractDate: { gte: lastMonthStart, lte: lastMonthEnd },
                },
            }),

            // 4. Total de contratos
            prisma.contract.count(),

            // 5. Contratos do mês atual
            prisma.contract.count({
                where: {
                    contractDate: { gte: currentMonthStart, lte: currentMonthEnd },
                },
            }),

            // 6. Contratos do mês anterior
            prisma.contract.count({
                where: {
                    contractDate: { gte: lastMonthStart, lte: lastMonthEnd },
                },
            }),

            // 7. Receita de hoje
            prisma.contract.aggregate({
                _sum: { totalValue: true },
                where: {
                    contractDate: { gte: todayStart, lte: todayEnd },
                },
            }),

            // 8. Contratos de hoje
            prisma.contract.count({
                where: {
                    contractDate: { gte: todayStart, lte: todayEnd },
                },
            }),

            // 9. Distribuição por pacote
            prisma.contract.groupBy({
                by: ["package"],
                _count: { id: true },
                _sum: { totalValue: true },
            }),

            // 10. Distribuição por origem
            prisma.contract.groupBy({
                by: ["source"],
                _count: { id: true },
                _sum: { totalValue: true },
            }),

            // 11. Contratos dos últimos 6 meses (para gráfico de evolução)
            prisma.contract.findMany({
                where: {
                    contractDate: { gte: sixMonthsAgo },
                },
                select: {
                    contractDate: true,
                    totalValue: true,
                    package: true,
                    addons: true,
                    source: true,
                },
                orderBy: { contractDate: "asc" },
            }),

            // 12. Todos os contratos (para análise de adicionais)
            prisma.contract.findMany({
                select: {
                    addons: true,
                    totalValue: true,
                    package: true,
                },
            }),
        ]);

        // ============================================
        // PROCESSAMENTO DE DADOS
        // ============================================

        // KPIs
        const totalRevenue = Number(totalRevenueResult._sum?.totalValue || 0);
        const monthlyRevenue = Number(currentMonthRevenue._sum?.totalValue || 0);
        const prevMonthRevenue = Number(lastMonthRevenue._sum?.totalValue || 0);
        const avgTicket = totalContracts > 0 ? totalRevenue / totalContracts : 0;
        const prevAvgTicket = lastMonthContracts > 0
            ? Number(lastMonthRevenue._sum?.totalValue || 0) / lastMonthContracts
            : 0;

        // Gráfico: Evolução de Faturamento Mensal
        const monthlyRevenueMap = new Map<string, {
            month: string;
            receita: number;
            contratos: number;
        }>();

        // Inicializa os últimos 6 meses
        for (let i = 5; i >= 0; i--) {
            const date = subMonths(now, i);
            const monthKey = format(date, "MMM/yy", { locale: ptBR });
            monthlyRevenueMap.set(monthKey, {
                month: monthKey,
                receita: 0,
                contratos: 0,
            });
        }

        // Preenche com dados reais
        contractsLast6Months.forEach((contract) => {
            const monthKey = format(contract.contractDate, "MMM/yy", { locale: ptBR });
            if (monthlyRevenueMap.has(monthKey)) {
                const entry = monthlyRevenueMap.get(monthKey)!;
                entry.receita += Number(contract.totalValue);
                entry.contratos += 1;
            }
        });

        const revenueEvolutionData = Array.from(monthlyRevenueMap.values());

        // Gráfico: Distribuição por Pacote
        const packageData = packageDistribution.map((d) => ({
            name: PACKAGE_LABELS[d.package as ContractPackage] || d.package,
            value: d._count.id,
            revenue: Number(d._sum.totalValue || 0),
            package: d.package,
        })).sort((a, b) => b.revenue - a.revenue);

        // Gráfico: Distribuição por Origem
        const sourceData = sourceDistribution.map((d) => ({
            name: SOURCE_LABELS[d.source as ContractSource] || d.source,
            value: d._count.id,
            revenue: Number(d._sum.totalValue || 0),
            source: d.source,
        })).sort((a, b) => b.value - a.value);

        // ============================================
        // ANÁLISE DE ADICIONAIS
        // ============================================

        const addonStats = new Map<string, { count: number; revenue: number }>();
        let contractsWithAddons = 0;


        allContracts.forEach((contract) => {
            if (contract.addons.length > 0) {
                contractsWithAddons++;
                contract.addons.forEach((addon) => {
                    const current = addonStats.get(addon) || { count: 0, revenue: 0 };
                    current.count += 1;
                    addonStats.set(addon, current);
                });
            }
        });

        const addonData = Array.from(addonStats.entries())
            .map(([addon, stats]) => ({
                name: ADDON_LABELS[addon] || addon,
                value: stats.count,
                addon,
            }))
            .sort((a, b) => b.value - a.value);

        const addonPercentage = totalContracts > 0
            ? Math.round((contractsWithAddons / totalContracts) * 100)
            : 0;

        // ============================================
        // RANKING DE PACOTES (Top Sellers)
        // ============================================

        const packageRanking = packageDistribution
            .map((d) => ({
                package: d.package,
                name: PACKAGE_LABELS[d.package as ContractPackage] || d.package,
                count: d._count.id,
                revenue: Number(d._sum.totalValue || 0),
                avgTicket: d._count.id > 0 ? Number(d._sum.totalValue || 0) / d._count.id : 0,
            }))
            .sort((a, b) => b.count - a.count);

        // ============================================
        // TENDÊNCIAS
        // ============================================

        const revenueGrowth = prevMonthRevenue > 0
            ? ((monthlyRevenue - prevMonthRevenue) / prevMonthRevenue) * 100
            : monthlyRevenue > 0 ? 100 : 0;

        const contractsGrowth = lastMonthContracts > 0
            ? ((currentMonthContracts - lastMonthContracts) / lastMonthContracts) * 100
            : currentMonthContracts > 0 ? 100 : 0;

        return {
            success: true,
            data: {
                kpis: {
                    totalRevenue,
                    monthlyRevenue,
                    prevMonthRevenue,
                    revenueGrowth,
                    totalContracts,
                    monthlyContracts: currentMonthContracts,
                    prevMonthContracts: lastMonthContracts,
                    contractsGrowth,
                    avgTicket,
                    prevAvgTicket,
                    todayRevenue: Number(todayRevenue._sum?.totalValue || 0),
                    todayContracts,
                },
                charts: {
                    revenueEvolution: revenueEvolutionData,
                    packageDistribution: packageData,
                    sourceDistribution: sourceData,
                    addonDistribution: addonData,
                },
                analysis: {
                    addonPercentage,
                    contractsWithAddons,
                    packageRanking,
                    bestSource: sourceData[0] || null,
                    bestPackage: packageRanking[0] || null,
                },
            },
        };
    } catch (error) {
        console.error("Erro ao buscar métricas de contratos:", error);
        return { success: false, error: "Erro ao carregar métricas" };
    }
}
