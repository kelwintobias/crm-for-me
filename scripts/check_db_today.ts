
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("Connecting to DB...");

    // Basic check: Count contracts
    const count = await prisma.contract.count();
    console.log(`Total contracts in DB: ${count}`);

    // Check Today's Sales (UTC)
    const startOfDay = new Date("2026-01-26T00:00:00Z");
    const endOfDay = new Date("2026-01-26T23:59:59Z");

    console.log(`Checking contracts between ${startOfDay.toISOString()} and ${endOfDay.toISOString()}`);

    const contracts = await prisma.contract.findMany({
        where: {
            contractDate: {
                gte: startOfDay,
                lte: endOfDay
            }
        }
    });

    const total = contracts.reduce((sum, c) => sum + Number(c.totalValue), 0);
    console.log(`Total Value for 2026-01-26 (UTC): ${total.toFixed(2)}`);

    // List them
    contracts.forEach(c => {
        console.log(`${c.clientName}: ${c.totalValue} (${c.contractDate.toISOString()})`);
    });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
