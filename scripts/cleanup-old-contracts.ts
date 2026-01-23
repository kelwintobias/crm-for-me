import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("Limpando contratos antigos (antes de 2026)...");

    // Deleta contratos antes de 01/01/2026
    const deleted = await prisma.contract.deleteMany({
        where: {
            contractDate: {
                lt: new Date("2026-01-01T00:00:00.000Z")
            }
        }
    });

    console.log(`Contratos deletados: ${deleted.count}`);

    // Verifica novo total
    const contracts = await prisma.contract.findMany();
    const totalValue = contracts.reduce((acc, curr) => acc + Number(curr.totalValue), 0);
    console.log(`Novo Total de Contratos: ${contracts.length}`);
    console.log(`Nova Soma Total: R$ ${totalValue.toFixed(2)}`);
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
