import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ContractPackage, ContractSource, PipelineStage, PlanType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import {
    calculateTotalValue,
    PACKAGE_LABELS,
    ADDON_LABELS,
    ADDON_PRICES
} from "@/lib/contract-constants";

// Mapeamento de ContractPackage para PlanType
// Isso garante que o plano do lead reflita o pacote do contrato
function contractPackageToPlanType(pkg: ContractPackage): PlanType {
    const mapping: Record<ContractPackage, PlanType> = {
        INTERMEDIARIO: "INTERMEDIARIO",
        AVANCADO: "AVANCADO",
        ELITE: "ELITE",
        PRO_PLUS: "PRO_PLUS",
        ULTRA_PRO: "ULTRA_PRO",
        EVOLUTION: "EVOLUTION",
    };
    return mapping[pkg] || "INDEFINIDO";
}

// ===========================================
// WEBHOOK: RECEBER CONTRATOS VIA HTTP (CUSTOM FORMAT)
// ===========================================

export const dynamic = "force-dynamic";

// Log para debug
const logPayload = (payload: unknown, source: string) => {
    console.log(`[WEBHOOK CONTRACT] Source: ${source}`);
    console.log(`[WEBHOOK CONTRACT] Payload:`, JSON.stringify(payload, null, 2));
};

// ===========================================
// DATA PARSING HELPERS
// ===========================================

/**
 * Normaliza o nome do pacote a partir da string recebida
 * Ex: "Pacote Intermediário (R$25,00)" -> "INTERMEDIARIO"
 */
function parsePackage(raw: string): ContractPackage {
    const normalized = raw.toLowerCase();

    if (normalized.includes("intermediário") || normalized.includes("intermediario")) return "INTERMEDIARIO";
    if (normalized.includes("avançado") || normalized.includes("avancado")) return "AVANCADO";
    if (normalized.includes("elite")) return "ELITE";
    if (normalized.includes("pro plus") || normalized.includes("pro_plus")) return "PRO_PLUS";
    if (normalized.includes("ultra pro") || normalized.includes("ultra_pro") || normalized.includes("ultra")) return "ULTRA_PRO";
    if (normalized.includes("evolution")) return "EVOLUTION";

    return "INTERMEDIARIO"; // Default
}

/**
 * Normaliza a fonte do contrato
 * Ex: "Anúncio nas redes sociais da UPBOOST" -> "ANUNCIO"
 */
function parseSource(raw: string): ContractSource {
    const normalized = raw.toLowerCase();

    if (normalized.includes("anúncio") || normalized.includes("anuncio")) return "ANUNCIO";
    if (normalized.includes("indicação") || normalized.includes("indicacao")) return "INDICACAO";
    if (normalized.includes("influenciador") || normalized.includes("influencer")) return "INFLUENCIADOR";
    if (normalized.includes("parceiro")) return "PARCEIRO";

    return "ANUNCIO"; // Default
}

/**
 * Extrai os adicionais da string recebida
 * Ex: "Ativação do Windows (R$19,90)" -> ["ATIVACAO_WINDOWS"]
 * Pode receber múltiplos valores? Vamos assumir que sim, separados por vírgula ou em array.
 */
function parseAddons(raw: string | string[]): string[] {
    if (!raw) return [];

    const rawString = Array.isArray(raw) ? raw.join(",") : raw;
    const normalized = rawString.toLowerCase();
    const foundAddons: string[] = [];

    // Mapeamento reverso de labels para keys
    // ADDON_LABELS: "ATIVACAO_WINDOWS": "Ativação do Windows"
    // ADDON_PRICES chaves também são válidas

    // Verifica cada chave de addon possível
    Object.keys(ADDON_LABELS).forEach(key => {
        const label = ADDON_LABELS[key].toLowerCase();
        // Verifica se a string raw contém o label (ex: "ativação do windows")
        if (normalized.includes(label)) {
            foundAddons.push(key);
        }
    });

    return foundAddons;
}

/**
 * Parseia string de data no formato "dd/MM/yyyy HH:mm:ss" ou ISO
 * Ex: "23/01/2026 11:13:28"
 */
function parseDateString(raw: string): Date {
    if (!raw) return new Date();

    // Tentar formato ISO primeiro
    const isoDate = new Date(raw);
    if (!isNaN(isoDate.getTime()) && raw.includes("-")) return isoDate;

    // Formato brasileiro: dd/MM/yyyy HH:mm:ss
    // Regex para capturar partes
    const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}):(\d{2}))?/);

    if (match) {
        const day = parseInt(match[1]);
        const month = parseInt(match[2]) - 1; // Mês 0-indexado
        const year = parseInt(match[3]);
        const hour = parseInt(match[4] || "0");
        const minute = parseInt(match[5] || "0");
        const second = parseInt(match[6] || "0");

        return new Date(year, month, day, hour, minute, second);
    }

    return new Date();
}

// ===========================================
// POST - Receber novo contrato
// ===========================================

export async function POST(request: Request) {
    let rawPayload = "";
    try {
        const payload = await request.json();
        rawPayload = JSON.stringify(payload);
        logPayload(payload, request.headers.get("user-agent") || "unknown");

        // Validação básica
        if (!payload.clientName || !payload.whatsapp) {
            await prisma.webhookLog.create({
                data: {
                    provider: "pluga",
                    event: "validation_error",
                    payload: rawPayload,
                    status: "ERROR",
                    error: "Campos obrigatórios: clientName, whatsapp",
                }
            });
            return NextResponse.json(
                { success: false, error: "Campos obrigatórios: clientName, whatsapp" },
                { status: 400 }
            );
        }

        // 1. Identificar usuário (Vendedor ou Admin)
        // O pedido diz que sellerEmail não é necessário na aba Contratos, 
        // mas precisamos associar a alguém. Vamos buscar um admin default.
        let userId: string | null = null;

        // Tenta encontrar admin
        const admin = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: "dherick@upboost.pro" },
                    { email: "kelwin@upboost.com" },
                    { role: "ADMIN" }
                ]
            },
        });
        userId = admin?.id || null;

        if (!userId) {
            // Fallback extremo: pega qualquer usuário se não tiver admin (improvável)
            const anyUser = await prisma.user.findFirst();
            userId = anyUser?.id || null;
        }

        if (!userId) {
            return NextResponse.json(
                { success: false, error: "Nenhum usuário admin encontrado para associar" },
                { status: 500 }
            );
        }

        // 2. Parsing e Normalização
        const normalizedPhone = String(payload.whatsapp).replace(/\D/g, "");
        const contractDate = parseDateString(payload.contractDate);
        const contractPackage = parsePackage(payload.package || "");
        const contractSource = parseSource(payload.source || "");
        const addons = parseAddons(payload.addons || "");
        const email = payload.email && payload.email !== "" ? payload.email : null;
        const instagram = payload.instagram && payload.instagram !== "" ? payload.instagram : null;
        const cpf = payload.CPF || payload.cpf ? String(payload.CPF || payload.cpf).replace(/\D/g, "") : null;

        // 3. Cálculo de Valor
        const totalValue = calculateTotalValue(contractPackage, addons);

        // 4. Criação do Contrato
        const contract = await prisma.contract.create({
            data: {
                clientName: payload.clientName,
                email,
                whatsapp: normalizedPhone,
                instagram,
                cpf,
                contractDate,
                source: contractSource,
                package: contractPackage,
                addons,
                termsAccepted: true, // Sempre true conforme regra
                totalValue,
                userId,
            },
        });

        // 5. Atualização de Lead (se existir)
        let leadUpdated = false;
        const lead = await prisma.lead.findFirst({
            where: {
                phone: { contains: normalizedPhone.slice(-8) }, // Busca pelos últimos 8 dígitos
            },
        });

        if (lead) {
            // Atualiza o lead com os dados do contrato, incluindo o plano
            const leadPlan = contractPackageToPlanType(contractPackage);

            await prisma.lead.update({
                where: { id: lead.id },
                data: {
                    stage: PipelineStage.FINALIZADO,
                    plan: leadPlan, // Sincroniza o plano do lead com o pacote do contrato
                    email: email || lead.email,
                    instagram: instagram || lead.instagram,
                    cpf: cpf || lead.cpf,
                    contractDate,
                    packageType: contractPackage,
                    addOns: addons.join(", "),
                    termsAccepted: true,
                },
            });
            leadUpdated = true;
        }

        // Revalidar cache para atualizar a UI
        revalidatePath("/");

        // Log sucesso com detalhes da ação executada
        const actionDetails = {
            action: "CONTRACT_CREATED",
            contractId: contract.id,
            clientName: contract.clientName,
            clientPhone: normalizedPhone,
            package: contractPackage,
            packageLabel: PACKAGE_LABELS[contractPackage],
            source: contractSource,
            addons: addons,
            totalValue: totalValue,
            leadUpdated: leadUpdated,
            leadId: lead?.id || null,
            receivedData: {
                rawClientName: payload.clientName,
                rawWhatsapp: payload.whatsapp,
                rawPackage: payload.package,
                rawSource: payload.source,
                rawAddons: payload.addons,
                rawContractDate: payload.contractDate,
            }
        };

        await prisma.webhookLog.create({
            data: {
                provider: "pluga",
                event: "contract_created",
                payload: JSON.stringify({
                    received: payload,
                    processed: actionDetails,
                }, null, 2),
                status: "SUCCESS",
            }
        });

        return NextResponse.json({
            success: true,
            message: "Contrato criado com sucesso",
            data: {
                id: contract.id,
                client: contract.clientName,
                package: PACKAGE_LABELS[contractPackage],
                value: totalValue,
                leadUpdated
            }
        });

    } catch (error) {
        console.error("[WEBHOOK ERROR]", error);

        // Log erro
        await prisma.webhookLog.create({
            data: {
                provider: "pluga",
                event: "internal_error",
                payload: rawPayload || "Error before body read",
                status: "ERROR",
                error: error instanceof Error ? error.message : "Unknown error",
            }
        }).catch(() => {}); // Não falhar se o log falhar

        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : "Erro interno" },
            { status: 500 }
        );
    }
}

// GET para documentação/teste
export async function GET() {
    return NextResponse.json({
        success: true,
        message: "Webhook Ativo. Envie POST com JSON.",
        examplePayload: {
            "clientName": "Fulano de Tal",
            "whatsapp": "34999999999",
            "email": "fulano@email.com",
            "instagram": "@fulano",
            "CPF": "12345678900",
            "contractDate": "23/01/2026 11:13:28",
            "package": "Pacote Intermediário (R$25,00)",
            "source": "Anúncio nas redes sociais",
            "addons": "Ativação do Windows (R$19,90)"
        }
    });
}
