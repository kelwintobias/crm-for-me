import { PrismaClient, ContractSource, ContractPackage } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import { parse } from 'csv-parse/sync'

const prisma = new PrismaClient()

const DEFAULT_USER_ID = '428b527d-c4c9-4eb9-a3d1-9ac216500d52'

// Mapear nome do arquivo para mês/ano
const FILE_TO_MONTH: Record<string, { month: number; year: number }> = {
  'maio2025.csv': { month: 5, year: 2025 },
  'junho2025.csv': { month: 6, year: 2025 },
  'julho2025.csv': { month: 7, year: 2025 },
  'agosto2025.csv': { month: 8, year: 2025 },
  'setembro2025.csv': { month: 9, year: 2025 },
  'outubro2025.csv': { month: 10, year: 2025 },
  'novembro2025.csv': { month: 11, year: 2025 },
  'dezembro2025.csv': { month: 12, year: 2025 },
  'janeiro2026.csv': { month: 1, year: 2026 },
}

function mapOrigemToSource(origem: string): ContractSource {
  const origemNormalizada = origem.toLowerCase().trim()

  if (origemNormalizada === 'indicação' || origemNormalizada === 'indicacao') {
    return 'INDICACAO'
  }

  if (origemNormalizada.includes('video de influenciadores') ||
    origemNormalizada.includes('vídeo de influenciadores') ||
    origemNormalizada.includes('vídeos de influenciadores')) {
    return 'INFLUENCIADOR'
  }

  if (origemNormalizada.includes('página parceira') ||
    origemNormalizada.includes('pagina parceira')) {
    return 'PARCEIRO'
  }

  return 'ANUNCIO'
}

function mapPacote(pacoteCSV: string): ContractPackage {
  const lower = pacoteCSV.toLowerCase()

  if (lower.includes('evolution')) return 'EVOLUTION'
  if (lower.includes('ultra pro')) return 'ULTRA_PRO'
  if (lower.includes('pro plus')) return 'PRO_PLUS'
  if (lower.includes('elite')) return 'ELITE'
  if (lower.includes('avançado') || lower.includes('avancado')) return 'AVANCADO'
  if (lower.includes('intermediario') || lower.includes('intermediário')) return 'INTERMEDIARIO'
  if (lower.includes('essencial')) return 'INTERMEDIARIO'

  return 'INTERMEDIARIO'
}

function mapAdicionais(adicionaisCSV: string): string[] {
  if (!adicionaisCSV || adicionaisCSV.trim() === '' || adicionaisCSV.toLowerCase() === 'padrao') {
    return []
  }

  const addons: string[] = []
  const lower = adicionaisCSV.toLowerCase()

  if (lower.includes('upboost +') || lower.includes('upboost+')) {
    addons.push('UPBOOST_PLUS')
  }

  if (lower.includes('formatação padrão') || lower.includes('formatacao padrao')) {
    addons.push('FORMATACAO_PADRAO')
  }

  if (lower.includes('formatação profissional') || lower.includes('formatacao profissional')) {
    addons.push('FORMATACAO_PROFISSIONAL')
  }

  if (lower.includes('ativação do windows') || lower.includes('ativacao do windows')) {
    addons.push('ATIVACAO_WINDOWS')
  }

  if (lower.includes('remoção delay') || lower.includes('remocao delay')) {
    addons.push('REMOCAO_DELAY')
  }

  return addons
}

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

// Parsear data do CSV, mas garantir que o mês seja o do arquivo
function parseData(dataCSV: string, fileMonth: number, fileYear: number): Date {
  if (!dataCSV) return new Date(fileYear, fileMonth - 1, 1, 12, 0, 0)

  const match = dataCSV.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/)
  if (!match) return new Date(fileYear, fileMonth - 1, 1, 12, 0, 0)

  const [, dia, mes, ano, hora, minuto, segundo] = match
  const parsedMonth = parseInt(mes)
  const parsedYear = parseInt(ano)

  // Se a data do registro é de outro mês, ajustar para o mês do arquivo
  if (parsedMonth !== fileMonth || parsedYear !== fileYear) {
    // Usar o mesmo dia, mas no mês correto (do arquivo)
    const adjustedDay = Math.min(parseInt(dia), 28) // Garantir dia válido
    return new Date(
      fileYear,
      fileMonth - 1,
      adjustedDay,
      parseInt(hora),
      parseInt(minuto),
      parseInt(segundo)
    )
  }

  return new Date(
    parseInt(ano),
    parseInt(mes) - 1,
    parseInt(dia),
    parseInt(hora),
    parseInt(minuto),
    parseInt(segundo)
  )
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

async function main() {
  console.log('🚀 Iniciando importação de contratos (corrigida)...\n')

  // 1. Limpar contratos existentes
  console.log('🗑️  Removendo contratos existentes...')
  const deleted = await prisma.contract.deleteMany({})
  console.log(`   Removidos: ${deleted.count} contratos\n`)

  // 2. Ler todos os CSVs
  const csvDir = path.join(process.cwd(), 'dbantigodocliente')
  const csvFiles = fs.readdirSync(csvDir).filter(f => f.endsWith('.csv'))

  let totalImportados = 0
  let totalErros = 0
  let datasAjustadas = 0
  const totaisPorMes: Record<string, { count: number; valor: number }> = {}

  for (const file of csvFiles) {
    const fileInfo = FILE_TO_MONTH[file]
    if (!fileInfo) {
      console.log(`⚠️  Arquivo ignorado (não mapeado): ${file}`)
      continue
    }

    const filePath = path.join(csvDir, file)
    const content = fs.readFileSync(filePath, 'utf-8')

    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    })

    console.log(`📄 Processando ${file}: ${records.length} registros`)
    let fileTotal = 0

    for (const row of records as any[]) {
      try {
        const data = row['DATA'] || ''
        const email = row['EMAIL '] || row['EMAIL'] || ''
        const nome = row['NOME'] || ''
        const whatsapp = row['WHATSAPP'] || ''
        const instagram = row['INSTAGRAM'] || ''
        const cpf = row['CPF'] || ''
        const pacote = row['PACOTE ADQUIRIDO '] || row['PACOTE ADQUIRIDO'] || ''
        const adicionais = row['ADICIONAIS'] || ''
        const declaracao = row['DECLARAÇÃO '] || row['DECLARAÇÃO'] || ''
        const origem = row['ORIGEM'] || ''
        const valor = row['VALOR'] || ''

        if (!nome || !whatsapp) {
          continue
        }

        // Parsear data original para verificar se precisa ajuste
        const originalMatch = data.match(/(\d{2})\/(\d{2})\/(\d{4})/)
        const originalMonth = originalMatch ? parseInt(originalMatch[2]) : fileInfo.month
        const originalYear = originalMatch ? parseInt(originalMatch[3]) : fileInfo.year

        if (originalMonth !== fileInfo.month || originalYear !== fileInfo.year) {
          datasAjustadas++
        }

        const contractDate = parseData(data, fileInfo.month, fileInfo.year)
        const totalValue = parseValor(valor)
        fileTotal += totalValue

        await prisma.contract.create({
          data: {
            clientName: nome.trim(),
            email: email.trim() || null,
            whatsapp: normalizePhone(whatsapp),
            instagram: instagram.trim() || null,
            cpf: cpf.trim() || null,
            contractDate,
            source: mapOrigemToSource(origem),
            package: mapPacote(pacote),
            addons: mapAdicionais(adicionais),
            termsAccepted: declaracao.toLowerCase().includes('aceito'),
            totalValue,
            userId: DEFAULT_USER_ID
          }
        })

        totalImportados++

        // Acumular totais por mês (usando o mês do arquivo)
        const mesAno = `${String(fileInfo.month).padStart(2, '0')}/${fileInfo.year}`
        if (!totaisPorMes[mesAno]) {
          totaisPorMes[mesAno] = { count: 0, valor: 0 }
        }
        totaisPorMes[mesAno].count++
        totaisPorMes[mesAno].valor += totalValue

      } catch (err) {
        totalErros++
        console.error(`   Erro ao importar registro: ${err}`)
      }
    }

    console.log(`   Total do arquivo: R$ ${fileTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
  }

  console.log(`\n✅ Importação concluída!`)
  console.log(`   - Total importados: ${totalImportados}`)
  console.log(`   - Datas ajustadas: ${datasAjustadas}`)
  console.log(`   - Erros: ${totalErros}`)

  // 3. Exibir totais por mês
  console.log(`\n📊 Totais por mês:`)

  const mesesOrdenados = Object.keys(totaisPorMes).sort((a, b) => {
    const [mesA, anoA] = a.split('/')
    const [mesB, anoB] = b.split('/')
    return parseInt(anoA + mesA) - parseInt(anoB + mesB)
  })

  const nomeMeses: Record<string, string> = {
    '01': 'Janeiro',
    '02': 'Fevereiro',
    '03': 'Março',
    '04': 'Abril',
    '05': 'Maio',
    '06': 'Junho',
    '07': 'Julho',
    '08': 'Agosto',
    '09': 'Setembro',
    '10': 'Outubro',
    '11': 'Novembro',
    '12': 'Dezembro'
  }

  // Valores esperados
  const esperados: Record<string, number> = {
    '05/2025': 7696.90,
    '06/2025': 9885.00,
    '07/2025': 9760.00,
    '08/2025': 10520.00,
    '09/2025': 16870.00,
    '10/2025': 15181.00,
    '11/2025': 12463.00,
    '12/2025': 31007.00,
    '01/2026': 8185.00,
  }

  for (const mesAno of mesesOrdenados) {
    const [mes, ano] = mesAno.split('/')
    const stats = totaisPorMes[mesAno]
    const esperado = esperados[mesAno]
    const diferenca = Math.abs(stats.valor - esperado)
    const status = diferenca < 1 ? '✓' : `⚠️ (esperado: R$ ${esperado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`

    console.log(`   ${nomeMeses[mes]} ${ano}: R$ ${stats.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${stats.count} contratos) ${status}`)
  }

  // 4. Total geral
  const totalGeral = await prisma.contract.aggregate({
    _sum: { totalValue: true },
    _count: true
  })

  console.log(`\n💰 TOTAL GERAL: ${totalGeral._count} contratos | R$ ${Number(totalGeral._sum.totalValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
