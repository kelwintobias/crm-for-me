import { PrismaClient, ContractSource, ContractPackage } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import { parse } from 'csv-parse/sync'

const prisma = new PrismaClient()

// ID do usuário padrão para associar os contratos
const DEFAULT_USER_ID = '428b527d-c4c9-4eb9-a3d1-9ac216500d52' // kelwin

// Mapeamento de origens do CSV para enum ContractSource
function mapOrigemToSource(origem: string): ContractSource {
  const origemNormalizada = origem.toLowerCase().trim()

  // Indicação
  if (origemNormalizada === 'indicação' || origemNormalizada === 'indicacao') {
    return 'INDICACAO'
  }

  // Influenciador (Vídeo de influenciadores = Influencer)
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

  // Anúncio nas redes sociais da UPBOOST = Anúncio
  // E todas as outras campanhas de ads
  return 'ANUNCIO'
}

// Mapeamento de pacotes do CSV para o enum ContractPackage
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

// Mapear adicionais do CSV para formato do sistema
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

// Parsear data do CSV (ex: "02/07/2025 16:37:29" -> Date)
function parseData(dataCSV: string): Date {
  if (!dataCSV) return new Date()

  const match = dataCSV.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/)
  if (!match) return new Date()

  const [, dia, mes, ano, hora, minuto, segundo] = match
  return new Date(
    parseInt(ano),
    parseInt(mes) - 1,
    parseInt(dia),
    parseInt(hora),
    parseInt(minuto),
    parseInt(segundo)
  )
}

// Normalizar telefone
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

async function main() {
  console.log('🚀 Iniciando importação de contratos...\n')

  // 1. Limpar contratos existentes
  console.log('🗑️  Removendo contratos existentes...')
  const deleted = await prisma.contract.deleteMany({})
  console.log(`   Removidos: ${deleted.count} contratos\n`)

  // 2. Ler todos os CSVs
  const csvDir = path.join(process.cwd(), 'dbantigodocliente')
  const csvFiles = fs.readdirSync(csvDir).filter(f => f.endsWith('.csv'))

  console.log(`📁 Arquivos CSV encontrados: ${csvFiles.length}`)
  csvFiles.forEach(f => console.log(`   - ${f}`))
  console.log()

  let totalImportados = 0
  let totalErros = 0
  const totaisPorMes: Record<string, { count: number; valor: number }> = {}

  for (const file of csvFiles) {
    const filePath = path.join(csvDir, file)
    const content = fs.readFileSync(filePath, 'utf-8')

    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    })

    console.log(`📄 Processando ${file}: ${records.length} registros`)

    for (const row of records) {
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

        // Ignorar registros sem dados essenciais
        if (!nome || !whatsapp) {
          continue
        }

        const contractDate = parseData(data)
        const totalValue = parseValor(valor)

        // Criar contrato
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

        // Acumular totais por mês
        const mesAno = `${String(contractDate.getMonth() + 1).padStart(2, '0')}/${contractDate.getFullYear()}`
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
  }

  console.log(`\n✅ Importação concluída!`)
  console.log(`   - Total importados: ${totalImportados}`)
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

  for (const mesAno of mesesOrdenados) {
    const [mes, ano] = mesAno.split('/')
    const stats = totaisPorMes[mesAno]
    console.log(`   ${nomeMeses[mes]} ${ano}: R$ ${stats.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${stats.count} contratos)`)
  }

  // 4. Verificação final
  const totalGeral = await prisma.contract.aggregate({
    _sum: { totalValue: true },
    _count: true
  })

  console.log(`\n💰 TOTAL GERAL: ${totalGeral._count} contratos | R$ ${Number(totalGeral._sum.totalValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)

  // 5. Verificar distribuição por origem
  const porOrigem = await prisma.contract.groupBy({
    by: ['source'],
    _count: { source: true }
  })

  console.log(`\n📈 Distribuição por origem:`)
  for (const o of porOrigem) {
    console.log(`   - ${o.source}: ${o._count.source}`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
