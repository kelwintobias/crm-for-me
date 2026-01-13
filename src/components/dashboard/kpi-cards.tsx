"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Users, CreditCard } from "lucide-react";

interface KPICardsProps {
  metrics: {
    totalRevenue: number;
    mrr: number;
    pipeline: number;
    averageTicket: number;
  };
}

export function KPICards({ metrics }: KPICardsProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  const kpis = [
    {
      title: "Faturamento Total",
      value: formatCurrency(metrics.totalRevenue),
      description: "Vendas acumuladas",
      icon: DollarSign,
      iconColor: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      title: "MRR (Recorrente)",
      value: formatCurrency(metrics.mrr),
      description: "Receita mensal ativa",
      icon: TrendingUp,
      iconColor: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Pipeline",
      value: formatCurrency(metrics.pipeline),
      description: "Potencial em negociacao",
      icon: Users,
      iconColor: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      title: "Ticket Medio",
      value: formatCurrency(metrics.averageTicket),
      description: "Media por venda",
      icon: CreditCard,
      iconColor: "text-violet-500",
      bgColor: "bg-violet-500/10",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => (
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
            <div className="text-2xl font-bold tracking-tight">{kpi.value}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {kpi.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
