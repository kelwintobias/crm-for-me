/**
 * Script de Importação em Massa (RAW) - CORRIGIDO
 * 
 * 1. Limpa todos os dados atuais do usuário dherick@upboost.pro
 * 2. Importa todos os CSVs encontrados na pasta dbantigodocliente
 * 3. Mantém fidelidade 1:1 (uma linha do CSV = um registro no banco)
 * 
 * Uso: npx ts-node --compiler-options '{"module":"commonjs"}' scripts/bulk-import-raw.ts
 */

import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();
const USER_EMAIL = "dherick@upboost.pro";
const IMPORT_DIR = "/root/meu-projeto-claude/dbantigodocliente";

// ================================
// FUNÇÕES DE MAPEAMENTO (CORRIGIDAS COM ANY PARA EVITAR ERROS DE TS)
// ================================

function mapSource(csvSource: string): any {
    const normalized = (csvSource || "").toLowerCase().trim();
    if (normalized.includes("anuncio") || normalized.includes("anúncio") || normalized.includes("ads")) return "ANUNCIO";
    if (normalized.includes("indica")) return "INDICACAO";
    if (normalized.includes("influenciador") || normalized.includes("influencer")) return "INFLUENCIADOR";
    if (normalized.includes("parceiro") || normalized.includes("partner")) return "PARCEIRO";
    return "ANUNCIO";
}

function mapPackage(csvPackage: string): any {
    const normalized = (csvPackage || "").toLowerCase().trim();
    if (normalized.includes("evolution")) return "EVOLUTION";
    if (normalized.includes("ultra")) return "ULTRA_PRO";
    if (normalized.includes("pro plus") || normalized.includes("proplus")) return "PRO_PLUS";
    if (normalized.includes("elite")) return "ELITE";
    if (normalized.includes("avan") || normalized.includes("avançado")) return "AVANCADO";
    if (normalized.includes("interm") || normalized.includes("intermediário")) return "INTERMEDIARIO";
    return "INTERMEDIARIO";
}

function mapLeadSource(csvSource: string): any {
    const normalized = (csvSource || "").toLowerCase().trim();
    if (normalized.includes("instagram")) return "INSTAGRAM";
    if (normalized.includes("indica")) return "INDICACAO";
    if (normalized.includes("google")) return "GOOGLE";
    return "OUTRO";
}

function parseAddons(csvAddons: string): string[] {
    if (!csvAddons || csvAddons.trim() === "" || csvAddons.trim() === "-") return [];

    // Tenta quebrar JSON ou lista simples
    try {
        if (csvAddons.startsWith("[")) {
            const parsed = JSON.parse(csvAddons);
            if (Array.isArray(parsed)) return parsed;
        }
    } catch (e) { }

    // Separa por vírgula que não esteja dentro de parênteses
    // Regex simplificado para split: virgula ou ponto e virgula
    const items = csvAddons.split(/[,;]/).map(s => s.trim()).filter(s => s);

    return items.map(item => {
        const normalized = item.toLowerCase();
        if (normalized.includes("windows") || normalized.includes("ativação")) return "ATIVACAO_WINDOWS";
        if (normalized.includes("upboost") || normalized.includes("boost")) return "UPBOOST_PLUS";
        if (normalized.includes("delay")) return "REMOCAO_DELAY";
        if (normalized.includes("profissional")) return "FORMATACAO_PROFISSIONAL";
        if (normalized.includes("format") && !normalized.includes("profissional")) return "FORMATACAO_PADRAO";
        return item; // Retorna string original se não mapear
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

    // Formato: 13/05/2025 13:44:45
    // Ou: 13/05/2025

    try {
        if (csvDate.includes("/")) {
            const parts = csvDate.split(" ");
            const datePart = parts[0];
            const timePart = parts[1] || "00:00:00";

            const [day, month, year] = datePart.split("/");
            if (day && month && year) {
                return new Date(`${year}-${month}-${day}T${timePart}`);
            }
        }
    } catch (e) {
        // Fallback
    }

    const parsed = new Date(csvDate);
    if (isNaN(parsed.getTime())) return new Date(); // Fallback to now if invalid
    return parsed;
}

// ================================
// PARSER CSV
// ================================

function parseCSV(content: string): Record<string, string>[] {
    const records: Record<string, string>[] = [];
    let headers: string[] = [];

    let currentField = '';
    let currentRecord: string[] = [];
    let inQuotes = false;

    // Normalizar quebras de linha para \n
    const text = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    for (let i = 0; i < text.length; i++) {
        const char = text[i];

        if (char === '"') {
            // Handle escaped quotes ("") - verifica se o próximo char também é aspas
            if (inQuotes && text[i + 1] === '"') {
                currentField += '"';
                i++; // Pula a próxima aspas
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            // Fim do campo
            currentRecord.push(currentField.trim()); // Trim apenas nas bordas do campo (opcional, mas bom pra limpar lixo)
            currentField = '';
        } else if (char === '\n' && !inQuotes) {
            // Fim do registro
            currentRecord.push(currentField.trim());
            currentField = '';

            // Processar registro
            if (currentRecord.length > 0 && currentRecord.some(f => f)) {
                if (headers.length === 0) {
                    // Definir headers (primeira linha)
                    headers = currentRecord.map(h => h.trim().toUpperCase());
                } else {
                    // Dados
                    const rec: Record<string, string> = {};
                    headers.forEach((h, idx) => {
                        // Evitar erro se o registro tiver mais colunas que o header ou vice-versa
                        if (idx < currentRecord.length) {
                            rec[h] = currentRecord[idx];
                        }
                    });
                    records.push(rec);
                }
            }
            currentRecord = [];
        } else {
            currentField += char;
        }
    }

    // Processar último registro se não houver \n no final do arquivo
    if (currentRecord.length > 0 || currentField) {
        currentRecord.push(currentField.trim());
        if (currentRecord.length > 0 && currentRecord.some(f => f) && headers.length > 0) {
            const rec: Record<string, string> = {};
            headers.forEach((h, idx) => {
                if (idx < currentRecord.length) rec[h] = currentRecord[idx];
            });
            records.push(rec);
        }
    }

    return records;
}

// ================================
// EXECUÇÃO
// ================================

async function main() {
    console.log("🚀 INICIANDO IMPORTAÇÃO EM MASSA (MODO RAW/SEM DEDUPLICAÇÃO)");
    console.log("==========================================================");

    // 1. Verificar User
    const user = await prisma.user.findUnique({ where: { email: USER_EMAIL } });
    if (!user) {
        console.error(`❌ Usuário ${USER_EMAIL} não encontrado!`);
        process.exit(1);
    }
    console.log(`👤 Usuário: ${user.name} (${user.email})`);

    // 2. Limpar dados anteriores
    console.log("\n🧹 Limpando dados antigos...");

    const delContracts = await prisma.contract.deleteMany({ where: { userId: user.id } });
    console.log(`   - Contratos removidos: ${delContracts.count}`);

    const delLeads = await prisma.lead.deleteMany({
        where: { userId: user.id }
    });
    console.log(`   - Leads removidos: ${delLeads.count}`);

    // 3. Listar Arquivos
    const files = fs.readdirSync(IMPORT_DIR).filter(f => f.toLowerCase().endsWith(".csv"));
    console.log(`\n📂 Encontrados ${files.length} arquivos CSV.`);

    let totalImported = 0;

    // 4. Processar cada arquivo
    for (const file of files) {
        console.log(`\n📄 Processando: ${file}`);
        const content = fs.readFileSync(path.join(IMPORT_DIR, file), "utf-8");
        const records = parseCSV(content);

        console.log(`   ↳ ${records.length} registros detectados.`);

        let fileSuccess = 0;

        for (const row of records as any[]) {
            const data = {
                date: parseDate(row["DATA"] || row["DATE"] || row["CREATED_AT"] || ""),
                email: row["EMAIL"],
                name: row["NOME"] || row["NAME"] || row["CLIENTE"] || "Cliente Importado",
                whatsapp: (row["WHATSAPP"] || row["TELEFONE"] || row["PHONE"] || "").replace(/\D/g, ""),
                instagram: row["INSTAGRAM"] || "",
                cpf: (row["CPF"] || "").replace(/\D/g, ""),
                packageName: row["PACOTE ADQUIRIDO"] || row["PACOTE_ADQUIRIDO"] || row["PACOTE"] || row["PACKAGE"] || "",
                addons: row["ADICIONAIS"] || row["ADD_ONS"] || row["ADDONS"] || "",
                value: parseValue(row["VALOR"] || row["VALUE"] || row["TOTAL"] || "0"),
                origin: row["ORIGEM"] || row["ORIGIN"] || row["SOURCE"] || "Anúncio",
                termos: "Aceito"
            };

            // Filtro básico de integridade
            if (!data.name || !data.email || data.name.toLowerCase() === 'padrao') continue;

            try {
                // CONTRACT
                await prisma.contract.create({
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
                        createdAt: data.date,
                    }
                });

                // LEAD (Finalizado) - REMOVIDO POR SOLICITACAO DO USUARIO
                // O usuario pediu para nao inserir no Kanban ainda, apenas na aba Contratos.
                /*
                await prisma.lead.create({
                    data: {
                        name: data.name,
                        phone: data.whatsapp || "0000000000",
                        email: data.email,
                        instagram: data.instagram,
                        cpf: data.cpf,
                        source: mapLeadSource(data.origin),
                        stage: "FINALIZADO" as any, 
                        value: new Decimal(data.value),
                        packageType: data.packageName,
                        addOns: data.addons,
                        termsAccepted: true,
                        contractDate: data.date,
                        userId: user.id,
                        createdAt: data.date,
                    }
                });
                */

                fileSuccess++;
            } catch (error) {
                console.error(`   ❌ Falha linha: ${data.name} - ${error instanceof Error ? error.message : String(error)}`);
            }
        }

        console.log(`   ✅ Importados neste arquivo: ${fileSuccess}`);
        totalImported += fileSuccess;
    }

    console.log("\n========================================================");
    console.log(`🎉 IMPORTAÇÃO GERAL CONCLUÍDA!`);
    console.log(`📊 TOTAL DE REGISTROS ADICIONADOS: ${totalImported}`);
    console.log("========================================================");
}

main()
    .then(() => prisma.$disconnect())
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
