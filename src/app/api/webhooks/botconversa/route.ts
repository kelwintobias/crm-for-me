import { NextRequest, NextResponse } from "next/server";
import { createLeadService } from "@/app/actions/leads";
import { prisma } from "@/lib/prisma";
import { LeadSource } from "@prisma/client";

// Mapeamento de fontes do BotConversa para o CRM
// Usa keywords ASCII que funcionam independente de encoding
// Valores esperados do BotConversa:
// - "Anúncio nas redes sociais da UPBOOST" → ANUNCIO
// - "Indicação" → INDICACAO
// - "Página Parceira" → PAGINA_PARCEIRA
// - "Vídeo de influenciadores" → INFLUENCER
function mapSource(sourceText: string): LeadSource {
    if (!sourceText) return "OUTRO";

    const text = sourceText.toLowerCase();

    // Match por keywords ASCII únicas (funciona com qualquer encoding)
    if (text.includes("upboost")) return "ANUNCIO";
    if (text.includes("indica")) return "INDICACAO";  // "Indicação" contém "indica"
    if (text.includes("parceira")) return "PAGINA_PARCEIRA";
    if (text.includes("influenc")) return "INFLUENCER";  // "influenciadores" contém "influenc"
    if (text.includes("instagram")) return "INSTAGRAM";

    return "OUTRO";
}

// Log para debug
const logPayload = (payload: unknown, source: string) => {
    console.log(`[WEBHOOK BOTCONVERSA] Source: ${source}`);
    console.log(`[WEBHOOK BOTCONVERSA] Payload:`, JSON.stringify(payload, null, 2));
};

export async function POST(req: NextRequest) {
    let rawBody = "";
    try {
        // Ler body como texto para garantir que podemos logar exatamente o que chegou
        rawBody = await req.text();

        let body: any = {};
        try {
            if (rawBody) {
                body = JSON.parse(rawBody);
            }
        } catch (e) {
            console.error("Error parsing JSON:", e);
            // Log de erro de JSON inválido
            await prisma.webhookLog.create({
                data: {
                    provider: "botconversa",
                    event: "json_parse_error",
                    payload: rawBody || "(empty)",
                    status: "ERROR",
                    error: "Invalid JSON format",
                }
            });
            return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
        }

        // Log do payload (console)
        logPayload(body, req.headers.get("user-agent") || "unknown");

        // Log entrada no banco (antes de processar, ou depois? Se falhar processamento, atualiza status?)
        // Vamos logar o resultado final.

        // Teste de conexão
        if (body.test === true || body.action === "test") {
            await prisma.webhookLog.create({
                data: {
                    provider: "botconversa",
                    event: "test_connection",
                    payload: rawBody,
                    status: "SUCCESS",
                }
            });
            return NextResponse.json({
                success: true,
                message: "Webhook BotConversa ativo!",
                received: body
            });
        }

        // Tenta extrair campos de diferentes formatos comuns
        const name = body.name ||
            (body.first_name ? `${body.first_name} ${body.last_name || ""}`.trim() : null) ||
            body.fullName ||
            "Lead sem Nome";

        let phone = body.phone || body.phone_number || body.whatsapp || body.celular || "";
        // Normaliza telefone (remove não-dígitos)
        phone = String(phone).replace(/\D/g, "");

        const source = body.source || body.origem || "OUTRO";

        // Validação básica
        if (!phone) {
            console.error("[WEBHOOK BOTCONVERSA] Erro: Telefone não encontrado no payload");
            await prisma.webhookLog.create({
                data: {
                    provider: "botconversa",
                    event: "validation_error",
                    payload: rawBody,
                    status: "ERROR",
                    error: "Phone number missing in payload",
                }
            });
            return NextResponse.json(
                { success: false, error: "Phone number is required" },
                { status: 400 }
            );
        }

        // 3. Mapeamento da Origem
        let finalSource: LeadSource;
        const knownSources = ["INSTAGRAM", "INDICACAO", "PAGINA_PARCEIRA", "INFLUENCER", "ANUNCIO", "OUTRO"];

        if (knownSources.includes(source)) {
            finalSource = source as LeadSource;
        } else {
            finalSource = mapSource(source);
        }

        // 4. Buscar usuário padrão (Admin) para atribuir o lead
        const adminUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { role: "ADMIN" },
                    { email: "dherick@upboost.pro" },
                    { email: "kelwin@upboost.com" }
                ]
            },
        });

        let userId = adminUser?.id;

        if (!userId) {
            // Fallback: pega qualquer usuário se não tiver admin
            const anyUser = await prisma.user.findFirst();
            if (!anyUser) {
                console.error("[WEBHOOK BOTCONVERSA] Erro: Nenhum usuário encontrado no CRM");
                await prisma.webhookLog.create({
                    data: {
                        provider: "botconversa",
                        event: "system_error",
                        payload: rawBody,
                        status: "ERROR",
                        error: "No users found in CRM",
                    }
                });
                return NextResponse.json(
                    { success: false, error: "No users found in CRM to assign lead" },
                    { status: 500 }
                );
            }
            userId = anyUser.id;
        }

        // Cria o lead
        const lead = await createLeadService({
            name,
            phone,
            source: finalSource,
            stage: "EM_NEGOCIACAO", // Alterado para EM_NEGOCIACAO conforme solicitado
            userId: userId
        });

        console.log(`[WEBHOOK BOTCONVERSA] Lead criado com sucesso: ${lead.id} (${lead.name})`);

        // Log Sucesso com detalhes da ação executada
        const actionDetails = {
            action: "LEAD_CREATED",
            leadId: lead.id,
            leadName: lead.name,
            leadPhone: phone,
            leadSource: finalSource,
            leadStage: "EM_NEGOCIACAO",
            assignedTo: userId,
            receivedData: {
                rawName: body.name || body.first_name,
                rawPhone: body.phone || body.phone_number || body.whatsapp || body.celular,
                rawSource: body.source || body.origem,
            }
        };

        await prisma.webhookLog.create({
            data: {
                provider: "botconversa",
                event: "lead_created",
                payload: JSON.stringify({
                    received: JSON.parse(rawBody),
                    processed: actionDetails,
                }, null, 2),
                status: "SUCCESS",
            }
        });

        return NextResponse.json({
            success: true,
            leadId: lead.id,
            mappedSource: finalSource
        });

    } catch (error) {
        console.error("[WEBHOOK BOTCONVERSA] Erro Interno:", error);

        // Log de erro
        await prisma.webhookLog.create({
            data: {
                provider: "botconversa",
                event: "internal_error",
                payload: rawBody || "Error before body read",
                status: "ERROR",
                error: error instanceof Error ? error.message : "Unknown error",
            }
        });

        return NextResponse.json(
            { success: false, error: "Internal Server Error", details: error instanceof Error ? error.message : "Unknown" },
            { status: 500 }
        );
    }
}
