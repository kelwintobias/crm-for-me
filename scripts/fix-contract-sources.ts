import { PrismaClient, ContractSource } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import { parse } from 'csv-parse/sync'

const prisma = new PrismaClient()

// Mapeamento de origens do CSV para enum ContractSource
// ContractSource: ANUNCIO, INDICACAO, INFLUENCIADOR, PARCEIRO
function mapOrigemToContractSource(origem: string): ContractSource {
  const origemNormalizada = origem.toLowerCase().trim()

  // Indicação
  if (origemNormalizada === 'indicação' || origemNormalizada === 'indicacao') {
    return 'INDICACAO'
  }

  // Influenciador
  if (origemNormalizada.includes('video de influenciadores') ||
    origemNormalizada.includes('vídeo de influenciadores') ||
    origemNormalizada.includes('vídeos de influenciadores')) {
    return 'INFLUENCIADOR'
  }

  // Página Parceira → Parceiro
  if (origemNormalizada.includes('página parceira') ||
    origemNormalizada.includes('pagina parceira')) {
    return 'PARCEIRO'
  }

  // Anúncios e campanhas
  if (origemNormalizada.includes('anúncio nas redes sociais') ||
    origemNormalizada.includes('anuncio nas redes sociais') ||
    origemNormalizada.includes('meta ads') ||
    origemNormalizada.includes('- ads') ||
    origemNormalizada.includes('interesse -') ||
    origemNormalizada.includes('conta reserva') ||
    origemNormalizada === 'linktree' ||
    origemNormalizada === 'instagram' ||
    origemNormalizada === 'site') {
    return 'ANUNCIO'
  }

  // Default para ANUNCIO
  return 'ANUNCIO'
}

// Normaliza telefone para comparação
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').replace(/^55/, '')
}

// Normaliza email para comparação
function normalizeEmail(email: string): string {
  return email.toLowerCase().trim()
}

async function main() {
  console.log('🚀 Iniciando correção das origens dos contratos...\n')

  // 1. Ler todos os CSVs e criar mapa de email/telefone → origem
  const csvDir = path.join(process.cwd(), 'dbantigodocliente')
  const csvFiles = fs.readdirSync(csvDir).filter(f => f.endsWith('.csv'))

  const emailToOrigem = new Map<string, string>()
  const phoneToOrigem = new Map<string, string>()

  for (const file of csvFiles) {
    const filePath = path.join(csvDir, file)
    const content = fs.readFileSync(filePath, 'utf-8')

    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    })

    for (const record of records as any[]) {
      const email = record['EMAIL '] || record['EMAIL'] || ''
      const phone = record['WHATSAPP'] || ''
      const origem = record['ORIGEM'] || ''

      if (email && origem) {
        emailToOrigem.set(normalizeEmail(email), origem)
      }
      if (phone && origem) {
        phoneToOrigem.set(normalizePhone(phone), origem)
      }
    }
  }

  console.log(`📊 Emails mapeados: ${emailToOrigem.size}`)
  console.log(`📊 Telefones mapeados: ${phoneToOrigem.size}\n`)

  // 2. Buscar todos os contratos no banco
  const contracts = await prisma.contract.findMany({
    select: { id: true, email: true, whatsapp: true, source: true, clientName: true }
  })

  console.log(`📋 Contratos no banco de dados: ${contracts.length}\n`)

  // 3. Atualizar cada contrato
  let updated = 0
  let notFound = 0
  const sourceStats: Record<string, number> = {}

  for (const contract of contracts) {
    let origem: string | undefined

    // Tentar encontrar pelo email primeiro
    if (contract.email) {
      origem = emailToOrigem.get(normalizeEmail(contract.email))
    }

    // Se não encontrou pelo email, tentar pelo telefone
    if (!origem && contract.whatsapp) {
      origem = phoneToOrigem.get(normalizePhone(contract.whatsapp))
    }

    if (origem) {
      const newSource = mapOrigemToContractSource(origem)

      // Atualizar no banco
      await prisma.contract.update({
        where: { id: contract.id },
        data: { source: newSource }
      })

      sourceStats[newSource] = (sourceStats[newSource] || 0) + 1
      updated++
    } else {
      notFound++
      // Manter como ANUNCIO para os não encontrados
      sourceStats['ANUNCIO'] = (sourceStats['ANUNCIO'] || 0) + 1
    }
  }

  console.log(`✅ Atualização concluída!`)
  console.log(`   - Contratos atualizados: ${updated}`)
  console.log(`   - Contratos não encontrados nos CSVs: ${notFound}`)

  console.log(`\n📈 Distribuição das novas origens:`)
  for (const [source, count] of Object.entries(sourceStats).sort((a, b) => b[1] - a[1])) {
    console.log(`   - ${source}: ${count}`)
  }

  // 4. Verificação final
  const finalCounts = await prisma.contract.groupBy({
    by: ['source'],
    _count: { source: true }
  })

  console.log(`\n🔍 Verificação final das origens no banco:`)
  for (const c of finalCounts) {
    console.log(`   - ${c.source}: ${c._count.source}`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
