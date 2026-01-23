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
    try {
        // Parse do Body
        const body = await req.json();

        // Log do payload
        logPayload(body, req.headers.get("user-agent") || "unknown");

        // Teste de conexão
        if (body.test === true || body.action === "test") {
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

        return NextResponse.json({
            success: true,
            leadId: lead.id,
            mappedSource: finalSource
        });

    } catch (error) {
        console.error("[WEBHOOK BOTCONVERSA] Erro Interno:", error);
        return NextResponse.json(
            { success: false, error: "Internal Server Error", details: error instanceof Error ? error.message : "Unknown" },
            { status: 500 }
        );
    }
}
