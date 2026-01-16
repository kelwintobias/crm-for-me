import { PrismaClient, LeadSource } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import { parse } from 'csv-parse/sync'

const prisma = new PrismaClient()

// Mapeamento de origens do CSV para enum LeadSource
function mapOrigemToSource(origem: string): LeadSource {
  const origemNormalizada = origem.toLowerCase().trim()

  // Mapeamento principal conforme solicitado pelo usuário
  if (origemNormalizada.includes('anúncio nas redes sociais') ||
      origemNormalizada.includes('anuncio nas redes sociais')) {
    return 'ANUNCIO'
  }

  if (origemNormalizada.includes('video de influenciadores') ||
      origemNormalizada.includes('vídeo de influenciadores') ||
      origemNormalizada.includes('vídeos de influenciadores')) {
    return 'INFLUENCER'
  }

  if (origemNormalizada === 'indicação' || origemNormalizada === 'indicacao') {
    return 'INDICACAO'
  }

  if (origemNormalizada.includes('página parceira') ||
      origemNormalizada.includes('pagina parceira')) {
    return 'PAGINA_PARCEIRA'
  }

  // Mapeamentos adicionais para outras origens encontradas nos CSVs
  if (origemNormalizada === 'instagram') {
    return 'INSTAGRAM'
  }

  // Campanhas de Meta Ads e outras campanhas de anúncios
  if (origemNormalizada.includes('meta ads') ||
      origemNormalizada.includes('- ads') ||
      origemNormalizada.includes('interesse -') ||
      origemNormalizada.includes('conta reserva')) {
    return 'ANUNCIO'
  }

  // LINKTREE pode ser considerado como anúncio/Instagram
  if (origemNormalizada === 'linktree') {
    return 'ANUNCIO'
  }

  // SITE
  if (origemNormalizada === 'site') {
    return 'OUTRO'
  }

  // Origens indefinidas
  if (origemNormalizada.includes('indefinida') ||
      origemNormalizada.includes('inefinida') ||
      origemNormalizada === '') {
    return 'OUTRO'
  }

  // Default
  return 'OUTRO'
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
  console.log('🚀 Iniciando correção das origens dos leads...\n')

  // 1. Ler todos os CSVs e criar mapa de email/telefone → origem
  const csvDir = path.join(process.cwd(), 'dbantigodocliente')
  const csvFiles = fs.readdirSync(csvDir).filter(f => f.endsWith('.csv'))

  const emailToOrigem = new Map<string, string>()
  const phoneToOrigem = new Map<string, string>()

  let totalCsvRecords = 0

  for (const file of csvFiles) {
    const filePath = path.join(csvDir, file)
    const content = fs.readFileSync(filePath, 'utf-8')

    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    })

    for (const record of records) {
      const email = record['EMAIL '] || record['EMAIL'] || ''
      const phone = record['WHATSAPP'] || ''
      const origem = record['ORIGEM'] || ''

      if (email && origem) {
        emailToOrigem.set(normalizeEmail(email), origem)
      }
      if (phone && origem) {
        phoneToOrigem.set(normalizePhone(phone), origem)
      }
      totalCsvRecords++
    }
  }

  console.log(`📊 Estatísticas dos CSVs:`)
  console.log(`   - Total de registros: ${totalCsvRecords}`)
  console.log(`   - Emails mapeados: ${emailToOrigem.size}`)
  console.log(`   - Telefones mapeados: ${phoneToOrigem.size}\n`)

  // 2. Buscar todos os leads no banco
  const leads = await prisma.lead.findMany({
    where: { deletedAt: null },
    select: { id: true, email: true, phone: true, source: true, name: true }
  })

  console.log(`📋 Leads no banco de dados: ${leads.length}\n`)

  // 3. Atualizar cada lead
  let updated = 0
  let notFound = 0
  const sourceStats: Record<string, number> = {}
  const notFoundLeads: string[] = []

  for (const lead of leads) {
    let origem: string | undefined

    // Tentar encontrar pelo email primeiro
    if (lead.email) {
      origem = emailToOrigem.get(normalizeEmail(lead.email))
    }

    // Se não encontrou pelo email, tentar pelo telefone
    if (!origem && lead.phone) {
      origem = phoneToOrigem.get(normalizePhone(lead.phone))
    }

    if (origem) {
      const newSource = mapOrigemToSource(origem)

      // Atualizar no banco
      await prisma.lead.update({
        where: { id: lead.id },
        data: { source: newSource }
      })

      sourceStats[newSource] = (sourceStats[newSource] || 0) + 1
      updated++
    } else {
      notFound++
      notFoundLeads.push(`${lead.name} (${lead.email || lead.phone})`)
    }
  }

  console.log(`✅ Atualização concluída!`)
  console.log(`   - Leads atualizados: ${updated}`)
  console.log(`   - Leads não encontrados nos CSVs: ${notFound}`)

  console.log(`\n📈 Distribuição das novas origens:`)
  for (const [source, count] of Object.entries(sourceStats).sort((a, b) => b[1] - a[1])) {
    console.log(`   - ${source}: ${count}`)
  }

  if (notFoundLeads.length > 0 && notFoundLeads.length <= 20) {
    console.log(`\n⚠️ Leads não encontrados nos CSVs:`)
    for (const lead of notFoundLeads) {
      console.log(`   - ${lead}`)
    }
  }

  // 4. Verificação final
  const finalCounts = await prisma.lead.groupBy({
    by: ['source'],
    _count: { source: true },
    where: { deletedAt: null }
  })

  console.log(`\n🔍 Verificação final das origens no banco:`)
  for (const c of finalCounts) {
    console.log(`   - ${c.source}: ${c._count.source}`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
