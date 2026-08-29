export type UserProfile = 'socio' | 'secretaria' | 'corretor' | 'administrador'

export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  perfil?: UserProfile
  created: string
  updated: string
}

export interface Corretor {
  id: string
  nome: string
  email: string
  telefone?: string
  creci?: string
  ativo: boolean
  created: string
  updated: string
}

export type VendaStatus = 'realizada' | 'pendente' | 'cancelada'
export type SituacaoRecebimento = 'Recebido' | 'Parcial'
export type FormaPagamento = 'Centralizada' | 'Separada'
export type TipoVenda = 'venda' | 'locacao' | 'administracao'

export interface Venda {
  id: string
  titulo_imovel: string
  cliente: string
  corretor: string
  captador?: string
  captadores?: string[]
  valor_vgv: number
  percentual_comissao: number
  valor_comissao: number
  tipo_venda?: TipoVenda
  data_recebimento?: string
  is_valor_fixo?: boolean
  forma_pagamento?: FormaPagamento
  situacao_recebimento?: SituacaoRecebimento
  valor_recebido?: number
  data_venda: string
  status: VendaStatus
  user: string
  created: string
  updated: string
  expand?: {
    corretor?: Corretor
    captador?: Corretor
    captadores?: Corretor[]
    user?: User
  }
}

export type ComissaoParte = 'imobiliaria' | 'corretor' | 'captador'
export type ComissaoStatus = 'pendente' | 'recebida' | 'paga'
export type ComissaoTipo = 'venda' | 'captacao'

export interface Comissao {
  id: string
  venda: string
  parte: ComissaoParte
  corretor?: string
  percentual: number
  valor: number
  status: ComissaoStatus
  tipo?: ComissaoTipo
  data_recebimento?: string
  user: string
  created: string
  updated: string
  expand?: {
    venda?: Venda
    corretor?: Corretor
    user?: User
  }
}

export type MetaPeriodo = 'mensal' | 'trimestral' | 'semestral' | 'anual'

export interface MetaVGV {
  id: string
  titulo: string
  periodo: MetaPeriodo
  data_inicio: string
  data_fim: string
  valor_meta: number
  corretor?: string
  user: string
  created: string
  updated: string
}

export type TransacaoTipo = 'entrada' | 'saida'
export type TransacaoCategoria =
  | 'comissao'
  | 'imposto'
  | 'repasse'
  | 'aluguel'
  | 'marketing'
  | 'salarios'
  | 'utilidades'
  | 'manutencao'
  | 'outros'

export interface Transacao {
  id: string
  tipo: TransacaoTipo
  descricao: string
  categoria: TransacaoCategoria
  valor: number
  data: string
  data_competencia?: string
  data_vencimento?: string
  consolidado?: boolean
  status?: string
  venda?: string
  comissao?: string
  user: string
  created: string
  updated: string
  expand?: {
    venda?: Venda
    comissao?: Comissao
  }
}

export type DespesaCategoria =
  | 'aluguel'
  | 'marketing'
  | 'salarios'
  | 'utilidades'
  | 'manutencao'
  | 'outros'

export type DespesaFrequencia = 'mensal' | 'trimestral' | 'semestral' | 'anual'

export interface Despesa {
  id: string
  descricao: string
  categoria: DespesaCategoria
  valor: number
  data: string
  data_competencia?: string
  data_vencimento?: string
  recorrente: boolean
  frequencia?: DespesaFrequencia
  ativa: boolean
  proxima_data?: string
  user: string
  created: string
  updated: string
}

export type NotaFiscalStatus = 'emitida' | 'cancelada'

export interface NotaFiscal {
  id: string
  numero: string
  venda?: string
  cliente: string
  valor: number
  taxa: number
  valor_imposto: number
  data_emissao: string
  status: NotaFiscalStatus
  user: string
  created: string
  updated: string
  expand?: {
    venda?: Venda
  }
}

export interface Fechamento {
  id: string
  mes: number
  ano: number
  receita_bruta: number
  despesas: number
  impostos: number
  resultado_liquido: number
  snapshot: any
  status?: 'aberto' | 'fechado'
  total_vgv?: number
  total_comissoes?: number
  total_entradas?: number
  total_saidas?: number
  lucro_liquido?: number
  data_fechamento?: string
  fechado_em: string
  fechado_por: string
  created: string
  updated: string
}
export interface Configuracoes {
  id: string
  user: string
  percentual_imobiliaria: number
  percentual_corretor: number
  percentual_captador: number
  percentual_comissao_padrao: number
  created: string
  updated: string
}

export interface SystemUser {
  id: string
  email: string
  name: string
  perfil: UserProfile
  created: string
  updated: string
}

export type PeriodoGlobal = 'mes' | 'trimestre' | 'semestre' | 'ano' | string
