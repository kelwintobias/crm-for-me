
import * as fs from "fs";
import * as path from "path";

function parseValue(csvValue: string): number {
    if (!csvValue) return 0;
    const cleaned = csvValue
        .replace(/R\$\s*/gi, "")
        .replace(/\./g, "")
        .replace(",", ".")
        .trim();
    return parseFloat(cleaned) || 0;
}

function parseCSV(content: string): Record<string, string>[] {
    const lines = content.split("\n").filter(line => line.trim());
    if (lines.length < 2) return [];
    const headerLine = lines[0];
    const headers = headerLine.split(",").map(h => h.trim().toUpperCase());
    const records: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const values: string[] = [];
        let current = "";
        let inQuotes = false;
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') inQuotes = !inQuotes;
            else if (char === ',' && !inQuotes) { values.push(current.trim()); current = ""; }
            else current += char;
        }
        values.push(current.trim());
        const record: Record<string, string> = {};
        headers.forEach((header, index) => record[header] = values[index] || "");
        records.push(record);
    }
    return records;
}

const csvPath = "/root/meu-projeto-claude/dbantigodocliente/janeiro2026.csv";
const content = fs.readFileSync(csvPath, "utf-8");
const records = parseCSV(content);

let total = 0;
console.log("Valores individuais:");
records.forEach(r => {
    const valStr = r["VALOR"] || r["VALUE"] || "0";
    const name = r["NOME"] || "";
    const num = parseValue(valStr);

    // Logar apenas se for zerado ou muito alto para debug
    // if (num === 0) console.log(`[ZERO] ${name}: ${valStr}`);

    total += num;
});

console.log(`\nRegistros no CSV: ${records.length}`);
console.log(`Soma do CSV: ${total.toFixed(2)}`);
