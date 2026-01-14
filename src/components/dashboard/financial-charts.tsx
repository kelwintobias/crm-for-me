"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import type { DashboardMetrics } from "@/types";

interface FinancialChartsProps {
  metrics: DashboardMetrics;
}

// Cores para os gráficos
const COLORS = {
  vendaUnica: "#10b981", // emerald-500
  assinatura: "#a855f7", // purple-500 (brand-accent)
};

// Formatar moeda brasileira para tooltip
function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

// Formatar mês para exibição
function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split("-");
  const months = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez"
  ];
  return `${months[parseInt(month) - 1]}/${year.slice(2)}`;
}

// Tooltip customizado para o gráfico de barras
function CustomBarTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string; color: string }>; label?: string }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-brand-card border border-white/10 rounded-lg p-3 shadow-xl">
        <p className="text-text-primary font-medium mb-2">{formatMonth(label || "")}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-text-secondary">
              {entry.dataKey === "vendaUnica" ? "Venda Única" : "Assinatura"}:
            </span>
            <span className="text-text-primary font-medium">
              {formatCurrency(entry.value)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

// Tooltip customizado para o gráfico de pizza
function CustomPieTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { fill: string } }> }) {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-brand-card border border-white/10 rounded-lg p-3 shadow-xl">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: data.payload.fill }}
          />
          <span className="text-text-primary font-medium">{data.name}</span>
        </div>
        <p className="text-text-secondary text-sm mt-1">
          {data.value} vendas
        </p>
      </div>
    );
  }
  return null;
}

export function FinancialCharts({ metrics }: FinancialChartsProps) {
  // Preparar dados para o gráfico de pizza
  const pieData = [
    {
      name: "Plano Único",
      value: metrics.vendasPorPlano.planoUnico,
      color: COLORS.vendaUnica,
    },
    {
      name: "Plano Mensal",
      value: metrics.vendasPorPlano.planoMensal,
      color: COLORS.assinatura,
    },
  ].filter((item) => item.value > 0);

  // Formatar dados do gráfico de barras
  const barData = metrics.chartData.map((item) => ({
    ...item,
    monthLabel: formatMonth(item.month),
  }));

  const totalVendas = metrics.vendasPorPlano.planoUnico + metrics.vendasPorPlano.planoMensal;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Gráfico de Barras - Evolução de Receita */}
      <div className="metric-card overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-display text-lg font-semibold text-text-primary">
                Evolução de Receita
              </h3>
              <p className="text-sm text-text-secondary mt-0.5">
                Últimos 3 meses
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-text-secondary">Venda Única</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <span className="text-text-secondary">Assinatura</span>
              </div>
            </div>
          </div>

          <div className="h-[280px] min-w-0">
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
                <BarChart
                  data={barData}
                  margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.05)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="monthLabel"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }}
                    tickFormatter={(value) =>
                      value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value
                    }
                  />
                  <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
                  <Bar
                    dataKey="vendaUnica"
                    name="Venda Única"
                    fill={COLORS.vendaUnica}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={50}
                  />
                  <Bar
                    dataKey="assinatura"
                    name="Assinatura"
                    fill={COLORS.assinatura}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={50}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-8 h-8 text-text-tertiary"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                  </div>
                  <p className="text-text-secondary text-sm">
                    Sem dados de vendas ainda
                  </p>
                  <p className="text-text-tertiary text-xs mt-1">
                    Os dados aparecerão aqui conforme as vendas forem fechadas
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Gráfico de Pizza - Distribuição de Vendas */}
      <div className="metric-card overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-display text-lg font-semibold text-text-primary">
                Distribuição de Vendas
              </h3>
              <p className="text-sm text-text-secondary mt-0.5">
                Por tipo de plano
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-text-primary font-display">
                {totalVendas}
              </span>
              <span className="text-text-tertiary text-sm ml-1">total</span>
            </div>
          </div>

          <div className="h-[280px] min-w-0">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        className="transition-all duration-300 hover:opacity-80"
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value) => (
                      <span className="text-text-secondary text-sm">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-8 h-8 text-text-tertiary"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"
                      />
                    </svg>
                  </div>
                  <p className="text-text-secondary text-sm">
                    Sem vendas registradas
                  </p>
                  <p className="text-text-tertiary text-xs mt-1">
                    Feche vendas para ver a distribuição
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Resumo abaixo do gráfico */}
          {pieData.length > 0 && (
            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/[0.04]">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-text-secondary text-xs">Plano Único</span>
                </div>
                <span className="text-xl font-bold text-emerald-400">
                  {metrics.vendasPorPlano.planoUnico}
                </span>
                <span className="text-text-tertiary text-xs ml-1">
                  ({totalVendas > 0 ? ((metrics.vendasPorPlano.planoUnico / totalVendas) * 100).toFixed(0) : 0}%)
                </span>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-purple-500" />
                  <span className="text-text-secondary text-xs">Plano Mensal</span>
                </div>
                <span className="text-xl font-bold text-purple-400">
                  {metrics.vendasPorPlano.planoMensal}
                </span>
                <span className="text-text-tertiary text-xs ml-1">
                  ({totalVendas > 0 ? ((metrics.vendasPorPlano.planoMensal / totalVendas) * 100).toFixed(0) : 0}%)
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
