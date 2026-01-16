"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ContractSource, ContractPackage, Contract } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { calculateTotalValue } from "@/lib/contract-constants";

// ============================================
// SCHEMAS DE VALIDAÇÃO
// ============================================

const createContractSchema = z.object({
    clientName: z.string().min(1, "Nome é obrigatório"),
    email: z.string().email("Email inválido").optional().or(z.literal("")),
    whatsapp: z.string().min(10, "WhatsApp deve ter pelo menos 10 dígitos"),
    instagram: z.string().optional(),
    cpf: z.string().optional(),
    contractDate: z.string(),
    source: z.enum(["ANUNCIO", "INDICACAO", "INFLUENCIADOR", "PARCEIRO"]),
    package: z.enum(["INTERMEDIARIO", "AVANCADO", "ELITE", "PRO_PLUS", "ULTRA_PRO", "EVOLUTION"]),
    addons: z.array(z.string()).default([]),
    termsAccepted: z.boolean().default(false),
});

// ============================================
// HELPER: SERIALIZAR CONTRATO
// ============================================

function serializeContract(contract: Contract) {
    return {
        ...contract,
        totalValue: Number(contract.totalValue),
        contractDate: contract.contractDate.toISOString(),
        createdAt: contract.createdAt.toISOString(),
        updatedAt: contract.updatedAt.toISOString(),
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
// CRIAR CONTRATO
// ============================================

export async function createContract(data: unknown) {
    try {
        const user = await getCurrentUser();
        const validated = createContractSchema.parse(data);

        // Calcular valor total no backend (segurança)
        const totalValue = calculateTotalValue(
            validated.package as ContractPackage,
            validated.addons
        );

        const contract = await prisma.contract.create({
            data: {
                clientName: validated.clientName,
                email: validated.email || null,
                whatsapp: validated.whatsapp.replace(/\D/g, ""),
                instagram: validated.instagram || null,
                cpf: validated.cpf || null,
                contractDate: new Date(validated.contractDate),
                source: validated.source as ContractSource,
                package: validated.package as ContractPackage,
                addons: validated.addons,
                termsAccepted: validated.termsAccepted,
                totalValue: new Decimal(totalValue),
                userId: user.id,
            },
        });

        revalidatePath("/");
        return { success: true, data: serializeContract(contract) };
    } catch (error) {
        console.error("Erro ao criar contrato:", error);
        if (error instanceof z.ZodError) {
            return { success: false, error: error.errors[0].message };
        }
        return { success: false, error: "Erro ao criar contrato" };
    }
}

// ============================================
// LISTAR CONTRATOS
// ============================================

export async function getContracts() {
    try {
        await getCurrentUser();

        const contracts = await prisma.contract.findMany({
            orderBy: { contractDate: "desc" },
        });

        return { success: true, data: contracts.map(serializeContract) };
    } catch (error) {
        console.error("Erro ao buscar contratos:", error);
        return { success: false, error: "Erro ao buscar contratos" };
    }
}

// ============================================
// DELETAR CONTRATO
// ============================================

export async function deleteContract(id: string) {
    try {
        await getCurrentUser();

        const existing = await prisma.contract.findFirst({
            where: { id },
        });

        if (!existing) {
            return { success: false, error: "Contrato não encontrado" };
        }

        await prisma.contract.delete({
            where: { id },
        });

        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Erro ao deletar contrato:", error);
        return { success: false, error: "Erro ao deletar contrato" };
    }
}
