"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { SafeChartContainer } from "@/components/ui/safe-chart-container";
import { TrendingUp } from "lucide-react";

interface WeeklyData {
  day: string;
  atendimentos: number;
}

interface WeeklyPerformanceChartProps {
  data: WeeklyData[];
}

export function WeeklyPerformanceChart({ data }: WeeklyPerformanceChartProps) {
  const total = data.reduce((sum, item) => sum + item.atendimentos, 0);
  const maxValue = Math.max(...data.map((d) => d.atendimentos), 1);

  return (
    <div className="rounded-xl border border-white/[0.08] bg-brand-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-brand-accent" />
          <h3 className="font-display text-lg text-text-primary">Atendimentos por Dia</h3>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-text-primary">{total}</p>
          <p className="text-xs text-text-tertiary">ultimas 4 semanas</p>
        </div>
      </div>

      <SafeChartContainer height={200}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="day"
              tick={{ fill: "#9CA3AF", fontSize: 12 }}
              axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#9CA3AF", fontSize: 12 }}
              axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
              tickLine={false}
              domain={[0, maxValue + 1]}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-brand-card border border-white/10 rounded-lg p-3 shadow-lg">
                      <p className="text-text-primary font-medium">{label}</p>
                      <p className="text-text-secondary text-sm">
                        {payload[0].value} atendimentos
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar
              dataKey="atendimentos"
              fill="#D4AF37"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </SafeChartContainer>
    </div>
  );
}
