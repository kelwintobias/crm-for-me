"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { LeadSource, PlanType, PipelineStage } from "@prisma/client";

// Schema de validação para novo lead
const createLeadSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  phone: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos"),
  source: z.enum(["INSTAGRAM", "GOOGLE", "INDICACAO", "OUTRO"]),
});

// Schema de validação para atualização de lead
const updateLeadSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Nome é obrigatório").optional(),
  phone: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos").optional(),
  source: z.enum(["INSTAGRAM", "GOOGLE", "INDICACAO", "OUTRO"]).optional(),
  plan: z.enum(["INDEFINIDO", "PLANO_UNICO", "PLANO_MENSAL"]).optional(),
  stage: z.enum(["NOVOS", "EM_CONTATO", "VENDIDO_UNICO", "VENDIDO_MENSAL", "PERDIDO"]).optional(),
  notes: z.string().nullable().optional(),
});

async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Não autorizado");
  }

  // Busca ou cria o usuário no Prisma
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

export async function createLead(formData: FormData) {
  try {
    const user = await getCurrentUser();

    const rawData = {
      name: formData.get("name") as string,
      phone: (formData.get("phone") as string).replace(/\D/g, ""),
      source: formData.get("source") as LeadSource,
    };

    const validatedData = createLeadSchema.parse(rawData);

    const lead = await prisma.lead.create({
      data: {
        ...validatedData,
        userId: user.id,
      },
    });

    revalidatePath("/");
    return { success: true, data: lead };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: "Erro ao criar lead" };
  }
}

export async function updateLead(data: {
  id: string;
  name?: string;
  phone?: string;
  source?: LeadSource;
  plan?: PlanType;
  stage?: PipelineStage;
  notes?: string | null;
}) {
  try {
    const user = await getCurrentUser();

    const validatedData = updateLeadSchema.parse(data);

    // Verifica se o lead pertence ao usuário
    const existingLead = await prisma.lead.findFirst({
      where: {
        id: validatedData.id,
        userId: user.id,
        deletedAt: null,
      },
    });

    if (!existingLead) {
      return { success: false, error: "Lead não encontrado" };
    }

    const lead = await prisma.lead.update({
      where: { id: validatedData.id },
      data: {
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.phone && { phone: validatedData.phone.replace(/\D/g, "") }),
        ...(validatedData.source && { source: validatedData.source }),
        ...(validatedData.plan && { plan: validatedData.plan }),
        ...(validatedData.stage && { stage: validatedData.stage }),
        ...(validatedData.notes !== undefined && { notes: validatedData.notes }),
      },
    });

    revalidatePath("/");
    return { success: true, data: lead };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: "Erro ao atualizar lead" };
  }
}

export async function updateLeadStage(id: string, stage: PipelineStage) {
  try {
    const user = await getCurrentUser();

    // Verifica se o lead pertence ao usuário
    const existingLead = await prisma.lead.findFirst({
      where: {
        id,
        userId: user.id,
        deletedAt: null,
      },
    });

    if (!existingLead) {
      return { success: false, error: "Lead não encontrado" };
    }

    const lead = await prisma.lead.update({
      where: { id },
      data: { stage },
    });

    revalidatePath("/");
    return { success: true, data: lead };
  } catch {
    return { success: false, error: "Erro ao mover lead" };
  }
}

export async function getLeads() {
  try {
    const user = await getCurrentUser();

    const leads = await prisma.lead.findMany({
      where: {
        userId: user.id,
        deletedAt: null,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return { success: true, data: leads };
  } catch {
    return { success: false, error: "Erro ao buscar leads", data: [] };
  }
}

export async function getMetrics() {
  try {
    const user = await getCurrentUser();

    // Início do mês atual
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [leadsNaEsteira, vendasUnicas, vendasMensais] = await Promise.all([
      // Leads na esteira (não vendidos e não perdidos)
      prisma.lead.count({
        where: {
          userId: user.id,
          deletedAt: null,
          stage: {
            in: ["NOVOS", "EM_CONTATO"],
          },
        },
      }),
      // Vendas únicas no mês
      prisma.lead.count({
        where: {
          userId: user.id,
          deletedAt: null,
          stage: "VENDIDO_UNICO",
          updatedAt: {
            gte: startOfMonth,
          },
        },
      }),
      // Vendas mensais no mês
      prisma.lead.count({
        where: {
          userId: user.id,
          deletedAt: null,
          stage: "VENDIDO_MENSAL",
          updatedAt: {
            gte: startOfMonth,
          },
        },
      }),
    ]);

    return {
      success: true,
      data: {
        leadsNaEsteira,
        vendasUnicas,
        vendasMensais,
      },
    };
  } catch {
    return {
      success: false,
      error: "Erro ao buscar métricas",
      data: { leadsNaEsteira: 0, vendasUnicas: 0, vendasMensais: 0 },
    };
  }
}

export async function deleteLead(id: string) {
  try {
    const user = await getCurrentUser();

    // Soft delete
    await prisma.lead.update({
      where: {
        id,
        userId: user.id,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    revalidatePath("/");
    return { success: true };
  } catch {
    return { success: false, error: "Erro ao excluir lead" };
  }
}
