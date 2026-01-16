"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FixedCost } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

// ============================================
// SCHEMAS DE VALIDAÇÃO
// ============================================

const createFixedCostSchema = z.object({
    date: z.string(),
    type: z.string().min(1, "Tipo é obrigatório"),
    category: z.string().min(1, "Categoria é obrigatória"),
    description: z.string().min(1, "Descrição é obrigatória"),
    value: z.number().min(0, "Valor deve ser positivo"),
});

// ============================================
// HELPER: SERIALIZAR CUSTO FIXO
// ============================================

export interface PlainFixedCost {
    id: string;
    date: string;
    type: string;
    category: string;
    description: string;
    value: number;
    month: number;
    year: number;
    createdAt: string;
    updatedAt: string;
}

function serializeFixedCost(cost: FixedCost): PlainFixedCost {
    return {
        id: cost.id,
        date: cost.date.toISOString(),
        type: cost.type,
        category: cost.category,
        description: cost.description,
        value: Number(cost.value),
        month: cost.month,
        year: cost.year,
        createdAt: cost.createdAt.toISOString(),
        updatedAt: cost.updatedAt.toISOString(),
    };
}

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
// CRIAR CUSTO FIXO
// ============================================

export async function createFixedCost(data: unknown) {
    try {
        const user = await getCurrentUser();
        const validated = createFixedCostSchema.parse(data);

        const date = new Date(validated.date);
        const month = date.getMonth() + 1; // getMonth() retorna 0-11
        const year = date.getFullYear();

        const cost = await prisma.fixedCost.create({
            data: {
                date,
                type: validated.type,
                category: validated.category,
                description: validated.description,
                value: new Decimal(validated.value),
                month,
                year,
                userId: user.id,
            },
        });

        revalidatePath("/");
        return { success: true, data: serializeFixedCost(cost) };
    } catch (error) {
        console.error("Erro ao criar custo fixo:", error);
        if (error instanceof z.ZodError) {
            return { success: false, error: error.errors[0].message };
        }
        return { success: false, error: "Erro ao criar custo fixo" };
    }
}

// ============================================
// LISTAR CUSTOS FIXOS
// ============================================

export async function getFixedCosts() {
    try {
        const user = await getCurrentUser();

        const costs = await prisma.fixedCost.findMany({
            where: { userId: user.id },
            orderBy: { date: "desc" },
        });

        return { success: true, data: costs.map(serializeFixedCost) };
    } catch (error) {
        console.error("Erro ao buscar custos fixos:", error);
        return { success: false, error: "Erro ao buscar custos fixos" };
    }
}

// ============================================
// DELETAR CUSTO FIXO
// ============================================

export async function deleteFixedCost(id: string) {
    try {
        const user = await getCurrentUser();

        const existing = await prisma.fixedCost.findFirst({
            where: { id, userId: user.id },
        });

        if (!existing) {
            return { success: false, error: "Custo fixo não encontrado" };
        }

        await prisma.fixedCost.delete({
            where: { id },
        });

        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Erro ao deletar custo fixo:", error);
        return { success: false, error: "Erro ao deletar custo fixo" };
    }
}
