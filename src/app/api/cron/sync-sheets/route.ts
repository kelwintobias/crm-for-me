import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAllContractsFromSpreadsheet, type SheetContract } from "@/lib/google-sheets";
import { ContractPackage, ContractSource, PipelineStage } from "@prisma/client";

// ===========================================
// CRON: SINCRONIZAÇÃO COM GOOGLE SHEETS
// ===========================================
// Este endpoint é chamado pelo Vercel Cron a cada 15 minutos
// ou pode ser invocado manualmente para sincronização imediata

export const dynamic = "force-dynamic";

// Desativa timeout padrão (cron jobs podem demorar mais)
export const maxDuration = 60;

export async function GET(request: Request) {
    try {
        // Verificar autorização (token do Vercel Cron ou admin)
        const authHeader = request.headers.get("authorization");
        const cronSecret = process.env.CRON_SECRET;

        // Em produção, verificar token do cron
        if (process.env.NODE_ENV === "production" && cronSecret) {
            if (authHeader !== `Bearer ${cronSecret}`) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }
        }

        const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
        if (!spreadsheetId) {
            return NextResponse.json(
                { error: "GOOGLE_SHEETS_ID não configurado" },
                { status: 500 }
            );
        }

        console.log("[SYNC] Iniciando sincronização com Google Sheets...");

        // Buscar contratos da planilha
        const sheetData = await getAllContractsFromSpreadsheet(spreadsheetId);

        let totalImported = 0;
        let totalSkipped = 0;
        let totalLeadsUpdated = 0;
        const errors: string[] = [];

        // Buscar um usuário admin para associar contratos sem vendedor identificado
        const adminUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: "dherick@upboost.pro" },
                    { email: "kelwin@upboost.com" },
                    { role: "ADMIN" }
                ]
            },
        });

        if (!adminUser) {
            return NextResponse.json(
                { error: "Nenhum usuário admin encontrado para associar contratos" },
                { status: 500 }
            );
        }

        for (const { sheet, contracts } of sheetData) {
            console.log(`[SYNC] Processando aba: ${sheet} (${contracts.length} contratos)`);

            for (const sheetContract of contracts) {
                try {
                    const result = await processContract(sheetContract, adminUser.id);
                    if (result.imported) {
                        totalImported++;
                    } else {
                        totalSkipped++;
                    }
                    if (result.leadUpdated) {
                        totalLeadsUpdated++;
                    }
                } catch (error) {
                    const errorMsg = `Erro ao processar ${sheetContract.clientName}: ${error instanceof Error ? error.message : "Erro desconhecido"}`;
                    console.error(`[SYNC] ${errorMsg}`);
                    errors.push(errorMsg);
                }
            }
        }

        const summary = {
            success: true,
            timestamp: new Date().toISOString(),
            sheetsProcessed: sheetData.length,
            contractsImported: totalImported,
            contractsSkipped: totalSkipped,
            leadsUpdated: totalLeadsUpdated,
            errors: errors.length > 0 ? errors.slice(0, 10) : undefined, // Limita erros no response
        };

        console.log("[SYNC] Sincronização concluída:", summary);

        return NextResponse.json(summary);
    } catch (error) {
        console.error("[SYNC] Erro fatal na sincronização:", error);
        return NextResponse.json(
            {
                error: "Erro na sincronização",
                details: error instanceof Error ? error.message : "Erro desconhecido"
            },
            { status: 500 }
        );
    }
}

// ===========================================
// PROCESS SINGLE CONTRACT
// ===========================================

interface ProcessResult {
    imported: boolean;
    leadUpdated: boolean;
}

async function processContract(
    sheetContract: SheetContract,
    defaultUserId: string
): Promise<ProcessResult> {
    // Verificar se contrato já existe (por WhatsApp + Data)
    const existingContract = await prisma.contract.findFirst({
        where: {
            whatsapp: sheetContract.whatsapp,
            contractDate: sheetContract.contractDate,
        },
    });

    if (existingContract) {
        return { imported: false, leadUpdated: false };
    }

    // Buscar vendedor pelo nome (se disponível)
    let userId = defaultUserId;
    if (sheetContract.sellerName) {
        const seller = await prisma.user.findFirst({
            where: {
                OR: [
                    { name: { contains: sheetContract.sellerName, mode: "insensitive" } },
                    { email: { contains: sheetContract.sellerName.toLowerCase() } },
                ],
            },
        });
        if (seller) {
            userId = seller.id;
        }
    }

    // Criar contrato
    await prisma.contract.create({
        data: {
            clientName: sheetContract.clientName,
            email: sheetContract.email,
            whatsapp: sheetContract.whatsapp,
            instagram: sheetContract.instagram,
            cpf: sheetContract.cpf,
            contractDate: sheetContract.contractDate,
            source: sheetContract.source as ContractSource,
            package: sheetContract.package as ContractPackage,
            addons: sheetContract.addons,
            termsAccepted: sheetContract.termsAccepted,
            totalValue: sheetContract.totalValue,
            userId,
        },
    });

    // Buscar lead pelo WhatsApp para atualizar
    let leadUpdated = false;
    const lead = await prisma.lead.findFirst({
        where: {
            phone: {
                contains: sheetContract.whatsapp.slice(-8), // Últimos 8 dígitos
            },
        },
    });

    if (lead) {
        // Atualizar lead com dados do contrato e mover para FINALIZADO
        await prisma.lead.update({
            where: { id: lead.id },
            data: {
                stage: PipelineStage.FINALIZADO,
                email: sheetContract.email || lead.email,
                instagram: sheetContract.instagram || lead.instagram,
                cpf: sheetContract.cpf || lead.cpf,
                contractDate: sheetContract.contractDate,
                packageType: sheetContract.package,
                addOns: sheetContract.addons.join(", "),
                termsAccepted: sheetContract.termsAccepted,
            },
        });
        leadUpdated = true;
    }

    return { imported: true, leadUpdated };
}
