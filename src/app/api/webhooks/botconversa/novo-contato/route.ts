import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Webhook para novos contatos do BotConversa
// Cria o lead na coluna "Novo Lead" quando qualquer pessoa envia mensagem

export async function POST(req: NextRequest) {
    let rawBody = "";
    try {
        rawBody = await req.text();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let body: any = {};
        try {
            if (rawBody) {
                body = JSON.parse(rawBody);
            }
        } catch (e) {
            console.error("[WEBHOOK NOVO-CONTATO] Error parsing JSON:", e);
            await prisma.webhookLog.create({
                data: {
                    provider: "botconversa",
                    event: "novo_contato_json_error",
                    payload: rawBody || "(empty)",
                    status: "ERROR",
                    error: "Invalid JSON format",
                }
            });
            return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
        }

        console.log("[WEBHOOK NOVO-CONTATO] Payload:", JSON.stringify(body, null, 2));

        // Teste de conexão
        if (body.test === true || body.action === "test") {
            await prisma.webhookLog.create({
                data: {
                    provider: "botconversa",
                    event: "novo_contato_test",
                    payload: rawBody,
                    status: "SUCCESS",
                }
            });
            return NextResponse.json({
                success: true,
                message: "Webhook Novo Contato ativo!",
                received: body
            });
        }

        // Extrair nome e telefone
        const name = body.name ||
            (body.first_name ? `${body.first_name} ${body.last_name || ""}`.trim() : null) ||
            body.fullName ||
            "Lead sem Nome";

        let phone = body.phone || body.phone_number || body.whatsapp || body.celular || "";
        phone = String(phone).replace(/\D/g, "");

        // Validação: telefone é obrigatório
        if (!phone) {
            console.error("[WEBHOOK NOVO-CONTATO] Erro: Telefone não encontrado");
            await prisma.webhookLog.create({
                data: {
                    provider: "botconversa",
                    event: "novo_contato_validation_error",
                    payload: rawBody,
                    status: "ERROR",
                    error: "Phone number missing",
                }
            });
            return NextResponse.json(
                { success: false, error: "Phone number is required" },
                { status: 400 }
            );
        }

        // Verificar se lead já existe pelo telefone
        const existingLead = await prisma.lead.findFirst({
            where: { phone },
        });

        if (existingLead) {
            console.log(`[WEBHOOK NOVO-CONTATO] Lead já existe: ${existingLead.id} (${existingLead.name})`);
            await prisma.webhookLog.create({
                data: {
                    provider: "botconversa",
                    event: "novo_contato_already_exists",
                    payload: JSON.stringify({
                        received: JSON.parse(rawBody),
                        existingLead: {
                            id: existingLead.id,
                            name: existingLead.name,
                            phone: existingLead.phone,
                            stage: existingLead.stage,
                        }
                    }, null, 2),
                    status: "SUCCESS",
                }
            });
            return NextResponse.json({
                success: true,
                message: "Lead já existe no CRM",
                leadId: existingLead.id,
                stage: existingLead.stage,
            });
        }

        // Buscar usuário admin para atribuir o lead
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
            const anyUser = await prisma.user.findFirst();
            if (!anyUser) {
                console.error("[WEBHOOK NOVO-CONTATO] Erro: Nenhum usuário encontrado");
                await prisma.webhookLog.create({
                    data: {
                        provider: "botconversa",
                        event: "novo_contato_system_error",
                        payload: rawBody,
                        status: "ERROR",
                        error: "No users found in CRM",
                    }
                });
                return NextResponse.json(
                    { success: false, error: "No users found in CRM" },
                    { status: 500 }
                );
            }
            userId = anyUser.id;
        }

        // Criar lead na coluna NOVO_LEAD
        const lead = await prisma.lead.create({
            data: {
                name,
                phone,
                source: "OUTRO", // Fonte inicial desconhecida
                stage: "NOVO_LEAD",
                userId,
            },
        });

        console.log(`[WEBHOOK NOVO-CONTATO] Lead criado: ${lead.id} (${lead.name}) - NOVO_LEAD`);

        await prisma.webhookLog.create({
            data: {
                provider: "botconversa",
                event: "novo_contato_created",
                payload: JSON.stringify({
                    received: JSON.parse(rawBody),
                    created: {
                        leadId: lead.id,
                        name: lead.name,
                        phone: lead.phone,
                        stage: "NOVO_LEAD",
                        assignedTo: userId,
                    }
                }, null, 2),
                status: "SUCCESS",
            }
        });

        return NextResponse.json({
            success: true,
            message: "Lead criado com sucesso",
            leadId: lead.id,
            stage: "NOVO_LEAD",
        });

    } catch (error) {
        console.error("[WEBHOOK NOVO-CONTATO] Erro:", error);
        await prisma.webhookLog.create({
            data: {
                provider: "botconversa",
                event: "novo_contato_internal_error",
                payload: rawBody || "Error before body read",
                status: "ERROR",
                error: error instanceof Error ? error.message : "Unknown error",
            }
        });
        return NextResponse.json(
            { success: false, error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
