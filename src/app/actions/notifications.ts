"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./leads";

export interface NotificationAppointment {
  id: string;
  leadName: string;
  leadPhone: string;
  scheduledAt: string;
  isToday: boolean;
  isTomorrow: boolean;
  isOwner: boolean;
}

export async function getUpcomingAppointments(): Promise<{
  success: boolean;
  data?: NotificationAppointment[];
  error?: string;
}> {
  try {
    const user = await getCurrentUser();

    // Offset do Brasil (UTC-3)
    const BRT_OFFSET = 3;
    const now = new Date();

    // Hoje 00:00 BRT = 03:00 UTC
    const todayStart = new Date(now);
    todayStart.setUTCHours(BRT_OFFSET, 0, 0, 0);
    // Se já passou da meia-noite BRT (03:00 UTC), todayStart está correto
    // Se não, todayStart está um dia à frente, precisa voltar
    if (now < todayStart) {
      todayStart.setUTCDate(todayStart.getUTCDate() - 1);
    }

    // Hoje 23:59:59 BRT = 02:59:59 UTC do dia seguinte
    const todayEnd = new Date(todayStart);
    todayEnd.setUTCDate(todayEnd.getUTCDate() + 1);
    todayEnd.setUTCHours(BRT_OFFSET - 1, 59, 59, 999);

    // Amanhã 00:00 BRT
    const tomorrowStart = new Date(todayEnd);
    tomorrowStart.setUTCMilliseconds(1);

    // Amanhã 23:59:59 BRT = 02:59:59 UTC do dia depois de amanhã
    const tomorrowEnd = new Date(todayStart);
    tomorrowEnd.setUTCDate(tomorrowEnd.getUTCDate() + 2);
    tomorrowEnd.setUTCHours(BRT_OFFSET - 1, 59, 59, 999);

    // Busca agendamentos de hoje e amanhã
    const appointments = await prisma.appointment.findMany({
      where: {
        status: "SCHEDULED",
        canceledAt: null,
        scheduledAt: {
          gte: todayStart,
          lte: tomorrowEnd,
        },
      },
      include: {
        lead: {
          select: {
            name: true,
            phone: true,
          },
        },
      },
      orderBy: {
        scheduledAt: "asc",
      },
    });

    const notifications: NotificationAppointment[] = appointments.map((apt) => {
      const aptDate = new Date(apt.scheduledAt);
      const isToday = aptDate >= todayStart && aptDate <= todayEnd;
      const isTomorrow = aptDate >= tomorrowStart && aptDate <= tomorrowEnd;

      return {
        id: apt.id,
        leadName: apt.lead.name,
        leadPhone: apt.lead.phone,
        scheduledAt: apt.scheduledAt.toISOString(),
        isToday,
        isTomorrow,
        isOwner: apt.userId === user.id,
      };
    });

    return { success: true, data: notifications };
  } catch (error) {
    console.error("Erro ao buscar notificações:", error);
    return { success: false, error: "Erro ao carregar notificações" };
  }
}
