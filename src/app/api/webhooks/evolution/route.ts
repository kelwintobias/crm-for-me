import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { broadcastTableChange } from "@/lib/realtime/broadcast";

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

        // Validar estrutura básica
        if (!msgData || !msgData.key) {
            return NextResponse.json({ ignored: true, reason: "Invalid data structure" });
        }

        // 3. Ignorar mensagens enviadas por MIM (fromMe: true)
        // Queremos apenas mensagens RECEBIDAS do cliente
        if (msgData.key.fromMe) {
            return NextResponse.json({ ignored: true, reason: "Message from me" });
        }

        // 4. Extrair Telefone (RemoteJid) e Nome (PushName)
        const remoteJid = msgData.key.remoteJid; // ex: 5511999999999@s.whatsapp.net
        if (!remoteJid) {
            return NextResponse.json({ ignored: true, reason: "No remoteJid" });
        }

        // Extrair apenas números do telefone para buscar no banco
        // O padrão do banco é armazenar apenas digitos (ex: 5511999999999)
        const phone = remoteJid.replace(/\D/g, "");

        // Nome definido pelo usuário no WhatsApp
        const pushName = msgData.pushName || "Lead sem Nome";

        // TODO: Validar instância se necessário (ex: if (body.instance !== "julia"))
        // Por enquanto aceita de qualquer instância configurada no webhook

        // 5. Verificar se o Lead já existe no banco (apenas leads ativos)
        const existingLead = await prisma.lead.findFirst({
            where: { phone, deletedAt: null },
        });

        let leadId = "";
        let action = "";

        if (existingLead) {
            // Cenário A: Lead Já Existe

            if (existingLead.inPipeline) {
                // Se já está no Kanban (ativo), não fazemos nada.
                console.log(`[WEBHOOK EVOLUTION] Lead já no pipeline: ${existingLead.id} (${existingLead.name})`);

                // Opcional: Poderíamos atualizar a data de "última interação" se houvesse campo para isso.

                return NextResponse.json({
                    success: true,
                    message: "Lead already in pipeline",
                    leadId: existingLead.id
                });
            } else {
                // Cenário B: Lead Existe mas NÃO está no Kanban (ex: Arquivado, Deletado?, ou flag inPipeline=false)
                // O requisito pede para adicionar na coluna "Novo Lead"

                console.log(`[WEBHOOK EVOLUTION] Reativando Lead: ${existingLead.id}`);

                // Manter o nome original do cadastro (não sobrescrever com pushName)
                await prisma.lead.update({
                    where: { id: existingLead.id },
                    data: {
                        inPipeline: true,         // Traz de volta pro Kanban
                        stage: "NOVO_LEAD",       // Move para primeira coluna
                        updatedAt: new Date(),    // Atualiza timestamp
                    }
                });

                leadId = existingLead.id;
                action = "reactivated";
            }

        } else {
            // Cenário C: Lead NÃO Existe (Novo Lead)

            console.log(`[WEBHOOK EVOLUTION] Criando Novo Lead: ${pushName} (${phone})`);

            // Atribuir Dono do Lead (UserId)
            // Lógica: Tentar achar um ADMIN, ou fallback para qualquer usuário.
            // Idealmente existiria uma roleta ou usuário "Bot".

            // Tenta achar admin específico ou qualquer admin
            const adminUser = await prisma.user.findFirst({
                where: {
                    OR: [
                        { role: "ADMIN" },
                        // Emails hardcoded como fallback de segurança caso não tenha role ADMIN nos dados
                        { email: "dherick@upboost.pro" },
                        { email: "kelwin@upboost.com" }
                    ]
                },
                orderBy: { createdAt: "asc" } // Pega o mais antigo (estável)
            });

            let userId = adminUser?.id;

            // Fallback: Se não achar admin, pega o primeiro usuário que existir
            if (!userId) {
                const anyUser = await prisma.user.findFirst();
                userId = anyUser?.id;
            }

            if (!userId) {
                // Erro Crítico: Não tem usuário no sistema para atribuir o lead.
                console.error("[WEBHOOK EVOLUTION] CRITICAL: Nenhum usuário encontrado para atribuir lead.");

                await prisma.webhookLog.create({
                    data: {
                        provider: "evolution",
                        event: "error_no_user",
                        payload: JSON.stringify({ phone, pushName }),
                        status: "ERROR",
                        error: "No users in database"
                    }
                });

                return NextResponse.json({ success: false, error: "System configuration error: No users" }, { status: 500 });
            }

            // Criar o Lead
            const newLead = await prisma.lead.create({
                data: {
                    name: pushName,          // Usa o nome do WhatsApp
                    phone: phone,            // Usa o número limpo
                    source: "OUTRO",         // Origem
                    stage: "NOVO_LEAD",      // Coluna Inicial
                    inPipeline: true,        // Visível no Kanban
                    userId: userId,          // Dono
                    value: 0,                // Valor inicial
                    plan: "INDEFINIDO",      // Plano inicial
                }
            });

            leadId = newLead.id;
            action = "created";
        }

        // Revalidar Cache para UI atualizar em tempo real (Server Actions/RSC)
        revalidatePath("/");
        await broadcastTableChange("leads", action === "created" ? "insert" : "update");

        // Logar Sucesso no WebhookLog (para debug futuro)
        // Salvamos apenas os dados essenciais para não lotar o banco com o payload gigante da Evolution
        await prisma.webhookLog.create({
            data: {
                provider: "evolution",
                event: "messages.upsert",
                payload: JSON.stringify({
                    phone,
                    pushName,
                    action,
                    leadId,
                    remoteJid
                }),
                status: "SUCCESS"
            }
        });

        return NextResponse.json({
            success: true,
            action,
            leadId
        });

    } catch (error) {
        console.error("[WEBHOOK EVOLUTION] Erro desconhecido:", error);

        // Logar erro
        await prisma.webhookLog.create({
            data: {
                provider: "evolution",
                event: "process_error",
                payload: rawBody.slice(0, 1000) || "error reading body", // Limita tamanho
                status: "ERROR",
                error: error instanceof Error ? error.message : "Unknown error"
            }
        });

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
