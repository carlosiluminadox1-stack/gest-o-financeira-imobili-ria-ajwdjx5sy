import pb from '@/lib/pocketbase/client'
import {
  Venda,
  Corretor,
  Comissao,
  MetaVGV,
  Transacao,
  TransacaoTipo,
  TransacaoCategoria,
  Despesa,
  DespesaCategoria,
  NotaFiscal,
  Fechamento,
  Configuracoes,
  SystemUser,
  FormaPagamento,
  SituacaoRecebimento,
} from '@/types'
import { calcularDivisaoComissao } from '@/lib/comissaoCalculator'

// User Management Service
export const UserService = {
  async getAll(): Promise<SystemUser[]> {
    return await pb.collection('users').getFullList<SystemUser>({
      sort: '-created',
    })
  },
  async create(data: {
    name: string
    email: string
    password: string
    perfil: 'socio' | 'secretaria'
  }): Promise<SystemUser> {
    const user = await pb.collection('users').create<SystemUser>({
      name: data.name,
      email: data.email,
      password: data.password,
      passwordConfirm: data.password,
      perfil: data.perfil,
    })

    // Init default settings if socio
    try {
      await pb.collection('configuracoes').create({
        user: user.id,
        percentual_imobiliaria: 50,
        percentual_corretor: 40,
        percentual_captador: 10,
        percentual_comissao_padrao: 6,
      })
    } catch {
      /* intentionally ignored */
    }

    return user
  },
  async update(
    id: string,
    data: { name?: string; email?: string; perfil?: 'socio' | 'secretaria'; password?: string },
  ): Promise<SystemUser> {
    const payload: any = { ...data }
    if (data.password) {
      payload.password = data.password
      payload.passwordConfirm = data.password
    } else {
      delete payload.password
    }
    return await pb.collection('users').update<SystemUser>(id, payload)
  },
  async delete(id: string): Promise<boolean> {
    return await pb.collection('users').delete(id)
  },
}

// Corretor Service
export const CorretorService = {
  async getAll(): Promise<Corretor[]> {
    return await pb.collection('corretores').getFullList<Corretor>({
      sort: 'nome',
    })
  },
  async getActives(): Promise<Corretor[]> {
    return await pb.collection('corretores').getFullList<Corretor>({
      filter: 'ativo = true',
      sort: 'nome',
    })
  },
  async create(data: Partial<Corretor>): Promise<Corretor> {
    return await pb.collection('corretores').create<Corretor>(data)
  },
  async update(id: string, data: Partial<Corretor>): Promise<Corretor> {
    return await pb.collection('corretores').update<Corretor>(id, data)
  },
  async delete(id: string): Promise<boolean> {
    return await pb.collection('corretores').delete(id)
  },
}

// Configuracoes Service
export const ConfigService = {
  async getForUser(userId: string): Promise<Configuracoes | null> {
    try {
      return await pb
        .collection('configuracoes')
        .getFirstListItem<Configuracoes>(`user = "${userId}"`)
    } catch {
      return null
    }
  },
  async saveForUser(userId: string, data: Partial<Configuracoes>): Promise<Configuracoes> {
    const existing = await this.getForUser(userId)
    if (existing) {
      return await pb.collection('configuracoes').update<Configuracoes>(existing.id, data)
    } else {
      return await pb.collection('configuracoes').create<Configuracoes>({
        user: userId,
        percentual_imobiliaria: data.percentual_imobiliaria ?? 50,
        percentual_corretor: data.percentual_corretor ?? 40,
        percentual_captador: data.percentual_captador ?? 10,
        percentual_comissao_padrao: data.percentual_comissao_padrao ?? 6,
      })
    }
  },
}

// Vendas Service with automatic commission distribution & cashflow integration
export const VendaService = {
  async getAll(filter?: string): Promise<Venda[]> {
    return await pb.collection('vendas').getFullList<Venda>({
      filter,
      sort: '-data_venda',
      expand: 'corretor,captador,captadores',
    })
  },
  async getById(id: string): Promise<Venda> {
    return await pb.collection('vendas').getOne<Venda>(id, {
      expand: 'corretor,captador,captadores',
    })
  },
  async create(data: {
    titulo_imovel: string
    cliente: string
    corretor: string
    captador?: string
    captadores?: string[]
    valor_vgv: number
    percentual_comissao: number
    valor_comissao?: number
    tipo_venda?: 'venda' | 'locacao' | 'administracao'
    data_recebimento?: string
    is_valor_fixo?: boolean
    pct_imobiliaria?: number
    pct_corretor?: number
    pct_captador?: number
    forma_pagamento?: FormaPagamento
    situacao_recebimento: SituacaoRecebimento
    valor_recebido?: number
    data_venda: string
    status: 'realizada' | 'pendente' | 'cancelada'
    userId: string
  }): Promise<Venda> {
    const valor_comissao =
      data.valor_comissao !== undefined
        ? data.valor_comissao
        : (data.valor_vgv * data.percentual_comissao) / 100
    const situacao = data.situacao_recebimento || 'Recebido'
    const forma = data.forma_pagamento || 'Centralizada'
    const valorRecebido =
      situacao === 'Recebido' ? valor_comissao : Number(data.valor_recebido ?? valor_comissao)

    // Normalizar captadores
    const captadoresList =
      data.captadores && data.captadores.length > 0
        ? data.captadores.filter(Boolean)
        : data.captador
          ? [data.captador]
          : []
    const primaryCaptador = captadoresList.length > 0 ? captadoresList[0] : null

    const record = await pb.collection('vendas').create<Venda>({
      titulo_imovel: data.titulo_imovel,
      cliente: data.cliente,
      corretor: data.corretor,
      captador: primaryCaptador,
      captadores: captadoresList,
      valor_vgv: data.valor_vgv,
      percentual_comissao: data.percentual_comissao,
      valor_comissao,
      tipo_venda: data.tipo_venda || 'venda',
      data_recebimento: data.data_recebimento || data.data_venda,
      is_valor_fixo: Boolean(data.is_valor_fixo),
      forma_pagamento: forma,
      situacao_recebimento: situacao,
      valor_recebido: valorRecebido,
      data_venda: data.data_venda,
      status: data.status,
      user: data.userId,
    })

    // Processar financeiro se realizada ou com valor recebido > 0
    if (data.status === 'realizada' && valorRecebido > 0) {
      await this.processarRecebimentoVenda({
        vendaId: record.id,
        tituloImovel: data.titulo_imovel,
        clienteNome: data.cliente,
        corretorId: data.corretor,
        captadorId: primaryCaptador || undefined,
        captadoresIds: captadoresList,
        formaPagamento: forma,
        valorBase: valorRecebido,
        valorTotalComissao: valor_comissao,
        pctImob: data.pct_imobiliaria,
        pctCorr: data.pct_corretor,
        pctCapt: data.pct_captador,
        dataVenda: data.data_recebimento || data.data_venda,
        dataCompetencia: data.data_venda,
        userId: data.userId,
        ehComplementar: false,
      })
    }

    return record
  },
  async update(
    id: string,
    data: Partial<Venda> & {
      forma_pagamento?: FormaPagamento
      situacao_recebimento?: SituacaoRecebimento
      valor_recebido?: number
      pct_imobiliaria?: number
      pct_corretor?: number
      pct_captador?: number
    },
    userId: string,
  ): Promise<Venda> {
    const prev = await pb.collection('vendas').getOne<Venda>(id, {
      expand: 'corretor,captador,captadores',
    })
    const isValorFixo =
      data.is_valor_fixo !== undefined ? Boolean(data.is_valor_fixo) : Boolean(prev.is_valor_fixo)
    const valor_vgv = data.valor_vgv !== undefined ? data.valor_vgv : prev.valor_vgv
    const percentual_comissao =
      data.percentual_comissao !== undefined ? data.percentual_comissao : prev.percentual_comissao
    const valor_comissao =
      data.valor_comissao !== undefined
        ? data.valor_comissao
        : isValorFixo
          ? prev.valor_comissao
          : (valor_vgv * percentual_comissao) / 100

    const forma = data.forma_pagamento ?? prev.forma_pagamento ?? 'Centralizada'
    const situacao = data.situacao_recebimento ?? prev.situacao_recebimento ?? 'Recebido'
    let novoValorRecebido =
      situacao === 'Recebido'
        ? valor_comissao
        : Number(data.valor_recebido ?? prev.valor_recebido ?? valor_comissao)

    const prevValorRecebido = Number(
      prev.valor_recebido ?? (prev.situacao_recebimento === 'Parcial' ? 0 : prev.valor_comissao),
    )
    const diferencaRecebida = novoValorRecebido - prevValorRecebido

    let captadoresList: string[] = []
    if (data.captadores !== undefined) {
      captadoresList = data.captadores.filter(Boolean)
    } else if (data.captador !== undefined) {
      captadoresList = data.captador ? [data.captador] : []
    } else if (prev.captadores && prev.captadores.length > 0) {
      captadoresList = prev.captadores
    } else if (prev.captador) {
      captadoresList = [prev.captador]
    }

    const primaryCaptador = captadoresList.length > 0 ? captadoresList[0] : null

    const updated = await pb.collection('vendas').update<Venda>(id, {
      ...data,
      captador: primaryCaptador,
      captadores: captadoresList,
      valor_comissao,
      forma_pagamento: forma,
      situacao_recebimento: situacao,
      valor_recebido: novoValorRecebido,
    })

    const statusNovo = data.status ?? prev.status
    const corretorId = data.corretor ?? prev.corretor
    const titulo = data.titulo_imovel ?? prev.titulo_imovel
    const cliente = data.cliente ?? prev.cliente
    const dataVenda = data.data_venda ?? prev.data_venda
    const dataRecebimento = data.data_recebimento ?? prev.data_recebimento ?? dataVenda

    // Se antes não era realizada e agora virou realizada
    if (statusNovo === 'realizada' && prev.status !== 'realizada' && novoValorRecebido > 0) {
      await this.processarRecebimentoVenda({
        vendaId: id,
        tituloImovel: titulo,
        clienteNome: cliente,
        corretorId,
        captadorId: primaryCaptador || undefined,
        captadoresIds: captadoresList,
        formaPagamento: forma,
        valorBase: novoValorRecebido,
        valorTotalComissao: valor_comissao,
        pctImob: data.pct_imobiliaria,
        pctCorr: data.pct_corretor,
        pctCapt: data.pct_captador,
        dataVenda: dataRecebimento,
        dataCompetencia: dataVenda,
        userId,
        ehComplementar: false,
      })
    } else if (statusNovo === 'realizada' && diferencaRecebida > 0) {
      // Edição de venda que aumentou o valor recebido: gerar fluxos sobre a diferença
      await this.processarRecebimentoVenda({
        vendaId: id,
        tituloImovel: titulo,
        clienteNome: cliente,
        corretorId,
        captadorId: primaryCaptador || undefined,
        captadoresIds: captadoresList,
        formaPagamento: forma,
        valorBase: diferencaRecebida,
        valorTotalComissao: valor_comissao,
        pctImob: data.pct_imobiliaria,
        pctCorr: data.pct_corretor,
        pctCapt: data.pct_captador,
        dataVenda: dataRecebimento,
        dataCompetencia: dataVenda,
        userId,
        ehComplementar: true,
      })
    }

    return updated
  },
  async delete(id: string): Promise<boolean> {
    // Delete associated transactions and commissions
    const [transacoes, commissions] = await Promise.all([
      pb.collection('transacoes').getFullList<Transacao>({ filter: `venda = "${id}"` }),
      pb.collection('comissoes').getFullList<Comissao>({ filter: `venda = "${id}"` }),
    ])

    for (const t of transacoes) {
      await pb.collection('transacoes').delete(t.id)
    }

    for (const c of commissions) {
      await pb.collection('comissoes').delete(c.id)
    }

    return await pb.collection('vendas').delete(id)
  },
  async processarRecebimentoVenda(params: {
    vendaId: string
    tituloImovel: string
    clienteNome?: string
    corretorId: string
    captadorId?: string
    captadoresIds?: string[]
    formaPagamento?: FormaPagamento
    valorBase: number // valor recebido efetivamente (ou parcela complementar)
    valorTotalComissao: number
    pctImob?: number
    pctCorr?: number
    pctCapt?: number
    dataVenda: string
    dataCompetencia?: string
    userId: string
    ehComplementar?: boolean
  }) {
    const {
      vendaId,
      tituloImovel,
      corretorId,
      captadorId,
      captadoresIds,
      formaPagamento = 'Centralizada',
      valorBase,
      pctImob: paramPctImob,
      pctCorr: paramPctCorr,
      pctCapt: paramPctCapt,
      dataVenda,
      dataCompetencia,
      userId,
      ehComplementar,
    } = params

    if (valorBase <= 0) return

    let config: Configuracoes | null = null
    if (userId) {
      config = await ConfigService.getForUser(userId)
    }

    // Identificar lista de captadores (seja array ou single id)
    let captadores: string[] = []
    if (captadoresIds && captadoresIds.length > 0) {
      captadores = captadoresIds.filter(Boolean)
    } else if (captadorId && captadorId.trim().length > 0) {
      captadores = [captadorId]
    }

    const numCaptadores = captadores.length
    const hasCaptador = numCaptadores > 0

    // Percentuais: se vierem customizados no form usa eles, senão usa config do usuário
    const pctImob = paramPctImob ?? config?.percentual_imobiliaria ?? 50
    const pctCorr =
      paramPctCorr ?? (hasCaptador ? (config?.percentual_corretor ?? 40) : 100 - pctImob)
    const pctCaptTotal = paramPctCapt ?? (hasCaptador ? (config?.percentual_captador ?? 10) : 0)

    // Usar cálculo centralizado e padronizado
    const calc = calcularDivisaoComissao({
      valorBase,
      formaPagamento,
      temCaptador: hasCaptador,
      numCaptadores,
      pctImobConfig: pctImob,
      pctCorrConfig: pctCorr,
      pctCaptConfig: pctCaptTotal,
      aliquotaImposto: 6,
    })

    const valCorr = calc.valorCorretor
    const valCaptTotal = calc.valorCaptadorTotal
    const valImobTotal = calc.valorImobiliariaLiquido
    const valImposto = calc.valorImposto

    const dataIso = dataVenda || new Date().toISOString()
    const prefixoDesc = ehComplementar
      ? 'Recebimento complementar comissão'
      : 'Recebimento comissão'

    // Obter dados do corretor e dos captadores para descrição legível
    let corretorNome = 'Corretor'
    const captadoresNomes: Record<string, string> = {}

    try {
      if (corretorId) {
        const cRec = await pb.collection('corretores').getOne<Corretor>(corretorId)
        corretorNome = cRec.nome
      }
      for (const cId of captadores) {
        try {
          const captRec = await pb.collection('corretores').getOne<Corretor>(cId)
          captadoresNomes[cId] = captRec.nome
        } catch {
          captadoresNomes[cId] = 'Captador'
        }
      }
    } catch {
      /* intentionally ignored */
    }

    // 1. Criar UMA transação de Entrada (categoria "comissao") com o valor recebido
    const tagForma = formaPagamento === 'Separada' ? ' [Separada]' : ' [Centralizada]'
    await pb.collection('transacoes').create({
      tipo: 'entrada',
      descricao: `${prefixoDesc} - ${tituloImovel}${tagForma}`,
      categoria: 'comissao',
      valor: valorBase,
      data: dataIso,
      data_competencia: dataCompetencia || dataIso,
      data_vencimento: dataIso,
      consolidado: false,
      venda: vendaId,
      user: userId,
    })

    // 2. Gerar Saída Pendente para Corretor (40% sobre base líquida na Centralizada ou integral na Separada)
    // Nas duas formas, a imobiliária gera saídas pendentes de corretor e captador(es)
    if (valCorr > 0) {
      const detalheForma =
        formaPagamento === 'Centralizada' ? ' [Centralizada pós-imposto]' : ' [Separada]'
      await pb.collection('transacoes').create({
        tipo: 'saida',
        descricao: `Repasse comissão corretor (${corretorNome})${detalheForma} - ${tituloImovel}${ehComplementar ? ' (Complementar)' : ''}`,
        categoria: 'repasse',
        valor: valCorr,
        data: dataIso,
        data_competencia: dataCompetencia || dataIso,
        data_vencimento: dataIso,
        consolidado: false,
        venda: vendaId,
        user: userId,
      })
    }

    // 3. Gerar Saída Pendente para cada Captador (dividido igualmente entre eles)
    if (hasCaptador && valCaptTotal > 0) {
      const valPorCaptador = calc.valorPorCaptador
      const pctPorCaptador = calc.pctPorCaptador
      const detalheForma =
        formaPagamento === 'Centralizada' ? ' [Centralizada pós-imposto]' : ' [Separada]'

      for (const cId of captadores) {
        const nomeCapt = captadoresNomes[cId] || 'Captador'
        const descDivisao = numCaptadores > 1 ? ` (${pctPorCaptador}% cada)` : ''

        await pb.collection('transacoes').create({
          tipo: 'saida',
          descricao: `Repasse comissão captador (${nomeCapt})${descDivisao}${detalheForma} - ${tituloImovel}${ehComplementar ? ' (Complementar)' : ''}`,
          categoria: 'repasse',
          valor: valPorCaptador,
          data: dataIso,
          data_competencia: dataCompetencia || dataIso,
          data_vencimento: dataIso,
          consolidado: false,
          venda: vendaId,
          user: userId,
        })
      }
    }

    // 4. Gerar Saída Pendente de Imposto (6% sobre total se Centralizada, ou 6% sobre parte da imob se Separada)
    if (valImposto > 0) {
      const descImposto =
        formaPagamento === 'Separada'
          ? `Imposto Simples Nacional (6% s/ parte Imob) - ${tituloImovel}${ehComplementar ? ' (Complementar)' : ''}`
          : `Imposto Simples Nacional (6% total) - ${tituloImovel}${ehComplementar ? ' (Complementar)' : ''}`

      await pb.collection('transacoes').create({
        tipo: 'saida',
        descricao: descImposto,
        categoria: 'imposto',
        valor: valImposto,
        data: dataIso,
        data_competencia: dataCompetencia || dataIso,
        data_vencimento: dataIso,
        consolidado: false,
        venda: vendaId,
        user: userId,
      })
    }

    // 5. Registrar também em comissoes para histórico e relatórios de comissão
    // Imobiliária (registra valor líquido que restou para a imobiliária)
    await pb.collection('comissoes').create({
      venda: vendaId,
      parte: 'imobiliaria',
      percentual: calc.pctImobiliaria,
      valor: valImobTotal,
      status: 'recebida',
      data_recebimento: dataIso,
      user: userId,
    })

    // Corretor
    if (valCorr > 0) {
      await pb.collection('comissoes').create({
        venda: vendaId,
        parte: 'corretor',
        corretor: corretorId,
        percentual: calc.pctCorretor,
        valor: valCorr,
        status: 'pendente',
        user: userId,
      })
    }

    // Captadores (lançamento individual para cada corretor captador)
    if (hasCaptador && valCaptTotal > 0) {
      const valPorCaptador = calc.valorPorCaptador
      const pctPorCaptador = calc.pctPorCaptador

      for (const cId of captadores) {
        await pb.collection('comissoes').create({
          venda: vendaId,
          parte: 'captador',
          corretor: cId,
          percentual: pctPorCaptador,
          valor: valPorCaptador,
          status: 'pendente',
          user: userId,
        })
      }
    }
  },
}

// Comissoes Service
export const ComissaoService = {
  async getAll(filter?: string): Promise<Comissao[]> {
    return await pb.collection('comissoes').getFullList<Comissao>({
      filter,
      sort: '-created',
      expand: 'venda,corretor,venda.corretor,venda.captador,venda.captadores',
    })
  },
  async registrarRecebimento(comissaoId: string, userId: string): Promise<void> {
    const comissao = await pb.collection('comissoes').getOne<Comissao>(comissaoId, {
      expand: 'venda',
    })

    const now = new Date()
    const todayIso = now.toISOString()
    const year = now.getFullYear()

    // 1. Mark commission as recebida
    await pb.collection('comissoes').update(comissaoId, {
      status: 'recebida',
      data_recebimento: todayIso,
    })

    const vendaTitulo = comissao.expand?.venda?.titulo_imovel || 'Imóvel'
    const clienteNome = comissao.expand?.venda?.cliente || 'Cliente'

    // 2. Create entry transaction (comissao)
    await pb.collection('transacoes').create({
      tipo: 'entrada',
      descricao: `Recebimento comissão - ${vendaTitulo}`,
      categoria: 'comissao',
      valor: comissao.valor,
      data: todayIso,
      consolidado: false,
      venda: comissao.venda,
      comissao: comissao.id,
      user: userId,
    })

    // 3. Generate unique invoice number NF-YYYY-NNNN
    const countNFs = await pb.collection('notas_fiscais').getList(1, 1, {
      filter: `numero ~ "NF-${year}"`,
      sort: '-created',
    })
    const nextNum = (countNFs.totalItems + 1).toString().padStart(4, '0')
    const nfNumero = `NF-${year}-${nextNum}`

    // 4. Calculate 6% tax
    const taxa = 6
    const valorImposto = (comissao.valor * taxa) / 100

    // 5. Create invoice
    await pb.collection('notas_fiscais').create({
      numero: nfNumero,
      venda: comissao.venda,
      cliente: clienteNome,
      valor: comissao.valor,
      taxa,
      valor_imposto: valorImposto,
      data_emissao: todayIso,
      status: 'emitida',
      user: userId,
    })

    // 6. Create exit transaction for tax (imposto)
    await pb.collection('transacoes').create({
      tipo: 'saida',
      descricao: `Imposto Simples Nacional (6%) - ${nfNumero}`,
      categoria: 'imposto',
      valor: valorImposto,
      data: todayIso,
      consolidado: false,
      venda: comissao.venda,
      user: userId,
    })
  },
  async registrarPagamento(comissaoId: string, userId: string): Promise<void> {
    const comissao = await pb.collection('comissoes').getOne<Comissao>(comissaoId, {
      expand: 'venda,corretor',
    })

    const now = new Date()
    const todayIso = now.toISOString()

    // 1. Mark commission as paga
    await pb.collection('comissoes').update(comissaoId, {
      status: 'paga',
      data_recebimento: todayIso,
    })

    const corretorNome = comissao.expand?.corretor?.nome || 'Corretor'
    const vendaTitulo = comissao.expand?.venda?.titulo_imovel || 'Imóvel'
    const roleLabel = comissao.parte === 'captador' ? 'captador' : 'corretor'

    // 2. Create exit transaction for repasse
    await pb.collection('transacoes').create({
      tipo: 'saida',
      descricao: `Repasse comissão ${roleLabel} (${corretorNome}) - ${vendaTitulo}`,
      categoria: 'repasse',
      valor: comissao.valor,
      data: todayIso,
      consolidado: false,
      venda: comissao.venda,
      comissao: comissao.id,
      user: userId,
    })
  },
  async markAsPaid(comissaoId: string): Promise<void> {
    const userId = pb.authStore.record?.id
    if (!userId) throw new Error('Usuário não autenticado')
    return this.registrarPagamento(comissaoId, userId)
  },
}

// Metas VGV Service
export const MetaVGVService = {
  async getAll(): Promise<MetaVGV[]> {
    return await pb.collection('metas_vgv').getFullList<MetaVGV>({
      sort: '-data_inicio',
    })
  },
  async create(data: Partial<MetaVGV>): Promise<MetaVGV> {
    return await pb.collection('metas_vgv').create<MetaVGV>(data)
  },
  async update(id: string, data: Partial<MetaVGV>): Promise<MetaVGV> {
    return await pb.collection('metas_vgv').update<MetaVGV>(id, data)
  },
  async delete(id: string): Promise<boolean> {
    return await pb.collection('metas_vgv').delete(id)
  },
}

export const MetaService = {
  async getAll(): Promise<MetaVGV[]> {
    return await pb.collection('metas_vgv').getFullList<MetaVGV>({
      sort: '-data_inicio',
    })
  },
  async create(data: Partial<MetaVGV>): Promise<MetaVGV> {
    return await pb.collection('metas_vgv').create<MetaVGV>(data)
  },
  async update(id: string, data: Partial<MetaVGV>): Promise<MetaVGV> {
    return await pb.collection('metas_vgv').update<MetaVGV>(id, data)
  },
  async delete(id: string): Promise<boolean> {
    return await pb.collection('metas_vgv').delete(id)
  },
}

// Transacoes Service
export const TransacaoService = {
  async getAll(filter?: string): Promise<Transacao[]> {
    return await pb.collection('transacoes').getFullList<Transacao>({
      filter,
      sort: '-data',
      expand: 'venda,comissao',
    })
  },
  async create(data: Partial<Transacao>): Promise<Transacao> {
    return await pb.collection('transacoes').create<Transacao>(data)
  },
  async createRecorrente(data: {
    tipo: TransacaoTipo
    descricao: string
    categoria: TransacaoCategoria
    valor: number
    data: string // YYYY-MM-DD or ISO
    data_competencia_iso?: string // ISO string of starting competence
    data_vencimento?: string // YYYY-MM-DD or ISO
    recorrencia_meses: number
    user: string
  }): Promise<Transacao[]> {
    const totalMeses = Math.max(1, Math.min(60, Math.floor(Number(data.recorrencia_meses) || 1)))
    const baseDescricao = data.descricao?.trim() || 'Transação'
    const valor = Number(data.valor)

    const baseRegistroDate = data.data.includes('T')
      ? new Date(data.data)
      : new Date(data.data + 'T12:00:00Z')

    const baseVencDate = data.data_vencimento
      ? data.data_vencimento.includes('T')
        ? new Date(data.data_vencimento)
        : new Date(data.data_vencimento + 'T12:00:00Z')
      : null

    const baseCompDate = data.data_competencia_iso ? new Date(data.data_competencia_iso) : null

    const createdRecords: Transacao[] = []

    for (let i = 0; i < totalMeses; i++) {
      const registroDate = i === 0 ? baseRegistroDate : addMonthsToDate(baseRegistroDate, i)
      const vencDate = baseVencDate ? addMonthsToDate(baseVencDate, i) : undefined
      const compDate = baseCompDate ? addMonthsToDate(baseCompDate, i) : undefined

      const parcelaSuffix = totalMeses > 1 ? ` (${i + 1}/${totalMeses})` : ''
      const descFinal = `${baseDescricao}${parcelaSuffix}`

      const payload: Partial<Transacao> = {
        tipo: data.tipo,
        descricao: descFinal,
        categoria: data.categoria,
        valor,
        data: registroDate.toISOString(),
        data_competencia: compDate ? compDate.toISOString() : undefined,
        data_vencimento: vencDate ? vencDate.toISOString() : undefined,
        consolidado: false,
        status: 'Pendente',
        user: data.user,
      }

      const rec = await this.create(payload)
      createdRecords.push(rec)
    }

    return createdRecords
  },
  async update(id: string, data: Partial<Transacao>): Promise<Transacao> {
    const updated = await pb.collection('transacoes').update<Transacao>(id, data)

    // Se houver despesa vinculada e o status mudou, sincronizar despesa
    if (updated.despesa && (data.status !== undefined || data.consolidado !== undefined)) {
      try {
        const nextStatus =
          data.status === 'Pago' || (data.consolidado && data.status !== 'Pendente')
            ? 'Pago'
            : data.status === 'Cancelado'
              ? 'Cancelado'
              : 'Pendente'
        await pb.collection('despesas').update(updated.despesa, { status: nextStatus })
      } catch (e) {
        console.warn('Erro ao sincronizar despesa a partir da transação:', e)
      }
    }

    return updated
  },
  async delete(id: string): Promise<boolean> {
    return await pb.collection('transacoes').delete(id)
  },
}

// Helper to add months preserving day or clamping to end of month (using UTC for date-only consistency)
function addMonthsToDate(date: Date, monthsToAdd: number): Date {
  const result = new Date(date.getTime())
  const originalDay = result.getUTCDate()
  const currentMonth = result.getUTCMonth()
  const currentYear = result.getUTCFullYear()

  const targetTotalMonths = currentMonth + monthsToAdd
  const targetYear = currentYear + Math.floor(targetTotalMonths / 12)
  const targetMonth = ((targetTotalMonths % 12) + 12) % 12

  // Set to 1st of target month first
  result.setUTCFullYear(targetYear)
  result.setUTCMonth(targetMonth, 1)

  // Find max days in the target month (day 0 of targetMonth + 1 in targetYear)
  const maxDaysInTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate()
  result.setUTCDate(Math.min(originalDay, maxDaysInTargetMonth))

  return result
}

// Despesas Service
export const DespesaService = {
  async getAll(filter?: string): Promise<Despesa[]> {
    return await pb.collection('despesas').getFullList<Despesa>({
      filter,
      sort: '-data_vencimento,-data',
    })
  },
  async create(data: Partial<Despesa>, userId: string): Promise<Despesa> {
    const isPaid = data.status === 'Pago'
    const record = await pb.collection('despesas').create<Despesa>({
      ...data,
      user: userId,
    })

    // Automatically create exit transaction linked to the expense
    try {
      await pb.collection('transacoes').create({
        tipo: 'saida',
        descricao: record.descricao,
        categoria: record.categoria,
        valor: record.valor,
        data: record.data,
        data_competencia: record.data_competencia || null,
        data_vencimento: record.data_vencimento || null,
        status: record.status || 'Pendente',
        observacoes: record.observacoes || '',
        consolidado: isPaid,
        despesa: record.id,
        user: userId,
      })
    } catch (e) {
      console.warn('Erro ao criar transação para despesa:', e)
    }

    return record
  },
  async createRecorrente(
    data: {
      descricao?: string
      categoria: DespesaCategoria
      valor: number
      data_registro?: string
      data_competencia_mes?: string // YYYY-MM
      data_vencimento: string // YYYY-MM-DD
      status?: 'Pendente' | 'Pago' | 'Cancelado'
      recorrencia_meses: number
      observacoes?: string
    },
    userId: string,
  ): Promise<Despesa[]> {
    const totalMeses = Math.max(1, Math.min(60, Math.floor(Number(data.recorrencia_meses) || 1)))
    const baseDescricao = data.descricao?.trim() || ''
    const status = data.status || 'Pendente'
    const valor = Number(data.valor)
    const categoria = data.categoria || 'outros'
    const observacoes = data.observacoes?.trim() || ''

    // Data de vencimento base
    const baseVencDate = data.data_vencimento
      ? data.data_vencimento.includes('T')
        ? new Date(data.data_vencimento)
        : new Date(data.data_vencimento + 'T12:00:00Z')
      : new Date()

    // Data de competência base
    let baseCompDate: Date
    if (data.data_competencia_mes) {
      const [anoStr, mesStr] = data.data_competencia_mes.split('-')
      baseCompDate = new Date(Date.UTC(parseInt(anoStr, 10), parseInt(mesStr, 10) - 1, 1, 12, 0, 0))
    } else {
      // Usa o mês e ano do vencimento ou data atual
      baseCompDate = new Date(
        Date.UTC(baseVencDate.getUTCFullYear(), baseVencDate.getUTCMonth(), 1, 12, 0, 0),
      )
    }

    const baseRegistroDate = data.data_registro
      ? data.data_registro.includes('T')
        ? new Date(data.data_registro)
        : new Date(data.data_registro + 'T12:00:00Z')
      : new Date()

    const createdRecords: Despesa[] = []

    for (let i = 0; i < totalMeses; i++) {
      // Incrementar 1 mês para cada parcela subsequente
      const vencDate = addMonthsToDate(baseVencDate, i)
      const compDate = addMonthsToDate(baseCompDate, i)

      // Data de registro para parcelas futuras
      const registroDate = i === 0 ? baseRegistroDate : addMonthsToDate(baseRegistroDate, i)

      const parcelaSuffix = totalMeses > 1 ? ` (${i + 1}/${totalMeses})` : ''
      const descFinal = baseDescricao
        ? `${baseDescricao}${parcelaSuffix}`
        : totalMeses > 1
          ? `Despesa (${i + 1}/${totalMeses})`
          : 'Despesa'

      const despesaPayload: Partial<Despesa> = {
        descricao: descFinal,
        categoria,
        valor,
        data: registroDate.toISOString(),
        data_competencia: compDate.toISOString(),
        data_vencimento: vencDate.toISOString(),
        recorrente: totalMeses > 1,
        frequencia: totalMeses > 1 ? 'mensal' : undefined,
        ativa: true,
        status,
        observacoes,
      }

      const rec = await this.create(despesaPayload, userId)
      createdRecords.push(rec)
    }

    return createdRecords
  },
  async update(id: string, data: Partial<Despesa>): Promise<Despesa> {
    const updated = await pb.collection('despesas').update<Despesa>(id, data)

    // Sincronizar transações vinculadas se o status, valor, descricao, data ou categoria mudou
    try {
      const linkedTransacoes = await pb.collection('transacoes').getFullList<Transacao>({
        filter: `despesa = "${id}"`,
      })

      const isPaid = data.status === 'Pago'
      const tPayload: Partial<Transacao> = {}
      if (data.status !== undefined) {
        tPayload.status = data.status
        tPayload.consolidado = isPaid
      }
      if (data.descricao !== undefined) tPayload.descricao = data.descricao
      if (data.valor !== undefined) tPayload.valor = data.valor
      if (data.categoria !== undefined) tPayload.categoria = data.categoria
      if (data.data !== undefined) tPayload.data = data.data
      if (data.data_competencia !== undefined) tPayload.data_competencia = data.data_competencia
      if (data.data_vencimento !== undefined) tPayload.data_vencimento = data.data_vencimento

      if (Object.keys(tPayload).length > 0) {
        for (const lt of linkedTransacoes) {
          await pb.collection('transacoes').update(lt.id, tPayload)
        }
      }
    } catch (e) {
      console.warn('Erro ao sincronizar transações vinculadas à despesa:', e)
    }

    return updated
  },
  async delete(id: string): Promise<boolean> {
    // Excluir também transações vinculadas
    try {
      const linkedTransacoes = await pb.collection('transacoes').getFullList<Transacao>({
        filter: `despesa = "${id}"`,
      })
      for (const lt of linkedTransacoes) {
        await pb.collection('transacoes').delete(lt.id)
      }
    } catch (e) {
      console.warn('Erro ao excluir transações vinculadas à despesa:', e)
    }

    return await pb.collection('despesas').delete(id)
  },
}

// Notas Fiscais Service
export const NotaFiscalService = {
  async getAll(filter?: string): Promise<NotaFiscal[]> {
    return await pb.collection('notas_fiscais').getFullList<NotaFiscal>({
      filter,
      sort: '-data_emissao',
      expand: 'venda',
    })
  },
  async create(data: {
    numero?: string
    venda?: string
    cliente: string
    valor: number
    taxa?: number
    data_emissao: string
    userId: string
  }): Promise<NotaFiscal> {
    const year = new Date(data.data_emissao).getFullYear()
    let numero = data.numero
    if (!numero || numero.trim() === '') {
      const countNFs = await pb.collection('notas_fiscais').getList(1, 1, {
        filter: `numero ~ "NF-${year}"`,
        sort: '-created',
      })
      const nextNum = (countNFs.totalItems + 1).toString().padStart(4, '0')
      numero = `NF-${year}-${nextNum}`
    }

    const taxa = data.taxa ?? 6
    const valor_imposto = (data.valor * taxa) / 100

    return await pb.collection('notas_fiscais').create<NotaFiscal>({
      numero,
      venda: data.venda || null,
      cliente: data.cliente,
      valor: data.valor,
      taxa,
      valor_imposto,
      data_emissao: data.data_emissao,
      status: 'emitida',
      user: data.userId,
    })
  },
  async cancel(id: string): Promise<NotaFiscal> {
    return await pb.collection('notas_fiscais').update<NotaFiscal>(id, {
      status: 'cancelada',
    })
  },
}

// Fechamentos Service
export const FechamentoService = {
  async getAll(): Promise<Fechamento[]> {
    return await pb.collection('fechamentos').getFullList<Fechamento>({
      sort: '-ano,-mes',
    })
  },
  async getByMonthYear(mes: number, ano: number): Promise<Fechamento | null> {
    try {
      return await pb
        .collection('fechamentos')
        .getFirstListItem<Fechamento>(`mes = ${mes} && ano = ${ano}`)
    } catch {
      return null
    }
  },
  async getByMesAno(mes: number, ano: number): Promise<Fechamento | null> {
    return this.getByMonthYear(mes, ano)
  },
  async fecharMes(params: {
    mes: number
    ano: number
    receita_bruta?: number
    despesas?: number
    impostos?: number
    resultado_liquido?: number
    total_vgv?: number
    total_comissoes?: number
    total_entradas?: number
    total_saidas?: number
    lucro_liquido?: number
    snapshot?: any
    userId?: string
    fechado_por?: string
  }): Promise<Fechamento> {
    const now = new Date().toISOString()
    const userId = params.userId || params.fechado_por || pb.authStore.record?.id || ''
    const record = await pb.collection('fechamentos').create<Fechamento>({
      mes: params.mes,
      ano: params.ano,
      receita_bruta: params.receita_bruta ?? params.total_entradas ?? 0,
      despesas: params.despesas ?? params.total_saidas ?? 0,
      impostos: params.impostos ?? 0,
      resultado_liquido: params.resultado_liquido ?? params.lucro_liquido ?? 0,
      snapshot: params.snapshot ?? {},
      status: 'fechado',
      total_vgv: params.total_vgv,
      total_comissoes: params.total_comissoes,
      total_entradas: params.total_entradas,
      total_saidas: params.total_saidas,
      lucro_liquido: params.lucro_liquido,
      data_fechamento: now,
      fechado_em: now,
      fechado_por: userId,
      user: userId,
    })

    // Mark transactions in this month as consolidado
    try {
      const startIso = new Date(Date.UTC(params.ano, params.mes - 1, 1)).toISOString().split('T')[0]
      const endIso = new Date(Date.UTC(params.ano, params.mes, 0, 23, 59, 59))
        .toISOString()
        .split('T')[0]

      const transacoes = await pb.collection('transacoes').getFullList({
        filter: `data >= "${startIso} 00:00:00.000Z" && data <= "${endIso} 23:59:59.999Z"`,
      })

      for (const t of transacoes) {
        await pb.collection('transacoes').update(t.id, { consolidado: true })
      }
    } catch {
      /* intentionally ignored */
    }

    return record
  },
  async reabrirMes(id: string): Promise<boolean> {
    return await pb.collection('fechamentos').delete(id)
  },
}
