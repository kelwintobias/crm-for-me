"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { LeadSource, PlanType, PipelineStage, Lead } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

// ============================================
// HELPERS
// ============================================

function serializeLead(lead: Lead) {
  return {
    ...lead,
    value: Number(lead.value),
  };
}

// ============================================
// PRECOS FIXOS DOS PLANOS (REGRA DE NEGOCIO)
// ============================================
// IMPORTANTE: Estes valores sao a unica fonte de verdade
// Qualquer alteracao de preco deve ser feita APENAS aqui
const PLAN_PRICES: Record<PlanType, number> = {
  INDEFINIDO: 0,
  INTERMEDIARIO: 25.00,
  AVANCADO: 40.00,
  ELITE: 50.00,
  PRO_PLUS: 75.00,
  ULTRA_PRO: 100.00,
  EVOLUTION: 150.00,
  PLANO_UNICO: 35.90,
  PLANO_MENSAL: 45.90,
};

// Funcao helper para obter o valor do plano
// O valor e calculado APENAS no backend para evitar manipulacao
function getPlanValue(plan: PlanType): Decimal {
  return new Decimal(PLAN_PRICES[plan]);
}

// ============================================
// SCHEMAS DE VALIDACAO
// ============================================

// BUG-006 FIX: Incluir todos os valores do enum Prisma
const LEAD_SOURCES = ["INSTAGRAM", "INDICACAO", "PAGINA_PARCEIRA", "INFLUENCER", "ANUNCIO", "GOOGLE", "OUTRO"] as const;
const PLAN_TYPES = ["INDEFINIDO", "INTERMEDIARIO", "AVANCADO", "ELITE", "PRO_PLUS", "ULTRA_PRO", "EVOLUTION", "PLANO_UNICO", "PLANO_MENSAL"] as const;

const createLeadSchema = z.object({
  name: z.string().min(1, "Nome e obrigatorio"),
  phone: z.string().min(10, "Telefone deve ter pelo menos 10 digitos"),
  source: z.enum(LEAD_SOURCES),
  plan: z.enum(PLAN_TYPES).optional(),
  stage: z.enum(["NOVO_LEAD", "EM_NEGOCIACAO"]).optional(), // Apenas colunas iniciais permitidas
});

// BUG-006 FIX: Incluir PERDIDO no schema de update
const PIPELINE_STAGES = ["NOVO_LEAD", "EM_NEGOCIACAO", "AGENDADO", "EM_ATENDIMENTO", "POS_VENDA", "PERDIDO", "FINALIZADO"] as const;

const updateLeadSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Nome e obrigatorio").optional(),
  phone: z.string().min(10, "Telefone deve ter pelo menos 10 digitos").optional(),
  source: z.enum(LEAD_SOURCES).optional(),
  plan: z.enum(PLAN_TYPES).optional(),
  stage: z.enum(PIPELINE_STAGES).optional(),
  notes: z.string().nullable().optional(),
  userId: z.string().uuid().optional(),
  // Campos do "Espelho da Planilha"
  email: z.string().email("Email invalido").nullable().optional().or(z.literal("")),
  contractDate: z.string().nullable().optional(),
  instagram: z.string().nullable().optional(),
  cpf: z.string().nullable().optional(),
  packageType: z.string().nullable().optional(),
  addOns: z.string().nullable().optional(),
  termsAccepted: z.boolean().optional(),
});

// ============================================
// AUTENTICACAO
// ============================================

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Nao autorizado");
  }

  // Busca ou cria o usuario no Prisma
  let dbUser = await prisma.user.findUnique({
    where: { email: user.email! },
  });

  if (!dbUser) {
    dbUser = await prisma.user.create({
      data: {
        id: user.id,
        email: user.email!,
        name: user.user_metadata?.full_name || user.email?.split("@")[0],
      },
    });
  }

  return dbUser;
}

// ============================================
// CRIAR LEAD
// ============================================

// ============================================
// CRIAR LEAD (SERVICE)
// ============================================

export type CreateLeadInput = {
  name: string;
  phone: string;
  source: LeadSource;
  plan?: PlanType;
  stage?: PipelineStage;
  userId?: string; // Opcional: se não passar, tenta pegar do usuário logado ou usa um padrão
};

export async function createLeadService(input: CreateLeadInput) {
  // Se userId não for fornecido, tenta pegar do usuário logado
  let userId = input.userId;

  if (!userId) {
    try {
      const user = await getCurrentUser();
      userId = user.id;
    } catch (error) {
      throw new Error("UserId obrigatório ou usuário não autenticado");
    }
  }

  const plan = input.plan || "INDEFINIDO";
  const stage = input.stage || "NOVO_LEAD";

  // SEGURANCA: Valor financeiro calculado APENAS no backend
  const value = getPlanValue(plan);

  const lead = await prisma.lead.create({
    data: {
      name: input.name,
      phone: input.phone,
      source: input.source,
      plan: plan,
      stage: stage,
      value: value,
      userId: userId,
    },
  });

  return lead;
}

// ============================================
// CRIAR LEAD (SERVER ACTION)
// ============================================

export async function createLead(formData: FormData) {
  try {
    // Apenas para garantir que o usuário está logado antes de processar
    const user = await getCurrentUser();

    const rawData = {
      name: formData.get("name") as string,
      phone: (formData.get("phone") as string).replace(/\D/g, ""),
      source: formData.get("source") as LeadSource,
      plan: (formData.get("plan") as PlanType) || "INDEFINIDO",
      stage: (formData.get("stage") as PipelineStage) || undefined,
    };

    const validatedData = createLeadSchema.parse(rawData);

    const lead = await createLeadService({
      ...validatedData,
      userId: user.id
    });

    revalidatePath("/");
    return { success: true, data: serializeLead(lead) };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: "Erro ao criar lead" };
  }
}

// ============================================
// ATUALIZAR LEAD
// ============================================

export async function updateLead(data: {
  id: string;
  name?: string;
  phone?: string;
  source?: LeadSource;
  plan?: PlanType;
  stage?: PipelineStage;
  notes?: string | null;
  userId?: string;
  // Campos do "Espelho da Planilha"
  email?: string | null;
  contractDate?: string | null;
  instagram?: string | null;
  cpf?: string | null;
  packageType?: string | null;
  addOns?: string | null;
  termsAccepted?: boolean;
}) {
  try {
    await getCurrentUser();

    const validatedData = updateLeadSchema.parse(data);

    // Verifica se o lead existe
    const existingLead = await prisma.lead.findFirst({
      where: {
        id: validatedData.id,
        deletedAt: null,
      },
    });

    if (!existingLead) {
      return { success: false, error: "Lead nao encontrado" };
    }

    // Monta o objeto de atualizacao
    const updateData: Record<string, unknown> = {
      ...(validatedData.name && { name: validatedData.name }),
      ...(validatedData.phone && { phone: validatedData.phone.replace(/\D/g, "") }),
      ...(validatedData.source && { source: validatedData.source }),
      ...(validatedData.notes !== undefined && { notes: validatedData.notes }),
      // Campos do "Espelho da Planilha"
      ...(validatedData.email !== undefined && { email: validatedData.email || null }),
      ...(validatedData.contractDate !== undefined && {
        contractDate: validatedData.contractDate ? new Date(validatedData.contractDate) : null,
      }),
      ...(validatedData.instagram !== undefined && { instagram: validatedData.instagram || null }),
      ...(validatedData.cpf !== undefined && { cpf: validatedData.cpf || null }),
      ...(validatedData.packageType !== undefined && { packageType: validatedData.packageType || null }),
      ...(validatedData.addOns !== undefined && { addOns: validatedData.addOns || null }),
      ...(validatedData.termsAccepted !== undefined && { termsAccepted: validatedData.termsAccepted }),
      ...(validatedData.userId && { userId: validatedData.userId }),
    };

    // LOGICA DE CONSISTENCIA: Se o stage mudar para VENDIDO_*
    // o plano e valor sao atualizados automaticamente
    if (validatedData.stage) {
      updateData.stage = validatedData.stage;
    }

    // Se o plano for alterado explicitamente (sem mudanca de stage)
    if (validatedData.plan && !validatedData.stage) {
      updateData.plan = validatedData.plan;
      updateData.value = getPlanValue(validatedData.plan);
    }

    const lead = await prisma.lead.update({
      where: { id: validatedData.id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    revalidatePath("/");
    return {
      success: true,
      data: {
        ...serializeLead(lead),
        owner: lead.user ? {
          id: lead.user.id,
          name: lead.user.name,
          email: lead.user.email,
        } : undefined,
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: "Erro ao atualizar lead" };
  }
}

// ============================================
// MOVER LEAD NO KANBAN (Atualizar Stage)
// ============================================

export async function updateLeadStage(id: string, stage: PipelineStage, lostReason?: string) {
  try {
    await getCurrentUser();

    const existingLead = await prisma.lead.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!existingLead) {
      return { success: false, error: "Lead nao encontrado" };
    }

    // LOGICA DE CONSISTENCIA ao mover no Kanban
    const updateData: Record<string, unknown> = { stage };

    if (stage === 'PERDIDO' && lostReason) {
      updateData.lostReason = lostReason;
    } else if (stage !== 'PERDIDO') {
      updateData.lostReason = null; // Clear reason if moved out of PERDIDO
    }

    const lead = await prisma.lead.update({
      where: { id },
      data: updateData,
    });

    revalidatePath("/");
    return { success: true, data: serializeLead(lead) };
  } catch {
    return { success: false, error: "Erro ao mover lead" };
  }
}

// ============================================
// EXCLUIR LEAD (Soft Delete)
// ============================================

export async function deleteLead(id: string) {
  try {
    await getCurrentUser();

    const existingLead = await prisma.lead.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!existingLead) {
      return { success: false, error: "Lead nao encontrado" };
    }

    await prisma.lead.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    revalidatePath("/");
    return { success: true };
  } catch {
    return { success: false, error: "Erro ao excluir lead" };
  }
}

// ============================================
// LISTAR LEADS DO USUÁRIO (para página de perfil)
// ============================================

export async function getMyLeads() {
  try {
    const user = await getCurrentUser();

    const leads = await prisma.lead.findMany({
      where: {
        userId: user.id,
        deletedAt: null,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 50, // Limita aos 50 mais recentes
    });

    // Estatísticas
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Início da semana (domingo)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Conta leads atualizados hoje
    const todayLeads = leads.filter((lead) => new Date(lead.updatedAt) >= todayStart);
    const weekLeads = leads.filter((lead) => new Date(lead.updatedAt) >= weekStart);
    const monthLeads = leads.filter((lead) => new Date(lead.updatedAt) >= monthStart);

    // Conta finalizados (vendas)
    const finalizadosHoje = todayLeads.filter((l) => l.stage === "FINALIZADO").length;
    const finalizadosSemana = weekLeads.filter((l) => l.stage === "FINALIZADO").length;
    const finalizadosMes = monthLeads.filter((l) => l.stage === "FINALIZADO").length;

    return {
      success: true,
      data: {
        leads: leads.map(serializeLead),
        stats: {
          totalLeads: leads.length,
          leadsHoje: todayLeads.length,
          leadsSemana: weekLeads.length,
          leadsMes: monthLeads.length,
          vendasHoje: finalizadosHoje,
          vendasSemana: finalizadosSemana,
          vendasMes: finalizadosMes,
        },
      },
    };
  } catch (error) {
    console.error("Erro ao buscar meus leads:", error);
    return { success: false, error: "Erro ao buscar leads" };
  }
}

// ============================================
// LISTAR LEADS
// ============================================

export async function getLeads() {
  try {
    // Nota: Auth é validada pelo middleware antes da página carregar
    // Dados são compartilhados entre todos os usuários

    const leads = await prisma.lead.findMany({
      where: {
        deletedAt: null,
        inPipeline: true,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      success: true,
      data: leads.map((lead) => ({
        ...serializeLead(lead),
        owner: lead.user ? {
          id: lead.user.id,
          name: lead.user.name,
          email: lead.user.email,
        } : undefined,
      })),
    };
  } catch (error) {
    console.error("Erro ao buscar leads:", error);
    return { success: false, error: "Erro ao buscar leads" };
  }
}
