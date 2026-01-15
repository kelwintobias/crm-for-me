"use client";

import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SafeChartContainer } from "@/components/ui/safe-chart-container";

interface RevenueChartProps {
  data: Array<{
    name: string;
    unico: number;
    mensal: number;
  }>;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

export function RevenueChart({ data }: RevenueChartProps) {
  // Calcula totais para exibir no header
  const totalUnico = data.reduce((acc, item) => acc + item.unico, 0);
  const totalMensal = data.reduce((acc, item) => acc + item.mensal, 0);

  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>Evolucao de Receita</CardTitle>
        <CardDescription>
          Ultimos 3 meses: {formatCurrency(totalUnico + totalMensal)} total
        </CardDescription>
      </CardHeader>
      <CardContent className="pl-2">
        {/* PERF FIX: SafeChartContainer previne erros de dimensões negativas */}
        <SafeChartContainer height={300} minHeight={200}>
          <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="name"
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.05)" }}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                borderColor: "hsl(var(--border))",
                borderRadius: "8px",
              }}
              formatter={(value) => [formatCurrency(Number(value)), ""]}
              labelStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Legend
              wrapperStyle={{ paddingTop: "20px" }}
              formatter={(value) => (
                <span className="text-sm text-muted-foreground">{value}</span>
              )}
            />
            <Bar
              dataKey="unico"
              name="Plano Unico"
              fill="#adfa1d"
              radius={[4, 4, 0, 0]}
              maxBarSize={50}
            />
            <Bar
              dataKey="mensal"
              name="Plano Mensal"
              fill="#2563eb"
              radius={[4, 4, 0, 0]}
              maxBarSize={50}
            />
          </BarChart>
        </SafeChartContainer>
      </CardContent>
    </Card>
  );
}
