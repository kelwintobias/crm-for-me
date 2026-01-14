import type {
  Lead,
  User,
  LeadSource,
  PlanType,
  PipelineStage,
  Appointment,
  AppointmentStatus,
  AppointmentHistory,
  HistoryAction,
} from "@prisma/client";

export type {
  Lead,
  User,
  LeadSource,
  PlanType,
  PipelineStage,
  Appointment,
  AppointmentStatus,
  AppointmentHistory,
  HistoryAction,
};

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
  NOVO_LEAD: "Novo Lead",
  EM_NEGOCIACAO: "Em Negociação",
  AGENDADO: "Agendado",
  EM_ATENDIMENTO: "Em Atendimento",
  POS_VENDA: "Pós-Venda",
  FINALIZADO: "Finalizado",
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
  NOVO_LEAD: "bg-blue-500",
  EM_NEGOCIACAO: "bg-amber-500",
  AGENDADO: "bg-purple-500",
  EM_ATENDIMENTO: "bg-emerald-500",
  POS_VENDA: "bg-cyan-500",
  FINALIZADO: "bg-green-500",
};

// ============================================
// AGENDAMENTOS
// ============================================

export interface PlainAppointment extends Omit<Appointment, 'scheduledAt' | 'createdAt' | 'updatedAt' | 'canceledAt'> {
  scheduledAt: string;
  createdAt: string;
  updatedAt: string;
  canceledAt: string | null;
}

export interface AppointmentWithDetails extends PlainAppointment {
  lead: {
    id: string;
    name: string;
    phone: string;
  };
  user: {
    name: string | null;
    email: string;
  };
  isOwner: boolean;
}

export interface TimeSlot {
  time: string;
  available: boolean;
  scheduledAt: string;
}

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  SCHEDULED: "Agendado",
  COMPLETED: "Concluído",
  CANCELED: "Cancelado",
  NO_SHOW: "Não compareceu",
};

export const HISTORY_ACTION_LABELS: Record<HistoryAction, string> = {
  CREATED: "Criado",
  RESCHEDULED: "Remarcado",
  CANCELED: "Cancelado",
  COMPLETED: "Concluído",
};
