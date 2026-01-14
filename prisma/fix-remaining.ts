import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Migrando leads restantes...\n');

  const oldValues = ['NOVOS', 'EM_CONTATO', 'VENDIDO_UNICO', 'VENDIDO_MENSAL', 'PERDIDO'];
  const mapping: Record<string, string> = {
    'NOVOS': 'NOVO_LEAD',
    'EM_CONTATO': 'EM_NEGOCIACAO',
    'VENDIDO_UNICO': 'FINALIZADO',
    'VENDIDO_MENSAL': 'FINALIZADO',
    'PERDIDO': 'FINALIZADO',
  };

  for (const oldValue of oldValues) {
    const count = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*) as count FROM leads WHERE stage::text = '${oldValue}'`
    );

    const leadCount = Number(count[0].count);

    if (leadCount > 0) {
      console.log(`📝 Migrando ${leadCount} leads de "${oldValue}" para "${mapping[oldValue]}"...`);

      // Migra TODOS os leads, incluindo os deletados
      await prisma.$executeRawUnsafe(
        `UPDATE leads SET stage = '${mapping[oldValue]}'::"PipelineStage" WHERE stage::text = '${oldValue}'`
      );

      console.log(`✅ Migração concluída`);
    }
  }

  console.log('\n✨ Todos os leads foram migrados!');
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
