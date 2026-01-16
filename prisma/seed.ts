import { PrismaClient, LeadSource, PlanType, PipelineStage } from "@prisma/client";
import { fakerPT_BR as faker } from "@faker-js/faker";

const prisma = new PrismaClient();

// ============================================
// CONFIGURACAO DO SEED
// ============================================

// Tipo interno para controle da geracao do seed
type SeedStage = "NOVOS" | "EM_CONTATO" | "VENDIDO_UNICO" | "VENDIDO_MENSAL" | "PERDIDO";

const SEED_CONFIG = {
  TOTAL_LEADS: 1500,
  DAYS_RANGE: 90,
  INSTAGRAM_PERCENTAGE: 0.95,
  PLANO_UNICO_PERCENTAGE: 0.60,
  NOTES_PERCENTAGE: 0.20,
};

// Precos dos planos (deve espelhar o backend)
const PLAN_PRICES: Record<PlanType, number> = {
  INDEFINIDO: 0,
  INTERMEDIARIO: 25.00,
  AVANCADO: 40.00,
  ELITE: 50.00,
  PRO_PLUS: 75.00,
  ULTRA_PRO: 100.00,
  EVOLUTION: 150.00,
};

// Distribuicao realista de stages para simular um funil de vendas
const STAGE_DISTRIBUTION: { stage: SeedStage; weight: number }[] = [
  { stage: "NOVOS", weight: 0.25 },           // 25% - Leads novos
  { stage: "EM_CONTATO", weight: 0.20 },      // 20% - Em negociacao
  { stage: "VENDIDO_UNICO", weight: 0.25 },   // 25% - Vendas unicas
  { stage: "VENDIDO_MENSAL", weight: 0.18 },  // 18% - Assinaturas
  { stage: "PERDIDO", weight: 0.12 },         // 12% - Perdidos
];

// ============================================
// FUNCOES AUXILIARES
// ============================================

function mapSeedStageToPipelineStage(seedStage: SeedStage): PipelineStage {
  switch (seedStage) {
    case "NOVOS":
      return "NOVO_LEAD";
    case "EM_CONTATO":
      return "EM_NEGOCIACAO";
    case "VENDIDO_UNICO":
    case "VENDIDO_MENSAL":
    case "PERDIDO":
      return "FINALIZADO";
    default:
      return "NOVO_LEAD";
  }
}

function getWeightedStage(): SeedStage {
  const random = Math.random();
  let cumulative = 0;

  for (const { stage, weight } of STAGE_DISTRIBUTION) {

    cumulative += weight;
    if (random <= cumulative) {
      return stage;
    }
  }

  return "NOVOS";
}

function getRandomSource(): LeadSource {
  // 95% Instagram, 5% distribuido entre outros
  if (Math.random() < SEED_CONFIG.INSTAGRAM_PERCENTAGE) {
    return "INSTAGRAM";
  }

  const otherSources: LeadSource[] = ["INDICACAO", "PAGINA_PARCEIRA", "INFLUENCER", "ANUNCIO", "OUTRO"];
  return faker.helpers.arrayElement(otherSources);
}

function getRandomDateInRange(days: number): Date {
  const now = new Date();
  const past = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  // Distribuicao mais realista: mais leads recentes
  // Usando uma curva que favorece datas mais recentes
  const random = Math.pow(Math.random(), 0.7); // Bias para datas recentes
  const timestamp = past.getTime() + random * (now.getTime() - past.getTime());

  return new Date(timestamp);
}

function getPlanAndValueForStage(stage: SeedStage): { plan: PlanType; value: number } {
  // Lista de planos disponiveis (exceto INDEFINIDO)
  const availablePlans: PlanType[] = ["INTERMEDIARIO", "AVANCADO", "ELITE", "PRO_PLUS", "ULTRA_PRO", "EVOLUTION"];

  // REGRA DE CONSISTENCIA ESTRITA
  // Se vendido, escolhe um plano aleatorio
  if (stage === "VENDIDO_UNICO" || stage === "VENDIDO_MENSAL") {
    // Planos basicos para UNICO, premium para MENSAL
    const basicPlans: PlanType[] = ["INTERMEDIARIO", "AVANCADO"];
    const premiumPlans: PlanType[] = ["ELITE", "PRO_PLUS", "ULTRA_PRO", "EVOLUTION"];

    const plans = stage === "VENDIDO_UNICO" ? basicPlans : premiumPlans;
    const plan = faker.helpers.arrayElement(plans);
    return { plan, value: PLAN_PRICES[plan] };
  }

  // Para leads nao vendidos, simula interesse em planos
  if (stage === "NOVOS" || stage === "EM_CONTATO") {
    // 30% ainda indefinido, 70% ja manifestou interesse
    if (Math.random() < 0.30) {
      return { plan: "INDEFINIDO", value: 0 };
    }

    const plan = faker.helpers.arrayElement(availablePlans);
    return { plan, value: PLAN_PRICES[plan] };
  }

  // PERDIDO - mantém o plano que tinha interesse (ou indefinido)
  const wasInterested = Math.random() < 0.70;
  if (!wasInterested) {
    return { plan: "INDEFINIDO", value: 0 };
  }

  const plan = faker.helpers.arrayElement(availablePlans);
  return { plan, value: PLAN_PRICES[plan] };
}

function generateBrazilianPhone(): string {
  const ddd = faker.helpers.arrayElement([
    "11", "21", "31", "41", "51", "61", "71", "81", "85", "62", "27", "48"
  ]);
  const prefix = "9";
  const number = faker.string.numeric(8);
  return `${ddd}${prefix}${number}`;
}

function generateNotes(): string | null {
  if (Math.random() > SEED_CONFIG.NOTES_PERCENTAGE) {
    return null;
  }

  const noteTemplates = [
    "Cliente interessado, aguardando retorno",
    "Indicacao do @{username}",
    "Viu o post sobre {topic}",
    "Ja usa produto similar",
    "Duvidas sobre pagamento",
    "Prefere contato por WhatsApp",
    "Melhor horario: {time}",
    "Empresa: {company}",
    "Quer desconto para fechar hoje",
    "Retornar na proxima semana",
  ];

  let note = faker.helpers.arrayElement(noteTemplates);

  // Substitui placeholders
  note = note.replace("{username}", faker.internet.username());
  note = note.replace("{topic}", faker.helpers.arrayElement(["emagrecimento", "dieta", "treino", "saude"]));
  note = note.replace("{time}", faker.helpers.arrayElement(["manha", "tarde", "noite"]));
  note = note.replace("{company}", faker.company.name());

  return note;
}

// ============================================
// FUNCAO PRINCIPAL DO SEED
// ============================================

async function main() {
  console.log("=".repeat(50));
  console.log("    UPBOOST CRM - SEED DE DADOS");
  console.log("=".repeat(50));
  console.log("");

  // 1. Busca ou cria usuario de teste
  let user = await prisma.user.findFirst();

  if (!user) {
    console.log("Usuario nao encontrado. Criando usuario de teste...");
    user = await prisma.user.create({
      data: {
        id: "seed_user_" + Date.now(),
        email: "vendedor@upboost.com",
        name: "Vendedor UpBoost",
        commissionRate: 10.0, // 10% de comissao
      },
    });
    console.log(`Usuario criado: ${user.email}`);
  } else {
    console.log(`Usuario encontrado: ${user.email}`);
  }

  // 2. Limpa leads anteriores deste usuario
  const deletedCount = await prisma.lead.deleteMany({
    where: { userId: user.id },
  });
  console.log(`Leads anteriores removidos: ${deletedCount.count}`);
  console.log("");

  // 3. Gera os leads
  console.log(`Gerando ${SEED_CONFIG.TOTAL_LEADS} leads...`);
  console.log(`- Periodo: ultimos ${SEED_CONFIG.DAYS_RANGE} dias`);
  console.log(`- Instagram: ${SEED_CONFIG.INSTAGRAM_PERCENTAGE * 100}%`);
  console.log(`- Plano Unico: ${SEED_CONFIG.PLANO_UNICO_PERCENTAGE * 100}%`);
  console.log("");

  const leadsData = [];
  const stats = {
    sources: {} as Record<string, number>,
    stages: {} as Record<string, number>,
    plans: {} as Record<string, number>,
  };

  for (let i = 0; i < SEED_CONFIG.TOTAL_LEADS; i++) {
    // Gera data com distribuicao realista
    const createdAt = getRandomDateInRange(SEED_CONFIG.DAYS_RANGE);

    // Gera source (95% Instagram)
    const source = getRandomSource();

    // Gera stage com distribuicao de funil
    const stage = getWeightedStage();

    // IMPORTANTE: Plano e valor derivados do stage para consistencia
    const { plan, value } = getPlanAndValueForStage(stage);

    // Coleta estatisticas
    stats.sources[source] = (stats.sources[source] || 0) + 1;
    stats.stages[stage] = (stats.stages[stage] || 0) + 1;
    stats.plans[plan] = (stats.plans[plan] || 0) + 1;

    leadsData.push({
      name: faker.person.fullName(),
      phone: generateBrazilianPhone(),
      source,
      plan,
      value,
      stage: mapSeedStageToPipelineStage(stage),
      userId: user.id,
      createdAt,
      updatedAt: createdAt,
      notes: generateNotes(),
    });

    // Progress indicator
    if ((i + 1) % 500 === 0) {
      console.log(`  Gerados: ${i + 1}/${SEED_CONFIG.TOTAL_LEADS}`);
    }
  }

  // 4. Insere em batch
  console.log("");
  console.log("Inserindo no banco de dados...");

  await prisma.lead.createMany({
    data: leadsData,
  });

  // 5. Exibe estatisticas
  console.log("");
  console.log("=".repeat(50));
  console.log("    ESTATISTICAS DO SEED");
  console.log("=".repeat(50));

  console.log("");
  console.log("ORIGEM DOS LEADS:");
  Object.entries(stats.sources)
    .sort((a, b) => b[1] - a[1])
    .forEach(([source, count]) => {
      const pct = ((count / SEED_CONFIG.TOTAL_LEADS) * 100).toFixed(1);
      console.log(`  ${source.padEnd(12)} ${count.toString().padStart(5)} (${pct}%)`);
    });

  console.log("");
  console.log("DISTRIBUICAO POR STAGE:");
  Object.entries(stats.stages)
    .sort((a, b) => b[1] - a[1])
    .forEach(([stage, count]) => {
      const pct = ((count / SEED_CONFIG.TOTAL_LEADS) * 100).toFixed(1);
      console.log(`  ${stage.padEnd(15)} ${count.toString().padStart(5)} (${pct}%)`);
    });

  console.log("");
  console.log("DISTRIBUICAO POR PLANO:");
  Object.entries(stats.plans)
    .sort((a, b) => b[1] - a[1])
    .forEach(([plan, count]) => {
      const pct = ((count / SEED_CONFIG.TOTAL_LEADS) * 100).toFixed(1);
      console.log(`  ${plan.padEnd(15)} ${count.toString().padStart(5)} (${pct}%)`);
    });

  // 6. Calcula metricas financeiras
  const vendidosBasicos = stats.stages["VENDIDO_UNICO"] || 0;
  const vendidosPremium = stats.stages["VENDIDO_MENSAL"] || 0;

  // Usa preco medio estimado para cada categoria
  const precoMedioBasico = (PLAN_PRICES.INTERMEDIARIO + PLAN_PRICES.AVANCADO) / 2;
  const precoMedioPremium = (PLAN_PRICES.ELITE + PLAN_PRICES.PRO_PLUS + PLAN_PRICES.ULTRA_PRO + PLAN_PRICES.EVOLUTION) / 4;

  const faturamentoBasico = vendidosBasicos * precoMedioBasico;
  const faturamentoPremium = vendidosPremium * precoMedioPremium;
  const faturamentoTotal = faturamentoBasico + faturamentoPremium;

  console.log("");
  console.log("METRICAS FINANCEIRAS:");
  console.log(`  Vendas Basicas:   ${vendidosBasicos} x R$ ${precoMedioBasico.toFixed(2)} = R$ ${faturamentoBasico.toFixed(2)}`);
  console.log(`  Vendas Premium:   ${vendidosPremium} x R$ ${precoMedioPremium.toFixed(2)} = R$ ${faturamentoPremium.toFixed(2)}`);
  console.log(`  FATURAMENTO TOTAL: R$ ${faturamentoTotal.toFixed(2)}`);

  console.log("");
  console.log("=".repeat(50));
  console.log("    SEED CONCLUIDO COM SUCESSO!");
  console.log("=".repeat(50));
}

// ============================================
// EXECUCAO
// ============================================

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("ERRO NO SEED:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
