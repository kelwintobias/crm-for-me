/**
 * Script de Deduplicação de Dados no Banco
 * 
 * Verifica contratos e leads duplicados (por email) e consolida os dados.
 * Útil para limpar importações de CSV que tinham múltiplas linhas por cliente.
 * 
 * Uso:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/deduplicate-database.ts <email-usuario-responsavel>
 */

import { PrismaClient, ContractSource, ContractPackage, LeadSource, PipelineStage } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();

// Mapeamentos para garantir validação
function normPackage(pkg: string): ContractPackage {
    if (!pkg) return "INTERMEDIARIO";
    const s = pkg.toUpperCase();
    if (s.includes("EVOLUTION")) return "EVOLUTION";
    if (s.includes("ULTRA")) return "ULTRA_PRO";
    if (s.includes("PRO_PLUS")) return "PRO_PLUS";
    if (s.includes("ELITE")) return "ELITE";
    if (s.includes("AVANCADO")) return "AVANCADO";
    return "INTERMEDIARIO";
}

function normAddons(addons: (string | null | undefined)[]): string[] {
    const flat: string[] = [];
    for (const item of addons) {
        if (!item) continue;
        // Se for string JSON ou CSV, quebrar
        if (item.includes(",")) {
            flat.push(...item.split(",").map(x => x.trim()));
        } else {
            flat.push(item);
        }
    }

    // Normalizar nomes
    return [...new Set(flat.map(a => {
        const n = a.toUpperCase();
        if (n.includes("WINDOWS")) return "ATIVACAO_WINDOWS";
        if (n.includes("UPBOOST")) return "UPBOOST_PLUS";
        if (n.includes("DELAY")) return "REMOCAO_DELAY";
        if (n.includes("PROFISSIONAL")) return "FORMATACAO_PROFISSIONAL";
        if (n.includes("PADRAO") || n.includes("FORMATACAO")) return "FORMATACAO_PADRAO";
        return a;
    }).filter(x => x))];
}

async function deduplicate(userEmail: string) {
    console.log("==========================================");
    console.log("  DEDUPLICAÇÃO DE DADOS NO BANCO");
    console.log("==========================================\n");

    const user = await prisma.user.findUnique({
        where: { email: userEmail }
    });

    if (!user) {
        console.error("Usuário não encontrado.");
        return;
    }
    console.log(`Usuário: ${user.name} (${user.email})`);

    // 1. Encontrar Emails com duplicação em Contratos
    const duplicates = await prisma.$queryRaw<{ email: string, count: bigint }[]>`
        SELECT email, COUNT(*) as count 
        FROM contracts 
        WHERE email IS NOT NULL AND "userId" = ${user.id}
        GROUP BY email 
        HAVING COUNT(*) > 1
        ORDER BY count DESC
    `;

    console.log(`\nEncontrados ${duplicates.length} emails com contratos duplicados.\n`);

    let processedCount = 0;

    for (const dup of duplicates) {
        const email = dup.email;
        if (!email) continue; // Safety check

        console.log(`[${processedCount + 1}/${duplicates.length}] Processando: ${email} (${dup.count.toString()} registros)`);

        // ============================================
        // TRATAR CONTRATOS
        // ============================================
        const contracts = await prisma.contract.findMany({
            where: { email, userId: user.id },
            orderBy: { createdAt: 'desc' } // Mais recente primeiro
        });

        if (contracts.length <= 1) continue;

        // Consolidar dados
        let masterContract = contracts[0]; // Usar o mais recente como base inicial
        // Mas procurar o contrato que tenha pacote definido (não intermediário se possível)
        const contractWithPackage = contracts.find(c =>
            c.package !== "INTERMEDIARIO" ||
            (c.totalValue && c.totalValue.toNumber() > 100)
        );
        if (contractWithPackage) masterContract = contractWithPackage;

        // Somar valores
        let totalValue = 0;
        const allAddons: string[] = [];

        contracts.forEach(c => {
            totalValue += Number(c.totalValue || 0);
            if (c.addons && Array.isArray(c.addons)) {
                allAddons.push(...c.addons);
            }
        });

        // Unique addons
        const uniqueAddons = normAddons(allAddons);

        console.log(`   > Mesclando Contracts: Total R$ ${totalValue.toFixed(2)} | Pkg: ${masterContract.package} | Addons: ${uniqueAddons.length}`);

        // Deletar todos
        await prisma.contract.deleteMany({
            where: { email, userId: user.id }
        });

        // Criar novo consolidado
        const newContract = await prisma.contract.create({
            data: {
                clientName: masterContract.clientName,
                email: masterContract.email,
                whatsapp: masterContract.whatsapp,
                instagram: masterContract.instagram,
                cpf: masterContract.cpf,
                contractDate: masterContract.contractDate, // Data original
                source: masterContract.source,
                package: masterContract.package,
                addons: uniqueAddons,
                termsAccepted: true,
                totalValue: new Decimal(totalValue),
                userId: user.id,
                createdAt: masterContract.createdAt // Manter data criação
            }
        });


        // ============================================
        // TRATAR LEADS
        // ============================================
        const leads = await prisma.lead.findMany({
            where: { email, userId: user.id },
            orderBy: { createdAt: 'desc' }
        });

        if (leads.length > 1) {
            let masterLead = leads[0];
            // Tentar achar um que tenha nome de pacote
            const leadWithPkg = leads.find(l => l.packageType && l.packageType.length > 5);
            if (leadWithPkg) masterLead = leadWithPkg;

            // Somar valores
            let leadTotal = 0;
            const leadAddonsStrs: string[] = [];

            leads.forEach(l => {
                leadTotal += Number(l.value || 0);
                if (l.addOns) leadAddonsStrs.push(l.addOns);
            });

            const mergedAddons = normAddons(leadAddonsStrs).join(", ");

            console.log(`   > Mesclando Leads: Total R$ ${leadTotal.toFixed(2)} | Pkg: ${masterLead.packageType}`);

            // Deletar anteriores
            await prisma.lead.deleteMany({
                where: { email, userId: user.id }
            });

            // Criar novo
            await prisma.lead.create({
                data: {
                    name: masterLead.name,
                    phone: masterLead.phone,
                    email: masterLead.email,
                    instagram: masterLead.instagram,
                    cpf: masterLead.cpf,
                    source: masterLead.source,
                    stage: PipelineStage.FINALIZADO,
                    value: new Decimal(leadTotal),
                    packageType: masterLead.packageType || newContract.package,
                    addOns: mergedAddons,
                    termsAccepted: true,
                    contractDate: masterLead.contractDate,
                    userId: user.id,
                    createdAt: masterLead.createdAt
                }
            });
        }

        processedCount++;
    }

    console.log(`\n✅ Processo concluído! ${processedCount} clientes consolidados.`);
}

const args = process.argv.slice(2);
const email = args[0];

if (!email) {
    console.log("Uso: npx ts-node --compiler-options '{\"module\":\"commonjs\"}' scripts/deduplicate-database.ts <email-usuario>");
    process.exit(1);
}

deduplicate(email)
    .then(() => prisma.$disconnect())
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
