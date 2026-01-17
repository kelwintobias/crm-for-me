"use server";

import { prisma } from "@/lib/prisma";
import { PACKAGE_LABELS, ADDON_LABELS } from "@/lib/contract-constants";

// ============================================
// TIPOS
// ============================================

export interface PessoaData {
    id: string; // Unique key based on normalized phone/cpf
    name: string;
    phone: string;
    cpf: string | null;
    email: string | null;
    instagram: string | null;
    source: string;

    // Dados da última venda
    lastPackage: string;
    lastAddons: string[];
    lastContractDate: string;

    // Campos calculados
    tag: "CLIENTE_ATIVO";
    ltv: number;
    contractCount: number;

    // Observações (histórico de compras)
    observacoes: string;

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
// FUNÇÃO PRINCIPAL - BASEADA EM CONTRATOS
// ============================================

export async function getPessoasData(): Promise<PessoaData[]> {
    try {
        // Buscar todos os contratos, ordenados por data (mais recente primeiro)
        const contracts = await prisma.contract.findMany({
            orderBy: { contractDate: "desc" },
        });

        // Agrupar contratos por telefone/cpf normalizado
        const customerMap = new Map<string, typeof contracts>();

        for (const contract of contracts) {
            // Normalizar telefone para chave única
            const normalizedPhone = contract.whatsapp.replace(/\D/g, "");
            const normalizedCpf = contract.cpf?.replace(/\D/g, "") || null;

            // Usar telefone como chave primária, cpf como fallback
            const key = normalizedPhone || normalizedCpf || contract.id;

            if (!customerMap.has(key)) {
                customerMap.set(key, []);
            }
            customerMap.get(key)!.push(contract);
        }

        // Converter mapa para array de PessoaData
        const pessoasData: PessoaData[] = [];

        for (const [key, customerContracts] of customerMap) {
            // Contratos já estão ordenados por data desc, então o primeiro é o mais recente
            const lastContract = customerContracts[0];

            // Calcular LTV (soma de todos os valores)
            const ltv = customerContracts.reduce(
                (sum, c) => sum + Number(c.totalValue),
                0
            );

            // Gerar Observações (histórico de compras)
            const observacoes = customerContracts
                .map((c) => {
                    const date = new Date(c.contractDate).toLocaleDateString("pt-BR");
                    const packageLabel = PACKAGE_LABELS[c.package as keyof typeof PACKAGE_LABELS] || c.package;
                    const addonsLabels = c.addons
                        .map((a) => ADDON_LABELS[a] || a)
                        .join(", ");

                    if (addonsLabels) {
                        return `${date} — Comprou ${packageLabel} com adicional ${addonsLabels}.`;
                    }
                    return `${date} — Comprou ${packageLabel}.`;
                })
                .join("\n");

            pessoasData.push({
                id: key,
                name: lastContract.clientName,
                phone: lastContract.whatsapp,
                cpf: lastContract.cpf,
                email: lastContract.email,
                instagram: lastContract.instagram,
                source: lastContract.source,

                lastPackage: lastContract.package,
                lastAddons: lastContract.addons,
                lastContractDate: lastContract.contractDate.toISOString(),

                tag: "CLIENTE_ATIVO",
                ltv,
                contractCount: customerContracts.length,
                observacoes,

                contracts: customerContracts.map((c) => ({
                    id: c.id,
                    contractDate: c.contractDate.toISOString(),
                    package: c.package,
                    addons: c.addons,
                    totalValue: Number(c.totalValue),
                })),
            });
        }

        // Ordenar por data da última compra (mais recente primeiro)
        pessoasData.sort((a, b) =>
            new Date(b.lastContractDate).getTime() - new Date(a.lastContractDate).getTime()
        );

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
