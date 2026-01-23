import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("Analisando Contratos no Banco de Dados...");

    const contracts = await prisma.contract.findMany();

    const totalValue = contracts.reduce((acc, curr) => acc + Number(curr.totalValue), 0);

    console.log(`Total de Contratos: ${contracts.length}`);
    console.log(`Soma Total (DB): R$ ${totalValue.toFixed(2)}`);

    // Detalhes para debug
    console.log("\nTop 5 Contratos por Valor:");
    const sorted = [...contracts].sort((a, b) => Number(b.totalValue) - Number(a.totalValue));
    sorted.slice(0, 5).forEach(c => {
        console.log(`- ${c.clientName}: R$ ${Number(c.totalValue).toFixed(2)} (${c.contractDate.toISOString()})`);
    });

    // Verificar se existem contratos antigos/teste
    console.log("\nDistribuição por Data:");
    const dates = contracts.map(c => c.contractDate.toISOString().split('T')[0]);
    const counts: Record<string, number> = {};
    dates.forEach(d => counts[d] = (counts[d] || 0) + 1);
    console.table(counts);

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
