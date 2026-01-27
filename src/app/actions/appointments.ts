"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";

// ============================================
// SCHEMAS DE VALIDAÇÃO
// ============================================

const createAppointmentSchema = z.object({
  leadId: z.string().uuid(),
  scheduledAt: z.string().datetime(), // ISO 8601
  duration: z.number().min(15).max(240).default(60),
  notes: z.string().optional(),
});

const updateAppointmentSchema = z.object({
  id: z.string().uuid(),
  scheduledAt: z.string().datetime(),
  notes: z.string().optional(),
});

const cancelAppointmentSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().optional(),
});

// ============================================
// HELPER FUNCTIONS
// ============================================

async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Não autorizado");

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email! },
  });

  if (!dbUser) throw new Error("Usuário não encontrado");
  return dbUser;
}

// Verifica se horário é válido (permite qualquer horário e dia)
function isWithinBusinessHours(date: Date): boolean {
  // Permite agendamento em qualquer horário e dia da semana
  // Permite datas no passado (conforme solicitado)
  return true;
}

// Verifica conflitos de horário
async function hasConflict(
  scheduledAt: Date,
  duration: number,
  excludeAppointmentId?: string
): Promise<boolean> {
  const endTime = new Date(scheduledAt.getTime() + duration * 60000);

  // Busca agendamentos que PODEM conflitar (janela de tempo relevante)
  // Um agendamento existente conflita se:
  // - Começa antes do novo terminar E termina depois do novo começar
  const potentialConflicts = await prisma.appointment.findMany({
    where: {
      status: "SCHEDULED",
      id: excludeAppointmentId ? { not: excludeAppointmentId } : undefined,
      // Filtra apenas agendamentos no mesmo dia para otimização
      scheduledAt: {
        gte: new Date(scheduledAt.getTime() - 24 * 60 * 60000), // 24h antes
        lte: new Date(endTime.getTime() + 24 * 60 * 60000), // 24h depois
      },
    },
    select: {
      scheduledAt: true,
      duration: true,
    },
  });

  // Verifica sobreposição real considerando a duração
  for (const existing of potentialConflicts) {
    const existingEnd = new Date(
      existing.scheduledAt.getTime() + existing.duration * 60000
    );

    // Há conflito se os intervalos se sobrepõem:
    // [scheduledAt, endTime) ∩ [existing.scheduledAt, existingEnd) ≠ ∅
    const hasOverlap = scheduledAt < existingEnd && endTime > existing.scheduledAt;

    if (hasOverlap) {
      return true;
    }
  }

  return false;
}

// ============================================
// AÇÕES PÚBLICAS
// ============================================

// Criar agendamento
export async function createAppointment(data: unknown) {
  try {
    const user = await getCurrentUser();
    const validated = createAppointmentSchema.parse(data);

    const scheduledAt = new Date(validated.scheduledAt);

    // Validações
    if (!isWithinBusinessHours(scheduledAt)) {
      return {
        success: false,
        error: "Não é possível agendar para datas no passado"
      };
    }

    if (await hasConflict(scheduledAt, validated.duration)) {
      return {
        success: false,
        error: "Horário já está reservado"
      };
    }

    // Verifica se o lead existe e pertence ao usuário
    const lead = await prisma.lead.findUnique({
      where: { id: validated.leadId, userId: user.id, deletedAt: null },
    });

    if (!lead) {
      return { success: false, error: "Lead não encontrado" };
    }

    // BUG-002 FIX: Verifica se o lead já possui um agendamento ativo
    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        leadId: validated.leadId,
        status: "SCHEDULED",
      },
    });

    if (existingAppointment) {
      return {
        success: false,
        error: "Este lead já possui um agendamento ativo. Cancele ou conclua o agendamento existente primeiro."
      };
    }

    // Cria agendamento e atualiza stage do lead em uma transação
    const appointment = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Criar agendamento
      const apt = await tx.appointment.create({
        data: {
          leadId: validated.leadId,
          userId: user.id,
          scheduledAt,
          duration: validated.duration,
          notes: validated.notes,
          status: "SCHEDULED",
        },
      });

      // Criar histórico
      await tx.appointmentHistory.create({
        data: {
          appointmentId: apt.id,
          userId: user.id,
          action: "CREATED",
          newValue: JSON.stringify({
            scheduledAt: scheduledAt.toISOString(),
            duration: validated.duration,
          }),
        },
      });

      // Mover lead para coluna AGENDADO
      await tx.lead.update({
        where: { id: validated.leadId },
        data: { stage: "AGENDADO" },
      });

      return apt;
    });

    revalidatePath("/");

    return {
      success: true,
      data: {
        id: appointment.id,
        scheduledAt: appointment.scheduledAt.toISOString(),
      },
    };
  } catch (error) {
    console.error("Erro ao criar agendamento:", error);
    return { success: false, error: "Erro ao criar agendamento" };
  }
}

// Remarcar agendamento
export async function rescheduleAppointment(data: unknown) {
  try {
    const user = await getCurrentUser();
    const validated = updateAppointmentSchema.parse(data);

    const scheduledAt = new Date(validated.scheduledAt);

    // Validações
    if (!isWithinBusinessHours(scheduledAt)) {
      return {
        success: false,
        error: "Não é possível remarcar para datas no passado"
      };
    }

    // Busca agendamento existente
    const existing = await prisma.appointment.findUnique({
      where: { id: validated.id },
      include: { lead: true },
    });

    if (!existing || existing.lead.userId !== user.id) {
      return { success: false, error: "Agendamento não encontrado" };
    }

    if (existing.status !== "SCHEDULED") {
      return {
        success: false,
        error: "Apenas agendamentos ativos podem ser remarcados"
      };
    }

    // Verifica conflito (excluindo o próprio agendamento)
    if (await hasConflict(scheduledAt, existing.duration, validated.id)) {
      return {
        success: false,
        error: "Horário já está reservado"
      };
    }

    // Atualizar agendamento
    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const apt = await tx.appointment.update({
        where: { id: validated.id },
        data: {
          scheduledAt,
          notes: validated.notes,
        },
      });

      // Registrar histórico
      await tx.appointmentHistory.create({
        data: {
          appointmentId: apt.id,
          userId: user.id,
          action: "RESCHEDULED",
          previousValue: JSON.stringify({
            scheduledAt: existing.scheduledAt.toISOString(),
          }),
          newValue: JSON.stringify({
            scheduledAt: scheduledAt.toISOString(),
          }),
        },
      });

      return apt;
    });

    revalidatePath("/");

    return {
      success: true,
      data: {
        id: updated.id,
        scheduledAt: updated.scheduledAt.toISOString(),
      },
    };
  } catch (error) {
    console.error("Erro ao remarcar agendamento:", error);
    return { success: false, error: "Erro ao remarcar agendamento" };
  }
}

// Cancelar agendamento
export async function cancelAppointment(data: unknown) {
  try {
    const user = await getCurrentUser();
    const validated = cancelAppointmentSchema.parse(data);

    const existing = await prisma.appointment.findUnique({
      where: { id: validated.id },
      include: { lead: true },
    });

    if (!existing || existing.lead.userId !== user.id) {
      return { success: false, error: "Agendamento não encontrado" };
    }

    if (existing.status === "CANCELED") {
      return { success: false, error: "Agendamento já foi cancelado" };
    }

    // Cancelar agendamento
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.appointment.update({
        where: { id: validated.id },
        data: {
          status: "CANCELED",
          canceledAt: new Date(),
          notes: validated.reason
            ? `${existing.notes || ""}\nMotivo do cancelamento: ${validated.reason}`
            : existing.notes,
        },
      });

      // Registrar histórico
      await tx.appointmentHistory.create({
        data: {
          appointmentId: validated.id,
          userId: user.id,
          action: "CANCELED",
          newValue: validated.reason || "Sem motivo especificado",
        },
      });

      // BUG-009 FIX: Só volta para EM_NEGOCIACAO se o lead estava em AGENDADO
      // Se estava em stage mais avançado, mantém o progresso
      const advancedStages = ["EM_ATENDIMENTO", "POS_VENDA", "FINALIZADO"];
      if (!advancedStages.includes(existing.lead.stage)) {
        await tx.lead.update({
          where: { id: existing.leadId },
          data: { stage: "EM_NEGOCIACAO" },
        });
      }
    });

    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("Erro ao cancelar agendamento:", error);
    return { success: false, error: "Erro ao cancelar agendamento" };
  }
}

// Buscar horários disponíveis para um dia
export async function getAvailableSlots(date: string) {
  try {
    // Nota: Auth é validada pelo middleware antes da página carregar
    // Dados são compartilhados entre todos os usuários

    // Offset do Brasil (UTC-3)
    const BRT_OFFSET = 3;

    // Configurar o range do dia em UTC
    // Dia começa às 00:00 BRT = 03:00 UTC
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(BRT_OFFSET, 0, 0, 0);

    // Dia termina às 23:59 BRT = 02:59 UTC do dia seguinte
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    // Busca todos os agendamentos que caem neste "dia brasileiro"
    const appointments = await prisma.appointment.findMany({
      where: {
        status: "SCHEDULED",
        scheduledAt: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
      select: {
        scheduledAt: true,
        duration: true,
      },
    });

    // Gera slots de 30 em 30 minutos das 6h às 22h (horário de Brasília)
    const slots: Array<{
      time: string;
      available: boolean;
      scheduledAt: string;
    }> = [];

    for (let hour = 6; hour < 23; hour++) {
      for (const minute of [0, 30]) {
        // Criar data baseada no input string (YYYY-MM-DD -> 00:00 UTC)
        // Ajustar para o horário BRT desejado convertendo para UTC corretamente
        // Ex: 10:00 BRT -> 10 + 3 = 13:00 UTC
        const slotTime = new Date(date);
        slotTime.setUTCHours(hour + BRT_OFFSET, minute, 0, 0);

        // Verifica se há conflito (considerando 1 hora de duração)
        const slotEnd = new Date(slotTime.getTime() + 60 * 60000);

        const hasConflict = appointments.some((apt: { scheduledAt: Date; duration: number }) => {
          const aptEnd = new Date(
            apt.scheduledAt.getTime() + apt.duration * 60000
          );
          return slotTime < aptEnd && slotEnd > apt.scheduledAt;
        });

        slots.push({
          time: `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`,
          available: !hasConflict,
          scheduledAt: slotTime.toISOString(),
        });
      }
    }

    return { success: true, data: slots };
  } catch (error) {
    console.error("Erro ao buscar horários:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao buscar horários"
    };
  }
}

// Buscar agendamentos da semana
export async function getWeekAppointments(startDate: string) {
  try {
    // Nota: Auth é validada pelo middleware antes da página carregar
    // Dados são compartilhados entre todos os usuários

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 7);

    const appointments = await prisma.appointment.findMany({
      where: {
        scheduledAt: { gte: start, lt: end },
        status: { in: ["SCHEDULED", "COMPLETED"] },
      },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { scheduledAt: "asc" },
    });

    return {
      success: true,
      data: appointments.map((apt: typeof appointments[number]) => ({
        id: apt.id,
        leadId: apt.lead.id,
        leadName: apt.lead.name,
        leadPhone: apt.lead.phone,
        vendedora: apt.user.name || apt.user.email,
        scheduledAt: apt.scheduledAt.toISOString(),
        duration: apt.duration,
        status: apt.status,
        notes: apt.notes,
        isOwner: false, // Sem auth check, não sabemos o dono
      })),
    };
  } catch (error) {
    console.error("Erro ao buscar agendamentos:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao buscar agendamentos"
    };
  }
}

// Buscar histórico de um agendamento
export async function getAppointmentHistory(appointmentId: string) {
  try {
    await getCurrentUser();

    const history = await prisma.appointmentHistory.findMany({
      where: { appointmentId },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      data: history.map((h: typeof history[number]) => ({
        action: h.action,
        userName: h.user.name || h.user.email,
        previousValue: h.previousValue,
        newValue: h.newValue,
        createdAt: h.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    console.error("Erro ao buscar histórico:", error);
    return { success: false, error: "Erro ao buscar histórico" };
  }
}

// Buscar todos os agendamentos (para métricas do dashboard)
export async function getAllAppointments() {
  try {
    // Nota: Auth é validada pelo middleware antes da página carregar
    // Dados são compartilhados entre todos os usuários

    const appointments = await prisma.appointment.findMany({
      select: {
        id: true,
        scheduledAt: true,
        status: true,
        duration: true,
        canceledAt: true,
        createdAt: true,
        userId: true, // Para filtrar por vendedor no dashboard
      },
      orderBy: { scheduledAt: "desc" },
    });

    return {
      success: true,
      data: appointments.map((apt: typeof appointments[number]) => ({
        id: apt.id,
        scheduledAt: apt.scheduledAt.toISOString(),
        status: apt.status,
        duration: apt.duration,
        canceledAt: apt.canceledAt?.toISOString() || null,
        createdAt: apt.createdAt.toISOString(),
        userId: apt.userId,
      })),
    };
  } catch (error) {
    console.error("Erro ao buscar agendamentos:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao buscar agendamentos"
    };
  }
}

// Buscar um agendamento específico por ID
export async function getAppointmentById(appointmentId: string) {
  try {
    const user = await getCurrentUser();

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            phone: true,
            userId: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!appointment) {
      return { success: false, error: "Agendamento não encontrado" };
    }

    return {
      success: true,
      data: {
        id: appointment.id,
        leadId: appointment.lead.id,
        leadName: appointment.lead.name,
        leadPhone: appointment.lead.phone,
        vendedora: appointment.user.name || appointment.user.email,
        scheduledAt: appointment.scheduledAt.toISOString(),
        duration: appointment.duration,
        status: appointment.status,
        notes: appointment.notes,
        isOwner: appointment.lead.userId === user.id,
      },
    };
  } catch (error) {
    console.error("Erro ao buscar agendamento:", error);
    return { success: false, error: "Erro ao buscar agendamento" };
  }
}
