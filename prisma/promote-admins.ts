import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ADMIN_EMAILS = [
    "kelwin@upboost.com",
    "dherick@upboost.pro"
];

async function main() {
    console.log("Iniciando promoção de usuários para ADMIN...");

    for (const email of ADMIN_EMAILS) {
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (user) {
            if (user.role === "ADMIN") {
                console.log(`[JÁ ADMIN] ${email}`);
            } else {
                await prisma.user.update({
                    where: { email },
                    data: { role: "ADMIN" },
                });
                console.log(`[PROMOVIDO] ${email} agora é ADMIN.`);
            }
        } else {
            console.log(`[NÃO ENCONTRADO] ${email} - Usuário não existe no banco.`);
        }
    }

    console.log("Concluído.");
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
