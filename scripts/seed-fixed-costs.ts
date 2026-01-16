import { prisma } from "../src/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

const FIXED_COSTS_DATA = [
    { date: "2025-09-30", type: "Despesa", category: "automação de mensagens", description: "Manychat", value: 80.00 },
    { date: "2025-09-30", type: "Despesa", category: "automação de mensagens", description: "Bot Conversa", value: 199.00 },
    { date: "2025-09-30", type: "Despesa", category: "Verificado instagram", description: "instagram", value: 120.90 },
    { date: "2025-09-30", type: "Despesa", category: "Gestor de Tráfego", description: "Trafego Pago", value: 800.00 },
    { date: "2025-09-30", type: "Despesa", category: "Funcionario instagram/Post", description: "Funcionario", value: 250.00 },
    { date: "2025-09-30", type: "Despesa", category: "Season Cloud/Site", description: "Site", value: 0.00 },
    { date: "2025-09-30", type: "Despesa", category: "Verificado instagram", description: "instagram", value: 54.90 },
    { date: "2025-09-30", type: "Despesa", category: "Banners, imagens", description: "Designer", value: 70.00 },
];

async function main() {
    console.log("🌱 Seeding fixed costs...\n");

    // Buscar um usuário existente para associar os custos
    const user = await prisma.user.findFirst();

    if (!user) {
        console.error("❌ Nenhum usuário encontrado. Crie um usuário primeiro.");
        process.exit(1);
    }

    console.log(`📌 Usando usuário: ${user.name || user.email}`);

    // Verificar se já existem custos fixos
    const existingCosts = await prisma.fixedCost.count({
        where: { userId: user.id }
    });

    if (existingCosts > 0) {
        console.log(`⚠️  Já existem ${existingCosts} custos fixos. Pulando seed.`);
        process.exit(0);
    }

    // Criar os custos fixos
    for (const cost of FIXED_COSTS_DATA) {
        const date = new Date(cost.date);
        await prisma.fixedCost.create({
            data: {
                date,
                type: cost.type,
                category: cost.category,
                description: cost.description,
                value: new Decimal(cost.value),
                month: date.getMonth() + 1,
                year: date.getFullYear(),
                userId: user.id,
            },
        });
        console.log(`✅ Criado: ${cost.description} - R$ ${cost.value.toFixed(2)}`);
    }

    console.log(`\n🎉 Seed concluído! ${FIXED_COSTS_DATA.length} custos fixos criados.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
