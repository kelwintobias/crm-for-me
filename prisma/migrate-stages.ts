import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Iniciando migração dos stages...');

  // Passo 1: Adicionar novos valores ao enum
  console.log('📝 Adicionando novos valores ao enum PipelineStage...');
  const newValues = ['NOVO_LEAD', 'EM_NEGOCIACAO', 'AGENDADO', 'EM_ATENDIMENTO', 'POS_VENDA', 'FINALIZADO'];

  for (const value of newValues) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TYPE "PipelineStage" ADD VALUE IF NOT EXISTS '${value}'`);
      console.log(`  ✓ Adicionado: ${value}`);
    } catch (error: any) {
      if (error.code === 'P2010' && error.meta?.message?.includes('already exists')) {
        console.log(`  ⏭️  Já existe: ${value}`);
      } else {
        throw error;
      }
    }
  }
  console.log('✅ Novos valores adicionados ao enum');

  // Passo 2: Contar leads antes da migração
  const totalLeads = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count FROM leads WHERE "deletedAt" IS NULL
  `;
  console.log(`📊 Total de leads encontrados: ${totalLeads[0].count}`);

  // Passo 3: Migrar os dados
  const migrations = [
    { from: 'NOVOS', to: 'NOVO_LEAD' },
    { from: 'EM_CONTATO', to: 'EM_NEGOCIACAO' },
    { from: 'VENDIDO_UNICO', to: 'FINALIZADO' },
    { from: 'VENDIDO_MENSAL', to: 'FINALIZADO' },
    { from: 'PERDIDO', to: 'FINALIZADO' },
  ];

  for (const { from, to } of migrations) {
    const count = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*) as count FROM leads WHERE stage::text = '${from}' AND "deletedAt" IS NULL`
    );

    const leadCount = Number(count[0].count);

    if (leadCount > 0) {
      console.log(`📝 Migrando ${leadCount} leads de "${from}" para "${to}"...`);

      await prisma.$executeRawUnsafe(
        `UPDATE leads SET stage = '${to}'::"PipelineStage" WHERE stage::text = '${from}' AND "deletedAt" IS NULL`
      );

      console.log(`✅ Migração de "${from}" para "${to}" concluída`);
    } else {
      console.log(`⏭️  Nenhum lead encontrado em "${from}", pulando...`);
    }
  }

  console.log('✨ Migração de dados concluída com sucesso!');
  console.log('');
  console.log('⚠️  IMPORTANTE: Agora você pode executar:');
  console.log('   npm run db:push -- --accept-data-loss');
  console.log('   Para aplicar as mudanças finais no schema e remover os valores antigos do enum.');
}

main()
  .catch((e) => {
    console.error('❌ Erro durante a migração:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
