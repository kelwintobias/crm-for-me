"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSellerMetrics } from "@/app/actions/dashboard";
import { STAGE_LABELS } from "@/types";
import { TrendingUp, CalendarDays, Target, BarChart2 } from "lucide-react";

interface SellerDashboardProps {
  userId: string;
}

interface SellerData {
  leadsWorkedToday: number;
  leadsWorkedMonth: number;
  pipeline: Array<{ stage: string; count: number }>;
  totalLeads: number;
  convertedLeads: number;
  taxaConversao: number;
}

export function SellerDashboard({ userId }: SellerDashboardProps) {
  const [data, setData] = useState<SellerData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const result = await getSellerMetrics(userId);
      if (result.success && result.data) {
        setData(result.data);
      }
      setLoading(false);
    }
    load();
  }, [userId]);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6"><div className="h-16 bg-zinc-800 rounded" /></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) {
    return <div className="text-center py-8 text-muted-foreground">Erro ao carregar métricas.</div>;
  }

  const STAGE_ORDER = ["NOVO_LEAD", "EM_NEGOCIACAO", "AGENDADO", "EM_ATENDIMENTO", "POS_VENDA", "PERDIDO", "FINALIZADO"];
  const STAGE_COLORS: Record<string, string> = {
    NOVO_LEAD: "bg-blue-500",
    EM_NEGOCIACAO: "bg-amber-500",
    AGENDADO: "bg-purple-500",
    EM_ATENDIMENTO: "bg-emerald-500",
    POS_VENDA: "bg-cyan-500",
    PERDIDO: "bg-red-500",
    FINALIZADO: "bg-green-500",
  };

  const totalPipelineLeads = data.pipeline.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <CalendarDays className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Leads Hoje</p>
                <p className="text-2xl font-bold">{data.leadsWorkedToday}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <BarChart2 className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Leads no Mês</p>
                <p className="text-2xl font-bold">{data.leadsWorkedMonth}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Target className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Conversões</p>
                <p className="text-2xl font-bold">{data.convertedLeads}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <TrendingUp className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Conversão</p>
                <p className="text-2xl font-bold">{data.taxaConversao}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Pessoal */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pipeline Pessoal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {STAGE_ORDER.map((stage) => {
              const stageData = data.pipeline.find((s) => s.stage === stage);
              const count = stageData?.count || 0;
              const pct = totalPipelineLeads > 0 ? (count / totalPipelineLeads) * 100 : 0;

              return (
                <div key={stage} className="flex items-center gap-3">
                  <span className="text-sm text-zinc-400 w-32 truncate">
                    {STAGE_LABELS[stage as keyof typeof STAGE_LABELS] || stage}
                  </span>
                  <div className="flex-1 h-6 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${STAGE_COLORS[stage] || "bg-zinc-600"} transition-all`}
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-zinc-300 w-8 text-right">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
