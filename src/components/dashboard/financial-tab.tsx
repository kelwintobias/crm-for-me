"use client";

import { useMemo, useCallback } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MonthSelector } from "./month-selector";
import { ContractKPICards } from "./contract-kpi-cards";
import { ContractRevenueChart } from "./contract-revenue-chart";
import { PackageDistributionChart } from "./package-distribution-chart";
import { AddonsAnalysisCard } from "./addons-analysis-card";
import { ContractSourceChart } from "./contract-source-chart";
import { ContractsCountChart } from "./contracts-count-chart";
import { FinancialInsightsCard } from "./financial-insights-card";

import { PlainContract } from "@/components/contracts/contracts-table";
import { ContractMetricsData } from "./dashboard-view";

interface FinancialTabProps {
    contracts: PlainContract[];
    contractMetrics: ContractMetricsData;
    selectedMonths: string[];
    onSelectionChange: (months: string[]) => void;
}

export function FinancialTab({
    contracts,
    contractMetrics,
    selectedMonths,
    onSelectionChange,
}: FinancialTabProps) {

    // Helper to check date
    const isDateInSelectedMonths = useCallback((date: Date | string) => {
        if (selectedMonths.length === 0) return true;
        const dateObj = typeof date === "string" ? new Date(date) : date;
        const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}`;
        return selectedMonths.includes(monthKey);
    }, [selectedMonths]);

    const filteredContractsData = useMemo(() => {
        return contracts.filter(contract => isDateInSelectedMonths(contract.contractDate));
    }, [contracts, isDateInSelectedMonths]);

    const filteredContractMetrics = useMemo(() => {
        const filtered = filteredContractsData;
        const totalRevenue = filtered.reduce((sum, c) => sum + Number(c.totalValue), 0);
        const totalContracts = filtered.length;
        const avgTicket = totalContracts > 0 ? totalRevenue / totalContracts : 0;

        // Distribuicao por pacote
        const packageMap = new Map<string, { count: number; revenue: number }>();
        filtered.forEach(c => {
            const pkg = c.package;
            const current = packageMap.get(pkg) || { count: 0, revenue: 0 };
            current.count++;
            current.revenue += Number(c.totalValue);
            packageMap.set(pkg, current);
        });

        const PACKAGE_LABELS: Record<string, string> = {
            INTERMEDIARIO: "Intermediario", AVANCADO: "Avancado", ELITE: "Elite",
            PRO_PLUS: "Pro Plus", ULTRA_PRO: "Ultra Pro", EVOLUTION: "Evolution",
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
            current.revenue += Number(c.totalValue);
            sourceMap.set(src, current);
        });

        const SOURCE_LABELS: Record<string, string> = {
            ANUNCIO: "Anuncio", INDICACAO: "Indicacao", INFLUENCIADOR: "Influenciador", PARCEIRO: "Parceiro",
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
            current.receita += Number(c.totalValue);
            current.contratos++;
            monthlyMap.set(monthKey, current);
        });

        const revenueEvolution = Array.from(monthlyMap.entries())
            .map(([month, data]) => ({ month, ...data }))
            .sort((a, b) => {
                // Better: relies on implicit sort or fix later.
                // Actually, date-fns parse might be needed if exact order matters.
                // Given format MMM/yy (e.g. Jan/24), new Date("Jan 2024") works in JS.
                // "Jan/24" -> replace "/" with " 20" -> "Jan 2024".
                return new Date(a.month.replace("/", " 20")).getTime() - new Date(b.month.replace("/", " 20")).getTime();
            });

        // Analise de adicionais
        const addonMap = new Map<string, number>();
        let contractsWithAddons = 0;
        filtered.forEach(c => {
            if (c.addons && c.addons.length > 0) {
                contractsWithAddons++;
                c.addons.forEach((addon: string) => {
                    addonMap.set(addon, (addonMap.get(addon) || 0) + 1);
                });
            }
        });

        const ADDON_LABELS: Record<string, string> = {
            ADICIONAL_FOTOS: "Fotos Extras", VIDEO_DRONE: "Video Drone",
            ALBUM_DIGITAL: "Album Digital", EDICAO_PREMIUM: "Edicao Premium",
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
    }, [contractMetrics, filteredContractsData]);


    return (
        <div className="space-y-4">
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
                        {filteredContractsData.length} contrato(s) no periodo selecionado
                    </span>
                )}
            </div>

            <ContractKPICards metrics={filteredContractMetrics.kpis} />

            <div className="grid gap-4 lg:grid-cols-7">
                <ContractRevenueChart
                    data={filteredContractMetrics.charts.revenueEvolution}
                    growth={filteredContractMetrics.kpis.revenueGrowth}
                />
                <PackageDistributionChart data={filteredContractMetrics.charts.packageDistribution} />
            </div>

            <div className="grid gap-4 lg:grid-cols-7">
                <AddonsAnalysisCard
                    data={filteredContractMetrics.charts.addonDistribution}
                    addonPercentage={filteredContractMetrics.analysis.addonPercentage}
                    contractsWithAddons={filteredContractMetrics.analysis.contractsWithAddons}
                    totalContracts={filteredContractMetrics.kpis.totalContracts}
                />
                <ContractSourceChart data={filteredContractMetrics.charts.sourceDistribution} />
            </div>

            <div className="grid gap-4 lg:grid-cols-7">
                <ContractsCountChart data={filteredContractMetrics.charts.revenueEvolution} />
                <FinancialInsightsCard
                    kpis={filteredContractMetrics.kpis}
                    analysis={filteredContractMetrics.analysis}
                />
            </div>
        </div>
    );
}
