"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./leads";

export interface PlainWebhookLog {
  id: string;
  provider: string;
  event: string | null;
  payload: string;
  status: string;
  error: string | null;
  createdAt: string;
}

export async function getWebhookLogs(page = 1, limit = 50): Promise<{
  success: boolean;
  data?: PlainWebhookLog[];
  total?: number;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (user.role !== "ADMIN") {
      return { success: false, error: "Acesso negado" };
    }

    const [logs, total] = await Promise.all([
      prisma.webhookLog.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.webhookLog.count(),
    ]);

    return {
      success: true,
      data: logs.map((log) => ({
        ...log,
        createdAt: log.createdAt.toISOString(),
      })),
      total,
    };
  } catch (error) {
    console.error("Erro ao buscar webhook logs:", error);
    return { success: false, error: "Erro ao buscar logs" };
  }
}
