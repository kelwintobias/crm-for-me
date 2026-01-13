import type { Lead, User, LeadSource, PlanType, PipelineStage } from "@prisma/client";

export type { Lead, User, LeadSource, PlanType, PipelineStage };

export interface LeadWithUser extends Lead {
  user: User;
}

export interface KanbanColumn {
  id: PipelineStage;
  title: string;
  leads: Lead[];
}

export interface DashboardMetrics {
  leadsNaEsteira: number;
  vendasUnicas: number;
  vendasMensais: number;
}

// Mapeamento de labels para exibição
export const STAGE_LABELS: Record<PipelineStage, string> = {
  NOVOS: "Novos",
  EM_CONTATO: "Em Contato",
  VENDIDO_UNICO: "Vendido - Único",
  VENDIDO_MENSAL: "Vendido - Mensal",
  PERDIDO: "Perdido/Arquivado",
};

export const SOURCE_LABELS: Record<LeadSource, string> = {
  INSTAGRAM: "Instagram",
  GOOGLE: "Google",
  INDICACAO: "Indicação",
  OUTRO: "Outro",
};

export const PLAN_LABELS: Record<PlanType, string> = {
  INDEFINIDO: "Indefinido",
  PLANO_UNICO: "Plano Único",
  PLANO_MENSAL: "Plano Mensal",
};

// Cores das badges por origem
export const SOURCE_BADGE_VARIANTS: Record<LeadSource, "instagram" | "google" | "indicacao" | "secondary"> = {
  INSTAGRAM: "instagram",
  GOOGLE: "google",
  INDICACAO: "indicacao",
  OUTRO: "secondary",
};
