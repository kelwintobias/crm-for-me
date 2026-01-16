/**
 * Script para limpar todos os dados do banco de dados
 * EXCETO os usuários (users)
 * 
 * Uso: npx tsx scripts/wipe-data.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function wipeData() {
    console.log('🗑️  Iniciando limpeza do banco de dados...\n');

    try {
        // Ordem de deleção respeitando as foreign keys

        // 1. Deletar histórico de agendamentos primeiro (depende de appointments)
        const deletedHistory = await prisma.appointmentHistory.deleteMany();
        console.log(`✓ AppointmentHistory: ${deletedHistory.count} registros deletados`);

        // 2. Deletar agendamentos (depende de leads)
        const deletedAppointments = await prisma.appointment.deleteMany();
        console.log(`✓ Appointments: ${deletedAppointments.count} registros deletados`);

        // 3. Deletar contratos
        const deletedContracts = await prisma.contract.deleteMany();
        console.log(`✓ Contracts: ${deletedContracts.count} registros deletados`);

        // 4. Deletar leads
        const deletedLeads = await prisma.lead.deleteMany();
        console.log(`✓ Leads: ${deletedLeads.count} registros deletados`);

        console.log('\n✅ Limpeza concluída com sucesso!');
        console.log('📌 Users foram preservados.');

        // Mostrar usuários restantes
        const users = await prisma.user.findMany({
            select: { id: true, email: true, name: true }
        });
        console.log(`\n👤 Usuários no sistema (${users.length}):`);
        users.forEach(u => console.log(`   - ${u.email} (${u.name || 'sem nome'})`));

    } catch (error) {
        console.error('❌ Erro durante a limpeza:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

wipeData();
