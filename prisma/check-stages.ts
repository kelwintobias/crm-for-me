import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Verificando stages no banco de dados...\n');

  // Verifica a distribuição atual de stages
  const stages = await prisma.$queryRawUnsafe<Array<{ stage: string; count: bigint }>>(
    `SELECT stage::text as stage, COUNT(*) as count FROM leads WHERE "deletedAt" IS NULL GROUP BY stage::text ORDER BY count DESC`
  );

  console.log('📊 Distribuição de stages:');
  stages.forEach(({ stage, count }) => {
    console.log(`  ${stage}: ${count}`);
  });

  console.log('\n');

  // Verifica se ainda existem valores antigos
  const oldValues = ['NOVOS', 'EM_CONTATO', 'VENDIDO_UNICO', 'VENDIDO_MENSAL', 'PERDIDO'];
  let hasOldValues = false;

  for (const oldValue of oldValues) {
    const count = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*) as count FROM leads WHERE stage::text = '${oldValue}'`
    );

    if (Number(count[0].count) > 0) {
      console.log(`⚠️  Ainda existem ${count[0].count} leads com stage "${oldValue}"`);
      hasOldValues = true;
    }
  }

  if (!hasOldValues) {
    console.log('✅ Nenhum valor antigo encontrado!');
  }

  // Verifica os valores aceitos no enum atual
  console.log('\n📋 Valores no enum PipelineStage:');
  const enumValues = await prisma.$queryRawUnsafe<Array<{ enumlabel: string }>>(
    `SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'PipelineStage') ORDER BY enumsortorder`
  );

  enumValues.forEach(({ enumlabel }) => {
    console.log(`  - ${enumlabel}`);
  });
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
