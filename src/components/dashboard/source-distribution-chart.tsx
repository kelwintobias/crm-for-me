"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface SourceDistributionChartProps {
  data: Array<{
    name: string;
    value: number;
    source: string;
  }>;
}

const COLORS: Record<string, string> = {
  INSTAGRAM: "#E1306C",
  GOOGLE: "#4285F4",
  INDICACAO: "#10B981",
  OUTRO: "#6B7280",
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
        <div className="h-[300px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
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
                  backgroundColor: "hsl(var(--card))",
                  borderColor: "hsl(var(--border))",
                  borderRadius: "8px",
                }}
                formatter={(value, name) => [
                  `${value} leads`,
                  String(name),
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
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
