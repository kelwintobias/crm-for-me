import { google } from "googleapis";

// ===========================================
// GOOGLE SHEETS SERVICE
// ===========================================

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"];

/**
 * Creates authenticated Google Sheets client using Service Account
 */
async function getAuthClient() {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!email || !privateKey) {
        throw new Error("Credenciais do Google não configuradas. Defina GOOGLE_SERVICE_ACCOUNT_EMAIL e GOOGLE_PRIVATE_KEY.");
    }

    const auth = new google.auth.JWT({
        email,
        key: privateKey,
        scopes: SCOPES,
    });

    return auth;
}

/**
 * Fetches all sheet names (tabs) from the spreadsheet
 */
export async function getSheetNames(spreadsheetId: string): Promise<string[]> {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: "v4", auth });

    const response = await sheets.spreadsheets.get({
        spreadsheetId,
    });

    return response.data.sheets?.map(s => s.properties?.title || "") || [];
}

// ===========================================
// CONTRACT DATA STRUCTURE
// ===========================================

export interface SheetContract {
    contractDate: Date;
    package: string;
    totalValue: number;
    clientName: string;
    whatsapp: string;
    email: string | null;
    instagram: string | null;
    cpf: string | null;
    addons: string[];
    termsAccepted: boolean;
    sellerName: string | null;
    source: string;
}

// ===========================================
// PACKAGE MAPPING
// ===========================================

const PACKAGE_MAP: Record<string, string> = {
    "intermediário": "INTERMEDIARIO",
    "intermediario": "INTERMEDIARIO",
    "avançado": "AVANCADO",
    "avancado": "AVANCADO",
    "elite": "ELITE",
    "pro plus": "PRO_PLUS",
    "pro+": "PRO_PLUS",
    "ultra pro": "ULTRA_PRO",
    "ultra": "ULTRA_PRO",
    "evolution": "EVOLUTION",
};

const SOURCE_MAP: Record<string, string> = {
    "anúncio": "ANUNCIO",
    "anuncio": "ANUNCIO",
    "indicação": "INDICACAO",
    "indicacao": "INDICACAO",
    "parceiro": "PARCEIRO",
    "influenciador": "INFLUENCIADOR",
    "influencer": "INFLUENCIADOR",
};

function normalizePackage(raw: string): string {
    const normalized = raw.toLowerCase().trim();
    return PACKAGE_MAP[normalized] || "INTERMEDIARIO";
}

function normalizeSource(raw: string): string {
    const normalized = raw.toLowerCase().trim();
    return SOURCE_MAP[normalized] || "ANUNCIO";
}

function parseValue(raw: string): number {
    if (!raw) return 0;
    // Remove R$, espaços e converte vírgula para ponto
    const cleaned = raw.replace(/[R$\s]/g, "").replace(",", ".");
    const value = parseFloat(cleaned);
    return isNaN(value) ? 0 : value;
}

function parsePhone(raw: string): string {
    if (!raw) return "";
    // Remove tudo exceto números
    return raw.replace(/\D/g, "");
}

function parseDate(raw: string): Date | null {
    if (!raw) return null;

    // Tenta formatos comuns: DD/MM/YYYY, YYYY-MM-DD
    const parts = raw.split("/");
    if (parts.length === 3) {
        const [day, month, year] = parts;
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (!isNaN(date.getTime())) return date;
    }

    // Tenta ISO format
    const isoDate = new Date(raw);
    if (!isNaN(isoDate.getTime())) return isoDate;

    return null;
}

// ===========================================
// FETCH CONTRACTS FROM SHEET
// ===========================================

/**
 * Fetches contract data from a specific month sheet
 * Expected columns based on planilha de Janeiro 2026:
 * A: Data | B: Pacote | C: Valor | D: Nome | E: WhatsApp | F: Email | G: Instagram | H: CPF | I: Adicionais | J: Termos | K: Vendedor
 */
export async function getContractsFromSheet(
    spreadsheetId: string,
    sheetName: string
): Promise<SheetContract[]> {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: "v4", auth });

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `'${sheetName}'!A2:K`, // Ignora cabeçalho
    });

    const rows = response.data.values || [];
    const contracts: SheetContract[] = [];

    for (const row of rows) {
        // Pula linhas vazias ou incompletas
        if (!row[0] || !row[3] || !row[4]) continue;

        const contractDate = parseDate(row[0]);
        if (!contractDate) continue;

        const contract: SheetContract = {
            contractDate,
            package: normalizePackage(row[1] || ""),
            totalValue: parseValue(row[2] || "0"),
            clientName: row[3]?.trim() || "",
            whatsapp: parsePhone(row[4] || ""),
            email: row[5]?.trim() || null,
            instagram: row[6]?.trim() || null,
            cpf: row[7]?.replace(/\D/g, "") || null,
            addons: row[8] ? row[8].split(",").map((a: string) => a.trim().toUpperCase()) : [],
            termsAccepted: row[9]?.toLowerCase() === "sim" || row[9]?.toLowerCase() === "s",
            sellerName: row[10]?.trim() || null,
            source: normalizeSource(row[1] || "anuncio"), // Fallback source
        };

        contracts.push(contract);
    }

    return contracts;
}

/**
 * Fetches contracts from all month sheets (ignores "Custos Fixos" and similar)
 */
export async function getAllContractsFromSpreadsheet(
    spreadsheetId: string
): Promise<{ sheet: string; contracts: SheetContract[] }[]> {
    const sheetNames = await getSheetNames(spreadsheetId);

    // Filtrar apenas abas de meses (ignorar "Custos Fixos", "Resumo", etc.)
    const monthSheets = sheetNames.filter(name => {
        const lower = name.toLowerCase();
        // Ignora sheets conhecidas que não são de contratos
        if (lower.includes("custo") || lower.includes("resumo") || lower.includes("config")) {
            return false;
        }
        // Aceita sheets com nomes de meses ou padrões como "Jan 2026"
        const monthPatterns = [
            "janeiro", "fevereiro", "março", "abril", "maio", "junho",
            "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
            "jan", "fev", "mar", "abr", "mai", "jun",
            "jul", "ago", "set", "out", "nov", "dez"
        ];
        return monthPatterns.some(m => lower.includes(m)) || /\d{4}/.test(name);
    });

    const results: { sheet: string; contracts: SheetContract[] }[] = [];

    for (const sheetName of monthSheets) {
        try {
            const contracts = await getContractsFromSheet(spreadsheetId, sheetName);
            results.push({ sheet: sheetName, contracts });
        } catch (error) {
            console.error(`Erro ao buscar contratos de ${sheetName}:`, error);
        }
    }

    return results;
}
