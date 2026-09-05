import { loadPdfJs, loadXlsx } from './cdnLoaders'
import { parseCsvText, parseTableRows } from './csvTableParser'
import { parseSicoobText } from './sicoobParser'
import { ExtratoParseResult } from './types'

export interface ProcessFileOptions {
  anoFallback?: number
  categoriasCadastradas?: Array<{ nome: string; tipo: string; ativo?: boolean }>
}

/**
 * Extrai texto completo de um arquivo PDF usando PDF.js
 */
async function extractTextFromPdf(file: File): Promise<string> {
  const pdfjsLib = await loadPdfJs()
  const arrayBuffer = await file.arrayBuffer()

  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
  const pdfDoc = await loadingTask.promise

  const numPages = pdfDoc.numPages
  const fullLines: string[] = []

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum)
    const textContent = await page.getTextContent()

    // Ordenar itens por coordenada vertical Y decrescente e horizontal X crescente para manter ordem de leitura
    const items = (textContent.items || []) as any[]

    // Agrupar itens que estão na mesma linha Y (com margem de ~3px)
    const lineBuckets: { y: number; text: string }[] = []

    for (const item of items) {
      const str = item.str || ''
      if (!str.trim() && str !== ' ') continue

      const y = item.transform ? Math.round(item.transform[5]) : 0

      // Procurar bucket de linha existente próximo
      const bucket = lineBuckets.find((b) => Math.abs(b.y - y) <= 3)
      if (bucket) {
        bucket.text += (bucket.text.endsWith(' ') || str.startsWith(' ') ? '' : ' ') + str
      } else {
        lineBuckets.push({ y, text: str })
      }
    }

    // Ordenar por Y decrescente (topo para base da página)
    lineBuckets.sort((a, b) => b.y - a.y)

    for (const lb of lineBuckets) {
      const clean = lb.text.trim()
      if (clean) fullLines.push(clean)
    }
  }

  return fullLines.join('\n')
}

/**
 * Lê arquivo Excel (.xlsx, .xls) usando SheetJS
 */
async function parseExcelFile(
  file: File,
  anoFallback?: number,
  categoriasCadastradas?: Array<{ nome: string; tipo: string; ativo?: boolean }>,
): Promise<ExtratoParseResult> {
  const XLSX = await loadXlsx()
  const arrayBuffer = await file.arrayBuffer()
  const workbook = XLSX.read(arrayBuffer, { type: 'array' })

  const firstSheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[firstSheetName]

  // Converte planilha para matriz de strings 2D
  const rows = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    raw: false,
  }) as string[][]

  return parseTableRows(rows, 'GENERICO_EXCEL', undefined, anoFallback, categoriasCadastradas)
}

/**
 * Processador principal que recebe qualquer arquivo suportado (PDF, CSV, XLSX, XLS)
 */
export async function processExtratoFile(
  file: File,
  options?: ProcessFileOptions,
): Promise<ExtratoParseResult> {
  const fileName = file.name.toLowerCase()
  const anoFallback = options?.anoFallback || new Date().getFullYear()

  // 1. Arquivo PDF
  if (fileName.endsWith('.pdf') || file.type === 'application/pdf') {
    try {
      const extractedText = await extractTextFromPdf(file)

      if (!extractedText || extractedText.trim().length === 0) {
        return {
          bancoDetectado: 'DESCONHECIDO',
          itens: [],
          totalEntradas: 0,
          totalSaidas: 0,
          qtdEntradas: 0,
          qtdSaidas: 0,
          avisos: [
            'O PDF parece ser uma imagem digitalizada (scanner) ou não contém texto legível.',
            'Por favor, utilize a versão digital emitida diretamente pelo internet banking SICOOB.',
          ],
        }
      }

      // Tenta parser SICOOB (foco principal do sistema)
      const sicoobResult = parseSicoobText(
        extractedText,
        anoFallback,
        options?.categoriasCadastradas,
      )

      if (sicoobResult.itens.length > 0) {
        return sicoobResult
      }

      // Se falhou SICOOB, tenta parser genérico linha a linha
      const lines = extractedText.split('\n').map((l) => [l])
      const fallbackResult = parseTableRows(
        lines,
        'GENERICO_CSV',
        undefined,
        anoFallback,
        options?.categoriasCadastradas,
      )

      if (fallbackResult.itens.length > 0) {
        return fallbackResult
      }

      return {
        bancoDetectado: 'DESCONHECIDO',
        itens: [],
        totalEntradas: 0,
        totalSaidas: 0,
        qtdEntradas: 0,
        qtdSaidas: 0,
        avisos: [
          'Não foi possível encontrar linhas de movimentação no formato esperado do extrato bancário SICOOB.',
          'Verifique se o arquivo corresponde ao Extrato de Conta Corrente SICOOB SISBR.',
        ],
      }
    } catch (err: any) {
      console.error('Erro ao ler PDF:', err)
      return {
        bancoDetectado: 'DESCONHECIDO',
        itens: [],
        totalEntradas: 0,
        totalSaidas: 0,
        qtdEntradas: 0,
        qtdSaidas: 0,
        avisos: [`Falha ao processar arquivo PDF: ${err?.message || 'Erro desconhecido'}`],
      }
    }
  }

  // 2. Arquivo CSV / TXT
  if (fileName.endsWith('.csv') || fileName.endsWith('.txt') || file.type.includes('csv')) {
    try {
      const text = await file.text()
      // Verificar se é texto puro do extrato SICOOB colado
      if (text.includes('SICOOB') || text.includes('SISBR')) {
        const sicoobRes = parseSicoobText(text, anoFallback, options?.categoriasCadastradas)
        if (sicoobRes.itens.length > 0) return sicoobRes
      }
      return parseCsvText(text, anoFallback, options?.categoriasCadastradas)
    } catch (err: any) {
      return {
        bancoDetectado: 'GENERICO_CSV',
        itens: [],
        totalEntradas: 0,
        totalSaidas: 0,
        qtdEntradas: 0,
        qtdSaidas: 0,
        avisos: [`Erro ao ler arquivo CSV: ${err?.message || 'Arquivo inválido'}`],
      }
    }
  }

  // 3. Arquivo Excel (.xlsx, .xls)
  if (
    fileName.endsWith('.xlsx') ||
    fileName.endsWith('.xls') ||
    file.type.includes('spreadsheet')
  ) {
    try {
      return await parseExcelFile(file, anoFallback, options?.categoriasCadastradas)
    } catch (err: any) {
      return {
        bancoDetectado: 'GENERICO_EXCEL',
        itens: [],
        totalEntradas: 0,
        totalSaidas: 0,
        qtdEntradas: 0,
        qtdSaidas: 0,
        avisos: [`Erro ao processar planilha Excel: ${err?.message || 'Arquivo corrompido'}`],
      }
    }
  }

  return {
    bancoDetectado: 'DESCONHECIDO',
    itens: [],
    totalEntradas: 0,
    totalSaidas: 0,
    qtdEntradas: 0,
    qtdSaidas: 0,
    avisos: [
      'Formato de arquivo não suportado. Por favor, envie um arquivo em PDF, CSV ou Excel (.xlsx).',
    ],
  }
}
