import fs from "fs";
import { parse } from "csv-parse/sync";
import { PrismaClient, ContractPackage, ContractSource, PipelineStage, LeadSource, PlanType } from "@prisma/client";

const prisma = new PrismaClient();

const CSV_PATH = String.raw`C:\Users\kelwi\Documents\crm-for-me\_[COMPRADORES] - UPBOOST 1 - JANEIRO_2026.csv`;

// Helpers de Parsing
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

function parseSource(raw: string): ContractSource {
    const normalized = raw.toLowerCase();

    if (normalized.includes("anúncio") || normalized.includes("anuncio")) return "ANUNCIO";
    if (normalized.includes("indicação") || normalized.includes("indicacao")) return "INDICACAO";
    if (normalized.includes("influenciador") || normalized.includes("influencer") || normalized.includes("video")) return "INFLUENCIADOR";
    if (normalized.includes("parceira") || normalized.includes("parceiro")) return "PARCEIRO";

    return "ANUNCIO"; // Default
}

function mapContractSourceToLeadSource(source: ContractSource): LeadSource {
    const map: Record<string, LeadSource> = {
        "ANUNCIO": "ANUNCIO",
        "INDICACAO": "INDICACAO",
        "INFLUENCIADOR": "INFLUENCER", // Correção aqui: O Enum do Lead é INFLUENCER
        "PARCEIRO": "PAGINA_PARCEIRA",
        // Adicionando mapeamento reverso caso venha string direta
        "INFLUENCER": "INFLUENCER"
    };
    return map[source] || "OUTRO";
}

function parseValues(raw: string): number {
    return parseFloat(raw.replace("R$", "").replace(/\./g, "").replace(",", ".").trim()) || 0;
}

function parseDate(raw: string): Date {
    // dd/MM/yyyy HH:mm:ss
    const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}):(\d{2}))?/);
    if (match) {
        return new Date(
            parseInt(match[3]),
            parseInt(match[2]) - 1,
            parseInt(match[1]),
            parseInt(match[4] || "0"),
            parseInt(match[5] || "0"),
            parseInt(match[6] || "0")
        );
    }
    return new Date();
}

async function main() {
    console.log("Iniciando importação de contratos do CSV...");

    if (!fs.existsSync(CSV_PATH)) {
        console.error("Arquivo CSV não encontrado:", CSV_PATH);
        return;
    }

    const fileContent = fs.readFileSync(CSV_PATH, "utf-8");
    const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
    });

    console.log(`Encontrados ${records.length} registros no CSV.`);

    // Buscar admin para associar
    let admin = await prisma.user.findFirst({
        where: { email: "kelwin@upboost.com" }
    });
    if (!admin) {
        admin = await prisma.user.findFirst({
            where: { role: "ADMIN" }
        });
    }

    if (!admin) {
        console.error("Nenhum admin encontrado para associar contratos.");
        return;
    }
    const userId = admin.id;

    let createdCount = 0;
    let skippedCount = 0;

    for (const row of records) {
        try {
            const dataStr = row["DATA"];
            const email = row["EMAIL "] || row["EMAIL"];
            const nome = row["NOME"];
            const whatsapp = String(row["WHATSAPP"]).replace(/\D/g, "");
            const instagram = row["INSTAGRAM"];
            const cpf = String(row["CPF"]).replace(/\D/g, "");
            const pacoteStr = row["PACOTE ADQUIRIDO "] || row["PACOTE ADQUIRIDO"];
            const adicionaisStr = row["ADICIONAIS"];
            const origemStr = row["ORIGEM"];
            const valorStr = row["VALOR"];

            if (!whatsapp) {
                console.warn(`Registro sem WhatsApp ignorado: ${nome}`);
                continue;
            }

            const contractDate = parseDate(dataStr);
            const totalValue = parseValues(valorStr);
            const pack = parsePackage(pacoteStr);
            const source = parseSource(origemStr);

            const addonsList = adicionaisStr
                ? adicionaisStr.split(",").map((s: string) => s.trim()).filter((s: string) => s.length > 0)
                : [];

            // 1. Verificar se contrato existe
            const existingContract = await prisma.contract.findFirst({
                where: {
                    whatsapp: whatsapp,
                    contractDate: contractDate,
                }
            });

            if (!existingContract) {
                // 2. Criar Contrato
                await prisma.contract.create({
                    data: {
                        clientName: nome,
                        email: email,
                        whatsapp: whatsapp,
                        instagram: instagram,
                        cpf: cpf,
                        contractDate: contractDate,
                        source: source,
                        package: pack,
                        addons: addonsList,
                        totalValue: totalValue,
                        termsAccepted: true,
                        userId: userId,
                    }
                });
                createdCount++;
            } else {
                skippedCount++;
            }

            // 3. Criar ou Atualizar Lead (SEMPRE)
            // Lógica para garantir que apareça em Pessoas/Finalizado
            const phoneSuffix = whatsapp.slice(-8);
            let lead = await prisma.lead.findFirst({
                where: {
                    phone: { contains: phoneSuffix }
                }
            });

            const leadData = {
                name: nome,
                phone: whatsapp,
                email: email,
                instagram: instagram,
                cpf: cpf,
                source: mapContractSourceToLeadSource(source),
                plan: pack as unknown as PlanType,
                value: totalValue,
                stage: "FINALIZADO" as PipelineStage,
                contractDate: contractDate,
                packageType: pack,
                addOns: addonsList.join(", "),
                termsAccepted: true,
            };

            if (lead) {
                await prisma.lead.update({
                    where: { id: lead.id },
                    data: {
                        ...leadData,
                        userId: lead.userId
                    }
                });
            } else {
                await prisma.lead.create({
                    data: {
                        ...leadData,
                        userId: userId
                    }
                });
            }

        } catch (err) {
            console.error(`Erro ao processar linha:`, row, err);
        }
    }

    console.log("Importação concluída!");
    console.log(`Contratos criados: ${createdCount}`);
    console.log(`Contratos existentes (ignorados): ${skippedCount}`);
    // Leads são sempre atualizados/criados, então não conto explicitamente, mas roda para todos.
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
