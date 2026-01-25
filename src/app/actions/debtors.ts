"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Decimal } from "@prisma/client/runtime/library";

// ============================================
// VALIDAÇÃO
// ============================================

const createDebtorSchema = z.object({
    clientName: z.string().min(1, "Nome é obrigatório"),
    phone: z.string().min(10, "Telefone inválido"),
    amountPaid: z.number().min(0),
    amountRemaining: z.number().min(0),
    dueDate: z.string().optional(), // Pode vir vazio
    notes: z.string().optional(),
});

// ============================================
// AUTENTICAÇÃO
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

// ============================================
// ACTIONS
// ============================================

export async function createDebtor(data: unknown) {
    try {
        const user = await getCurrentUser();
        const validated = createDebtorSchema.parse(data);

        await prisma.debtor.create({
            data: {
                clientName: validated.clientName,
                phone: validated.phone.replace(/\D/g, ""),
                amountPaid: new Decimal(validated.amountPaid),
                amountRemaining: new Decimal(validated.amountRemaining),
                dueDate: validated.dueDate ? new Date(validated.dueDate) : null,
                notes: validated.notes,
                userId: user.id,
                status: "PENDENTE"
            },
        });

        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Erro ao criar devedor:", error);
        return { success: false, error: "Erro ao criar devedor" };
    }
}

export async function getDebtors() {
    try {
        const debtors = await prisma.debtor.findMany({
            orderBy: { createdAt: "desc" },
        });

        // Serializar Decimal e Dates
        const serialized = debtors.map(d => ({
            ...d,
            amountPaid: Number(d.amountPaid),
            amountRemaining: Number(d.amountRemaining),
            dueDate: d.dueDate?.toISOString() || null,
            createdAt: d.createdAt.toISOString(),
            updatedAt: d.updatedAt.toISOString(),
        }));

        return { success: true, data: serialized };
    } catch (error) {
        console.error("Erro ao buscar devedores:", error);
        return { success: false, error: "Erro ao buscar devedores" };
    }
}

export async function markAsPaid(id: string) {
    try {
        await getCurrentUser();

        // Buscar devedor atual
        const debtor = await prisma.debtor.findUnique({ where: { id } });
        if (!debtor) return { success: false, error: "Devedor não encontrado" };

        const total = Number(debtor.amountPaid) + Number(debtor.amountRemaining);

        await prisma.debtor.update({
            where: { id },
            data: {
                status: "PAGO",
                amountPaid: new Decimal(total),
                amountRemaining: new Decimal(0),
            }
        });

        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Erro ao marcar como pago:", error);
        return { success: false, error: "Erro ao atualizar status" };
    }
}

export async function deleteDebtor(id: string) {
    try {
        await getCurrentUser();
        await prisma.debtor.delete({ where: { id } });
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Erro ao excluir devedor:", error);
        return { success: false, error: "Erro ao excluir devedor" };
    }
}
