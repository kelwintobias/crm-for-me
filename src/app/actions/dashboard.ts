"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { subMonths, format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

// ============================================
// AUTENTICACAO
// ============================================

async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Nao autorizado");
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email! },
  });

  if (!dbUser) throw new Error("Usuario nao encontrado");

  return dbUser;
}

// ============================================
// DASHBOARD METRICS (Server Action)
// ============================================

export async function getDashboardMetrics() {
  try {
    const user = await getCurrentUser();

    // Periodos para comparacao
    const now = new Date();
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    // Executa todas as queries em paralelo para performance
    const [
      totalRevenueResult,
      mrrResult,
      pipelineResult,
      averageTicketResult,
      salesDistribution,
      revenueByMonth,
      // Metricas do mes anterior para comparacao
      prevTotalRevenueResult,
      prevMrrResult,
      prevPipelineResult,
      prevAverageTicketResult,
      // Distribuicao por origem
      sourceDistribution,
      // Funil e conversao
      stageDistribution,
      totalLeadsCount,
      vendidosCount,
    ] = await Promise.all([
      // 1. KPI: Faturamento Total (soma de VENDIDO_UNICO + VENDIDO_MENSAL)
      prisma.lead.aggregate({
        _sum: { value: true },
        where: {
          userId: user.id,
          stage: { in: ["VENDIDO_UNICO", "VENDIDO_MENSAL"] },
          deletedAt: null,
        },
      }),

      // 2. KPI: MRR - Monthly Recurring Revenue (apenas VENDIDO_MENSAL)
      prisma.lead.aggregate({
        _sum: { value: true },
        where: {
          userId: user.id,
          stage: "VENDIDO_MENSAL",
          deletedAt: null,
        },
      }),

      // 3. KPI: Pipeline (valor potencial em NOVOS + EM_CONTATO)
      prisma.lead.aggregate({
        _sum: { value: true },
        where: {
          userId: user.id,
          stage: { in: ["NOVOS", "EM_CONTATO"] },
          deletedAt: null,
        },
      }),

      // 4. KPI: Ticket Medio (media das vendas realizadas)
      prisma.lead.aggregate({
        _avg: { value: true },
        where: {
          userId: user.id,
          stage: { in: ["VENDIDO_UNICO", "VENDIDO_MENSAL"] },
          deletedAt: null,
        },
      }),

      // 5. Grafico: Distribuicao de Vendas por Plano (PieChart)
      prisma.lead.groupBy({
        by: ["plan"],
        _count: { id: true },
        _sum: { value: true },
        where: {
          userId: user.id,
          stage: { in: ["VENDIDO_UNICO", "VENDIDO_MENSAL"] },
          deletedAt: null,
        },
      }),

      // 6. Grafico: Evolucao de Receita (ultimos 3 meses)
      prisma.lead.findMany({
        where: {
          userId: user.id,
          stage: { in: ["VENDIDO_UNICO", "VENDIDO_MENSAL"] },
          createdAt: { gte: subMonths(new Date(), 3) },
          deletedAt: null,
        },
        select: {
          createdAt: true,
          value: true,
          plan: true,
        },
        orderBy: { createdAt: "asc" },
      }),

      // 7. KPI Anterior: Faturamento do mes passado
      prisma.lead.aggregate({
        _sum: { value: true },
        where: {
          userId: user.id,
          stage: { in: ["VENDIDO_UNICO", "VENDIDO_MENSAL"] },
          createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
          deletedAt: null,
        },
      }),

      // 8. KPI Anterior: MRR do mes passado
      prisma.lead.aggregate({
        _sum: { value: true },
        where: {
          userId: user.id,
          stage: "VENDIDO_MENSAL",
          createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
          deletedAt: null,
        },
      }),

      // 9. KPI Anterior: Pipeline do mes passado
      prisma.lead.aggregate({
        _sum: { value: true },
        where: {
          userId: user.id,
          stage: { in: ["NOVOS", "EM_CONTATO"] },
          createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
          deletedAt: null,
        },
      }),

      // 10. KPI Anterior: Ticket Medio do mes passado
      prisma.lead.aggregate({
        _avg: { value: true },
        where: {
          userId: user.id,
          stage: { in: ["VENDIDO_UNICO", "VENDIDO_MENSAL"] },
          createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
          deletedAt: null,
        },
      }),

      // 11. Grafico: Distribuicao por Origem (todos os leads)
      prisma.lead.groupBy({
        by: ["source"],
        _count: { id: true },
        where: {
          userId: user.id,
          deletedAt: null,
        },
      }),

      // 12. Funil: Contagem por Stage
      prisma.lead.groupBy({
        by: ["stage"],
        _count: { id: true },
        where: {
          userId: user.id,
          deletedAt: null,
        },
      }),

      // 13. Total de leads
      prisma.lead.count({
        where: {
          userId: user.id,
          deletedAt: null,
        },
      }),

      // 14. Total de vendidos
      prisma.lead.count({
        where: {
          userId: user.id,
          stage: { in: ["VENDIDO_UNICO", "VENDIDO_MENSAL"] },
          deletedAt: null,
        },
      }),
    ]);

    // Processa dados do grafico de evolucao mensal
    const monthlyRevenueMap = new Map<
      string,
      { name: string; unico: number; mensal: number; total: number }
    >();

    // Inicializa os ultimos 3 meses para garantir que aparecem no grafico
    for (let i = 2; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthKey = format(date, "MMM", { locale: ptBR }).toUpperCase();
      monthlyRevenueMap.set(monthKey, {
        name: monthKey,
        unico: 0,
        mensal: 0,
        total: 0,
      });
    }

    // Preenche com dados reais
    revenueByMonth.forEach((lead) => {
      const monthKey = format(lead.createdAt, "MMM", { locale: ptBR }).toUpperCase();

      if (!monthlyRevenueMap.has(monthKey)) {
        monthlyRevenueMap.set(monthKey, {
          name: monthKey,
          unico: 0,
          mensal: 0,
          total: 0,
        });
      }

      const entry = monthlyRevenueMap.get(monthKey)!;
      const val = Number(lead.value);

      if (lead.plan === "PLANO_UNICO") {
        entry.unico += val;
      } else if (lead.plan === "PLANO_MENSAL") {
        entry.mensal += val;
      }
      entry.total += val;
    });

    // Converte para array ordenado cronologicamente
    const revenueChartData = Array.from(monthlyRevenueMap.values());

    // Formata distribuicao para o PieChart
    const distributionData = salesDistribution
      .filter((d) => d.plan !== "INDEFINIDO")
      .map((d) => ({
        name: d.plan === "PLANO_UNICO" ? "Plano Unico" : "Plano Mensal",
        value: d._count.id,
        revenue: Number(d._sum.value || 0),
      }));

    // Formata distribuicao por origem
    const SOURCE_LABELS: Record<string, string> = {
      INSTAGRAM: "Instagram",
      GOOGLE: "Google",
      INDICACAO: "Indicacao",
      OUTRO: "Outro",
    };

    const sourceData = sourceDistribution.map((d) => ({
      name: SOURCE_LABELS[d.source] || d.source,
      value: d._count.id,
      source: d.source,
    }));

    // Formata dados do funil
    const STAGE_ORDER = ["NOVOS", "EM_CONTATO", "VENDIDO_UNICO", "VENDIDO_MENSAL", "PERDIDO"];
    const STAGE_LABELS: Record<string, string> = {
      NOVOS: "Novos",
      EM_CONTATO: "Em Contato",
      VENDIDO_UNICO: "Vendido Unico",
      VENDIDO_MENSAL: "Vendido Mensal",
      PERDIDO: "Perdido",
    };

    const funnelData = STAGE_ORDER.map((stage) => {
      const found = stageDistribution.find((d) => d.stage === stage);
      return {
        stage,
        name: STAGE_LABELS[stage] || stage,
        value: found?._count.id || 0,
      };
    });

    // Taxa de conversao
    const taxaConversao = totalLeadsCount > 0
      ? Math.round((vendidosCount / totalLeadsCount) * 100)
      : 0;

    return {
      success: true,
      data: {
        kpis: {
          totalRevenue: Number(totalRevenueResult._sum.value || 0),
          totalRevenuePrev: Number(prevTotalRevenueResult._sum.value || 0),
          mrr: Number(mrrResult._sum.value || 0),
          mrrPrev: Number(prevMrrResult._sum.value || 0),
          pipeline: Number(pipelineResult._sum.value || 0),
          pipelinePrev: Number(prevPipelineResult._sum.value || 0),
          averageTicket: Number(averageTicketResult._avg.value || 0),
          averageTicketPrev: Number(prevAverageTicketResult._avg.value || 0),
        },
        charts: {
          distribution: distributionData,
          revenueEvolution: revenueChartData,
          sourceDistribution: sourceData,
          funnel: funnelData,
        },
        metrics: {
          totalLeads: totalLeadsCount,
          vendidos: vendidosCount,
          taxaConversao,
          leadsEmContato: funnelData.find(d => d.stage === "EM_CONTATO")?.value || 0,
          leadsPerdidos: funnelData.find(d => d.stage === "PERDIDO")?.value || 0,
        },
      },
    };
  } catch (error) {
    console.error("Erro ao buscar metricas do dashboard:", error);
    return { success: false, error: "Erro ao carregar dashboard" };
  }
}

// ============================================
// METRICAS DETALHADAS (Para relatorios futuros)
// ============================================

export async function getDetailedMetrics() {
  try {
    const user = await getCurrentUser();

    // Contagem por stage
    const stageCount = await prisma.lead.groupBy({
      by: ["stage"],
      _count: { id: true },
      where: {
        userId: user.id,
        deletedAt: null,
      },
    });

    // Contagem por source
    const sourceCount = await prisma.lead.groupBy({
      by: ["source"],
      _count: { id: true },
      where: {
        userId: user.id,
        deletedAt: null,
      },
    });

    // Taxa de conversao
    const totalLeads = await prisma.lead.count({
      where: {
        userId: user.id,
        deletedAt: null,
      },
    });

    const vendidos = await prisma.lead.count({
      where: {
        userId: user.id,
        stage: { in: ["VENDIDO_UNICO", "VENDIDO_MENSAL"] },
        deletedAt: null,
      },
    });

    const taxaConversao = totalLeads > 0 ? (vendidos / totalLeads) * 100 : 0;

    return {
      success: true,
      data: {
        stageCount: stageCount.map((s) => ({
          stage: s.stage,
          count: s._count.id,
        })),
        sourceCount: sourceCount.map((s) => ({
          source: s.source,
          count: s._count.id,
        })),
        totalLeads,
        vendidos,
        taxaConversao: Math.round(taxaConversao * 100) / 100,
      },
    };
  } catch (error) {
    console.error("Erro ao buscar metricas detalhadas:", error);
    return { success: false, error: "Erro ao carregar metricas" };
  }
}
