"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Package, RefreshCcw, Sparkles } from "lucide-react";
import type { DashboardMetrics } from "@/types";

interface MetricsHeaderProps {
  metrics: DashboardMetrics;
}

function AnimatedCounter({ value, duration = 1500 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);

      // Easing function for smooth deceleration
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

export function MetricsHeader({ metrics }: MetricsHeaderProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
      {/* Leads na Esteira */}
      <div className="metric-card group hover:scale-[1.02] transition-all duration-300 animate-fade-in-up">
        <div className="relative p-6 z-10">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-text-secondary text-sm font-medium">Leads na Esteira</span>
                <Sparkles className="w-3 h-3 text-brand-accent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl lg:text-5xl font-bold text-text-primary font-display tracking-tight">
                  <AnimatedCounter value={metrics.leadsNaEsteira} />
                </span>
                <span className="text-sm text-text-tertiary">leads</span>
              </div>
            </div>
            <div className="w-14 h-14 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center group-hover:scale-110 group-hover:shadow-stage-novos transition-all duration-300">
              <TrendingUp className="w-7 h-7 text-blue-400" />
            </div>
          </div>

          {/* Progress indicator */}
          <div className="mt-4 pt-4 border-t border-white/[0.04]">
            <div className="flex items-center justify-between text-xs text-text-tertiary mb-2">
              <span>Pipeline ativo</span>
              <span className="text-blue-400">Novos + Em Contato</span>
            </div>
            <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(100, metrics.leadsNaEsteira * 5)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Vendas Únicas */}
      <div className="metric-card group hover:scale-[1.02] transition-all duration-300 animate-fade-in-up delay-100">
        <div className="relative p-6 z-10">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-text-secondary text-sm font-medium">Vendas Únicas</span>
                {metrics.vendasUnicas > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 rounded-full">
                    +{metrics.vendasUnicas}
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl lg:text-5xl font-bold text-emerald-400 font-display tracking-tight">
                  <AnimatedCounter value={metrics.vendasUnicas} />
                </span>
                <span className="text-sm text-text-tertiary">este mês</span>
              </div>
            </div>
            <div className="w-14 h-14 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover:scale-110 group-hover:shadow-stage-vendido transition-all duration-300">
              <Package className="w-7 h-7 text-emerald-400" />
            </div>
          </div>

          {/* Visual indicator */}
          <div className="mt-4 pt-4 border-t border-white/[0.04]">
            <div className="flex items-center gap-2">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-2 rounded-full transition-all duration-500 ${
                    i < metrics.vendasUnicas
                      ? "bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-sm shadow-emerald-500/30"
                      : "bg-white/[0.05]"
                  }`}
                  style={{ transitionDelay: `${i * 100}ms` }}
                />
              ))}
            </div>
            <div className="mt-2 text-xs text-text-tertiary">
              Pacotes one-time fechados
            </div>
          </div>
        </div>
      </div>

      {/* Vendas Mensais */}
      <div className="metric-card group hover:scale-[1.02] transition-all duration-300 animate-fade-in-up delay-200">
        <div className="relative p-6 z-10">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-text-secondary text-sm font-medium">Vendas Mensais</span>
                {metrics.vendasMensais > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-brand-accent/20 text-brand-accent rounded-full animate-pulse">
                    RECORRENTE
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl lg:text-5xl font-bold text-brand-accent font-display tracking-tight text-glow">
                  <AnimatedCounter value={metrics.vendasMensais} />
                </span>
                <span className="text-sm text-text-tertiary">este mês</span>
              </div>
            </div>
            <div className="w-14 h-14 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center group-hover:scale-110 group-hover:shadow-glow transition-all duration-300">
              <RefreshCcw className="w-7 h-7 text-brand-accent group-hover:animate-spin" style={{ animationDuration: '3s' }} />
            </div>
          </div>

          {/* Revenue indicator */}
          <div className="mt-4 pt-4 border-t border-white/[0.04]">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-1">
                {[...Array(Math.min(4, metrics.vendasMensais || 1))].map((_, i) => (
                  <div
                    key={i}
                    className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-accent to-brand-accent-dim border-2 border-brand-card flex items-center justify-center"
                    style={{ zIndex: 4 - i }}
                  >
                    <span className="text-[8px] font-bold text-text-dark">R$</span>
                  </div>
                ))}
              </div>
              <span className="text-xs text-text-tertiary">
                Assinaturas ativas
              </span>
            </div>
          </div>
        </div>

        {/* Special glow effect for sales */}
        {metrics.vendasMensais > 0 && (
          <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-brand-accent/5 via-transparent to-transparent pointer-events-none" />
        )}
      </div>
    </div>
  );
}
