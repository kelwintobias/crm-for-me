import type { Lead, User, LeadSource, PlanType, PipelineStage } from "@prisma/client";

export type { Lead, User, LeadSource, PlanType, PipelineStage };

export interface LeadWithUser extends Lead {
  user: User;
}

export interface PlainLead extends Omit<Lead, 'value'> {
  value: number;
}

export interface PlainUser extends Omit<User, 'commissionRate'> {
  commissionRate: number;
}

export interface KanbanColumn {
  id: PipelineStage;
  title: string;
  leads: PlainLead[];
}

export interface DashboardMetrics {
  // Contadores basicos
  leadsNaEsteira: number;
  vendasUnicas: number;
  vendasMensais: number;
  // Metricas financeiras
  faturamentoTotal: number;
  faturamentoUnico: number;
  mrrAtual: number;
  pipelineValue: number;
  ticketMedio: number;
  // Dados para graficos
  chartData: Array<{
    month: string;
    vendaUnica: number;
    assinatura: number;
  }>;
  vendasPorPlano: {
    planoUnico: number;
    planoMensal: number;
  };
}

// ============================================
// PRECOS DOS PLANOS (Referencia para o frontend)
// ============================================
// IMPORTANTE: Os valores reais sao calculados no backend
// Este objeto e apenas para exibicao e referencia
export const PLAN_PRICES = {
  INDEFINIDO: 0,
  PLANO_UNICO: 35.90,
  PLANO_MENSAL: 45.90,
} as const;

// ============================================
// LABELS PARA EXIBICAO
// ============================================

export const STAGE_LABELS: Record<PipelineStage, string> = {
  NOVOS: "Novos",
  EM_CONTATO: "Em Contato",
  VENDIDO_UNICO: "Vendido - Unico",
  VENDIDO_MENSAL: "Vendido - Mensal",
  PERDIDO: "Perdido/Arquivado",
};

export const SOURCE_LABELS: Record<LeadSource, string> = {
  INSTAGRAM: "Instagram",
  GOOGLE: "Google",
  INDICACAO: "Indicacao",
  OUTRO: "Outro",
};

export const PLAN_LABELS: Record<PlanType, string> = {
  INDEFINIDO: "Indefinido",
  PLANO_UNICO: "Plano Unico",
  PLANO_MENSAL: "Plano Mensal",
};

// Cores das badges por origem
export const SOURCE_BADGE_VARIANTS: Record<
  LeadSource,
  "instagram" | "google" | "indicacao" | "secondary"
> = {
  INSTAGRAM: "instagram",
  GOOGLE: "google",
  INDICACAO: "indicacao",
  OUTRO: "secondary",
};

// Cores dos stages para UI
export const STAGE_COLORS: Record<PipelineStage, string> = {
  NOVOS: "bg-blue-500",
  EM_CONTATO: "bg-amber-500",
  VENDIDO_UNICO: "bg-emerald-500",
  VENDIDO_MENSAL: "bg-green-500",
  PERDIDO: "bg-gray-500",
};
