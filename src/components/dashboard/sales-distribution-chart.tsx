"use client";

import { Cell, Pie, PieChart, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SafeChartContainer } from "@/components/ui/safe-chart-container";

interface SalesDistributionChartProps {
  data: Array<{
    name: string;
    value: number;
  }>;
}

const COLORS: Record<string, string> = {
  "Intermediario": "#10B981", // Emerald 500
  "Avancado": "#3B82F6",      // Blue 500
  "Elite": "#8B5CF6",         // Violet 500
  "Pro Plus": "#F59E0B",      // Amber 500
  "Ultra Pro": "#EC4899",     // Pink 500
  "Evolution": "#6366F1",     // Indigo 500
  "Outro": "#94A3B8",         // Slate 400
};

export function SalesDistributionChart({ data }: SalesDistributionChartProps) {
  const total = data.reduce((acc, item) => acc + item.value, 0);

  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle>Distribuicao de Vendas</CardTitle>
        <CardDescription>
          {total} vendas realizadas
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* PERF FIX: SafeChartContainer previne erros de dimensões negativas */}
        <SafeChartContainer height={300} minHeight={200}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              fill="#8884d8"
              paddingAngle={5}
              dataKey="value"
              label={({ percent }: { percent?: number }) =>
                `${((percent || 0) * 100).toFixed(0)}%`
              }
              labelLine={false}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[entry.name as keyof typeof COLORS] || "#888888"}
                  className="stroke-background"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "#18181B",
                borderColor: "#3F3F46",
                borderRadius: "8px",
                padding: "12px 16px",
              }}
              labelStyle={{ color: "#FFFFFF", fontWeight: 600 }}
              itemStyle={{ color: "#E4E4E7" }}
              formatter={(value, name) => [
                <span key="value" className="text-zinc-200">{value} vendas</span>,
                <span key="name" className="text-white font-medium">{String(name)}</span>,
              ]}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => (
                <span className="text-sm text-muted-foreground">{value}</span>
              )}
            />
          </PieChart>
        </SafeChartContainer>
      </CardContent>
    </Card>
  );
}
