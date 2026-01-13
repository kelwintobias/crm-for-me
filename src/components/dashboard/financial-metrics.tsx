"use client";

import { useEffect, useState } from "react";
import {
  DollarSign,
  TrendingUp,
  RefreshCcw,
  Target,
  Wallet,
  Sparkles,
} from "lucide-react";
import type { DashboardMetrics } from "@/types";

interface FinancialMetricsProps {
  metrics: DashboardMetrics;
}

// Formatar moeda brasileira
function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

// Animação de contagem para valores monetários
function AnimatedCurrency({
  value,
  duration = 1500,
}: {
  value: number;
  duration?: number;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);

      // Easing function for smooth deceleration
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(easeOut * value);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return <span>{formatCurrency(count)}</span>;
}

// Animação de contagem para números inteiros
function AnimatedCounter({
  value,
  duration = 1500,
}: {
  value: number;
  duration?: number;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);

      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(easeOut * value));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return <span>{count}</span>;
}

export function FinancialMetrics({ metrics }: FinancialMetricsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
      {/* Faturamento Total */}
      <div className="metric-card group hover:scale-[1.02] transition-all duration-300 animate-fade-in-up">
        <div className="relative p-6 z-10">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-text-secondary text-sm font-medium">
                  Faturamento Total
                </span>
                <Sparkles className="w-3 h-3 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl lg:text-3xl font-bold text-emerald-400 font-display tracking-tight truncate">
                  <AnimatedCurrency value={metrics.faturamentoTotal} />
                </span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover:scale-110 group-hover:shadow-stage-vendido transition-all duration-300 flex-shrink-0">
              <DollarSign className="w-6 h-6 text-emerald-400" />
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-white/[0.04]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-tertiary">Vendas fechadas</span>
              <span className="text-emerald-400 font-medium">
                {metrics.vendasUnicas + metrics.vendasMensais} vendas
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* MRR Atual */}
      <div className="metric-card group hover:scale-[1.02] transition-all duration-300 animate-fade-in-up delay-100">
        <div className="relative p-6 z-10">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-text-secondary text-sm font-medium">
                  MRR Atual
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-brand-accent/20 text-brand-accent rounded-full animate-pulse">
                  RECORRENTE
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl lg:text-3xl font-bold text-brand-accent font-display tracking-tight text-glow truncate">
                  <AnimatedCurrency value={metrics.mrrAtual} />
                </span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center group-hover:scale-110 group-hover:shadow-glow transition-all duration-300 flex-shrink-0">
              <RefreshCcw
                className="w-6 h-6 text-brand-accent group-hover:animate-spin"
                style={{ animationDuration: "3s" }}
              />
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-white/[0.04]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-tertiary">Assinaturas ativas</span>
              <span className="text-brand-accent font-medium">
                <AnimatedCounter value={metrics.vendasMensais} /> clientes
              </span>
            </div>
          </div>
        </div>

        {/* Special glow effect */}
        {metrics.mrrAtual > 0 && (
          <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-brand-accent/5 via-transparent to-transparent pointer-events-none" />
        )}
      </div>

      {/* Pipeline (Na Mesa) */}
      <div className="metric-card group hover:scale-[1.02] transition-all duration-300 animate-fade-in-up delay-200">
        <div className="relative p-6 z-10">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-text-secondary text-sm font-medium">
                  Pipeline
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-blue-500/20 text-blue-400 rounded-full">
                  NA MESA
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl lg:text-3xl font-bold text-blue-400 font-display tracking-tight truncate">
                  <AnimatedCurrency value={metrics.pipelineValue} />
                </span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center group-hover:scale-110 group-hover:shadow-stage-novos transition-all duration-300 flex-shrink-0">
              <Target className="w-6 h-6 text-blue-400" />
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-white/[0.04]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-tertiary">Leads ativos</span>
              <span className="text-blue-400 font-medium">
                <AnimatedCounter value={metrics.leadsNaEsteira} /> leads
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Ticket Médio */}
      <div className="metric-card group hover:scale-[1.02] transition-all duration-300 animate-fade-in-up delay-300">
        <div className="relative p-6 z-10">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-text-secondary text-sm font-medium">
                  Ticket Médio
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl lg:text-3xl font-bold text-amber-400 font-display tracking-tight truncate">
                  <AnimatedCurrency value={metrics.ticketMedio} />
                </span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-all duration-300 flex-shrink-0">
              <Wallet className="w-6 h-6 text-amber-400" />
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-white/[0.04]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-tertiary">Média por venda</span>
              <span className="text-amber-400 font-medium">
                <TrendingUp className="w-3 h-3 inline mr-1" />
                Por cliente
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
