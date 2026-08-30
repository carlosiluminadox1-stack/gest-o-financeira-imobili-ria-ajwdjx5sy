import { FormaPagamento } from '@/types'

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

  if (formaPagamento === 'Centralizada') {
    // 1. Calcular o imposto de 6% sobre o valor TOTAL da comissão
    const valorImposto = (valorBase * aliquotaImposto) / 100

    // 2. Subtrair esse imposto do total para obter o valor líquido total (base de cálculo das partes)
    const baseLiquidaTotal = valorBase - valorImposto

    // 3. Dividir esse valor líquido total entre as partes
    const valorImobiliariaLiquido = (baseLiquidaTotal * pctImobConfig) / 100
    const valorImobiliariaBruto = valorImobiliariaLiquido // No modelo centralizado, o valor da imobiliária é sua cota sobre o líquido
    const valorCorretor = (baseLiquidaTotal * pctCorrConfig) / 100
    const valorCaptadorTotal = (baseLiquidaTotal * pctCaptTotalConfig) / 100
    const valorPorCaptador = numCaptadores > 0 ? valorCaptadorTotal / numCaptadores : 0

    const pctImobiliariaLiquidoReal =
      valorBase > 0 ? (valorImobiliariaLiquido / valorBase) * 100 : 0

    return {
      formaPagamento: 'Centralizada',
      valorBase,
      aliquotaImposto,
      baseCalculoPartes: baseLiquidaTotal,
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
    // 1. Comissão total é dividida entre as partes primeiro sobre a base bruta
    const valorImobiliariaBruto = (valorBase * pctImobConfig) / 100
    const valorCorretor = (valorBase * pctCorrConfig) / 100
    const valorCaptadorTotal = (valorBase * pctCaptTotalConfig) / 100
    const valorPorCaptador = numCaptadores > 0 ? valorCaptadorTotal / numCaptadores : 0

    // 2. Imposto de 6% incide APENAS sobre a parte da imobiliária
    const valorImposto = (valorImobiliariaBruto * aliquotaImposto) / 100

    // 3. Líquido da imobiliária = Parte Bruta da Imobiliária - Imposto de 6% sobre ela
    const valorImobiliariaLiquido = valorImobiliariaBruto - valorImposto

    const pctImobiliariaLiquidoReal =
      valorBase > 0 ? (valorImobiliariaLiquido / valorBase) * 100 : 0

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
