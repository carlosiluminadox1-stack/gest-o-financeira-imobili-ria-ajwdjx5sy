import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

export function extractFieldErrors(error: unknown): FieldErrors {
  if (!(error instanceof ClientResponseError)) return {}
  const data = error.response?.data
  if (!data || typeof data !== 'object') return {}
  const errors: FieldErrors = {}
  for (const [field, detail] of Object.entries(data)) {
    if (
      detail &&
      typeof detail === 'object' &&
      'message' in detail &&
      typeof (detail as { message: unknown }).message === 'string'
    ) {
      errors[field] = (detail as { message: string }).message
    }
  }
  return errors
}

const FIELD_LABELS_PT_BR: Record<string, string> = {
  titulo_imovel: 'Descrição/Título do imóvel',
  cliente: 'Cliente',
  corretor: 'Corretor responsável',
  captador: 'Captador',
  captadores: 'Captadores',
  valor_vgv: 'Valor do VGV',
  percentual_comissao: 'Percentual de comissão',
  valor_comissao: 'Valor da comissão',
  valor_recebido: 'Valor recebido',
  data_venda: 'Data da venda/competência',
  data_recebimento: 'Data de recebimento',
  status: 'Status',
  user: 'Usuário',
  forma_pagamento: 'Forma de pagamento',
  situacao_recebimento: 'Situação de recebimento',
  tipo_venda: 'Tipo de venda',
}

export function formatPocketBaseError(
  error: unknown,
  fallbackMessage = 'Erro ao processar operação.',
): string {
  if (!(error instanceof ClientResponseError)) {
    return error instanceof Error ? error.message : fallbackMessage
  }

  const fieldErrors = extractFieldErrors(error)
  const entries = Object.entries(fieldErrors)

  if (entries.length > 0) {
    const formattedList = entries.map(([field, msg]) => {
      const label = FIELD_LABELS_PT_BR[field] || field
      let translatedMsg = msg
      if (/cannot be blank/i.test(msg) || /required/i.test(msg)) {
        translatedMsg = 'é obrigatório'
      } else if (/failed to create record/i.test(msg)) {
        translatedMsg = 'falha de validação'
      }
      return `O campo "${label}" ${translatedMsg}.`
    })
    return formattedList.join(' ')
  }

  if (error.response?.message && !/failed to create record/i.test(error.response.message)) {
    return error.response.message
  }

  if (error.message && !/failed to create record/i.test(error.message)) {
    return error.message
  }

  return fallbackMessage
}

export function getErrorMessage(error: unknown): string {
  return formatPocketBaseError(error, 'Ocorreu um erro inesperado.')
}
