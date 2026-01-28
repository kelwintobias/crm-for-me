"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./leads";
import { addHours, startOfDay, endOfDay, addDays } from "date-fns";

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

    const now = new Date();
    const todayStart = startOfDay(now);
    const tomorrowEnd = endOfDay(addDays(now, 1));

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

    const todayEnd = endOfDay(now);
    const tomorrowStart = startOfDay(addDays(now, 1));

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
