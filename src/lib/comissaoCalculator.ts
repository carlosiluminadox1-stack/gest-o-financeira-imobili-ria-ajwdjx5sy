import { FormaPagamento } from '@/types'

export function round2(val: number): number {
  return Math.round((Number(val) || 0) * 100) / 100
}

export interface DivisaoComissaoInput {
  valorBase: number // Valor comissão total ou valor efetivamente recebido (Parcial)
  formaPagamento?: FormaPagamento
  temCaptador?: boolean
  numCaptadores?: number
  // Percentuais de divisão (Imobiliária, Corretor, Captador(es))
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
 * CENTRALIZADA:
 * 1. Calcular o imposto de 6% sobre o valor TOTAL da comissão.
 * 2. Subtrair esse imposto do total para obter o valor líquido total (Saldo Líquido).
 * 3. Dividir esse valor líquido total entre as partes (ex: 50% Imobiliária, 40% Corretor, 10% Captador).
 * Exemplo: R$ 15.000,00 (Total) -> R$ 900,00 (Imposto 6%) -> R$ 14.100,00 (Saldo Líquido) -> R$ 7.050,00 (Imobiliária) | R$ 5.640,00 (Corretor) | R$ 1.410,00 (Captador).
 *
 * SEPARADA:
 * 1. A comissão total é dividida entre as partes primeiro (base bruta).
 * 2. O imposto de 6% incide APENAS sobre a parte da imobiliária.
 * 3. O Corretor e o Captador recebem seus valores integrais nominais.
 * 4. O líquido da imobiliária é sua parte bruta menos o imposto de 6% sobre ela.
 */
export function calcularDivisaoComissao(input: DivisaoComissaoInput): DivisaoComissaoResult {
  const valorBase = Math.max(0, Number(input.valorBase) || 0)
  const formaPagamento: FormaPagamento =
    input.formaPagamento === 'Separada' ? 'Separada' : 'Centralizada'
  const aliquotaImposto = input.aliquotaImposto ?? 6

  const numCaptadores = Math.max(0, input.numCaptadores ?? (input.temCaptador ? 1 : 0))
  const temCaptador = numCaptadores > 0 || Boolean(input.temCaptador)

  // Percentuais configurados ou passados
  const pctImobConfig = input.pctImobConfig !== undefined ? Number(input.pctImobConfig) : 50
  const pctCaptTotalConfig =
    input.pctCaptConfig !== undefined ? Number(input.pctCaptConfig) : temCaptador ? 10 : 0
  const pctCorrConfig =
    input.pctCorrConfig !== undefined
      ? Number(input.pctCorrConfig)
      : temCaptador
        ? 40
        : 100 - pctImobConfig

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

  // Regra de divisão autorizada pelo usuário para Centralizada e Separada:
  // 1. Corretor: % INTEGRAL sobre a comissão total (sem desconto de imposto).
  // 2. Captador(es): % INTEGRAL sobre a comissão total (sem desconto de imposto, rateado entre captadores).
  // 3. Imobiliária bruta: % sobre a comissão total (ex: 50%).
  // 4. Imposto (6%): incide SOMENTE sobre a parte da imobiliária (6% da parte bruta da imobiliária).
  // 5. Imobiliária líquida: Imobiliária bruta - Imposto.
  //
  // No modo Centralizada: a imobiliária recebe o valor da comissão e repassa integralmente corretor/captador e paga o imposto.
  // No modo Separada: cada parte recebe direto na conta; imposto 6% continua apenas sobre a parte da imobiliária.
  const valorImobiliariaBruto = (valorBase * pctImobConfig) / 100
  const valorCorretor = (valorBase * pctCorrConfig) / 100
  const valorCaptadorTotal = (valorBase * pctCaptTotalConfig) / 100
  const valorPorCaptador = numCaptadores > 0 ? valorCaptadorTotal / numCaptadores : 0

  // Imposto incide SOMENTE sobre a parte da imobiliária
  const baseImposto = valorImobiliariaBruto
  const valorImposto = (baseImposto * aliquotaImposto) / 100
  const valorImobiliariaLiquido = valorImobiliariaBruto - valorImposto

  const pctImobiliariaLiquidoReal = valorBase > 0 ? (valorImobiliariaLiquido / valorBase) * 100 : 0

  return {
    formaPagamento,
    valorBase,
    aliquotaImposto,
    baseCalculoPartes: valorBase,
    valorImposto,
    baseImposto,
    descricaoImposto: `6% sobre a parte Imob (R$ ${baseImposto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`,
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
