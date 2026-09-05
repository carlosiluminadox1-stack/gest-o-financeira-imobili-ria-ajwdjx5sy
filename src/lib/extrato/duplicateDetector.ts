import { Transacao } from '@/types'
import { ExtratoItemRaw } from './types'

/**
 * Calcula similaridade simples entre duas strings (Jaccard token similarity)
 */
function stringSimilarity(s1: string, s2: string): number {
  const norm1 = s1
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  const norm2 = s2
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)

  if (norm1.length === 0 || norm2.length === 0) return 0

  const set1 = new Set(norm1)
  const set2 = new Set(norm2)

  let intersection = 0
  set1.forEach((token) => {
    if (set2.has(token)) intersection++
  })

  const union = new Set([...norm1, ...norm2]).size
  return union === 0 ? 0 : intersection / union
}

/**
 * Compara itens extraídos com transações existentes no sistema.
 * Se houver transação na mesma data (+/- 1 dia), com valor idêntico e mesmo tipo,
 * ou com forte similaridade de descrição, marca como duplicado.
 */
export function detectarDuplicados(
  itens: ExtratoItemRaw[],
  transacoesExistentes: Transacao[],
): ExtratoItemRaw[] {
  return itens.map((item) => {
    const itemDate = item.dataIso // YYYY-MM-DD
    const itemValor = item.valor
    const itemTipo = item.tipo

    // Procurar nas transações existentes
    const candidato = transacoesExistentes.find((t) => {
      // Comparar tipo (se disponível)
      if (t.tipo && t.tipo !== itemTipo) return false

      // Comparar valor com margem de 0.01 centavo
      const valorDiff = Math.abs((t.valor || 0) - itemValor)
      if (valorDiff > 0.05) return false

      // Comparar data (mesmo dia ou +/- 1 dia por fuso)
      const tDateStr = t.data ? t.data.split('T')[0] : ''
      if (!tDateStr) return false

      const isSameDate = tDateStr === itemDate

      if (isSameDate) {
        return true
      }

      // Se a data for bem próxima (1 dia de diferença) e a descrição for similar
      const d1 = new Date(itemDate).getTime()
      const d2 = new Date(tDateStr).getTime()
      const dayDiff = Math.abs(d1 - d2) / (1000 * 60 * 60 * 24)

      if (dayDiff <= 1) {
        const sim = stringSimilarity(item.descricao, t.descricao || '')
        if (sim >= 0.4) return true
      }

      return false
    })

    if (candidato) {
      return {
        ...item,
        isDuplicado: true,
        motivoDuplicado: `Lançamento similar já cadastrado em ${candidato.data?.split('T')[0]}: "${candidato.descricao}" (R$ ${(candidato.valor || 0).toFixed(2)})`,
        duplicadoComId: candidato.id,
        selecionado: false, // Desmarcado por padrão conforme especificação
      }
    }

    return item
  })
}
