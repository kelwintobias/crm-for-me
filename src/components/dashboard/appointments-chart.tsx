"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { SafeChartContainer } from "@/components/ui/safe-chart-container";
import { CalendarCheck } from "lucide-react";

interface AppointmentStatus {
  name: string;
  value: number;
  status: string;
  color: string;
  [key: string]: string | number;
}

interface AppointmentsChartProps {
  data: AppointmentStatus[];
}

export function AppointmentsChart({ data }: AppointmentsChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-brand-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <CalendarCheck className="h-5 w-5 text-brand-accent" />
          <h3 className="font-display text-lg text-text-primary">Status dos Agendamentos</h3>
        </div>
        <div className="flex items-center justify-center h-[200px] text-text-tertiary">
          Nenhum agendamento registrado
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/[0.08] bg-brand-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <CalendarCheck className="h-5 w-5 text-brand-accent" />
        <h3 className="font-display text-lg text-text-primary">Status dos Agendamentos</h3>
      </div>

      <SafeChartContainer height={220}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload as AppointmentStatus;
                  const percent = ((item.value / total) * 100).toFixed(1);
                  return (
                    <div className="bg-brand-card border border-white/10 rounded-lg p-3 shadow-lg">
                      <p className="text-text-primary font-medium">{item.name}</p>
                      <p className="text-text-secondary text-sm">
                        {item.value} ({percent}%)
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => (
                <span className="text-text-secondary text-sm">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </SafeChartContainer>

      {/* Total no centro */}
      <div className="text-center -mt-4">
        <p className="text-2xl font-bold text-text-primary">{total}</p>
        <p className="text-xs text-text-tertiary">Total</p>
      </div>
    </div>
  );
}
