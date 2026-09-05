import { ExtratoItemRaw, ExtratoParseResult, parseValorPtBr, sugerirCategoria } from './types'

/**
 * Expressões regulares e padrões para identificar linhas do extrato SICOOB (SISBR):
 * Ex: "02/01 TAR.MANUT.CTA ATIVA 40,00D"
 * Ex: "05/01 PIX REC.OUTRA IF MT 81,00C"
 * Ex: "20/01 CRED.PROM. PGTO.BOL 0,40C"
 * Ex: "20/01 DEB.PARC.SUBS/INTEG 0,10D"
 */
const TRANSACTION_LINE_REGEX = /^(\d{2}\/\d{2})\s+(.+?)\s+([\d.,]+)([CD])$/i

/**
 * Linhas de saldo ou ignoradas que combinam com o padrão de data + texto + valor,
 * mas NÃO são movimentações financeiras da empresa
 */
const IGNORE_PATTERNS = [
  /SALDO ANTERIOR/i,
  /SALDO BLOQ\.ANTERIOR/i,
  /SALDO DO DIA/i,
  /SALDO BLOQUEADO/i,
  /SALDO DISPON/i,
  /SALDO EM CONTA/i,
  /CHEQUE ESPECIAL/i,
]

/**
 * Seção de corte: a partir de "RESUMO" ou "ENCARGOS" tudo deve ser descartado
 */
const STOP_PATTERNS = [
  /^RESUMO$/i,
  /^\(\+\) SALDO EM CONTA/i,
  /^ENCARGOS VENCIDOS/i,
  /^ENCARGOS A VENCER/i,
  /^OUTRAS INFORMA/i,
  /EXTRATOS EMITIDOS AT/i,
  /^SAC:\s*0800/i,
  /^OUVIDORIA SICOOB/i,
]

export function parseSicoobText(fullText: string, anoFallback?: number): ExtratoParseResult {
  const lines = fullText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  let anoInferido = anoFallback || new Date().getFullYear()
  let conta = ''
  let empresa = ''
  let dataInicio = ''
  let dataFim = ''
  const avisos: string[] = []

  // 1. Procurar cabeçalho: Período, Conta, Empresa
  for (const line of lines) {
    // "PERÍODO: 01/01/2026 - 31/01/2026"
    const periodoMatch = line.match(
      /PER[IÍ]ODO:\s*(\d{2}\/\d{2}\/(\d{4}))\s*-\s*(\d{2}\/\d{2}\/(\d{4}))/i,
    )
    if (periodoMatch) {
      dataInicio = periodoMatch[1]
      dataFim = periodoMatch[3]
      anoInferido = parseInt(periodoMatch[4], 10)
    }

    // "CONTA: 38.818-1 / ALFA EMPREENDIMENTOS & IMOBILIARIA LTDA"
    const contaMatch = line.match(/CONTA:\s*([0-9.-]+)\s*\/?\s*(.*)/i)
    if (contaMatch) {
      conta = contaMatch[1].trim()
      if (contaMatch[2]) {
        empresa = contaMatch[2].trim()
      }
    }
  }

  // 2. Extrair movimentações
  const itens: ExtratoItemRaw[] = []
  let reachedStopSection = false
  let currentItem: {
    dataStr: string
    historicoBase: string
    valor: number
    sinal: 'C' | 'D'
    complementos: string[]
  } | null = null

  const finalizeCurrentItem = () => {
    if (!currentItem) return

    const { dataStr, historicoBase, valor, sinal, complementos } = currentItem
    const tipo = sinal === 'C' ? 'entrada' : 'saida'

    // Formatar data YYYY-MM-DD
    const [dia, mes] = dataStr.split('/')
    const dataIso = `${anoInferido}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`

    // Construir descrição completa com histórico + complementos
    // Filtrar complementos inúteis repetitivos como apenas "DOC.: Pix" ou linhas vazias
    const filteredComps = complementos.filter((c) => {
      const lower = c.toLowerCase()
      if (lower === 'doc.: pix' || lower === 'doc: pix' || lower === 'doc.: 69') return false
      return true
    })

    const descricaoCompleta =
      filteredComps.length > 0 ? `${historicoBase} - ${filteredComps.join(' | ')}` : historicoBase

    // Identificar documento se houver
    let docEncontrado: string | undefined
    for (const c of complementos) {
      const docMatch = c.match(/DOC\.?:\s*([^\s]+)/i)
      if (docMatch) {
        docEncontrado = docMatch[1]
        break
      }
    }

    const categoria = sugerirCategoria(descricaoCompleta, tipo)

    itens.push({
      id: `sicoob-${itens.length + 1}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      dataStr,
      dataIso,
      descricao: descricaoCompleta,
      detalhesComplementares: complementos.length > 0 ? complementos.join('\n') : undefined,
      valor,
      tipo,
      sinal,
      documento: docEncontrado,
      categoriaSugerida: categoria,
      status: 'Pago',
      selecionado: true,
      isDuplicado: false,
    })

    currentItem = null
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Verificar se atingiu a seção de corte (RESUMO, etc.)
    if (STOP_PATTERNS.some((p) => p.test(line))) {
      reachedStopSection = true
      break
    }

    // Tentar casar com linha de movimentação: "02/01 TAR.MANUT.CTA ATIVA 40,00D"
    const match = line.match(TRANSACTION_LINE_REGEX)

    if (match) {
      const dataStr = match[1]
      const historico = match[2].trim()
      const valorStr = match[3]
      const sinal = match[4].toUpperCase() as 'C' | 'D'

      // Checar se não é saldo do dia ou saldo anterior
      const shouldIgnore = IGNORE_PATTERNS.some((p) => p.test(historico))
      if (shouldIgnore) {
        // Se tinha um item anterior em andamento, finaliza-o agora
        finalizeCurrentItem()
        continue
      }

      // Finaliza o item anterior e começa novo
      finalizeCurrentItem()

      currentItem = {
        dataStr,
        historicoBase: historico,
        valor: parseValorPtBr(valorStr),
        sinal,
        complementos: [],
      }
      continue
    }

    // Se estivermos dentro de uma movimentação, linhas seguintes são complementos (até encontrar outra data ou saldo)
    if (currentItem) {
      // Ignora linhas de cabeçalho ou ruído repetido se o extrato for multi-página
      if (
        line.startsWith('SICOOB') ||
        line.includes('HISTÓRICO DE MOVIMENTAÇÃO') ||
        line.includes('DATA HISTÓRICO VALOR') ||
        line.startsWith('COOP.') ||
        line.startsWith('CONTA:') ||
        line.startsWith('PERÍODO:')
      ) {
        continue
      }

      // Adicionar linha complementar (ex: "Pagamento Pix", "06.981.180 0001-16", "VOA CORRETOR PLANO PLUS")
      currentItem.complementos.push(line)
    }
  }

  // Finalizar último item se ainda pendente
  if (currentItem && !reachedStopSection) {
    finalizeCurrentItem()
  }

  // Totais
  const qtdEntradas = itens.filter((it) => it.tipo === 'entrada').length
  const qtdSaidas = itens.filter((it) => it.tipo === 'saida').length
  const totalEntradas = itens
    .filter((it) => it.tipo === 'entrada')
    .reduce((sum, it) => sum + it.valor, 0)
  const totalSaidas = itens
    .filter((it) => it.tipo === 'saida')
    .reduce((sum, it) => sum + it.valor, 0)

  if (itens.length === 0) {
    avisos.push('Nenhuma movimentação identificada no formato SICOOB. Verifique o arquivo.')
  }

  return {
    bancoDetectado: 'SICOOB',
    periodoExtrato: {
      inicio: dataInicio,
      fim: dataFim,
      anoInferido,
    },
    conta,
    empresa,
    itens,
    totalEntradas: Math.round(totalEntradas * 100) / 100,
    totalSaidas: Math.round(totalSaidas * 100) / 100,
    qtdEntradas,
    qtdSaidas,
    avisos,
  }
}
