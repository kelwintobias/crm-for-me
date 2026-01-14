"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Users, CreditCard, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface KPICardsProps {
  metrics: {
    totalRevenue: number;
    totalRevenuePrev: number;
    mrr: number;
    mrrPrev: number;
    pipeline: number;
    pipelinePrev: number;
    averageTicket: number;
    averageTicketPrev: number;
  };
}

function calcVariation(current: number, prev: number): number {
  if (prev === 0) return current > 0 ? 100 : 0;
  return ((current - prev) / prev) * 100;
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function KPICards({ metrics }: KPICardsProps) {
  // Memoiza os KPIs para evitar recálculos desnecessários em cada render
  const kpis = useMemo(() => [
    {
      title: "Faturamento Total",
      value: currencyFormatter.format(metrics.totalRevenue),
      variation: calcVariation(metrics.totalRevenue, metrics.totalRevenuePrev),
      description: "vs mes anterior",
      icon: DollarSign,
      iconColor: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      title: "MRR (Recorrente)",
      value: currencyFormatter.format(metrics.mrr),
      variation: calcVariation(metrics.mrr, metrics.mrrPrev),
      description: "vs mes anterior",
      icon: TrendingUp,
      iconColor: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Pipeline",
      value: currencyFormatter.format(metrics.pipeline),
      variation: calcVariation(metrics.pipeline, metrics.pipelinePrev),
      description: "vs mes anterior",
      icon: Users,
      iconColor: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      title: "Ticket Medio",
      value: currencyFormatter.format(metrics.averageTicket),
      variation: calcVariation(metrics.averageTicket, metrics.averageTicketPrev),
      description: "vs mes anterior",
      icon: CreditCard,
      iconColor: "text-violet-500",
      bgColor: "bg-violet-500/10",
    },
  ], [metrics]);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => {
        const isPositive = kpi.variation >= 0;
        const showVariation = kpi.variation !== 0;

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
                    className={`flex items-center text-xs font-medium ${
                      isPositive ? "text-emerald-500" : "text-red-500"
                    }`}
                  >
                    {isPositive ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" />
                    )}
                    {Math.abs(kpi.variation).toFixed(1)}%
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {kpi.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
