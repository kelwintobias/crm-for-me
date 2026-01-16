"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Lightbulb,
    TrendingUp,
    TrendingDown,
    Target,
    Zap,
    Award,
    Rocket,
} from "lucide-react";

interface FinancialInsightsCardProps {
    kpis: {
        totalRevenue: number;
        monthlyRevenue: number;
        prevMonthRevenue: number;
        revenueGrowth: number;
        avgTicket: number;
        prevAvgTicket: number;
        todayRevenue: number;
        monthlyContracts: number;
        prevMonthContracts: number;
    };
    analysis: {
        addonPercentage: number;
        contractsWithAddons: number;
        bestSource: { name: string; value: number; revenue: number } | null;
        bestPackage: { name: string; count: number; revenue: number } | null;
    };
}

interface Insight {
    type: "success" | "warning" | "info" | "tip";
    icon: React.ReactNode;
    title: string;
    description: string;
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});

function generateInsights(
    kpis: FinancialInsightsCardProps["kpis"],
    analysis: FinancialInsightsCardProps["analysis"]
): Insight[] {
    const insights: Insight[] = [];

    // Insight: Crescimento de receita
    if (kpis.revenueGrowth > 15) {
        insights.push({
            type: "success",
            icon: <Rocket className="w-5 h-5 text-emerald-500" />,
            title: "Receita disparando!",
            description: `Crescimento de ${kpis.revenueGrowth.toFixed(0)}% em relacao ao mes anterior. Excelente desempenho!`,
        });
    } else if (kpis.revenueGrowth > 0) {
        insights.push({
            type: "success",
            icon: <TrendingUp className="w-5 h-5 text-emerald-500" />,
            title: "Receita em crescimento",
            description: `Aumento de ${kpis.revenueGrowth.toFixed(1)}% este mes. Continue assim!`,
        });
    } else if (kpis.revenueGrowth < -10) {
        insights.push({
            type: "warning",
            icon: <TrendingDown className="w-5 h-5 text-red-500" />,
            title: "Queda na receita",
            description: `Reducao de ${Math.abs(kpis.revenueGrowth).toFixed(0)}%. Revise sua estrategia de vendas.`,
        });
    }

    // Insight: Ticket médio
    const ticketVariation = kpis.prevAvgTicket > 0
        ? ((kpis.avgTicket - kpis.prevAvgTicket) / kpis.prevAvgTicket) * 100
        : 0;

    if (ticketVariation > 10) {
        insights.push({
            type: "success",
            icon: <Target className="w-5 h-5 text-blue-500" />,
            title: "Ticket medio em alta!",
            description: `Aumento de ${ticketVariation.toFixed(0)}% no ticket medio. Clientes estao comprando mais.`,
        });
    }

    // Insight: Adicionais
    if (analysis.addonPercentage >= 40) {
        insights.push({
            type: "success",
            icon: <Award className="w-5 h-5 text-violet-500" />,
            title: "Excelente taxa de adicionais!",
            description: `${analysis.addonPercentage}% dos clientes compram adicionais. Otimo upsell!`,
        });
    } else if (analysis.addonPercentage < 20 && analysis.addonPercentage > 0) {
        insights.push({
            type: "tip",
            icon: <Zap className="w-5 h-5 text-amber-500" />,
            title: "Oportunidade de upsell",
            description: `Apenas ${analysis.addonPercentage}% compram adicionais. Considere destacar os beneficios.`,
        });
    }

    // Insight: Melhor fonte
    if (analysis.bestSource && analysis.bestSource.value > 3) {
        insights.push({
            type: "info",
            icon: <Lightbulb className="w-5 h-5 text-purple-500" />,
            title: `${analysis.bestSource.name} e sua melhor fonte`,
            description: `Gerou ${currencyFormatter.format(analysis.bestSource.revenue)} em ${analysis.bestSource.value} contratos.`,
        });
    }

    // Insight: Melhor pacote
    if (analysis.bestPackage && analysis.bestPackage.count > 2) {
        insights.push({
            type: "info",
            icon: <Award className="w-5 h-5 text-emerald-500" />,
            title: "Pacote mais vendido",
            description: `${analysis.bestPackage.name} com ${analysis.bestPackage.count} vendas (${currencyFormatter.format(analysis.bestPackage.revenue)}).`,
        });
    }

    // Insight: Vendas de hoje
    if (kpis.todayRevenue > 0) {
        insights.push({
            type: "success",
            icon: <Zap className="w-5 h-5 text-brand-accent" />,
            title: "Dia produtivo!",
            description: `Voce ja faturou ${currencyFormatter.format(kpis.todayRevenue)} hoje. Continue fechando!`,
        });
    }

    // Insight padrão
    if (insights.length === 0) {
        insights.push({
            type: "info",
            icon: <Lightbulb className="w-5 h-5 text-brand-accent" />,
            title: "Comece a vender",
            description: "Registre contratos para gerar insights personalizados sobre seu negocio.",
        });
    }

    return insights.slice(0, 4);
}

const TYPE_STYLES = {
    success: "border-l-emerald-500 bg-emerald-500/5",
    warning: "border-l-amber-500 bg-amber-500/5",
    info: "border-l-blue-500 bg-blue-500/5",
    tip: "border-l-brand-accent bg-brand-accent/5",
};

export function FinancialInsightsCard({ kpis, analysis }: FinancialInsightsCardProps) {
    const insights = useMemo(
        () => generateInsights(kpis, analysis),
        [kpis, analysis]
    );

    return (
        <Card className="col-span-full lg:col-span-4">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-brand-accent" />
                    Insights Financeiros
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {insights.map((insight, index) => (
                    <div
                        key={index}
                        className={`p-4 rounded-lg border-l-4 ${TYPE_STYLES[insight.type]}`}
                    >
                        <div className="flex items-start gap-3">
                            <div className="shrink-0 mt-0.5">{insight.icon}</div>
                            <div>
                                <h4 className="font-semibold text-sm">{insight.title}</h4>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {insight.description}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
