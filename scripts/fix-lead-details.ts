import { PrismaClient, PlanType } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import { parse } from 'csv-parse/sync'

const prisma = new PrismaClient()

// Preços dos pacotes para calcular o valor
const PLAN_PRICES: Record<PlanType, number> = {
  INDEFINIDO: 0,
  INTERMEDIARIO: 25.00,
  AVANCADO: 40.00,
  ELITE: 50.00,
  PRO_PLUS: 75.00,
  ULTRA_PRO: 100.00,
  EVOLUTION: 150.00,
}

// Mapeamento de pacotes do CSV para o enum PlanType
function mapPacoteToPlan(pacoteCSV: string): PlanType {
  const lower = pacoteCSV.toLowerCase()

  if (lower.includes('evolution')) return 'EVOLUTION'
  if (lower.includes('ultra pro')) return 'ULTRA_PRO'
  if (lower.includes('pro plus')) return 'PRO_PLUS'
  if (lower.includes('elite')) return 'ELITE'
  if (lower.includes('avançado') || lower.includes('avancado')) return 'AVANCADO'
  if (lower.includes('intermediario') || lower.includes('intermediário')) return 'INTERMEDIARIO'
  if (lower.includes('essencial')) return 'INTERMEDIARIO' // Mapeia Essencial para Intermediário

  return 'INDEFINIDO'
}

// Extrair nome do pacote para packageType
function extractPackageName(pacoteCSV: string): string {
  // Remove valor entre parênteses e limpa
  const match = pacoteCSV.match(/Pacote\s+([^(]+)/i)
  if (match) {
    return match[1].trim()
  }
  return pacoteCSV.trim()
}

// Mapear adicionais do CSV para formato legível
function mapAdicionais(adicionaisCSV: string): string {
  if (!adicionaisCSV || adicionaisCSV.trim() === '' || adicionaisCSV === 'Padrao') {
    return ''
  }

  // Lista de adicionais encontrados
  const addons: string[] = []
  const lower = adicionaisCSV.toLowerCase()

  if (lower.includes('upboost +') || lower.includes('upboost+')) {
    addons.push('UPBOOST+')
  }

  if (lower.includes('formatação padrão') || lower.includes('formatacao padrao')) {
    addons.push('Formatação Padrão')
  }

  if (lower.includes('formatação profissional') || lower.includes('formatacao profissional')) {
    addons.push('Formatação Profissional')
  }

  if (lower.includes('ativação do windows') || lower.includes('ativacao do windows')) {
    addons.push('Ativação Windows')
  }

  if (lower.includes('remoção delay') || lower.includes('remocao delay')) {
    addons.push('Remoção Delay')
  }

  return addons.join(', ')
}

// Parsear valor do CSV (ex: "R$ 150,00" -> 150.00)
function parseValor(valorCSV: string): number {
  if (!valorCSV) return 0

  const cleaned = valorCSV
    .replace(/R\$\s*/gi, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .trim()

  const valor = parseFloat(cleaned)
  return isNaN(valor) ? 0 : valor
}

// Normaliza telefone para comparação
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').replace(/^55/, '')
}

// Normaliza email para comparação
function normalizeEmail(email: string): string {
  return email.toLowerCase().trim()
}

interface CSVRecord {
  email: string
  phone: string
  pacote: string
  plan: PlanType
  adicionais: string
  valor: number
}

async function main() {
  console.log('🚀 Iniciando correção dos leads do Kanban...\n')

  // 1. Ler todos os CSVs e criar mapa de dados
  const csvDir = path.join(process.cwd(), 'dbantigodocliente')
  const csvFiles = fs.readdirSync(csvDir).filter(f => f.endsWith('.csv'))

  const emailToRecord = new Map<string, CSVRecord>()
  const phoneToRecord = new Map<string, CSVRecord>()

  let totalCsvRecords = 0

  for (const file of csvFiles) {
    const filePath = path.join(csvDir, file)
    const content = fs.readFileSync(filePath, 'utf-8')

    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    })

    for (const row of records as any[]) {
      const email = row['EMAIL '] || row['EMAIL'] || ''
      const phone = row['WHATSAPP'] || ''
      const rawPacote = row['PACOTE ADQUIRIDO '] || row['PACOTE ADQUIRIDO'] || ''
      const rawAdicionais = row['ADICIONAIS'] || ''
      const rawValor = row['VALOR'] || ''

      const record: CSVRecord = {
        email: normalizeEmail(email),
        phone: normalizePhone(phone),
        pacote: extractPackageName(rawPacote),
        plan: mapPacoteToPlan(rawPacote),
        adicionais: mapAdicionais(rawAdicionais),
        valor: parseValor(rawValor)
      }

      if (email) {
        emailToRecord.set(normalizeEmail(email), record)
      }
      if (phone) {
        phoneToRecord.set(normalizePhone(phone), record)
      }
      totalCsvRecords++
    }
  }

  console.log(`📊 Estatísticas dos CSVs:`)
  console.log(`   - Total de registros: ${totalCsvRecords}`)
  console.log(`   - Emails mapeados: ${emailToRecord.size}`)
  console.log(`   - Telefones mapeados: ${phoneToRecord.size}\n`)

  // 2. Buscar todos os leads no banco
  const leads = await prisma.lead.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      plan: true,
      packageType: true,
      addOns: true,
      value: true
    }
  })

  console.log(`📋 Leads no banco de dados: ${leads.length}\n`)

  // 3. Atualizar cada lead
  let updated = 0
  let notFound = 0

  const stats = {
    planosCorrigidos: 0,
    adicionaisCorrigidos: 0,
    valoresCorrigidos: 0,
    pacotesCorrigidos: 0
  }

  const planCounts: Record<string, number> = {}

  for (const lead of leads) {
    let record: CSVRecord | undefined

    // Tentar encontrar pelo email primeiro
    if (lead.email) {
      record = emailToRecord.get(normalizeEmail(lead.email))
    }

    // Se não encontrou pelo email, tentar pelo telefone
    if (!record && lead.phone) {
      record = phoneToRecord.get(normalizePhone(lead.phone))
    }

    if (record) {
      const updates: {
        plan?: PlanType
        packageType?: string
        addOns?: string
        value?: number
      } = {}

      // Atualizar plano
      updates.plan = record.plan
      stats.planosCorrigidos++
      planCounts[record.plan] = (planCounts[record.plan] || 0) + 1

      // Atualizar nome do pacote
      updates.packageType = record.pacote
      stats.pacotesCorrigidos++

      // Atualizar adicionais
      updates.addOns = record.adicionais
      stats.adicionaisCorrigidos++

      // Atualizar valor
      if (record.valor > 0) {
        updates.value = record.valor
        stats.valoresCorrigidos++
      }

      // Aplicar atualização
      await prisma.lead.update({
        where: { id: lead.id },
        data: updates
      })

      updated++
    } else {
      notFound++
    }
  }

  console.log(`✅ Atualização concluída!`)
  console.log(`   - Leads atualizados: ${updated}`)
  console.log(`   - Leads não encontrados nos CSVs: ${notFound}`)

  console.log(`\n📈 Detalhes das correções:`)
  console.log(`   - Planos corrigidos: ${stats.planosCorrigidos}`)
  console.log(`   - Pacotes corrigidos: ${stats.pacotesCorrigidos}`)
  console.log(`   - Adicionais corrigidos: ${stats.adicionaisCorrigidos}`)
  console.log(`   - Valores corrigidos: ${stats.valoresCorrigidos}`)

  console.log(`\n📊 Distribuição por plano:`)
  for (const [plan, count] of Object.entries(planCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`   - ${plan}: ${count}`)
  }

  // 4. Verificação final - mostrar amostra de leads atualizados
  console.log(`\n🔍 Amostra de leads após atualização:`)
  const sample = await prisma.lead.findMany({
    where: { deletedAt: null },
    take: 5,
    select: {
      name: true,
      plan: true,
      packageType: true,
      addOns: true,
      value: true
    }
  })

  for (const l of sample) {
    console.log(`   ${l.name}:`)
    console.log(`     - Plano: ${l.plan}`)
    console.log(`     - Pacote: ${l.packageType || 'N/A'}`)
    console.log(`     - Adicionais: ${l.addOns || 'Nenhum'}`)
    console.log(`     - Valor: R$ ${Number(l.value).toFixed(2)}`)
  }

  // 5. Verificação final por plano
  const finalCounts = await prisma.lead.groupBy({
    by: ['plan'],
    _count: { plan: true },
    where: { deletedAt: null }
  })

  console.log(`\n🔍 Verificação final - Leads por plano no banco:`)
  for (const c of finalCounts) {
    console.log(`   - ${c.plan}: ${c._count.plan}`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
