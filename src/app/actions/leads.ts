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
};

// Funcao helper para obter o valor do plano
// O valor e calculado APENAS no backend para evitar manipulacao
function getPlanValue(plan: PlanType): Decimal {
  return new Decimal(PLAN_PRICES[plan]);
}

// ============================================
// SCHEMAS DE VALIDACAO
// ============================================

const createLeadSchema = z.object({
  name: z.string().min(1, "Nome e obrigatorio"),
  phone: z.string().min(10, "Telefone deve ter pelo menos 10 digitos"),
  source: z.enum(["INSTAGRAM", "INDICACAO", "PAGINA_PARCEIRA", "INFLUENCER", "ANUNCIO", "OUTRO"]),
  plan: z.enum(["INDEFINIDO", "INTERMEDIARIO", "AVANCADO", "ELITE", "PRO_PLUS", "ULTRA_PRO", "EVOLUTION"]).optional(),
  stage: z.enum(["NOVO_LEAD", "EM_NEGOCIACAO"]).optional(), // Apenas colunas iniciais permitidas
});

const updateLeadSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Nome e obrigatorio").optional(),
  phone: z.string().min(10, "Telefone deve ter pelo menos 10 digitos").optional(),
  source: z.enum(["INSTAGRAM", "INDICACAO", "PAGINA_PARCEIRA", "INFLUENCER", "ANUNCIO", "OUTRO"]).optional(),
  plan: z.enum(["INDEFINIDO", "INTERMEDIARIO", "AVANCADO", "ELITE", "PRO_PLUS", "ULTRA_PRO", "EVOLUTION"]).optional(),
  stage: z.enum(["NOVO_LEAD", "EM_NEGOCIACAO", "AGENDADO", "EM_ATENDIMENTO", "POS_VENDA", "FINALIZADO"]).optional(),
  notes: z.string().nullable().optional(),
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

export async function createLead(formData: FormData) {
  try {
    const user = await getCurrentUser();

    const rawData = {
      name: formData.get("name") as string,
      phone: (formData.get("phone") as string).replace(/\D/g, ""),
      source: formData.get("source") as LeadSource,
      plan: (formData.get("plan") as PlanType) || "INDEFINIDO",
      stage: (formData.get("stage") as PipelineStage) || undefined,
    };

    const validatedData = createLeadSchema.parse(rawData);
    const plan = validatedData.plan || "INDEFINIDO";
    const stage = validatedData.stage || "NOVO_LEAD";

    // SEGURANCA: Valor financeiro calculado APENAS no backend
    // O frontend NAO pode enviar ou manipular este valor
    const value = getPlanValue(plan);

    const lead = await prisma.lead.create({
      data: {
        name: validatedData.name,
        phone: validatedData.phone,
        source: validatedData.source,
        plan: plan,
        stage: stage,
        value: value,
        userId: user.id,
      },
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
    });

    revalidatePath("/");
    return { success: true, data: serializeLead(lead) };
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

export async function updateLeadStage(id: string, stage: PipelineStage) {
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
// LISTAR LEADS
// ============================================

export async function getLeads() {
  try {
    await getCurrentUser();

    const leads = await prisma.lead.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return { success: true, data: leads.map(serializeLead) };
  } catch {
    return { success: false, error: "Erro ao buscar leads" };
  }
}
