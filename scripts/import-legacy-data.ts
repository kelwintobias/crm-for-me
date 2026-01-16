/**
 * Script de Importação de Dados Legados do CSV
 * 
 * Este script lê arquivos CSV com histórico de vendas e:
 * 1. Cria um registro de Contract para cada linha
 * 2. Cria um Lead no estágio FINALIZADO para cada linha
 * 
 * Uso:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/import-legacy-data.ts <arquivo.csv> <email-usuario>
 * 
 * Exemplo:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/import-legacy-data.ts MAIO2025.csv admin@upboost.com
 */

import { PrismaClient, ContractSource, ContractPackage, PipelineStage, LeadSource } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

// ================================
// MAPEAMENTO DE VALORES
// ================================

// Mapeia texto do CSV para enum ContractSource
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
    // Default
    return "ANUNCIO";
}

// Mapeia texto do CSV para enum ContractPackage
function mapPackage(csvPackage: string): ContractPackage {
    const normalized = csvPackage.toLowerCase().trim();
    if (normalized.includes("evolution")) {
        return "EVOLUTION";
    }
    if (normalized.includes("ultra") || normalized.includes("ultra pro")) {
        return "ULTRA_PRO";
    }
    if (normalized.includes("pro plus") || normalized.includes("proplus")) {
        return "PRO_PLUS";
    }
    if (normalized.includes("elite")) {
        return "ELITE";
    }
    if (normalized.includes("avan") || normalized.includes("avançado")) {
        return "AVANCADO";
    }
    if (normalized.includes("interm") || normalized.includes("intermediário")) {
        return "INTERMEDIARIO";
    }
    // Default
    return "INTERMEDIARIO";
}

// Mapeia texto do CSV para enum LeadSource
function mapLeadSource(csvSource: string): LeadSource {
    const normalized = csvSource.toLowerCase().trim();
    if (normalized.includes("instagram")) {
        return "INSTAGRAM";
    }
    if (normalized.includes("indica")) {
        return "INDICACAO";
    }
    if (normalized.includes("parceiro") || normalized.includes("parceira")) {
        return "PAGINA_PARCEIRA";
    }
    if (normalized.includes("influenciador") || normalized.includes("influencer")) {
        return "INFLUENCER";
    }
    if (normalized.includes("anuncio") || normalized.includes("anúncio") || normalized.includes("ads")) {
        return "ANUNCIO";
    }
    // Default
    return "OUTRO";
}

// Parsea adicionais do CSV para array
function parseAddons(csvAddons: string): string[] {
    if (!csvAddons || csvAddons.trim() === "" || csvAddons.trim() === "-") {
        return [];
    }

    // Separa por vírgula ou ponto-e-vírgula
    const items = csvAddons.split(/[,;]/).map(s => s.trim()).filter(s => s);

    // Mapeia para IDs conhecidos
    return items.map(item => {
        const normalized = item.toLowerCase();
        if (normalized.includes("windows") || normalized.includes("ativação")) {
            return "ATIVACAO_WINDOWS";
        }
        if (normalized.includes("upboost") || normalized.includes("boost")) {
            return "UPBOOST_PLUS";
        }
        if (normalized.includes("delay")) {
            return "REMOCAO_DELAY";
        }
        if (normalized.includes("profissional")) {
            return "FORMATACAO_PROFISSIONAL";
        }
        if (normalized.includes("format")) {
            return "FORMATACAO_PADRAO";
        }
        return item; // Retorna original se não reconhecido
    });
}

// Parsea valor monetário do CSV
function parseValue(csvValue: string): number {
    if (!csvValue) return 0;
    // Remove R$, espaços, e troca vírgula por ponto
    const cleaned = csvValue
        .replace(/R\$\s*/gi, "")
        .replace(/\./g, "")  // Remove pontos de milhar
        .replace(",", ".")   // Troca vírgula decimal por ponto
        .trim();
    return parseFloat(cleaned) || 0;
}

// Parsea data do CSV
function parseDate(csvDate: string): Date {
    if (!csvDate) return new Date();

    // Tenta vários formatos
    // Formato: 2025-05-28
    if (/^\d{4}-\d{2}-\d{2}/.test(csvDate)) {
        return new Date(csvDate);
    }

    // Formato: 28/05/2025
    if (/^\d{2}\/\d{2}\/\d{4}/.test(csvDate)) {
        const [day, month, year] = csvDate.split("/");
        return new Date(`${year}-${month}-${day}`);
    }

    // Formato: 28-05-2025
    if (/^\d{2}-\d{2}-\d{4}/.test(csvDate)) {
        const [day, month, year] = csvDate.split("-");
        return new Date(`${year}-${month}-${day}`);
    }

    return new Date(csvDate);
}

// Limpa número de telefone
function cleanPhone(phone: string): string {
    if (!phone) return "";
    return phone.replace(/\D/g, "");
}

// ================================
// PARSER DE CSV SIMPLES
// ================================

function parseCSV(content: string): Record<string, string>[] {
    const lines = content.split("\n").filter(line => line.trim());
    if (lines.length < 2) return [];

    // Primeira linha é o header
    const headers = lines[0].split(",").map(h => h.trim().toUpperCase());

    const records: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map(v => v.trim());
        const record: Record<string, string> = {};

        headers.forEach((header, index) => {
            record[header] = values[index] || "";
        });

        records.push(record);
    }

    return records;
}

// ================================
// IMPORTAÇÃO PRINCIPAL
// ================================

async function importLegacyData(csvPath: string, userEmail: string) {
    console.log("\n===========================================");
    console.log("  IMPORTAÇÃO DE DADOS LEGADOS");
    console.log("===========================================\n");

    // 1. Verificar arquivo
    if (!fs.existsSync(csvPath)) {
        console.error(`❌ Arquivo não encontrado: ${csvPath}`);
        process.exit(1);
    }

    // 2. Buscar usuário
    const user = await prisma.user.findUnique({
        where: { email: userEmail },
    });

    if (!user) {
        console.error(`❌ Usuário não encontrado: ${userEmail}`);
        console.log("\nUsuários disponíveis:");
        const users = await prisma.user.findMany({ select: { email: true, name: true } });
        users.forEach(u => console.log(`  - ${u.email} (${u.name})`));
        process.exit(1);
    }

    console.log(`✅ Usuário: ${user.name} (${user.email})`);
    console.log(`📄 Arquivo: ${path.basename(csvPath)}\n`);

    // 3. Ler e parsear CSV
    const content = fs.readFileSync(csvPath, "utf-8");
    const records = parseCSV(content);

    console.log(`📊 Total de registros encontrados: ${records.length}\n`);

    if (records.length === 0) {
        console.log("⚠️  Nenhum registro para importar.");
        process.exit(0);
    }

    // Mostrar colunas encontradas
    console.log("Colunas detectadas no CSV:");
    console.log(Object.keys(records[0]).join(", "));
    console.log("");

    // 4. Importar cada registro
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < records.length; i++) {
        const row = records[i];

        try {
            // Extrair dados do CSV
            const data = {
                date: parseDate(row["DATA"] || row["DATE"] || row["CREATED_AT"] || ""),
                email: row["EMAIL"] || null,
                name: row["NOME"] || row["NAME"] || row["CLIENTE"] || "Cliente Importado",
                whatsapp: cleanPhone(row["WHATSAPP"] || row["TELEFONE"] || row["PHONE"] || ""),
                instagram: row["INSTAGRAM"] || null,
                cpf: row["CPF"] || null,
                packageName: row["PACOTE ADQUIRIDO"] || row["PACOTE"] || row["PACKAGE"] || "",
                addons: row["ADICIONAIS"] || row["ADD_ONS"] || row["ADDONS"] || "",
                value: parseValue(row["VALOR"] || row["VALUE"] || row["TOTAL"] || "0"),
                origin: row["ORIGEM"] || row["ORIGIN"] || row["SOURCE"] || "Anúncio",
            };

            console.log(`[${i + 1}/${records.length}] Importando: ${data.name}...`);

            // AÇÃO 1: Criar Contract
            const contract = await prisma.contract.create({
                data: {
                    clientName: data.name,
                    email: data.email,
                    whatsapp: data.whatsapp || "0000000000",
                    instagram: data.instagram,
                    cpf: data.cpf,
                    contractDate: data.date,
                    source: mapSource(data.origin),
                    package: mapPackage(data.packageName),
                    addons: parseAddons(data.addons),
                    termsAccepted: true,
                    totalValue: new Decimal(data.value),
                    userId: user.id,
                    createdAt: data.date, // Manter data original
                },
            });

            // AÇÃO 2: Criar Lead no estágio FINALIZADO
            const lead = await prisma.lead.create({
                data: {
                    name: data.name,
                    phone: data.whatsapp || "0000000000",
                    email: data.email,
                    instagram: data.instagram,
                    cpf: data.cpf,
                    source: mapLeadSource(data.origin),
                    stage: PipelineStage.FINALIZADO, // Já nasce como finalizado!
                    value: new Decimal(data.value),
                    packageType: data.packageName,
                    addOns: data.addons,
                    termsAccepted: true,
                    contractDate: data.date,
                    userId: user.id,
                    createdAt: data.date, // Manter data original
                },
            });

            console.log(`   ✅ Contract: ${contract.id.slice(0, 8)}... | Lead: ${lead.id.slice(0, 8)}...`);
            successCount++;

        } catch (error) {
            console.error(`   ❌ Erro: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
            errorCount++;
        }
    }

    // 5. Resumo final
    console.log("\n===========================================");
    console.log("  RESULTADO DA IMPORTAÇÃO");
    console.log("===========================================");
    console.log(`✅ Sucesso: ${successCount}`);
    console.log(`❌ Erros: ${errorCount}`);
    console.log(`📊 Total: ${records.length}`);
    console.log("===========================================\n");
}

// ================================
// EXECUÇÃO
// ================================

const args = process.argv.slice(2);

if (args.length < 2) {
    console.log(`
Uso: npx ts-node --compiler-options '{"module":"commonjs"}' scripts/import-legacy-data.ts <arquivo.csv> <email-usuario>

Argumentos:
  arquivo.csv     Caminho para o arquivo CSV
  email-usuario   Email do usuário no sistema

Exemplo:
  npx ts-node --compiler-options '{"module":"commonjs"}' scripts/import-legacy-data.ts data/MAIO2025.csv admin@upboost.com

Formato esperado do CSV:
  DATA,EMAIL,NOME,WHATSAPP,INSTAGRAM,CPF,PACOTE ADQUIRIDO,ADICIONAIS,VALOR,ORIGEM
`);
    process.exit(1);
}

const csvPath = args[0];
const userEmail = args[1];

importLegacyData(csvPath, userEmail)
    .then(() => prisma.$disconnect())
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
