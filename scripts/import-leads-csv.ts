
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CSV_PATH = path.join(process.cwd(), 'audience (1) - Users.csv');

function normalizePhone(phone: string): string {
    return phone.replace(/\D/g, "");
}

function mapSource(csvSource: string): any {
    if (!csvSource) return 'OUTRO';
    const lower = csvSource.toLowerCase().trim();
    if (lower.includes('instagram')) return 'INSTAGRAM';
    if (lower.includes('indica')) return 'INDICACAO';
    if (lower.includes('parceira')) return 'PAGINA_PARCEIRA';
    if (lower.includes('influencer') || lower.includes('criador') || lower.includes('conteúdo')) return 'INFLUENCER';
    if (lower.includes('anúncio') || lower.includes('anuncio') || lower.includes('ads')) return 'ANUNCIO';
    if (lower.includes('whatsapp')) return 'OUTRO'; // WhatsApp usually falls to OUTRO or handled separately if needed
    return 'OUTRO';
}

async function main() {
    console.log("Iniciando importação (ARRAY MODE)...");

    const user = await prisma.user.findFirst();
    if (!user) throw new Error("Nenhum usuário encontrado.");
    const userId = user.id;

    console.log("Carregando base existente...");
    const existingPhones = new Set<string>();

    // Contracts
    (await prisma.contract.findMany({ select: { whatsapp: true, cpf: true } })).forEach(c => {
        existingPhones.add(normalizePhone(c.whatsapp));
        if (c.cpf) existingPhones.add(normalizePhone(c.cpf));
    });

    // Leads
    (await prisma.lead.findMany({ select: { phone: true, cpf: true } })).forEach(l => {
        existingPhones.add(normalizePhone(l.phone));
        if (l.cpf) existingPhones.add(normalizePhone(l.cpf));
    });

    console.log(`${existingPhones.size} registros únicos na base.`);

    // 3. Parse CSV as Array
    const parser = fs
        .createReadStream(CSV_PATH)
        .pipe(parse({
            columns: false, // Return arrays
            skip_empty_lines: true,
            trim: true,
            bom: true
        }));

    let processedCount = 0;
    let duplicateCount = 0;
    let newLeadsCount = 0;
    const leadsToCreate: any[] = [];

    // Indices based on inspection:
    // 0: Primeiro nome
    // 1: Sobrenome
    // 2: Telefone (Target)
    // 4: Email
    // 5: CPF
    // 11: Campos personalizados
    // 28: ORIGEM
    // 29: Origem
    // 24: NomeServiçoEscolhido(1) - Alternativa para nome

    console.log("Lendo arquivo CSV...");

    for await (const row of parser) {
        // Skip header
        if (processedCount === 0) {
            // Check headers just in case
            if (row[0] === 'Primeiro nome' && row[2] === 'Telefone') {
                console.log("Headers verificados e corretos.");
            } else {
                console.log("AVISO: Headers parecem diferentes do esperado:", row);
            }
            processedCount++;
            continue;
        }
        processedCount++;

        const phoneRaw = row[2] || ""; // Column 3
        const phone = normalizePhone(phoneRaw);

        if (!phone || phone.length < 8) {
            continue;
        }

        const cpfRaw = row[5] || "";
        const cpf = cpfRaw ? normalizePhone(cpfRaw) : null;

        if (existingPhones.has(phone) || (cpf && existingPhones.has(cpf))) {
            duplicateCount++;
            continue;
        }

        const firstName = row[0] || "";
        const lastName = row[1] || "";
        const backupName = row[24] || "Sem Nome"; // NomeServiçoEscolhido(1)
        const fullName = `${firstName} ${lastName}`.trim() || backupName;

        const sourceRaw = row[29] || row[28] || ""; // Origem or ORIGEM
        const source = mapSource(sourceRaw);

        const notes = row[11] || null; // Campos personalizados
        const email = row[4] || null;

        leadsToCreate.push({
            userId: userId,
            name: fullName,
            phone: phoneRaw,
            source: source,
            plan: 'INDEFINIDO',
            stage: 'NOVO_LEAD',
            value: 0,
            email: email,
            cpf: cpf,
            notes: notes,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        existingPhones.add(phone);
        if (cpf) existingPhones.add(cpf);

        newLeadsCount++;
    }

    console.log(`Linhas processadas (incluindo header): ${processedCount}`);
    console.log(`Duplicados ignorados: ${duplicateCount}`);
    console.log(`Novos leads a inserir: ${newLeadsCount}`);

    if (newLeadsCount > 0) {
        console.log("Inserindo no banco de dados...");
        const BATCH_SIZE = 1000;
        for (let i = 0; i < leadsToCreate.length; i += BATCH_SIZE) {
            const batch = leadsToCreate.slice(i, i + BATCH_SIZE);
            await prisma.lead.createMany({
                data: batch,
                skipDuplicates: true
            });
            console.log(`Inserido lote ${i} a ${Math.min(i + BATCH_SIZE, leadsToCreate.length)}`);
        }
        console.log("Importação concluída com sucesso!");
    } else {
        console.log("Nenhum novo lead para inserir.");
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
