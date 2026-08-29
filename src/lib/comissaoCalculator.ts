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
 * Realiza a divisão de comissão seguindo estritamente as regras de negócio dos prints e especificações:
 *
 * Divisão base padrão: Imobiliária 50%, Corretor 40%, Captador(es) 10%.
 * (Sem captador: pode ser configurado ou 0% captador).
 *
 * CENTRALIZADA:
 * 1. O imposto de 6% é calculado sobre o VALOR TOTAL da comissão (ex: R$ 22.200 -> Imposto 6% = R$ 1.332,00).
 * 2. O valor de referência bruto da Imobiliária é 50% de 22.200 = R$ 11.100,00.
 * 3. O Corretor recebe 40% do total = R$ 8.880,00 e o Captador recebe 10% do total = R$ 2.220,00.
 * 4. Como a imobiliária arca com o imposto de toda a operação (ou o imposto é descontado do montante),
 *    o Líquido para a imobiliária é: R$ 11.100,00 - R$ 1.332,00 = R$ 9.768,00.
 *    (Conforme Print 2: Imobiliária: R$ 11.100,00 | Corretor: R$ 8.880,00 | Captador: R$ 2.220,00 | Imposto 6%: R$ 1.332,00 | Líquido para imobiliária: R$ 9.768,00).
 *
 * SEPARADA:
 * 1. A comissão total é dividida entre as partes primeiro:
 *    Imobiliária Bruto (50%) = R$ 11.100,00
 *    Corretor (40%) = R$ 8.880,00
 *    Captador (10%) = R$ 2.220,00
 * 2. O imposto de 6% incide APENAS sobre a parte da imobiliária:
 *    6% de R$ 11.100,00 = R$ 666,00.
 * 3. O Corretor e o Captador recebem seus valores integrais (R$ 8.880,00 e R$ 2.220,00).
 * 4. O líquido da imobiliária é sua parte bruta menos o imposto de 6% sobre ela:
 *    R$ 11.100,00 - R$ 666,00 = R$ 10.434,00.
 *    (Conforme Print 3: Imobiliária: R$ 11.100,00 | Corretor: R$ 8.880,00 | Captador: R$ 2.220,00 | Imposto 6%: R$ 666,00 | Líquido para imobiliária: R$ 10.434,00).
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

  // Valores nominais / brutos das partes sobre a comissão total
  const valorImobiliariaBruto = (valorBase * pctImobConfig) / 100
  const valorCorretor = (valorBase * pctCorrConfig) / 100
  const valorCaptadorTotal = (valorBase * pctCaptTotalConfig) / 100
  const valorPorCaptador = numCaptadores > 0 ? valorCaptadorTotal / numCaptadores : 0

  if (formaPagamento === 'Centralizada') {
    // 1. Imposto sobre 100% do valor total da comissão
    const valorImposto = (valorBase * aliquotaImposto) / 100

    // 2. Líquido da imobiliária = Parte Bruta da Imobiliária - Imposto Total de 6%
    const valorImobiliariaLiquido = valorImobiliariaBruto - valorImposto

    const pctImobiliariaLiquidoReal =
      valorBase > 0 ? (valorImobiliariaLiquido / valorBase) * 100 : 0

    return {
      formaPagamento: 'Centralizada',
      valorBase,
      aliquotaImposto,
      baseCalculoPartes: valorBase,
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
    // Imposto de 6% incide APENAS sobre a parte da imobiliária
    const valorImposto = (valorImobiliariaBruto * aliquotaImposto) / 100
    // Líquido da imobiliária = Parte Bruta da Imobiliária - Imposto de 6% sobre ela
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
