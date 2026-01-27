import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

// Webhook para Evolution API (WhatsApp) - Instância "julia"
// Cria ou reativa leads quando enviam mensagem.

export async function POST(req: NextRequest) {
    // 1. Ler o corpo da requisição com segurança
    let rawBody = "";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let body: any = {};

    try {
        rawBody = await req.text();
        if (rawBody) {
            body = JSON.parse(rawBody);
        }
    } catch (e) {
        console.error("[WEBHOOK EVOLUTION] Erro ao fazer parse do JSON:", e);
        return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
    }

    // console.log("[WEBHOOK EVOLUTION] Payload recebido:", JSON.stringify(body, null, 2));

    try {
        // 2. Validar Evento: Apenas 'messages.upsert' nos interessa
        // A Evolution API envia { event: "messages.upsert", ... }
        if (body.event !== "messages.upsert") {
            // Ignora silenciosamente outros eventos para não spammar Logs
            return NextResponse.json({ ignored: true, reason: `Event ${body.event} ignored` });
        }

        const msgData = body.data;

        // ... (rest of the code unchanged until end) ...

    } catch (error) {
        // ... (error handling) ...
        return NextResponse.json(
            { success: false, error: "Internal Server Error" },
            { status: 500 }
        );
    }
}

export async function GET(_req: NextRequest) {
    return NextResponse.json({ status: "online", message: "Evolution API Webhook is active" });
}

export async function OPTIONS(_req: NextRequest) {
    return NextResponse.json({}, { status: 200, headers: { "Allow": "POST, GET, OPTIONS" } });
}
