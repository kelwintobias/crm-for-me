import { NextRequest, NextResponse } from "next/server";
import { createLeadService } from "@/app/actions/leads";
import { prisma } from "@/lib/prisma";
import { LeadSource } from "@prisma/client";

// Normaliza string removendo acentos
function normalizeText(text: string): string {
    return text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase();
}

// Mapeamento de fontes do BotConversa para o CRM
// Valores esperados do BotConversa:
// - "Anúncio nas redes sociais da UPBOOST" → ANUNCIO
// - "Indicação" → INDICACAO
// - "Página Parceira" → PAGINA_PARCEIRA
// - "Vídeo de influenciadores" → INFLUENCER
function mapSource(sourceText: string): LeadSource {
    if (!sourceText) return "OUTRO";

    const text = normalizeText(sourceText);

    if (text.includes("UPBOOST") || text.includes("ANUNCIO")) return "ANUNCIO";
    if (text.includes("INFLUENCIADOR") || text.includes("INFLUENCER")) return "INFLUENCER";
    if (text.includes("INDICACAO")) return "INDICACAO";
    if (text.includes("PARCEIRA") || text.includes("PAGINA")) return "PAGINA_PARCEIRA";
    if (text.includes("INSTAGRAM")) return "INSTAGRAM";

    return "OUTRO";
}

export async function POST(req: NextRequest) {
    try {
        // 1. Verificação de Segurança (API Key simples)
        const apiKey = req.headers.get("x-api-key");
        const validApiKey = process.env.BOTCONVERSA_API_KEY || "crm-secret-key-123";

        if (apiKey !== validApiKey) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        // 2. Parse do Body
        const body = await req.json();
        const { name, phone, source, plan, stage } = body;

        // Validação básica
        if (!name || !phone) {
            return NextResponse.json(
                { success: false, error: "Name and phone are required" },
                { status: 400 }
            );
        }

        // 3. Mapeamento da Origem
        // Se o cliente mandar "source" mapeado, usa ele. Se mandar texto livre, tentamos mapear.
        // Assumimos que o BotConversa pode mandar algo como "Anúncio UPBOOST" no campo source.
        let finalSource: LeadSource;
        const knownSources = ["INSTAGRAM", "INDICACAO", "PAGINA_PARCEIRA", "INFLUENCER", "ANUNCIO", "OUTRO"];

        if (knownSources.includes(source)) {
            finalSource = source as LeadSource;
        } else {
            finalSource = mapSource(source);
        }

        // 4. Buscar usuário padrão (Admin) para atribuir o lead
        // Como é webhook, não tem usuário logado. Atribuímos ao primeiro admin encontrado.
        const adminUser = await prisma.user.findFirst({
            where: { role: "ADMIN" },
        });

        if (!adminUser) {
            // Fallback: pega qualquer usuário se não tiver admin
            const anyUser = await prisma.user.findFirst();
            if (!anyUser) {
                return NextResponse.json(
                    { success: false, error: "No users found in CRM to assign lead" },
                    { status: 500 }
                );
            }
            // Usa o primeiro usuário encontrado
            await createLeadService({
                name,
                phone,
                source: finalSource,
                plan,
                stage,
                userId: anyUser.id
            });
        } else {
            await createLeadService({
                name,
                phone,
                source: finalSource,
                plan,
                stage,
                userId: adminUser.id
            });
        }

        return NextResponse.json({ success: true, mappedSource: finalSource });

    } catch (error) {
        console.error("Webhook Error:", error);
        return NextResponse.json(
            { success: false, error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
