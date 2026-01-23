import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ContractPackage, ContractSource, PipelineStage } from "@prisma/client";

// ===========================================
// WEBHOOK: RECEBER CONTRATOS VIA HTTP
// ===========================================

export const dynamic = "force-dynamic";

// Log para debug - salva os payloads recebidos
const logPayload = (payload: unknown, source: string) => {
    console.log(`[WEBHOOK CONTRACT] Source: ${source}`);
    console.log(`[WEBHOOK CONTRACT] Payload:`, JSON.stringify(payload, null, 2));
};

// ===========================================
// POST - Receber novo contrato
// ===========================================

export async function POST(request: Request) {
    try {
        const payload = await request.json();

        // Log do payload para debug
        logPayload(payload, request.headers.get("user-agent") || "unknown");

        // Se for apenas um teste, retorna o payload recebido
        if (payload.test === true || payload.action === "test") {
            return NextResponse.json({
                success: true,
                message: "Webhook recebido com sucesso! Este é um teste.",
                receivedPayload: payload,
                expectedFormat: {
                    clientName: "Nome do Cliente (obrigatório)",
                    whatsapp: "11999999999 (obrigatório)",
                    email: "email@exemplo.com (opcional)",
                    instagram: "@instagram (opcional)",
                    cpf: "12345678900 (opcional)",
                    contractDate: "2026-01-23 ou ISO date (opcional, default: hoje)",
                    package: "INTERMEDIARIO | AVANCADO | ELITE | PRO_PLUS | ULTRA_PRO | EVOLUTION",
                    source: "ANUNCIO | INDICACAO | INFLUENCIADOR | PARCEIRO",
                    addons: ["ATIVACAO_WINDOWS", "UPBOOST_PLUS"],
                    totalValue: 150.00,
                    termsAccepted: true,
                    sellerEmail: "vendedor@exemplo.com (opcional)"
                }
            });
        }

        // Validação básica
        if (!payload.clientName || !payload.whatsapp) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Campos obrigatórios: clientName, whatsapp",
                    receivedPayload: payload
                },
                { status: 400 }
            );
        }

        // Buscar vendedor pelo email (se fornecido)
        let userId: string | null = null;
        if (payload.sellerEmail) {
            const seller = await prisma.user.findFirst({
                where: { email: payload.sellerEmail.toLowerCase() },
            });
            if (seller) {
                userId = seller.id;
            }
        }

        // Se não encontrou vendedor, busca um admin
        if (!userId) {
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
        }

        if (!userId) {
            return NextResponse.json(
                { success: false, error: "Nenhum usuário encontrado para associar o contrato" },
                { status: 500 }
            );
        }

        // Normalizar dados
        const normalizedPhone = String(payload.whatsapp).replace(/\D/g, "");
        const contractDate = payload.contractDate
            ? new Date(payload.contractDate)
            : new Date();

        // Normalizar pacote
        const packageMap: Record<string, ContractPackage> = {
            "intermediario": "INTERMEDIARIO",
            "intermediário": "INTERMEDIARIO",
            "avancado": "AVANCADO",
            "avançado": "AVANCADO",
            "elite": "ELITE",
            "pro_plus": "PRO_PLUS",
            "pro plus": "PRO_PLUS",
            "ultra_pro": "ULTRA_PRO",
            "ultra pro": "ULTRA_PRO",
            "ultra": "ULTRA_PRO",
            "evolution": "EVOLUTION",
        };

        const packageKey = String(payload.package || "intermediario").toLowerCase();
        const contractPackage = packageMap[packageKey] || payload.package as ContractPackage || "INTERMEDIARIO";

        // Normalizar fonte
        const sourceMap: Record<string, ContractSource> = {
            "anuncio": "ANUNCIO",
            "anúncio": "ANUNCIO",
            "indicacao": "INDICACAO",
            "indicação": "INDICACAO",
            "influenciador": "INFLUENCIADOR",
            "influencer": "INFLUENCIADOR",
            "parceiro": "PARCEIRO",
        };

        const sourceKey = String(payload.source || "anuncio").toLowerCase();
        const contractSource = sourceMap[sourceKey] || payload.source as ContractSource || "ANUNCIO";

        // Criar contrato
        const contract = await prisma.contract.create({
            data: {
                clientName: payload.clientName,
                email: payload.email || null,
                whatsapp: normalizedPhone,
                instagram: payload.instagram || null,
                cpf: payload.cpf ? String(payload.cpf).replace(/\D/g, "") : null,
                contractDate,
                source: contractSource,
                package: contractPackage,
                addons: Array.isArray(payload.addons) ? payload.addons : [],
                termsAccepted: payload.termsAccepted === true,
                totalValue: parseFloat(payload.totalValue) || 0,
                userId,
            },
        });

        // Tentar atualizar lead correspondente (se existir)
        let leadUpdated = false;
        const lead = await prisma.lead.findFirst({
            where: {
                phone: { contains: normalizedPhone.slice(-8) },
            },
        });

        if (lead) {
            await prisma.lead.update({
                where: { id: lead.id },
                data: {
                    stage: PipelineStage.FINALIZADO,
                    email: payload.email || lead.email,
                    instagram: payload.instagram || lead.instagram,
                    cpf: payload.cpf ? String(payload.cpf).replace(/\D/g, "") : lead.cpf,
                    contractDate,
                    packageType: contractPackage,
                    addOns: Array.isArray(payload.addons) ? payload.addons.join(", ") : "",
                    termsAccepted: payload.termsAccepted === true,
                },
            });
            leadUpdated = true;
        }

        return NextResponse.json({
            success: true,
            message: "Contrato criado com sucesso!",
            data: {
                contractId: contract.id,
                clientName: contract.clientName,
                whatsapp: contract.whatsapp,
                package: contract.package,
                totalValue: Number(contract.totalValue),
                leadUpdated,
            }
        });

    } catch (error) {
        console.error("[WEBHOOK CONTRACT] Erro:", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Erro interno",
            },
            { status: 500 }
        );
    }
}

// ===========================================
// GET - Verificar se o webhook está ativo
// ===========================================

export async function GET() {
    return NextResponse.json({
        success: true,
        message: "Webhook de contratos está ativo!",
        endpoint: "/api/webhooks/contracts",
        method: "POST",
        expectedFormat: {
            clientName: "Nome do Cliente (obrigatório)",
            whatsapp: "11999999999 (obrigatório)",
            email: "email@exemplo.com (opcional)",
            instagram: "@instagram (opcional)",
            cpf: "12345678900 (opcional)",
            contractDate: "2026-01-23 ou ISO date (opcional)",
            package: "INTERMEDIARIO | AVANCADO | ELITE | PRO_PLUS | ULTRA_PRO | EVOLUTION",
            source: "ANUNCIO | INDICACAO | INFLUENCIADOR | PARCEIRO",
            addons: ["ATIVACAO_WINDOWS", "UPBOOST_PLUS"],
            totalValue: 150.00,
            termsAccepted: true,
            sellerEmail: "vendedor@exemplo.com (opcional)"
        },
        testPayload: {
            test: true,
            clientName: "Teste Webhook",
            whatsapp: "11999999999"
        }
    });
}
