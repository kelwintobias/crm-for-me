"use server";

import { prisma } from "@/lib/prisma";
import { PACKAGE_LABELS, ADDON_LABELS } from "@/lib/contract-constants";
import { revalidatePath } from "next/cache";

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
    lastContractDate: string | null;

    // Campos calculados
    tag: "CLIENTE_ATIVO" | "LEAD";
    ltv: number;
    contractCount: number;

    // Observações do Usuário (Sincronizado com Lead)
    observacoes: string;
    // ID do Lead vinculado (se houver)
    leadId: string | null;

    // Texto gerado do histórico de compras
    purchaseHistoryText: string;

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

export async function getPessoasData() {
    try {
        // Buscar todos os contratos, ordenados por data (mais recente primeiro)
        const contracts = await prisma.contract.findMany({
            orderBy: { contractDate: "desc" },
        });

        // Buscar todos os leads para cruzar informações
        const leads = await prisma.lead.findMany();

        // OTIMIZAÇÃO: Criar Maps de leads por telefone e CPF para O(1) lookup
        // Antes: O(n²) com find() para cada cliente
        // Agora: O(n) para criar Maps + O(1) para cada lookup
        const leadsByPhone = new Map<string, typeof leads[0]>();
        const leadsByCpf = new Map<string, typeof leads[0]>();

        for (const lead of leads) {
            const phone = lead.phone.replace(/\D/g, "");
            if (phone) leadsByPhone.set(phone, lead);

            const cpf = lead.cpf?.replace(/\D/g, "");
            if (cpf) leadsByCpf.set(cpf, lead);
        }

        // Agrupar contratos por telefone/cpf normalizado
        const customerMap = new Map<string, typeof contracts>();

        for (const contract of contracts) {
            const normalizedPhone = contract.whatsapp.replace(/\D/g, "");
            const normalizedCpf = contract.cpf?.replace(/\D/g, "") || null;

            // Usar telefone como chave primária
            const key = normalizedPhone || normalizedCpf || contract.id;

            if (!customerMap.has(key)) {
                customerMap.set(key, []);
            }
            customerMap.get(key)!.push(contract);
        }

        const pessoasData: PessoaData[] = [];

        for (const [key, customerContracts] of customerMap) {
            const lastContract = customerContracts[0];
            const normalizedPhone = lastContract.whatsapp.replace(/\D/g, "");
            const normalizedCpf = lastContract.cpf?.replace(/\D/g, "") || null;

            // OTIMIZAÇÃO: O(1) lookup em vez de O(n) find()
            const linkedLead = leadsByPhone.get(normalizedPhone) ||
                (normalizedCpf ? leadsByCpf.get(normalizedCpf) : undefined);

            // Calcular LTV
            const ltv = customerContracts.reduce(
                (sum, c) => sum + Number(c.totalValue),
                0
            );

            // Gerar texto do histórico de compras
            const purchaseHistoryText = customerContracts
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
                name: lastContract.clientName, // Preferência para nome do Lead se existir? Não, contrato é oficial.
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

                // Se tiver Lead vinculado, usa as anotações dele. Senão, vazio.
                observacoes: linkedLead?.notes || "",
                leadId: linkedLead?.id || null,
                purchaseHistoryText: purchaseHistoryText,

                contracts: customerContracts.map((c) => ({
                    id: c.id,
                    contractDate: c.contractDate.toISOString(),
                    package: c.package,
                    addons: c.addons,
                    totalValue: Number(c.totalValue),
                })),
            });
        }

        // Incluir leads que não possuem contrato vinculado
        const linkedPhones = new Set(
            pessoasData.map(p => p.phone.replace(/\D/g, ""))
        );

        const leadsWithoutContract = leads.filter(l => {
            if (l.deletedAt) return false;
            const leadPhone = l.phone.replace(/\D/g, "");
            return !linkedPhones.has(leadPhone);
        });

        for (const lead of leadsWithoutContract) {
            pessoasData.push({
                id: `lead-${lead.id}`,
                name: lead.name,
                phone: lead.phone,
                cpf: lead.cpf || null,
                email: lead.email || null,
                instagram: lead.instagram || null,
                source: lead.source,

                lastPackage: "",
                lastAddons: [],
                lastContractDate: null,

                tag: "LEAD",
                ltv: 0,
                contractCount: 0,

                observacoes: lead.notes || "",
                leadId: lead.id,
                purchaseHistoryText: "",

                contracts: [],
            });
        }

        pessoasData.sort((a, b) => {
            const dateA = a.lastContractDate ? new Date(a.lastContractDate).getTime() : 0;
            const dateB = b.lastContractDate ? new Date(b.lastContractDate).getTime() : 0;
            return dateB - dateA;
        });

        return { success: true, data: pessoasData };
    } catch (error) {
        console.error("Erro ao buscar dados de pessoas:", error);
        return { success: false, error: "Erro ao buscar dados de pessoas" };
    }
}

// ============================================
// ATUALIZAR PESSOA (E LEAD/CONTRATOS)
// ============================================

export async function updatePessoa(id: string, data: {
    name: string;
    phone: string;
    email: string;
    cpf: string;
    observacoes: string;
    leadId: string | null;
}) {
    try {
        // 1. Atualizar Lead se existir
        if (data.leadId) {
            await prisma.lead.update({
                where: { id: data.leadId },
                data: {
                    name: data.name,
                    phone: data.phone,
                    email: data.email,
                    cpf: data.cpf,
                    notes: data.observacoes, // Sincroniza Observacoes
                }
            });
        }

        // 2. Atualizar contratos vinculados ao ID (da função, que é uma chave composta)
        // Isso é complexo pois não recebemos os IDs dos contratos. 
        // O ideal seria receber, mas vamos manter simples por agora e focar na sincronia do Lead.

        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Erro ao atualizar pessoa:", error);
        return { success: false, error: "Erro ao atualizar pessoa" };
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
