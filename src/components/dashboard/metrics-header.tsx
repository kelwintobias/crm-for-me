"use client";

import { TrendingUp, Package, RefreshCcw } from "lucide-react";
import type { DashboardMetrics } from "@/types";

interface MetricsHeaderProps {
  metrics: DashboardMetrics;
}

export function MetricsHeader({ metrics }: MetricsHeaderProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Leads na Esteira */}
      <div className="bg-brand-card rounded-xl p-6 border border-border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-text-secondary text-sm">Leads na Esteira</p>
            <p className="text-3xl font-bold text-text-primary mt-1">
              {metrics.leadsNaEsteira}
            </p>
          </div>
          <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-blue-500" />
          </div>
        </div>
        <p className="text-xs text-text-secondary mt-3">
          Novos + Em Contato
        </p>
      </div>

      {/* Vendas Únicas */}
      <div className="bg-brand-card rounded-xl p-6 border border-border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-text-secondary text-sm">Vendas Únicas</p>
            <p className="text-3xl font-bold text-green-500 mt-1">
              {metrics.vendasUnicas}
            </p>
          </div>
          <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
            <Package className="w-6 h-6 text-green-500" />
          </div>
        </div>
        <p className="text-xs text-text-secondary mt-3">
          Este mês
        </p>
      </div>

      {/* Vendas Mensais */}
      <div className="bg-brand-card rounded-xl p-6 border border-border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-text-secondary text-sm">Vendas Mensais</p>
            <p className="text-3xl font-bold text-brand-accent mt-1">
              {metrics.vendasMensais}
            </p>
          </div>
          <div className="w-12 h-12 bg-brand-accent/20 rounded-lg flex items-center justify-center">
            <RefreshCcw className="w-6 h-6 text-brand-accent" />
          </div>
        </div>
        <p className="text-xs text-text-secondary mt-3">
          Este mês
        </p>
      </div>
    </div>
  );
}
