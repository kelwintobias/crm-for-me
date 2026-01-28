"use client";

import { Cell, Pie, PieChart, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SafeChartContainer } from "@/components/ui/safe-chart-container";

interface SourceDistributionChartProps {
  data: Array<{
    name: string;
    value: number;
    source: string;
  }>;
}

const COLORS: Record<string, string> = {
  ANUNCIO: "#3B82F6",       // Blue (Google/Facebook Ads usually blueish)
  INDICACAO: "#10B981",     // Emerald (Positive/Growth)
  INFLUENCIADOR: "#E1306C", // Pink (Instagram/Social)
  PARCEIRO: "#8B5CF6",      // Violet (Partnership)
  PAGINA_PARCEIRA: "#6366F1", // Indigo
  INSTAGRAM: "#E1306C",     // Pink (Legacy/Fallback)
  GOOGLE: "#4285F4",        // Blue (Legacy/Fallback)
  OUTRO: "#6B7280",         // Gray
};

export function SourceDistributionChart({ data }: SourceDistributionChartProps) {
  const total = data.reduce((acc, item) => acc + item.value, 0);

  if (data.length === 0) {
    return (
      <Card className="col-span-3 lg:col-span-2">
        <CardHeader>
          <CardTitle>Leads por Origem</CardTitle>
          <CardDescription>De onde vem seus leads</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full flex items-center justify-center text-muted-foreground">
            Nenhum lead cadastrado
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-3 lg:col-span-2">
      <CardHeader>
        <CardTitle>Leads por Origem</CardTitle>
        <CardDescription>
          {total} leads no total
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
              {data.map((entry) => (
                <Cell
                  key={`cell-${entry.source}`}
                  fill={COLORS[entry.source] || "#888888"}
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
                <span key="value" className="text-zinc-200">{value} leads</span>,
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
