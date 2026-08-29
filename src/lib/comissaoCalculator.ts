import { FormaPagamento } from '@/types'

export interface DivisaoComissaoInput {
  valorBase: number // Valor comissão total ou valor efetivamente recebido (Parcial)
  formaPagamento?: FormaPagamento
  temCaptador?: boolean
  numCaptadores?: number
  // Percentuais configurados (caso customizados)
  pctImobConfig?: number // Padrão: 50
  pctCorrConfig?: number // Padrão: 40
  pctCaptConfig?: number // Padrão: 10
  aliquotaImposto?: number // Padrão: 6%
}

export interface DivisaoComissaoResult {
  formaPagamento: FormaPagamento
  valorBase: number
  aliquotaImposto: number
  // Base líquida pós-imposto se Centralizada, ou base bruta se Separada
  baseCalculoPartes: number
  // Imposto
  valorImposto: number
  baseImposto: number
  descricaoImposto: string
  // Partes calculadas
  valorImobiliariaLiquido: number
  valorImobiliariaBruto: number
  valorCorretor: number
  valorCaptadorTotal: number
  valorPorCaptador: number
  numCaptadores: number
  temCaptador: boolean
  // Percentuais efetivos / nominais
  pctImobiliaria: number
  pctCorretor: number
  pctCaptadorTotal: number
  pctPorCaptador: number
  // Percentual líquido da imobiliária em relação ao total recebido
  pctImobiliariaLiquidoReal: number
}

/**
 * Realiza a divisão de comissão seguindo estritamente as regras de negócio:
 *
 * Divisão base antes do imposto: Imobiliária 50%, Corretor 40%, Captador(es) 10%.
 * (Sem captador: Corretor 50%, Imobiliária 50%).
 *
 * CENTRALIZADA:
 * 1. Desconta 6% de imposto sobre o valor total recebido.
 * 2. A base líquida restante (94%) é dividida entre as partes: Imobiliária 50%, Corretor 40%, Captador(es) 10% sobre a base líquida.
 * 3. Gera saídas pendentes de corretor, captador(es) e imposto (6%).
 * Exemplo R$ 20.000: imposto R$ 1.200 -> base líquida R$ 18.800 -> Imobiliária R$ 9.400, Corretor R$ 7.520, Captador R$ 1.880.
 *
 * SEPARADA:
 * 1. Cada parte recebe direto do cliente. A imobiliária recebe a parte dela (50%), tira 6% de imposto apenas sobre essa parte, o restante é lucro da imobiliária.
 * 2. Corretor recebe 40% INTEGRAL (sem imposto) e Captador(es) 10% INTEGRAL (sem imposto).
 * 3. A imobiliária gera saídas de corretor e captador(es).
 * Exemplo R$ 20.000: Imobiliária parte bruta = R$ 10.000 -> imposto 6% = R$ 600 -> líquido R$ 9.400; Corretor R$ 8.000; Captador R$ 2.000.
 */
export function calcularDivisaoComissao(input: DivisaoComissaoInput): DivisaoComissaoResult {
  const valorBase = Math.max(0, Number(input.valorBase) || 0)
  const formaPagamento: FormaPagamento =
    input.formaPagamento === 'Separada' ? 'Separada' : 'Centralizada'
  const aliquotaImposto = input.aliquotaImposto ?? 6

  const numCaptadores = Math.max(0, input.numCaptadores ?? (input.temCaptador ? 1 : 0))
  const temCaptador = numCaptadores > 0 || Boolean(input.temCaptador)

  // Percentuais configurados
  const pctImobConfig = input.pctImobConfig ?? 50
  const pctCaptTotalConfig = temCaptador ? (input.pctCaptConfig ?? 10) : 0
  const pctCorrConfig = temCaptador ? (input.pctCorrConfig ?? 40) : 100 - pctImobConfig

  const pctPorCaptador = numCaptadores > 0 ? pctCaptTotalConfig / numCaptadores : 0

  if (valorBase === 0) {
    return {
      formaPagamento,
      valorBase: 0,
      aliquotaImposto,
      baseCalculoPartes: 0,
      valorImposto: 0,
      baseImposto: 0,
      descricaoImposto:
        formaPagamento === 'Separada' ? '6% s/ parte da imobiliária' : '6% sobre o total recebido',
      valorImobiliariaLiquido: 0,
      valorImobiliariaBruto: 0,
      valorCorretor: 0,
      valorCaptadorTotal: 0,
      valorPorCaptador: 0,
      numCaptadores,
      temCaptador,
      pctImobiliaria: pctImobConfig,
      pctCorretor: pctCorrConfig,
      pctCaptadorTotal: pctCaptTotalConfig,
      pctPorCaptador,
      pctImobiliariaLiquidoReal: 0,
    }
  }

  if (formaPagamento === 'Centralizada') {
    // 1. Imposto sobre 100% do valor total
    const valorImposto = (valorBase * aliquotaImposto) / 100
    // 2. Base líquida após desconto de 6%
    const baseLiquida = valorBase - valorImposto

    // 3. Divisão entre as partes sobre a base líquida
    const valorImobiliariaLiquido = (baseLiquida * pctImobConfig) / 100
    const valorCorretor = (baseLiquida * pctCorrConfig) / 100
    const valorCaptadorTotal = temCaptador ? (baseLiquida * pctCaptTotalConfig) / 100 : 0
    const valorPorCaptador = numCaptadores > 0 ? valorCaptadorTotal / numCaptadores : 0
    const valorImobiliariaBruto = (valorBase * pctImobConfig) / 100

    const pctImobiliariaLiquidoReal = (valorImobiliariaLiquido / valorBase) * 100

    return {
      formaPagamento: 'Centralizada',
      valorBase,
      aliquotaImposto,
      baseCalculoPartes: baseLiquida,
      valorImposto,
      baseImposto: valorBase,
      descricaoImposto: `6% sobre o valor total (R$ ${valorBase.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`,
      valorImobiliariaLiquido,
      valorImobiliariaBruto,
      valorCorretor,
      valorCaptadorTotal,
      valorPorCaptador,
      numCaptadores,
      temCaptador,
      pctImobiliaria: pctImobConfig,
      pctCorretor: pctCorrConfig,
      pctCaptadorTotal: pctCaptTotalConfig,
      pctPorCaptador,
      pctImobiliariaLiquidoReal,
    }
  } else {
    // SEPARADA:
    // Corretor e captadores recebem integral (40% e 10% sobre o valor total)
    const valorCorretor = (valorBase * pctCorrConfig) / 100
    const valorCaptadorTotal = temCaptador ? (valorBase * pctCaptTotalConfig) / 100 : 0
    const valorPorCaptador = numCaptadores > 0 ? valorCaptadorTotal / numCaptadores : 0

    // Parte bruta da imobiliária (50% ou percentual restante)
    const pctParteImob = 100 - pctCorrConfig - pctCaptTotalConfig
    const valorImobiliariaBruto = (valorBase * pctParteImob) / 100

    // Imposto de 6% incide APENAS sobre a parte da imobiliária
    const valorImposto = (valorImobiliariaBruto * aliquotaImposto) / 100
    const valorImobiliariaLiquido = valorImobiliariaBruto - valorImposto

    const pctImobiliariaLiquidoReal = (valorImobiliariaLiquido / valorBase) * 100

    return {
      formaPagamento: 'Separada',
      valorBase,
      aliquotaImposto,
      baseCalculoPartes: valorBase,
      valorImposto,
      baseImposto: valorImobiliariaBruto,
      descricaoImposto: `6% sobre a parte Imob (R$ ${valorImobiliariaBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`,
      valorImobiliariaLiquido,
      valorImobiliariaBruto,
      valorCorretor,
      valorCaptadorTotal,
      valorPorCaptador,
      numCaptadores,
      temCaptador,
      pctImobiliaria: pctImobConfig,
      pctCorretor: pctCorrConfig,
      pctCaptadorTotal: pctCaptTotalConfig,
      pctPorCaptador,
      pctImobiliariaLiquidoReal,
    }
  }
}
