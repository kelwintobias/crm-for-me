"use server";

import { prisma } from "@/lib/prisma";

// ============================================
// TIPOS
// ============================================

export interface PessoaData {
    id: string;
    name: string;
    phone: string;
    cpf: string | null;
    email: string | null;
    stage: string;
    source: string;
    createdAt: string;

    // Campos calculados
    tag: "CLIENTE_ATIVO" | "LEAD_FRIO";
    ltv: number;
    lastPurchaseDate: string | null;
    contractCount: number;

    // Para a jornada
    contracts: {
        id: string;
        contractDate: string;
        package: string;
        addons: string[];
        totalValue: number;
    }[];
}

// ============================================
// FUNÇÃO PRINCIPAL
// ============================================

export async function getPessoasData(): Promise<PessoaData[]> {
    try {
        // Buscar todos os leads
        const leads = await prisma.lead.findMany({
            where: { deletedAt: null },
            orderBy: { createdAt: "desc" },
        });

        // Buscar todos os contratos
        const contracts = await prisma.contract.findMany({
            orderBy: { contractDate: "desc" },
        });

        // Mapear leads para PessoaData com dados calculados
        const pessoasData: PessoaData[] = leads.map((lead) => {
            // Normalizar telefone para comparação (remover caracteres especiais)
            const normalizedPhone = lead.phone.replace(/\D/g, "");
            const normalizedCpf = lead.cpf?.replace(/\D/g, "") || null;

            // Encontrar contratos correspondentes por telefone OU cpf
            const matchingContracts = contracts.filter((contract) => {
                const contractPhone = contract.whatsapp.replace(/\D/g, "");
                const contractCpf = contract.cpf?.replace(/\D/g, "") || null;

                // Match por telefone
                if (normalizedPhone && contractPhone && normalizedPhone === contractPhone) {
                    return true;
                }

                // Match por CPF
                if (normalizedCpf && contractCpf && normalizedCpf === contractCpf) {
                    return true;
                }

                return false;
            });

            // Calcular LTV (soma de todos os valores de contratos)
            const ltv = matchingContracts.reduce(
                (sum: number, contract) => sum + Number(contract.totalValue),
                0
            );

            // Encontrar data da última compra
            const lastPurchaseDate = matchingContracts.length > 0
                ? matchingContracts[0].contractDate.toISOString()
                : null;

            // Determinar tag
            const tag: "CLIENTE_ATIVO" | "LEAD_FRIO" = matchingContracts.length > 0
                ? "CLIENTE_ATIVO"
                : "LEAD_FRIO";

            return {
                id: lead.id,
                name: lead.name,
                phone: lead.phone,
                cpf: lead.cpf,
                email: lead.email,
                stage: lead.stage,
                source: lead.source,
                createdAt: lead.createdAt.toISOString(),

                tag,
                ltv,
                lastPurchaseDate,
                contractCount: matchingContracts.length,

                contracts: matchingContracts.map((c) => ({
                    id: c.id,
                    contractDate: c.contractDate.toISOString(),
                    package: c.package,
                    addons: c.addons,
                    totalValue: Number(c.totalValue),
                })),
            };
        });

        return pessoasData;
    } catch (error) {
        console.error("Erro ao buscar dados de pessoas:", error);
        throw new Error("Erro ao buscar dados de pessoas");
    }
}

// ============================================
// BUSCAR HISTÓRICO DE ATENDIMENTO
// ============================================

export interface ServiceHistoryItem {
    id: string;
    date: string;
    action: string;
    description: string;
    userName: string | null;
}

export async function getServiceHistory(leadId: string): Promise<ServiceHistoryItem[]> {
    try {
        // Buscar todos os appointments do lead
        const appointments = await prisma.appointment.findMany({
            where: { leadId },
            include: {
                history: {
                    include: {
                        user: { select: { name: true } },
                    },
                    orderBy: { createdAt: "desc" },
                },
                user: { select: { name: true } },
            },
            orderBy: { scheduledAt: "desc" },
        });

        const historyItems: ServiceHistoryItem[] = [];

        for (const appointment of appointments) {
            // Adicionar criação do agendamento
            historyItems.push({
                id: `${appointment.id}-created`,
                date: appointment.createdAt.toISOString(),
                action: "AGENDAMENTO_CRIADO",
                description: `Agendamento criado para ${new Date(appointment.scheduledAt).toLocaleDateString("pt-BR")}`,
                userName: appointment.user?.name || null,
            });

            // Adicionar todos os itens do histórico
            for (const hist of appointment.history) {
                let description = "";
                switch (hist.action) {
                    case "RESCHEDULED":
                        description = "Agendamento reagendado";
                        break;
                    case "CANCELED":
                        description = "Agendamento cancelado";
                        break;
                    case "COMPLETED":
                        description = "Agendamento concluído";
                        break;
                    default:
                        description = hist.action;
                }

                historyItems.push({
                    id: hist.id,
                    date: hist.createdAt.toISOString(),
                    action: hist.action,
                    description,
                    userName: hist.user?.name || null,
                });
            }
        }

        // Ordenar por data, mais recente primeiro
        historyItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return historyItems;
    } catch (error) {
        console.error("Erro ao buscar histórico de atendimento:", error);
        throw new Error("Erro ao buscar histórico de atendimento");
    }
}
