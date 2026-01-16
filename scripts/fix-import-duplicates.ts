/**
 * Script de Correção de Importação - Mescla Registros Duplicados
 * 
 * Este script processa CSVs onde um cliente pode ter múltiplas linhas:
 * - Uma linha com o pacote principal
 * - Outra linha com adicionais
 * 
 * O script agrupa por email e mescla os dados em um único registro.
 * 
 * Uso:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/fix-import-duplicates.ts <arquivo.csv> <email-usuario>
 */

import { PrismaClient, ContractSource, ContractPackage, PipelineStage, LeadSource } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

// ================================
// MAPEAMENTO DE VALORES
// ================================

function mapSource(csvSource: string): ContractSource {
    const normalized = csvSource.toLowerCase().trim();
    if (normalized.includes("anuncio") || normalized.includes("anúncio") || normalized.includes("ads")) {
        return "ANUNCIO";
    }
    if (normalized.includes("indica")) {
        return "INDICACAO";
    }
    if (normalized.includes("influenciador") || normalized.includes("influencer")) {
        return "INFLUENCIADOR";
    }
    if (normalized.includes("parceiro") || normalized.includes("partner")) {
        return "PARCEIRO";
    }
    return "ANUNCIO";
}

function mapPackage(csvPackage: string): ContractPackage {
    const normalized = csvPackage.toLowerCase().trim();
    if (normalized.includes("evolution")) return "EVOLUTION";
    if (normalized.includes("ultra")) return "ULTRA_PRO";
    if (normalized.includes("pro plus") || normalized.includes("proplus")) return "PRO_PLUS";
    if (normalized.includes("elite")) return "ELITE";
    if (normalized.includes("avan") || normalized.includes("avançado")) return "AVANCADO";
    if (normalized.includes("interm") || normalized.includes("intermediário")) return "INTERMEDIARIO";
    return "INTERMEDIARIO";
}

function mapLeadSource(csvSource: string): LeadSource {
    const normalized = csvSource.toLowerCase().trim();
    if (normalized.includes("instagram")) return "INSTAGRAM";
    if (normalized.includes("indica")) return "INDICACAO";
    if (normalized.includes("parceiro") || normalized.includes("parceira")) return "PAGINA_PARCEIRA";
    if (normalized.includes("influenciador") || normalized.includes("influencer")) return "INFLUENCER";
    if (normalized.includes("anuncio") || normalized.includes("anúncio") || normalized.includes("ads")) return "ANUNCIO";
    return "OUTRO";
}

function parseAddons(csvAddons: string): string[] {
    if (!csvAddons || csvAddons.trim() === "" || csvAddons.trim() === "-") {
        return [];
    }

    const items = csvAddons.split(/[,;]/).map(s => s.trim()).filter(s => s);

    return items.map(item => {
        const normalized = item.toLowerCase();
        if (normalized.includes("windows") || normalized.includes("ativação")) return "ATIVACAO_WINDOWS";
        if (normalized.includes("upboost") || normalized.includes("boost")) return "UPBOOST_PLUS";
        if (normalized.includes("delay")) return "REMOCAO_DELAY";
        if (normalized.includes("profissional")) return "FORMATACAO_PROFISSIONAL";
        if (normalized.includes("format")) return "FORMATACAO_PADRAO";
        return item;
    });
}

function parseValue(csvValue: string): number {
    if (!csvValue) return 0;
    const cleaned = csvValue
        .replace(/R\$\s*/gi, "")
        .replace(/\./g, "")
        .replace(",", ".")
        .trim();
    return parseFloat(cleaned) || 0;
}

function parseDate(csvDate: string): Date {
    if (!csvDate) return new Date();

    if (/^\d{4}-\d{2}-\d{2}/.test(csvDate)) {
        return new Date(csvDate);
    }
    if (/^\d{2}\/\d{2}\/\d{4}/.test(csvDate)) {
        const [day, month, year] = csvDate.split("/");
        return new Date(`${year}-${month}-${day}`);
    }
    if (/^\d{2}-\d{2}-\d{4}/.test(csvDate)) {
        const [day, month, year] = csvDate.split("-");
        return new Date(`${year}-${month}-${day}`);
    }

    return new Date(csvDate);
}

function cleanPhone(phone: string): string {
    if (!phone) return "";
    return phone.replace(/\D/g, "");
}

// ================================
// PARSER CSV MELHORADO
// ================================

function parseCSV(content: string): Record<string, string>[] {
    const lines = content.split("\n").filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map(h => h.trim().toUpperCase());
    const records: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
        // Parse CSV considerando campos entre aspas
        const line = lines[i];
        const values: string[] = [];
        let current = "";
        let inQuotes = false;

        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = "";
            } else {
                current += char;
            }
        }
        values.push(current.trim());

        const record: Record<string, string> = {};
        headers.forEach((header, index) => {
            record[header] = values[index] || "";
        });

        records.push(record);
    }

    return records;
}

// ================================
// INTERFACE PARA DADOS MESCLADOS
// ================================

interface MergedRecord {
    date: Date;
    email: string | null;
    name: string;
    whatsapp: string;
    instagram: string | null;
    cpf: string | null;
    packageName: string;
    addons: string[];
    totalValue: number;
    origin: string;
}

// ================================
// MESCLAGEM DE REGISTROS
// ================================

function mergeRecords(records: Record<string, string>[]): MergedRecord[] {
    // Agrupar por email ou whatsapp (identificador único do cliente)
    const groups = new Map<string, Record<string, string>[]>();

    for (const record of records as any[]) {
        const email = record["EMAIL"] || "";
        const whatsapp = cleanPhone(record["WHATSAPP"] || record["TELEFONE"] || record["PHONE"] || "");
        const name = record["NOME"] || record["NAME"] || record["CLIENTE"] || "";

        // Pular linhas vazias ou de teste
        if (!name || name.toLowerCase() === "padrao" || !email) {
            continue;
        }

        // Usar email como chave primária
        const key = email.toLowerCase();

        if (!groups.has(key)) {
            groups.set(key, []);
        }
        groups.get(key)!.push(record);
    }

    // Mesclar cada grupo
    const merged: MergedRecord[] = [];

    for (const key of Array.from(groups.keys())) {
        const groupRecords = groups.get(key)!;
        // Encontrar o registro principal (com pacote)
        let mainRecord = groupRecords.find(r => {
            const pkg = r["PACOTE ADQUIRIDO"] || r["PACOTE"] || r["PACKAGE"] || "";
            return pkg.toLowerCase().includes("pacote");
        });

        // Se não encontrar registro com pacote, usar o primeiro
        if (!mainRecord) {
            mainRecord = groupRecords[0];
        }

        // Coletar todos os adicionais de todos os registros
        const allAddons: string[] = [];
        let totalValue = 0;

        for (const record of groupRecords) {
            const addonsStr = record["ADICIONAIS"] || record["ADD_ONS"] || record["ADDONS"] || "";
            const recordAddons = parseAddons(addonsStr);
            allAddons.push(...recordAddons);

            const value = parseValue(record["VALOR"] || record["VALUE"] || record["TOTAL"] || "0");
            totalValue += value;
        }

        // Remover adicionais duplicados
        const uniqueAddons = allAddons.filter((v, i, a) => a.indexOf(v) === i);

        merged.push({
            date: parseDate(mainRecord["DATA"] || mainRecord["DATE"] || mainRecord["CREATED_AT"] || ""),
            email: mainRecord["EMAIL"] || null,
            name: mainRecord["NOME"] || mainRecord["NAME"] || mainRecord["CLIENTE"] || "Cliente Importado",
            whatsapp: cleanPhone(mainRecord["WHATSAPP"] || mainRecord["TELEFONE"] || mainRecord["PHONE"] || ""),
            instagram: mainRecord["INSTAGRAM"] || null,
            cpf: mainRecord["CPF"] || null,
            packageName: mainRecord["PACOTE ADQUIRIDO"] || mainRecord["PACOTE"] || mainRecord["PACKAGE"] || "",
            addons: uniqueAddons,
            totalValue: totalValue,
            origin: mainRecord["ORIGEM"] || mainRecord["ORIGIN"] || mainRecord["SOURCE"] || "Anúncio",
        });
    }

    return merged;
}

// ================================
// IMPORTAÇÃO CORRETIVA
// ================================

async function fixImport(csvPath: string, userEmail: string) {
    console.log("\n===========================================");
    console.log("  CORREÇÃO DE IMPORTAÇÃO - MESCLA DUPLICADOS");
    console.log("===========================================\n");

    if (!fs.existsSync(csvPath)) {
        console.error(`❌ Arquivo não encontrado: ${csvPath}`);
        process.exit(1);
    }

    const user = await prisma.user.findUnique({
        where: { email: userEmail },
    });

    if (!user) {
        console.error(`❌ Usuário não encontrado: ${userEmail}`);
        process.exit(1);
    }

    console.log(`✅ Usuário: ${user.name} (${user.email})`);
    console.log(`📄 Arquivo: ${path.basename(csvPath)}\n`);

    const content = fs.readFileSync(csvPath, "utf-8");
    const rawRecords = parseCSV(content);

    console.log(`📊 Registros brutos no CSV: ${rawRecords.length}`);

    // Mesclar registros duplicados
    const mergedRecords = mergeRecords(rawRecords);

    console.log(`🔗 Registros após mesclagem: ${mergedRecords.length}`);
    console.log(`📝 Duplicatas mescladas: ${rawRecords.length - mergedRecords.length}\n`);

    // Primeiro, apagar registros existentes deste mês para evitar duplicação
    // (o script original já importou alguns, então vamos reimportar limpo)

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < mergedRecords.length; i++) {
        const data = mergedRecords[i];

        try {
            // Verificar se já existe um contrato com mesmo email e data similar
            const existingContract = await prisma.contract.findFirst({
                where: {
                    email: data.email,
                    userId: user.id,
                },
            });

            if (existingContract) {
                console.log(`[${i + 1}/${mergedRecords.length}] ⏭️  Pulando (já existe): ${data.name}`);
                skippedCount++;
                continue;
            }

            console.log(`[${i + 1}/${mergedRecords.length}] Importando: ${data.name}...`);
            console.log(`   📦 Pacote: ${data.packageName || "(nenhum)"}`);
            console.log(`   ➕ Adicionais: ${data.addons.length > 0 ? data.addons.join(", ") : "(nenhum)"}`);
            console.log(`   💰 Valor Total: R$ ${data.totalValue.toFixed(2)}`);

            // Criar Contract
            const contract = await prisma.contract.create({
                data: {
                    clientName: data.name,
                    email: data.email,
                    whatsapp: data.whatsapp || "0000000000",
                    instagram: data.instagram,
                    cpf: data.cpf,
                    contractDate: data.date,
                    source: mapSource(data.origin),
                    package: data.packageName ? mapPackage(data.packageName) : "INTERMEDIARIO",
                    addons: data.addons,
                    termsAccepted: true,
                    totalValue: new Decimal(data.totalValue),
                    userId: user.id,
                    createdAt: data.date,
                },
            });

            // Criar Lead no estágio FINALIZADO
            const lead = await prisma.lead.create({
                data: {
                    name: data.name,
                    phone: data.whatsapp || "0000000000",
                    email: data.email,
                    instagram: data.instagram,
                    cpf: data.cpf,
                    source: mapLeadSource(data.origin),
                    stage: PipelineStage.FINALIZADO,
                    value: new Decimal(data.totalValue),
                    packageType: data.packageName,
                    addOns: data.addons.join(", "),
                    termsAccepted: true,
                    contractDate: data.date,
                    userId: user.id,
                    createdAt: data.date,
                },
            });

            console.log(`   ✅ Contract: ${contract.id.slice(0, 8)}... | Lead: ${lead.id.slice(0, 8)}...`);
            successCount++;

        } catch (error) {
            console.error(`   ❌ Erro: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
            errorCount++;
        }
    }

    console.log("\n===========================================");
    console.log("  RESULTADO DA CORREÇÃO");
    console.log("===========================================");
    console.log(`✅ Sucesso: ${successCount}`);
    console.log(`⏭️  Pulados (já existem): ${skippedCount}`);
    console.log(`❌ Erros: ${errorCount}`);
    console.log(`📊 Total processado: ${mergedRecords.length}`);
    console.log("===========================================\n");
}

// ================================
// EXECUÇÃO
// ================================

const args = process.argv.slice(2);

if (args.length < 2) {
    console.log(`
Uso: npx ts-node --compiler-options '{"module":"commonjs"}' scripts/fix-import-duplicates.ts <arquivo.csv> <email-usuario>

Este script mescla registros duplicados (mesmo email) combinando:
- Pacote principal
- Adicionais de todas as linhas
- Valor total somado
`);
    process.exit(1);
}

const csvPath = args[0];
const userEmail = args[1];

fixImport(csvPath, userEmail)
    .then(() => prisma.$disconnect())
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
