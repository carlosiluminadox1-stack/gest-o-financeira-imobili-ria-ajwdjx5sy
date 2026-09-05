import { ExtratoItemRaw, ExtratoParseResult, parseValorPtBr, sugerirCategoria } from './types'

export interface ColumnMapping {
  colData: number // índice da coluna de data
  colDescricao: number // índice da coluna de descrição
  colValor?: number // índice se houver coluna única de valor (+ / - ou com D/C)
  colEntrada?: number // índice da coluna de crédito / entrada
  colSaida?: number // índice da coluna de débito / saída
  colDocumento?: number
}

/**
 * Tenta inferir o mapeamento de colunas com base no cabeçalho
 */
export function inferColumnMapping(headers: string[]): ColumnMapping {
  let colData = -1
  let colDescricao = -1
  let colValor = -1
  let colEntrada = -1
  let colSaida = -1
  let colDocumento = -1

  headers.forEach((h, idx) => {
    const clean = (h || '').toLowerCase().trim()

    if (colData === -1 && (clean.includes('data') || clean.includes('date') || clean === 'dt')) {
      colData = idx
    } else if (
      colDescricao === -1 &&
      (clean.includes('descri') ||
        clean.includes('hist') ||
        clean.includes('detalhe') ||
        clean.includes('memo') ||
        clean.includes('lancamento') ||
        clean.includes('lançamento'))
    ) {
      colDescricao = idx
    } else if (
      colEntrada === -1 &&
      (clean.includes('credito') ||
        clean.includes('crédito') ||
        clean.includes('entrada') ||
        clean === 'recebimento')
    ) {
      colEntrada = idx
    } else if (
      colSaida === -1 &&
      (clean.includes('debito') ||
        clean.includes('débito') ||
        clean.includes('saida') ||
        clean.includes('saída') ||
        clean === 'pagamento')
    ) {
      colSaida = idx
    } else if (
      colValor === -1 &&
      (clean.includes('valor') || clean.includes('amount') || clean === 'val')
    ) {
      colValor = idx
    } else if (
      colDocumento === -1 &&
      (clean.includes('doc') || clean.includes('num') || clean.includes('ident'))
    ) {
      colDocumento = idx
    }
  })

  // Se não achou por nomes clássicos, usa posições padrão (0: data, 1: descrição, 2: valor)
  if (colData === -1) colData = 0
  if (colDescricao === -1) colDescricao = headers.length > 1 ? 1 : 0
  if (colValor === -1 && colEntrada === -1 && colSaida === -1) {
    colValor = headers.length > 2 ? 2 : 1
  }

  return {
    colData,
    colDescricao,
    colValor: colValor !== -1 ? colValor : undefined,
    colEntrada: colEntrada !== -1 ? colEntrada : undefined,
    colSaida: colSaida !== -1 ? colSaida : undefined,
    colDocumento: colDocumento !== -1 ? colDocumento : undefined,
  }
}

/**
 * Normaliza qualquer data (DD/MM/YYYY, YYYY-MM-DD, DD/MM, etc.) para ISO YYYY-MM-DD
 */
export function normalizeDate(
  dateRaw: string,
  anoFallback?: number,
): { iso: string; display: string } {
  const clean = (dateRaw || '').trim()
  const currentYear = anoFallback || new Date().getFullYear()

  // Se for DD/MM/YYYY
  const ddmmyyyy = clean.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/)
  if (ddmmyyyy) {
    const dia = ddmmyyyy[1].padStart(2, '0')
    const mes = ddmmyyyy[2].padStart(2, '0')
    const ano = ddmmyyyy[3]
    return {
      iso: `${ano}-${mes}-${dia}`,
      display: `${dia}/${mes}/${ano}`,
    }
  }

  // Se for YYYY-MM-DD
  const yyyymmdd = clean.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/)
  if (yyyymmdd) {
    const ano = yyyymmdd[1]
    const mes = yyyymmdd[2].padStart(2, '0')
    const dia = yyyymmdd[3].padStart(2, '0')
    return {
      iso: `${ano}-${mes}-${dia}`,
      display: `${dia}/${mes}/${ano}`,
    }
  }

  // Se for DD/MM
  const ddmm = clean.match(/^(\d{1,2})[/\-.](\d{1,2})$/)
  if (ddmm) {
    const dia = ddmm[1].padStart(2, '0')
    const mes = ddmm[2].padStart(2, '0')
    return {
      iso: `${currentYear}-${mes}-${dia}`,
      display: `${dia}/${mes}`,
    }
  }

  // Fallback: tentar Date parse
  const parsed = new Date(clean)
  if (!isNaN(parsed.getTime())) {
    const iso = parsed.toISOString().split('T')[0]
    return { iso, display: clean }
  }

  // Default hoje
  const today = new Date().toISOString().split('T')[0]
  return { iso: today, display: clean || today }
}

/**
 * Parser para matriz de linhas (provenientes de CSV ou planilha Excel)
 */
export function parseTableRows(
  rows: string[][],
  tipoOrigem: 'GENERICO_CSV' | 'GENERICO_EXCEL',
  mapping?: ColumnMapping,
  anoFallback?: number,
): ExtratoParseResult {
  if (!rows || rows.length === 0) {
    return {
      bancoDetectado: tipoOrigem,
      itens: [],
      totalEntradas: 0,
      totalSaidas: 0,
      qtdEntradas: 0,
      qtdSaidas: 0,
      avisos: ['Arquivo vazio ou sem linhas de dados.'],
    }
  }

  // Encontrar cabeçalho (primeira linha com mais de uma coluna preenchida)
  let headerIndex = 0
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const nonEmpty = rows[i].filter((c) => (c || '').trim().length > 0)
    if (nonEmpty.length >= 2) {
      headerIndex = i
      break
    }
  }

  const headerRow = rows[headerIndex] || []
  const colMap = mapping || inferColumnMapping(headerRow)

  const itens: ExtratoItemRaw[] = []
  const avisos: string[] = []

  // Processar linhas subsequentes
  for (let r = headerIndex + 1; r < rows.length; r++) {
    const row = rows[r]
    if (!row || row.length === 0) continue

    const dataCell = row[colMap.colData]?.trim()
    const descCell = row[colMap.colDescricao]?.trim()
    if (!dataCell && !descCell) continue

    // Ignorar linhas de saldo ou totais
    if (
      /saldo/i.test(descCell || '') ||
      /total/i.test(descCell || '') ||
      /subtotal/i.test(descCell || '')
    ) {
      continue
    }

    let valor = 0
    let tipo: 'entrada' | 'saida' = 'saida'
    let sinal: 'C' | 'D' = 'D'

    // Se temos colunas separadas de crédito e débito
    if (colMap.colEntrada !== undefined && colMap.colSaida !== undefined) {
      const valEntrada = parseValorPtBr(row[colMap.colEntrada] || '')
      const valSaida = parseValorPtBr(row[colMap.colSaida] || '')

      if (valEntrada > 0) {
        valor = valEntrada
        tipo = 'entrada'
        sinal = 'C'
      } else if (valSaida > 0) {
        valor = valSaida
        tipo = 'saida'
        sinal = 'D'
      } else {
        continue // linha sem valor
      }
    } else if (colMap.colValor !== undefined) {
      const rawValorStr = row[colMap.colValor] || ''
      const isNegative = rawValorStr.includes('-')
      const endsWithD = /D$/i.test(rawValorStr.trim())
      const endsWithC = /C$/i.test(rawValorStr.trim())

      valor = parseValorPtBr(rawValorStr)
      if (valor === 0) continue

      if (endsWithC) {
        tipo = 'entrada'
        sinal = 'C'
      } else if (endsWithD || isNegative) {
        tipo = 'saida'
        sinal = 'D'
      } else {
        // Se for positivo sem sinal explícito, tenta deduzir pela descrição ou padrão entrada
        const isExpense = /pag|deb|tar|taxa|imposto|compra|saque/i.test(descCell || '')
        tipo = isExpense ? 'saida' : 'entrada'
        sinal = tipo === 'entrada' ? 'C' : 'D'
      }
    }

    const { iso, display } = normalizeDate(dataCell || '', anoFallback)
    const descricao = descCell || 'Lançamento sem descrição'
    const doc = colMap.colDocumento !== undefined ? row[colMap.colDocumento]?.trim() : undefined
    const categoria = sugerirCategoria(descricao, tipo)

    itens.push({
      id: `${tipoOrigem.toLowerCase()}-${r}-${Date.now()}`,
      dataStr: display,
      dataIso: iso,
      descricao,
      valor,
      tipo,
      sinal,
      documento: doc,
      categoriaSugerida: categoria,
      status: 'Pago',
      selecionado: true,
      isDuplicado: false,
    })
  }

  const qtdEntradas = itens.filter((it) => it.tipo === 'entrada').length
  const qtdSaidas = itens.filter((it) => it.tipo === 'saida').length
  const totalEntradas = itens
    .filter((it) => it.tipo === 'entrada')
    .reduce((sum, it) => sum + it.valor, 0)
  const totalSaidas = itens
    .filter((it) => it.tipo === 'saida')
    .reduce((sum, it) => sum + it.valor, 0)

  return {
    bancoDetectado: tipoOrigem,
    itens,
    totalEntradas: Math.round(totalEntradas * 100) / 100,
    totalSaidas: Math.round(totalSaidas * 100) / 100,
    qtdEntradas,
    qtdSaidas,
    avisos,
  }
}

/**
 * Parser de texto CSV (suporta delimitadores vírgula, ponto-e-vírgula e tab)
 */
export function parseCsvText(csvText: string, anoFallback?: number): ExtratoParseResult {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length === 0) {
    return {
      bancoDetectado: 'GENERICO_CSV',
      itens: [],
      totalEntradas: 0,
      totalSaidas: 0,
      qtdEntradas: 0,
      qtdSaidas: 0,
      avisos: ['Arquivo CSV vazio.'],
    }
  }

  // Detectar delimitador mais frequente na primeira linha
  const firstLine = lines[0]
  const commas = (firstLine.match(/,/g) || []).length
  const semicolons = (firstLine.match(/;/g) || []).length
  const tabs = (firstLine.match(/\t/g) || []).length

  let delimiter = ';'
  if (tabs > semicolons && tabs > commas) delimiter = '\t'
  else if (commas > semicolons) delimiter = ','

  const rows: string[][] = []

  for (const line of lines) {
    // Parser de linha CSV com tratamento básico de aspas
    const cells: string[] = []
    let curCell = ''
    let inQuotes = false

    for (let c = 0; c < line.length; c++) {
      const char = line[c]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === delimiter && !inQuotes) {
        cells.push(curCell.trim())
        curCell = ''
      } else {
        curCell += char
      }
    }
    cells.push(curCell.trim())
    rows.push(cells)
  }

  return parseTableRows(rows, 'GENERICO_CSV', undefined, anoFallback)
}
