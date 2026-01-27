
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";

const prisma = new PrismaClient();

async function main() {
    const csvFilePath = path.join(process.cwd(), "_[COMPRADORES] - UPBOOST 1 - JANEIRO_2026 (1).csv");

    console.log("Reading CSV...");
    const fileContent = fs.readFileSync(csvFilePath, "utf-8");
    const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        delimiter: ",",
    });

    // Calculate CSV Total
    let csvTotal = 0;
    const csvMap = new Map();

    for (const record of records) {
        // Assuming headers from previous usage: 'Nome do Cliente', 'Valor (R$)' or similar
        // The previous script output didn't show headers, checking calculate_csv.js would be ideal but I can infer or just log first record
        // Let's rely on my memory of calculate_csv.js or check it quickly if needed.
        // Wait, I can't check calculate_csv.js content easily without reading it again.
        // But I can see the previous output: "Invalid value parsed: ..."

        // Let's infer columns from the previous run or just look at the first record in this script.
        // I'll list keys first.
    }

    // Re-reading calculate_csv.js logic would be safer? 
    // Actually, I'll just dump the first record keys to be sure.
    if (records.length > 0) {
        console.log("CSV Columns:", Object.keys(records[0]));
    }

    // Helper to parse currency
    const parseCurrency = (val: string) => {
        if (!val) return 0;
        const clean = val.replace("R$", "").replace(/\./g, "").replace(",", ".").trim();
        return parseFloat(clean);
    };

    // Let's try to find the value column
    const recordsWithNormalizedData = records.map((r: any) => {
        // Try to find the value column
        let value = 0;
        // Based on previous tool output, there is a value column.
        // I'll search for keys with 'valor', 'price', 'total'.
        const key = Object.keys(r).find(k => k.toLowerCase().includes('valor') || k.toLowerCase().includes('price'));
        if (key) {
            value = parseCurrency(r[key]);
        }

        // Try to find name/email for identification
        const nameKey = Object.keys(r).find(k => k.toLowerCase().includes('nome') || k.toLowerCase().includes('name')) || "Unknown";
        const name = r[nameKey];

        return { name, value, raw: r };
    });

    csvTotal = recordsWithNormalizedData.reduce((acc: number, r: any) => acc + r.value, 0);
    console.log(`CSV Total: ${csvTotal.toFixed(2)}`);

    // DB Query
    // Target date: 2026-01-26
    // I will query for the whole day of 2026-01-26
    const startOfDay = new Date("2026-01-26T00:00:00.000Z"); // Using UTC to cover all bases or local?
    // User is -3. So 2026-01-26 00:00:00 -0300 is 2026-01-26 03:00:00 UTC
    // I will check the range of contractDates in the DB to match the CSV total.

    // Let's first fetch ALL contracts for Jan 26th in UTC
    // And also previous/next day to see if there's a shift.

    // Actually, let's just fetch all contracts created/dated in Jan 2026 surrounding the 26th and check their sums.

    const contracts = await prisma.contract.findMany({
        where: {
            contractDate: {
                gte: new Date("2026-01-25T00:00:00Z"),
                lte: new Date("2026-01-27T23:59:59Z")
            }
        }
    });

    console.log(`Found ${contracts.length} contracts in DB between 25th and 27th Jan 2026.`);

    // Group by day
    const rigidSum: { [key: string]: number } = {};

    contracts.forEach(c => {
        const day = c.contractDate.toISOString().split('T')[0];
        rigidSum[day] = (rigidSum[day] || 0) + Number(c.totalValue);
        // Log specific ones
        // console.log(`${day} - ${c.clientName}: ${c.totalValue}`);
    });

    console.log("DB Sums by UTC Day:");
    console.log(JSON.stringify(rigidSum, null, 2));

    // Check for the 20.149,70 figure
    // Maybe it encompasses a specific timezone shift?

    // Let's try to match records
    // Create a map of CSV records
    const csvNames = new Set(recordsWithNormalizedData.map((r: any) => r.name.toLowerCase().trim()));

    console.log("\n--- Checking for Extra DB Records (on 26th) ---");
    const dbContacts26 = contracts.filter(c => c.contractDate.toISOString().startsWith('2026-01-26'));
    let dbTotal26 = 0;

    dbContacts26.forEach(c => {
        dbTotal26 += Number(c.totalValue);
        const name = c.clientName.toLowerCase().trim();
        if (!csvNames.has(name)) {
            console.log(`[NotInCSV] DB Record: ${c.clientName} - ${c.totalValue} (${c.contractDate.toISOString()})`);
        }
    });
    console.log(`Total DB Sum for 2026-01-26 (UTC): ${dbTotal26.toFixed(2)}`);

}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
