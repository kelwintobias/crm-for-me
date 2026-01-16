import { PrismaClient, ContractSource, ContractPackage } from "@prisma/client";

const prisma = new PrismaClient();

// ============================================
// MAPEAMENTO DE CAMPOS
// ============================================

// ContractSource → LeadSource
function mapContractSourceToLeadSource(source: ContractSource) {
  const mapping: Record<ContractSource, "INSTAGRAM" | "INDICACAO" | "PAGINA_PARCEIRA" | "INFLUENCER" | "ANUNCIO" | "OUTRO"> = {
    ANUNCIO: "ANUNCIO",
    INDICACAO: "INDICACAO",
    INFLUENCIADOR: "INFLUENCER",
    PARCEIRO: "PAGINA_PARCEIRA",
  };
  return mapping[source];
}

// ContractPackage → PlanType
function mapContractPackageToPlanType(pkg: ContractPackage) {
  const mapping: Record<ContractPackage, "INDEFINIDO" | "INTERMEDIARIO" | "AVANCADO" | "ELITE" | "PRO_PLUS" | "ULTRA_PRO" | "EVOLUTION"> = {
    INTERMEDIARIO: "INTERMEDIARIO",
    AVANCADO: "AVANCADO",
    ELITE: "ELITE",
    PRO_PLUS: "PRO_PLUS",
    ULTRA_PRO: "ULTRA_PRO",
    EVOLUTION: "EVOLUTION",
  };
  return mapping[pkg];
}

// ============================================
// FUNÇÃO PRINCIPAL
// ============================================

async function main() {
  console.log("=".repeat(60));
  console.log("    MIGRAÇÃO: CONTRATOS JAN/2026 → LEADS FINALIZADOS");
  console.log("=".repeat(60));
  console.log("");

  // 1. Buscar contratos de janeiro de 2026
  const startOfMonth = new Date("2026-01-01T00:00:00.000Z");
  const endOfMonth = new Date("2026-01-31T23:59:59.999Z");

  const contracts = await prisma.contract.findMany({
    where: {
      contractDate: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
    orderBy: {
      contractDate: "asc",
    },
  });

  console.log(`Contratos encontrados em janeiro/2026: ${contracts.length}`);
  console.log("");

  if (contracts.length === 0) {
    console.log("Nenhum contrato para migrar. Encerrando.");
    return;
  }

  // 2. Preparar dados dos leads
  const leadsData = contracts.map((contract) => ({
    name: contract.clientName,
    phone: contract.whatsapp,
    source: mapContractSourceToLeadSource(contract.source),
    plan: mapContractPackageToPlanType(contract.package),
    value: contract.totalValue,
    stage: "FINALIZADO" as const,
    email: contract.email,
    contractDate: contract.contractDate,
    instagram: contract.instagram,
    cpf: contract.cpf,
    packageType: contract.package,
    addOns: contract.addons.join(", "),
    termsAccepted: contract.termsAccepted,
    userId: contract.userId,
    createdAt: contract.createdAt,
    updatedAt: contract.updatedAt,
  }));

  // 3. Criar leads em batch
  console.log("Criando leads na coluna FINALIZADO...");
  
  const result = await prisma.lead.createMany({
    data: leadsData,
  });

  console.log("");
  console.log(`✅ ${result.count} leads criados com sucesso!`);
  console.log("");

  // 4. Verificar resultado
  const finalizadoCount = await prisma.lead.count({
    where: {
      stage: "FINALIZADO",
      deletedAt: null,
    },
  });

  console.log(`Total de leads na coluna FINALIZADO: ${finalizadoCount}`);
  console.log("");
  console.log("=".repeat(60));
  console.log("    MIGRAÇÃO CONCLUÍDA!");
  console.log("=".repeat(60));
}

// ============================================
// EXECUÇÃO
// ============================================

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("ERRO NA MIGRAÇÃO:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
