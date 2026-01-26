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

// Tooltip customizado com melhor contraste
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 shadow-xl">
      <p className="text-white font-semibold mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-zinc-300">{entry.name}:</span>
          <span className="text-white font-medium">{formatCurrency(entry.value)}</span>
        </div>
      ))}
    </div>
  );
};

export function RevenueChart({ data }: RevenueChartProps) {
  // Calcula totais para exibir no header
  const totalUnico = data.reduce((acc, item) => acc + item.unico, 0);
  const totalMensal = data.reduce((acc, item) => acc + item.mensal, 0);

  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>Evolução de Receita</CardTitle>
        <CardDescription>
          Últimos 3 meses: {formatCurrency(totalUnico + totalMensal)} total
        </CardDescription>
      </CardHeader>
      <CardContent className="pl-2">
        {/* PERF FIX: SafeChartContainer previne erros de dimensões negativas */}
        <SafeChartContainer height={300} minHeight={200}>
          <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="name"
              stroke="#9CA3AF"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#9CA3AF"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
            <Legend
              wrapperStyle={{ paddingTop: "20px" }}
              formatter={(value) => (
                <span className="text-sm text-zinc-300">{value}</span>
              )}
            />
            <Bar
              dataKey="unico"
              name="Plano Único (< R$300)"
              fill="#3B82F6"
              radius={[4, 4, 0, 0]}
              maxBarSize={50}
            />
            <Bar
              dataKey="mensal"
              name="Plano Mensal (≥ R$300)"
              fill="#10B981"
              radius={[4, 4, 0, 0]}
              maxBarSize={50}
            />
          </BarChart>
        </SafeChartContainer>
      </CardContent>
    </Card>
  );
}
