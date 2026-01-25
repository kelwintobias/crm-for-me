/**
 * Script para sincronizar planos de leads FINALIZADO com seus contratos
 *
 * Problema: Existem cards na coluna Finalizado com plano INDEFINIDO.
 * Quando o cliente tem contrato, o plano deve refletir o pacote do último contrato.
 *
 * Uso:
 *   npx tsx scripts/sync-lead-plans.ts --dry-run   (apenas lista os leads)
 *   npx tsx scripts/sync-lead-plans.ts             (executa a sincronização)
 */

import { PrismaClient, ContractPackage, PlanType } from "@prisma/client";

const prisma = new PrismaClient();

// Mapeamento de ContractPackage para PlanType
function contractPackageToPlanType(pkg: ContractPackage): PlanType {
  const mapping: Record<ContractPackage, PlanType> = {
    INTERMEDIARIO: "INTERMEDIARIO",
    AVANCADO: "AVANCADO",
    ELITE: "ELITE",
    PRO_PLUS: "PRO_PLUS",
    ULTRA_PRO: "ULTRA_PRO",
    EVOLUTION: "EVOLUTION",
  };
  return mapping[pkg] || "INDEFINIDO";
}

async function main() {
  const isDryRun = process.argv.includes("--dry-run");

  console.log("\n=== Script de Sincronização de Planos ===\n");
  console.log(`Modo: ${isDryRun ? "DRY RUN (apenas simulação)" : "EXECUÇÃO REAL"}\n`);

  // 1. Buscar todos os leads em FINALIZADO com plano INDEFINIDO
  const leadsToSync = await prisma.lead.findMany({
    where: {
      stage: "FINALIZADO",
      plan: "INDEFINIDO",
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      phone: true,
      plan: true,
    },
  });

  console.log(`Leads FINALIZADO com plano INDEFINIDO: ${leadsToSync.length}\n`);

  if (leadsToSync.length === 0) {
    console.log("Nenhum lead para sincronizar. Finalizando.\n");
    return;
  }

  // 2. Buscar todos os contratos
  const contracts = await prisma.contract.findMany({
    select: {
      whatsapp: true,
      package: true,
      contractDate: true,
    },
    orderBy: {
      contractDate: "desc", // Mais recente primeiro
    },
  });

  console.log(`Total de contratos no sistema: ${contracts.length}\n`);

  // 3. Criar mapa de telefone -> último contrato
  const contractByPhone = new Map<string, { package: ContractPackage; contractDate: Date }>();

  contracts.forEach((contract) => {
    const last8Digits = contract.whatsapp.slice(-8);
    // Como está ordenado por data desc, o primeiro é o mais recente
    if (!contractByPhone.has(last8Digits)) {
      contractByPhone.set(last8Digits, {
        package: contract.package,
        contractDate: contract.contractDate,
      });
    }
  });

  // 4. Identificar leads que têm contrato correspondente
  const leadsWithContract: Array<{
    leadId: string;
    leadName: string;
    currentPlan: string;
    newPlan: PlanType;
    contractPackage: ContractPackage;
  }> = [];

  leadsToSync.forEach((lead) => {
    const last8Digits = lead.phone.slice(-8);
    const contract = contractByPhone.get(last8Digits);

    if (contract) {
      const newPlan = contractPackageToPlanType(contract.package);
      leadsWithContract.push({
        leadId: lead.id,
        leadName: lead.name,
        currentPlan: lead.plan,
        newPlan: newPlan,
        contractPackage: contract.package,
      });
    }
  });

  console.log(`Leads com contrato correspondente: ${leadsWithContract.length}`);
  console.log(`Leads sem contrato correspondente: ${leadsToSync.length - leadsWithContract.length}\n`);

  if (leadsWithContract.length === 0) {
    console.log("Nenhum lead com contrato para sincronizar. Finalizando.\n");
    return;
  }

  // Listar os leads que serão atualizados
  console.log("=== Leads que serão atualizados ===\n");
  leadsWithContract.forEach((lead, index) => {
    console.log(
      `${index + 1}. ${lead.leadName} - Plano atual: ${lead.currentPlan} → Novo plano: ${lead.newPlan} (${lead.contractPackage})`
    );
  });

  if (isDryRun) {
    console.log("\n[DRY RUN] Nenhuma alteração foi feita.");
    console.log(`[DRY RUN] Execute sem --dry-run para atualizar ${leadsWithContract.length} leads.\n`);
    return;
  }

  // 5. Executar a atualização
  console.log(`\n=== Atualizando ${leadsWithContract.length} leads ===\n`);

  let updatedCount = 0;
  for (const lead of leadsWithContract) {
    await prisma.lead.update({
      where: { id: lead.leadId },
      data: { plan: lead.newPlan },
    });
    updatedCount++;
    console.log(`✓ ${lead.leadName}: ${lead.currentPlan} → ${lead.newPlan}`);
  }

  console.log(`\nLeads atualizados com sucesso: ${updatedCount}\n`);

  // 6. Verificação
  const verifyLeads = await prisma.lead.findMany({
    where: {
      id: { in: leadsWithContract.slice(0, 3).map((l) => l.leadId) },
    },
    select: {
      id: true,
      name: true,
      plan: true,
    },
  });

  console.log("=== Verificação (primeiros 3 leads) ===\n");
  verifyLeads.forEach((lead) => {
    console.log(`${lead.name}: plan = ${lead.plan}`);
  });

  console.log("\n=== Script finalizado com sucesso ===\n");
}

main()
  .catch((e) => {
    console.error("Erro:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
