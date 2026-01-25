
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Iniciando limpeza de leads inválidos...");

    // Critério: Remover se não tiver CPF E não tiver Email E (não tiver Telefone ou for muito curto)
    // Nota: O banco exige 'phone', então ele nunca é null, mas pode ser vazio ou inválido.

    const allLeads = await prisma.lead.findMany({
        select: { id: true, phone: true, email: true, cpf: true }
    });

    const leadsToDelete: string[] = [];

    for (const lead of allLeads) {
        const hasEmail = !!lead.email && lead.email.trim().length > 0;
        const hasCpf = !!lead.cpf && lead.cpf.trim().length > 0;

        // Normaliza telefone para verificar se tem conteúdo real
        const phoneDigits = lead.phone.replace(/\D/g, "");
        const hasPhone = phoneDigits.length >= 8; // Considera válido se tiver pelo menos 8 digitos

        if (!hasEmail && !hasCpf && !hasPhone) {
            leadsToDelete.push(lead.id);
        }
    }

    console.log(`Encontrados ${leadsToDelete.length} leads para remover.`);

    if (leadsToDelete.length > 0) {
        const result = await prisma.lead.deleteMany({
            where: {
                id: { in: leadsToDelete }
            }
        });
        console.log(`Removidos ${result.count} leads.`);
    } else {
        console.log("Nenhum lead encontrado para remoção.");
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
