import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const contracts = await prisma.contract.findMany({
        include: { user: true }
    });

    const byUser: Record<string, { name: string, email: string, count: number, value: number }> = {};

    contracts.forEach(c => {
        const uid = c.userId;
        if (!byUser[uid]) {
            byUser[uid] = {
                name: c.user?.name || "Unknown",
                email: c.user?.email || "Unknown",
                count: 0,
                value: 0
            };
        }
        byUser[uid].count++;
        byUser[uid].value += Number(c.totalValue);
    });

    console.table(Object.values(byUser));
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
