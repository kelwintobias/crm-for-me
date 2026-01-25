
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Iniciando atualização de leads importados para ocultar do Kanban...");

    // Identificar leads importados recentemente e sem contratos.
    // Importação ocorreu em 2026-01-23 por volta de 22:40.
    // Vamos pegar leads criados após 22:30.

    const importThreshold = new Date('2026-01-23T22:30:00-03:00');
    // Nota: Ajuste de fuso pode ser necessário dependendo do servidor, mas vamos tentar range.

    console.log(`Buscando leads criados após ${importThreshold.toISOString()}...`);

    const leads = await prisma.lead.findMany({
        where: {
            createdAt: { gt: importThreshold },
            stage: 'NOVO_LEAD',
            plan: 'INDEFINIDO' // Leads importados tinham plano INDEFINIDO
        },
        select: { id: true, createdAt: true, phone: true }
    });

    console.log(`Encontrados ${leads.length} leads potenciais da importação.`);

    // Verificar quais têm contratos
    // (Embora a importação tenha evitado duplicatas de telefone, vamos garantir)

    const contracts = await prisma.contract.findMany({ select: { whatsapp: true } });
    const contractPhones = new Set(contracts.map(c => c.whatsapp.replace(/\D/g, "")));

    const leadsToHide: string[] = [];
    const leadsToKeep: string[] = [];

    for (const lead of leads) {
        const phone = lead.phone.replace(/\D/g, "");
        if (contractPhones.has(phone)) {
            leadsToKeep.push(lead.id);
        } else {
            leadsToHide.push(lead.id);
        }
    }

    console.log(`Leads com contrato (Manter no Kanban): ${leadsToKeep.length}`);
    console.log(`Leads sem contrato (Ocultar do Kanban): ${leadsToHide.length}`);

    if (leadsToHide.length > 0) {
        console.log("Atualizando leads para inPipeline = false...");
        const result = await prisma.lead.updateMany({
            where: {
                id: { in: leadsToHide }
            },
            data: {
                inPipeline: false
            }
        });
        console.log(`Sucesso: ${result.count} leads removidos do Kanban.`);
    } else {
        console.log("Nenhum lead para ocultar.");
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
