"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Lightbulb,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Target,
  Zap,
} from "lucide-react";

interface InsightsCardProps {
  kpis: {
    totalRevenue: number;
    totalRevenuePrev: number;
    mrr: number;
    mrrPrev: number;
    pipeline: number;
    averageTicket: number;
  };
  metrics: {
    totalLeads: number;
    vendidos: number;
    taxaConversao: number;
    leadsEmContato: number;
    leadsPerdidos: number;
  };
  sourceDistribution: Array<{ name: string; value: number; source: string }>;
}

interface Insight {
  type: "success" | "warning" | "info" | "tip";
  icon: React.ReactNode;
  title: string;
  description: string;
}

function generateInsights(
  kpis: InsightsCardProps["kpis"],
  metrics: InsightsCardProps["metrics"],
  sourceDistribution: InsightsCardProps["sourceDistribution"]
): Insight[] {
  const insights: Insight[] = [];

  // Insight: Variação de receita
  const revenueVariation =
    kpis.totalRevenuePrev > 0
      ? ((kpis.totalRevenue - kpis.totalRevenuePrev) / kpis.totalRevenuePrev) * 100
      : 0;

  if (revenueVariation > 10) {
    insights.push({
      type: "success",
      icon: <TrendingUp className="w-5 h-5 text-emerald-500" />,
      title: "Receita em alta!",
      description: `Seu faturamento cresceu ${revenueVariation.toFixed(0)}% em relacao ao mes anterior. Continue assim!`,
    });
  } else if (revenueVariation < -10) {
    insights.push({
      type: "warning",
      icon: <TrendingDown className="w-5 h-5 text-red-500" />,
      title: "Atencao: Receita em queda",
      description: `Sua receita caiu ${Math.abs(revenueVariation).toFixed(0)}%. Revise sua estrategia de vendas.`,
    });
  }

  // Insight: Taxa de conversão
  if (metrics.taxaConversao >= 30) {
    insights.push({
      type: "success",
      icon: <CheckCircle className="w-5 h-5 text-emerald-500" />,
      title: "Excelente taxa de conversao!",
      description: `${metrics.taxaConversao}% dos seus leads viraram vendas. Seu processo esta muito eficiente.`,
    });
  } else if (metrics.taxaConversao < 15 && metrics.totalLeads > 5) {
    insights.push({
      type: "warning",
      icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
      title: "Taxa de conversao baixa",
      description: `Apenas ${metrics.taxaConversao}% de conversao. Considere melhorar o follow-up com os leads.`,
    });
  }

  // Insight: Leads parados em contato
  if (metrics.leadsEmContato >= 5) {
    insights.push({
      type: "tip",
      icon: <Zap className="w-5 h-5 text-brand-accent" />,
      title: `${metrics.leadsEmContato} leads aguardando`,
      description: "Voce tem leads em contato esperando resposta. Priorize o follow-up hoje!",
    });
  }

  // Insight: MRR crescendo
  const mrrVariation =
    kpis.mrrPrev > 0 ? ((kpis.mrr - kpis.mrrPrev) / kpis.mrrPrev) * 100 : 0;

  if (kpis.mrr > 0 && mrrVariation > 0) {
    insights.push({
      type: "success",
      icon: <Target className="w-5 h-5 text-blue-500" />,
      title: "MRR crescendo!",
      description: `Sua receita recorrente aumentou ${mrrVariation.toFixed(0)}%. Otimo para previsibilidade.`,
    });
  }

  // Insight: Melhor fonte de leads
  if (sourceDistribution.length > 0) {
    const bestSource = sourceDistribution.reduce((a, b) =>
      a.value > b.value ? a : b
    );
    const totalFromSource = sourceDistribution.reduce((acc, s) => acc + s.value, 0);
    const percentage = totalFromSource > 0
      ? Math.round((bestSource.value / totalFromSource) * 100)
      : 0;

    if (percentage > 40) {
      insights.push({
        type: "info",
        icon: <Lightbulb className="w-5 h-5 text-purple-500" />,
        title: `${bestSource.name} e sua melhor fonte`,
        description: `${percentage}% dos seus leads vem do ${bestSource.name}. Considere investir mais nesse canal.`,
      });
    }
  }

  // Insight: Leads perdidos
  if (metrics.leadsPerdidos > 3 && metrics.totalLeads > 0) {
    const lostPercentage = Math.round(
      (metrics.leadsPerdidos / metrics.totalLeads) * 100
    );
    if (lostPercentage > 20) {
      insights.push({
        type: "warning",
        icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
        title: "Muitos leads perdidos",
        description: `${lostPercentage}% dos leads foram perdidos. Analise os motivos para reduzir essa taxa.`,
      });
    }
  }

  // Insight padrão se não houver nenhum
  if (insights.length === 0) {
    insights.push({
      type: "info",
      icon: <Lightbulb className="w-5 h-5 text-brand-accent" />,
      title: "Continue acompanhando",
      description: "Adicione mais leads para gerar insights personalizados sobre seu negocio.",
    });
  }

  return insights.slice(0, 4); // Máximo 4 insights
}

const TYPE_STYLES = {
  success: "border-l-emerald-500 bg-emerald-500/5",
  warning: "border-l-amber-500 bg-amber-500/5",
  info: "border-l-blue-500 bg-blue-500/5",
  tip: "border-l-brand-accent bg-brand-accent/5",
};

export function InsightsCard({ kpis, metrics, sourceDistribution }: InsightsCardProps) {
  const insights = generateInsights(kpis, metrics, sourceDistribution);

  return (
    <Card className="col-span-full lg:col-span-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-brand-accent" />
          Insights Automaticos
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
