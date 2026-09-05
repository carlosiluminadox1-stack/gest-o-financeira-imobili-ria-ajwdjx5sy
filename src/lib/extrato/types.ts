import { TransacaoCategoria, TransacaoTipo } from '@/types'

export interface ExtratoItemRaw {
  id: string
  dataStr: string // DD/MM ou YYYY-MM-DD
  dataIso: string // YYYY-MM-DD
  descricao: string
  detalhesComplementares?: string
  valor: number
  tipo: TransacaoTipo // 'entrada' | 'saida'
  sinal: 'C' | 'D'
  documento?: string
  categoriaSugerida: TransacaoCategoria
  status: 'Pago' | 'Pendente'
  selecionado: boolean
  isDuplicado: boolean
  motivoDuplicado?: string
  duplicadoComId?: string
}

export interface ExtratoParseResult {
  bancoDetectado: 'SICOOB' | 'GENERICO_CSV' | 'GENERICO_EXCEL' | 'DESCONHECIDO'
  periodoExtrato?: {
    inicio?: string
    fim?: string
    anoInferido?: number
  }
  conta?: string
  empresa?: string
  itens: ExtratoItemRaw[]
  totalEntradas: number
  totalSaidas: number
  qtdEntradas: number
  qtdSaidas: number
  avisos: string[]
}

/**
 * Categorização automática baseada em palavras-chave presentes no histórico/descrição
 */
export function sugerirCategoria(
  descricao: string,
  tipo: TransacaoTipo,
  categoriasCadastradas?: Array<{ nome: string; tipo: string; ativo?: boolean }>,
): TransacaoCategoria {
  const text = (descricao || '').toLowerCase()

  // 1. Tentar casar primeiro com categorias cadastradas ativas correspondentes ao tipo
  if (categoriasCadastradas && categoriasCadastradas.length > 0) {
    const validas = categoriasCadastradas.filter(
      (c) => (c.ativo === undefined || c.ativo) && (c.tipo === 'ambos' || c.tipo === tipo),
    )
    for (const cat of validas) {
      const nomeLower = cat.nome.toLowerCase().trim()
      if (nomeLower && (text.includes(nomeLower) || nomeLower.includes(text.trim()))) {
        return cat.nome
      }
    }
  }

  // 2. Fallback para regras padrão por palavras-chave

  // Se for entrada
  if (tipo === 'entrada') {
    if (
      text.includes('comiss') ||
      text.includes('corret') ||
      text.includes('rec.outra') ||
      text.includes('recebimento pix') ||
      text.includes('receb') ||
      text.includes('alfa empreendimentos') ||
      text.includes('cred.prom')
    ) {
      return 'comissao'
    }
    if (text.includes('aluguel') || text.includes('locacao') || text.includes('locação')) {
      return 'aluguel'
    }
    return 'outros'
  }

  // Se for saída
  if (
    text.includes('tar.manut') ||
    text.includes('tarifa') ||
    text.includes('manut.cta') ||
    text.includes('encargo') ||
    text.includes('deb.parc.subs')
  ) {
    return 'utilidades'
  }
  if (
    text.includes('telecom') ||
    text.includes('vivo') ||
    text.includes('claro') ||
    text.includes('tim') ||
    text.includes('internet') ||
    text.includes('recarga') ||
    text.includes('deb.recar')
  ) {
    return 'utilidades'
  }
  if (
    text.includes('imposto') ||
    text.includes('darf') ||
    text.includes('simples nacional') ||
    text.includes('das ') ||
    text.includes('tribut') ||
    text.includes('iss')
  ) {
    return 'imposto'
  }
  if (
    text.includes('aluguel') ||
    text.includes('condominio') ||
    text.includes('condomínio') ||
    text.includes('iptu')
  ) {
    return 'aluguel'
  }
  if (
    text.includes('marketing') ||
    text.includes('facebook') ||
    text.includes('meta ads') ||
    text.includes('google') ||
    text.includes('anuncio') ||
    text.includes('anúncio') ||
    text.includes('voa corretor') ||
    text.includes('software') ||
    text.includes('plano plus')
  ) {
    return 'marketing'
  }
  if (
    text.includes('salario') ||
    text.includes('salário') ||
    text.includes('adiantamento') ||
    text.includes('pro-labore') ||
    text.includes('pró-labore') ||
    text.includes('folha')
  ) {
    return 'salarios'
  }
  if (
    text.includes('repasse') ||
    text.includes('pgto paloma') ||
    text.includes('paloma') ||
    text.includes('honorarios') ||
    text.includes('honorários')
  ) {
    return 'repasse'
  }
  if (
    text.includes('manutencao') ||
    text.includes('manutenção') ||
    text.includes('reforma') ||
    text.includes('limpeza') ||
    text.includes('material')
  ) {
    return 'manutencao'
  }

  return 'outros'
}

/**
 * Converte valor em formato pt-BR ("1.492,96" ou "-1492.96" ou "81,00") para number positivo
 */
export function parseValorPtBr(valStr: string): number {
  if (!valStr) return 0
  let clean = valStr
    .trim()
    .replace(/R\$\s*/i, '')
    .replace(/[CD]$/i, '')
    .trim()

  // Se tiver formato brasileiro com ponto de milhar e vírgula decimal (ex: 1.234,56)
  if (clean.includes(',') && clean.includes('.')) {
    clean = clean.replace(/\./g, '').replace(',', '.')
  } else if (clean.includes(',')) {
    clean = clean.replace(',', '.')
  }

  const num = Math.abs(parseFloat(clean))
  return isNaN(num) ? 0 : Math.round(num * 100) / 100
}

/**
 * Formata número para moeda Real pt-BR
 */
export function formatMoedaPtBr(val: number): string {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
