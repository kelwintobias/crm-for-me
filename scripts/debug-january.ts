
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    // Definir intervalo de Janeiro 2026
    const start = new Date("2026-01-01T00:00:00.000Z");
    const end = new Date("2026-02-01T00:00:00.000Z");

    const contracts = await prisma.contract.findMany({
        where: {
            contractDate: {
                gte: start,
                lt: end
            }
        }
    });

    console.log(`Encontrados ${contracts.length} contratos em Janeiro 2026.`);

    let total = 0;
    contracts.forEach(c => {
        total += Number(c.totalValue);
        // console.log(`${c.clientName}: ${c.totalValue}`);
    });

    console.log(`Soma Total (JS): ${total.toFixed(2)}`);

    // Soma via Aggregate
    const agg = await prisma.contract.aggregate({
        _sum: {
            totalValue: true
        },
        where: {
            contractDate: {
                gte: start,
                lt: end
            }
        }
    });

    console.log(`Soma Total (Prisma Aggregate): ${agg._sum.totalValue}`);
}

main()
    .then(() => prisma.$disconnect())
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
