import { PrismaClient, ContractPackage } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import { parse } from 'csv-parse/sync'

const prisma = new PrismaClient()

// Mapeamento de adicionais do CSV para o sistema
function mapAdicionais(adicionaisCSV: string): string[] {
  if (!adicionaisCSV || adicionaisCSV.trim() === '') {
    return []
  }

  const addons: string[] = []
  const lower = adicionaisCSV.toLowerCase()

  // UPBOOST+ (R$29,90)
  if (lower.includes('upboost +') || lower.includes('upboost+')) {
    addons.push('UPBOOST_PLUS')
  }

  // Formatação Padrão (R$59,90)
  if (lower.includes('formatação padrão') || lower.includes('formatacao padrao')) {
    addons.push('FORMATACAO_PADRAO')
  }

  // Formatação Profissional (R$99,90)
  if (lower.includes('formatação profissional') || lower.includes('formatacao profissional')) {
    addons.push('FORMATACAO_PROFISSIONAL')
  }

  // Ativação do Windows (R$19,90)
  if (lower.includes('ativação do windows') || lower.includes('ativacao do windows')) {
    addons.push('ATIVACAO_WINDOWS')
  }

  // Remoção Delay (R$35,90)
  if (lower.includes('remoção delay') || lower.includes('remocao delay')) {
    addons.push('REMOCAO_DELAY')
  }

  return addons
}

// Mapeamento de pacotes do CSV para o enum
function mapPacote(pacoteCSV: string): ContractPackage {
  const lower = pacoteCSV.toLowerCase()

  if (lower.includes('evolution')) return 'EVOLUTION'
  if (lower.includes('ultra pro')) return 'ULTRA_PRO'
  if (lower.includes('pro plus')) return 'PRO_PLUS'
  if (lower.includes('elite')) return 'ELITE'
  if (lower.includes('avançado') || lower.includes('avancado')) return 'AVANCADO'
  if (lower.includes('intermediario') || lower.includes('intermediário')) return 'INTERMEDIARIO'

  // Default
  return 'INTERMEDIARIO'
}

// Parsear valor do CSV (ex: "R$ 150,00" -> 150.00)
function parseValor(valorCSV: string): number {
  if (!valorCSV) return 0

  // Remove "R$", espaços e converte vírgula para ponto
  const cleaned = valorCSV
    .replace(/R\$\s*/gi, '')
    .replace(/\./g, '') // Remove pontos de milhar
    .replace(',', '.') // Converte vírgula decimal para ponto
    .trim()

  const valor = parseFloat(cleaned)
  return isNaN(valor) ? 0 : valor
}

// Parsear data do CSV (ex: "02/07/2025 16:37:29" -> Date)
function parseData(dataCSV: string): Date | null {
  if (!dataCSV) return null

  // Formato: DD/MM/YYYY HH:MM:SS
  const match = dataCSV.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/)
  if (!match) return null

  const [, dia, mes, ano, hora, minuto, segundo] = match
  return new Date(
    parseInt(ano),
    parseInt(mes) - 1, // Mês é 0-indexed em JS
    parseInt(dia),
    parseInt(hora),
    parseInt(minuto),
    parseInt(segundo)
  )
}

// Normaliza telefone para comparação
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').replace(/^55/, '')
}

// Normaliza email para comparação
function normalizeEmail(email: string): string {
  return email.toLowerCase().trim()
}

interface CSVRow {
  'EMAIL '?: string
  'EMAIL'?: string
  'WHATSAPP'?: string
  'DATA'?: string
  'PACOTE ADQUIRIDO '?: string
  'PACOTE ADQUIRIDO'?: string
  'ADICIONAIS'?: string
  'VALOR'?: string
  [key: string]: string | undefined
}

interface CSVRecord {
  email: string
  phone: string
  data: Date | null
  pacote: ContractPackage
  adicionais: string[]
  valor: number
  rawData: string
  rawPacote: string
  rawAdicionais: string
  rawValor: string
}

async function main() {
  console.log('🚀 Iniciando correção dos detalhes dos contratos...\n')

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
    }) as CSVRow[]

    for (const row of records) {
      const email = row['EMAIL '] || row['EMAIL'] || ''
      const phone = row['WHATSAPP'] || ''
      const rawData = row['DATA'] || ''
      const rawPacote = row['PACOTE ADQUIRIDO '] || row['PACOTE ADQUIRIDO'] || ''
      const rawAdicionais = row['ADICIONAIS'] || ''
      const rawValor = row['VALOR'] || ''

      const record: CSVRecord = {
        email: normalizeEmail(email),
        phone: normalizePhone(phone),
        data: parseData(rawData),
        pacote: mapPacote(rawPacote),
        adicionais: mapAdicionais(rawAdicionais),
        valor: parseValor(rawValor),
        rawData,
        rawPacote,
        rawAdicionais,
        rawValor
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

  // 2. Buscar todos os contratos no banco
  const contracts = await prisma.contract.findMany({
    select: {
      id: true,
      email: true,
      whatsapp: true,
      clientName: true,
      contractDate: true,
      package: true,
      addons: true,
      totalValue: true
    }
  })

  console.log(`📋 Contratos no banco de dados: ${contracts.length}\n`)

  // 3. Atualizar cada contrato
  let updated = 0
  let notFound = 0
  let errors = 0

  const stats = {
    datasCorrigidas: 0,
    adicionaisCorrigidos: 0,
    valoresCorrigidos: 0,
    pacotesCorrigidos: 0
  }

  for (const contract of contracts) {
    let record: CSVRecord | undefined

    // Tentar encontrar pelo email primeiro
    if (contract.email) {
      record = emailToRecord.get(normalizeEmail(contract.email))
    }

    // Se não encontrou pelo email, tentar pelo telefone
    if (!record && contract.whatsapp) {
      record = phoneToRecord.get(normalizePhone(contract.whatsapp))
    }

    if (record) {
      try {
        const updates: {
          contractDate?: Date
          package?: ContractPackage
          addons?: string[]
          totalValue?: number
        } = {}

        // Atualizar data se disponível
        if (record.data) {
          updates.contractDate = record.data
          stats.datasCorrigidas++
        }

        // Atualizar pacote
        if (record.pacote !== contract.package) {
          updates.package = record.pacote
          stats.pacotesCorrigidos++
        }

        // Atualizar adicionais
        updates.addons = record.adicionais
        stats.adicionaisCorrigidos++

        // Atualizar valor
        if (record.valor > 0) {
          updates.totalValue = record.valor
          stats.valoresCorrigidos++
        }

        // Aplicar atualização
        await prisma.contract.update({
          where: { id: contract.id },
          data: updates
        })

        updated++
      } catch (err) {
        console.error(`Erro ao atualizar contrato ${contract.clientName}:`, err)
        errors++
      }
    } else {
      notFound++
    }
  }

  console.log(`✅ Atualização concluída!`)
  console.log(`   - Contratos atualizados: ${updated}`)
  console.log(`   - Contratos não encontrados nos CSVs: ${notFound}`)
  console.log(`   - Erros: ${errors}`)

  console.log(`\n📈 Detalhes das correções:`)
  console.log(`   - Datas corrigidas: ${stats.datasCorrigidas}`)
  console.log(`   - Pacotes corrigidos: ${stats.pacotesCorrigidos}`)
  console.log(`   - Adicionais corrigidos: ${stats.adicionaisCorrigidos}`)
  console.log(`   - Valores corrigidos: ${stats.valoresCorrigidos}`)

  // 4. Verificação final - mostrar amostra de contratos atualizados
  console.log(`\n🔍 Amostra de contratos após atualização:`)
  const sample = await prisma.contract.findMany({
    take: 5,
    select: {
      clientName: true,
      contractDate: true,
      package: true,
      addons: true,
      totalValue: true
    }
  })

  for (const c of sample) {
    console.log(`   ${c.clientName}:`)
    console.log(`     - Data: ${c.contractDate?.toLocaleDateString('pt-BR')}`)
    console.log(`     - Pacote: ${c.package}`)
    console.log(`     - Adicionais: ${c.addons.length > 0 ? c.addons.join(', ') : 'Nenhum'}`)
    console.log(`     - Valor: R$ ${Number(c.totalValue).toFixed(2)}`)
  }

  // 5. Estatísticas finais por pacote
  const packageCounts = await prisma.contract.groupBy({
    by: ['package'],
    _count: { package: true },
    _sum: { totalValue: true }
  })

  console.log(`\n📊 Resumo final por pacote:`)
  for (const p of packageCounts) {
    console.log(`   - ${p.package}: ${p._count.package} contratos | Total: R$ ${Number(p._sum.totalValue || 0).toFixed(2)}`)
  }

  // Total geral
  const totalGeral = await prisma.contract.aggregate({
    _sum: { totalValue: true },
    _count: true
  })
  console.log(`\n💰 TOTAL GERAL: ${totalGeral._count} contratos | R$ ${Number(totalGeral._sum.totalValue || 0).toFixed(2)}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
