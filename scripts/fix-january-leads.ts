/**
 * Script para corrigir leads de janeiro de 2026
 *
 * Problema: Leads sem contrato em janeiro estão inflando as estatísticas
 * porque o filtro usa o campo updatedAt.
 *
 * Solução: Identificar leads sem contrato no mês de janeiro de 2026
 * e atualizar o updatedAt para maio de 2025.
 *
 * Uso:
 *   npx tsx scripts/fix-january-leads.ts --dry-run   (apenas lista os leads)
 *   npx tsx scripts/fix-january-leads.ts             (executa a atualização)
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const isDryRun = process.argv.includes("--dry-run");

  console.log("\n=== Script de Correção de Leads de Janeiro 2026 ===\n");
  console.log(`Modo: ${isDryRun ? "DRY RUN (apenas simulação)" : "EXECUÇÃO REAL"}\n`);

  // Definir período de janeiro de 2026
  const januaryStart = new Date("2026-01-01T00:00:00.000Z");
  const januaryEnd = new Date("2026-01-31T23:59:59.999Z");

  // Data para onde vamos mover os leads (maio de 2025)
  const newUpdatedAt = new Date("2025-05-15T12:00:00.000Z");

  // 1. Buscar todos os leads atualizados em janeiro de 2026
  const leadsInJanuary = await prisma.lead.findMany({
    where: {
      updatedAt: {
        gte: januaryStart,
        lte: januaryEnd,
      },
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      phone: true,
      stage: true,
      updatedAt: true,
      createdAt: true,
    },
  });

  console.log(`Total de leads com updatedAt em janeiro 2026: ${leadsInJanuary.length}\n`);

  // 2. Buscar todos os contratos para verificar quais leads têm contrato
  const contracts = await prisma.contract.findMany({
    select: {
      whatsapp: true,
      contractDate: true,
    },
  });

  // Criar um Set com os últimos 8 dígitos dos telefones dos contratos
  const contractPhones = new Set(
    contracts.map((c) => c.whatsapp.slice(-8))
  );

  // 3. Filtrar leads sem contrato
  const leadsWithoutContract = leadsInJanuary.filter((lead) => {
    const last8Digits = lead.phone.slice(-8);
    return !contractPhones.has(last8Digits);
  });

  console.log(`Leads SEM contrato em janeiro 2026: ${leadsWithoutContract.length}`);
  console.log(`Leads COM contrato em janeiro 2026: ${leadsInJanuary.length - leadsWithoutContract.length}\n`);

  // 4. Filtrar apenas leads que não estão em FINALIZADO ou POS_VENDA
  // (estes provavelmente são leads antigos que não foram convertidos)
  const leadsToUpdate = leadsWithoutContract.filter(
    (lead) => !["FINALIZADO", "POS_VENDA"].includes(lead.stage)
  );

  console.log(`Leads que serão atualizados (não FINALIZADO/POS_VENDA): ${leadsToUpdate.length}\n`);

  if (leadsToUpdate.length === 0) {
    console.log("Nenhum lead para atualizar. Finalizando.\n");
    return;
  }

  // Listar os leads que serão atualizados
  console.log("=== Leads que serão atualizados ===\n");
  leadsToUpdate.forEach((lead, index) => {
    console.log(
      `${index + 1}. ${lead.name} (${lead.phone}) - Stage: ${lead.stage} - updatedAt: ${lead.updatedAt.toISOString()}`
    );
  });

  if (isDryRun) {
    console.log("\n[DRY RUN] Nenhuma alteração foi feita.");
    console.log(`[DRY RUN] Execute sem --dry-run para atualizar ${leadsToUpdate.length} leads.\n`);
    return;
  }

  // 5. Executar a atualização
  console.log(`\n=== Atualizando ${leadsToUpdate.length} leads ===\n`);

  const leadIds = leadsToUpdate.map((lead) => lead.id);

  const result = await prisma.lead.updateMany({
    where: {
      id: { in: leadIds },
    },
    data: {
      updatedAt: newUpdatedAt,
    },
  });

  console.log(`Leads atualizados com sucesso: ${result.count}`);
  console.log(`Novo updatedAt: ${newUpdatedAt.toISOString()}\n`);

  // 6. Verificação
  const verifyLeads = await prisma.lead.findMany({
    where: {
      id: { in: leadIds.slice(0, 3) },
    },
    select: {
      id: true,
      name: true,
      updatedAt: true,
    },
  });

  console.log("=== Verificação (primeiros 3 leads) ===\n");
  verifyLeads.forEach((lead) => {
    console.log(`${lead.name}: updatedAt = ${lead.updatedAt.toISOString()}`);
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
