"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    DollarSign,
    TrendingUp,
    FileText,
    CreditCard,
    ArrowUpRight,
    ArrowDownRight,
    Calendar,
} from "lucide-react";

interface ContractKPICardsProps {
    metrics: {
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
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
});

const compactCurrencyFormatter = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
});

function calcVariation(current: number, prev: number): number {
    if (prev === 0) return current > 0 ? 100 : 0;
    return ((current - prev) / prev) * 100;
}

export function ContractKPICards({ metrics }: ContractKPICardsProps) {
    const kpis = useMemo(() => [
        {
            title: "Receita Total",
            value: metrics.totalRevenue >= 10000
                ? compactCurrencyFormatter.format(metrics.totalRevenue)
                : currencyFormatter.format(metrics.totalRevenue),
            subtitle: `${metrics.totalContracts} contratos`,
            icon: DollarSign,
            iconColor: "text-emerald-500",
            bgColor: "bg-emerald-500/10",
        },
        {
            title: "Receita Mensal",
            value: currencyFormatter.format(metrics.monthlyRevenue),
            variation: metrics.revenueGrowth,
            subtitle: "vs mes anterior",
            icon: TrendingUp,
            iconColor: "text-blue-500",
            bgColor: "bg-blue-500/10",
        },
        {
            title: "Contratos do Mes",
            value: metrics.monthlyContracts.toString(),
            variation: metrics.contractsGrowth,
            subtitle: `${metrics.prevMonthContracts} no mes anterior`,
            icon: FileText,
            iconColor: "text-violet-500",
            bgColor: "bg-violet-500/10",
        },
        {
            title: "Ticket Medio",
            value: currencyFormatter.format(metrics.avgTicket),
            variation: calcVariation(metrics.avgTicket, metrics.prevAvgTicket),
            subtitle: "por contrato",
            icon: CreditCard,
            iconColor: "text-amber-500",
            bgColor: "bg-amber-500/10",
        },
    ], [metrics]);

    return (
        <div className="space-y-4">
            {/* KPIs principais */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {kpis.map((kpi) => {
                    const hasVariation = kpi.variation !== undefined;
                    const isPositive = hasVariation && kpi.variation >= 0;
                    const showVariation = hasVariation && kpi.variation !== 0;

                    return (
                        <Card key={kpi.title} className="overflow-hidden">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    {kpi.title}
                                </CardTitle>
                                <div className={`rounded-full p-2 ${kpi.bgColor}`}>
                                    <kpi.icon className={`h-4 w-4 ${kpi.iconColor}`} />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-bold tracking-tight">{kpi.value}</span>
                                    {showVariation && (
                                        <span
                                            className={`flex items-center text-xs font-medium ${isPositive ? "text-emerald-500" : "text-red-500"
                                                }`}
                                        >
                                            {isPositive ? (
                                                <ArrowUpRight className="h-3 w-3" />
                                            ) : (
                                                <ArrowDownRight className="h-3 w-3" />
                                            )}
                                            {Math.abs(kpi.variation!).toFixed(1)}%
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {kpi.subtitle}
                                </p>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Card de hoje */}
            {(metrics.todayRevenue > 0 || metrics.todayContracts > 0) && (
                <Card className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border-emerald-500/20">
                    <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="rounded-full p-2 bg-emerald-500/20">
                                    <Calendar className="h-5 w-5 text-emerald-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">Vendas de Hoje</p>
                                    <p className="text-xs text-muted-foreground">
                                        {metrics.todayContracts} {metrics.todayContracts === 1 ? "contrato" : "contratos"} fechados
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-bold text-emerald-500">
                                    {currencyFormatter.format(metrics.todayRevenue)}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
