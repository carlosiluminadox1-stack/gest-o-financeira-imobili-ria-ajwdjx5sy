import pb from '@/lib/pocketbase/client'
import {
  Venda,
  Corretor,
  Comissao,
  MetaVGV,
  Transacao,
  Despesa,
  NotaFiscal,
  Fechamento,
  Configuracoes,
} from '@/types'

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

// Vendas Service with automatic commission distribution
export const VendaService = {
  async getAll(filter?: string): Promise<Venda[]> {
    return await pb.collection('vendas').getFullList<Venda>({
      filter,
      sort: '-data_venda',
      expand: 'corretor,captador',
    })
  },
  async getById(id: string): Promise<Venda> {
    return await pb.collection('vendas').getOne<Venda>(id, {
      expand: 'corretor,captador',
    })
  },
  async create(data: {
    titulo_imovel: string
    cliente: string
    corretor: string
    captador?: string
    valor_vgv: number
    percentual_comissao: number
    data_venda: string
    status: 'realizada' | 'pendente' | 'cancelada'
    userId: string
  }): Promise<Venda> {
    const valor_comissao = (data.valor_vgv * data.percentual_comissao) / 100

    const record = await pb.collection('vendas').create<Venda>({
      titulo_imovel: data.titulo_imovel,
      cliente: data.cliente,
      corretor: data.corretor,
      captador: data.captador || null,
      valor_vgv: data.valor_vgv,
      percentual_comissao: data.percentual_comissao,
      valor_comissao,
      data_venda: data.data_venda,
      status: data.status,
      user: data.userId,
    })

    // If status is "realizada", automatically create commissions
    if (data.status === 'realizada') {
      await this.generateCommissions(
        record.id,
        valor_comissao,
        data.corretor,
        data.captador,
        data.userId,
      )
    }

    return record
  },
  async update(id: string, data: Partial<Venda>, userId: string): Promise<Venda> {
    const prev = await pb.collection('vendas').getOne<Venda>(id)
    const valor_vgv = data.valor_vgv !== undefined ? data.valor_vgv : prev.valor_vgv
    const percentual_comissao =
      data.percentual_comissao !== undefined ? data.percentual_comissao : prev.percentual_comissao
    const valor_comissao = (valor_vgv * percentual_comissao) / 100

    const updated = await pb.collection('vendas').update<Venda>(id, {
      ...data,
      valor_comissao,
    })

    // If newly marked as realizada and had no commissions
    if (updated.status === 'realizada' && prev.status !== 'realizada') {
      const existingComms = await pb
        .collection('comissoes')
        .getFullList({ filter: `venda = "${id}"` })
      if (existingComms.length === 0) {
        await this.generateCommissions(
          id,
          valor_comissao,
          updated.corretor,
          updated.captador,
          userId,
        )
      }
    }

    return updated
  },
  async delete(id: string): Promise<boolean> {
    // Check if any commission was received or paid
    const commissions = await pb.collection('comissoes').getFullList<Comissao>({
      filter: `venda = "${id}"`,
    })

    const hasPaidOrReceived = commissions.some(
      (c) => c.status === 'recebida' || c.status === 'paga',
    )
    if (hasPaidOrReceived) {
      throw new Error('Não é possível excluir venda com comissões já recebidas ou pagas.')
    }

    // Delete associated commissions
    for (const c of commissions) {
      await pb.collection('comissoes').delete(c.id)
    }

    return await pb.collection('vendas').delete(id)
  },
  async generateCommissions(
    vendaId: string,
    valor_comissao: number,
    corretorId: string,
    captadorId?: string,
    userId?: string,
  ) {
    let config: Configuracoes | null = null
    if (userId) {
      config = await ConfigService.getForUser(userId)
    }

    const pctImob = config?.percentual_imobiliaria ?? 50
    const hasCaptador = Boolean(captadorId && captadorId.trim().length > 0)
    const pctCorr = hasCaptador ? (config?.percentual_corretor ?? 40) : 100 - pctImob
    const pctCapt = hasCaptador ? (config?.percentual_captador ?? 10) : 0

    const valImob = (valor_comissao * pctImob) / 100
    const valCorr = (valor_comissao * pctCorr) / 100
    const valCapt = hasCaptador ? (valor_comissao * pctCapt) / 100 : 0

    // 1. Imobiliaria commission
    await pb.collection('comissoes').create({
      venda: vendaId,
      parte: 'imobiliaria',
      percentual: pctImob,
      valor: valImob,
      status: 'pendente',
      user: userId,
    })

    // 2. Corretor commission
    await pb.collection('comissoes').create({
      venda: vendaId,
      parte: 'corretor',
      corretor: corretorId,
      percentual: pctCorr,
      valor: valCorr,
      status: 'pendente',
      user: userId,
    })

    // 3. Captador commission
    if (hasCaptador && valCapt > 0) {
      await pb.collection('comissoes').create({
        venda: vendaId,
        parte: 'captador',
        corretor: captadorId,
        percentual: pctCapt,
        valor: valCapt,
        status: 'pendente',
        user: userId,
      })
    }
  },
}

// Comissoes Service
export const ComissaoService = {
  async getAll(filter?: string): Promise<Comissao[]> {
    return await pb.collection('comissoes').getFullList<Comissao>({
      filter,
      sort: '-created',
      expand: 'venda,corretor,venda.corretor,venda.captador',
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
}

// Metas VGV Service
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
  async update(id: string, data: Partial<Transacao>): Promise<Transacao> {
    return await pb.collection('transacoes').update<Transacao>(id, data)
  },
  async delete(id: string): Promise<boolean> {
    return await pb.collection('transacoes').delete(id)
  },
}

// Despesas Service
export const DespesaService = {
  async getAll(filter?: string): Promise<Despesa[]> {
    return await pb.collection('despesas').getFullList<Despesa>({
      filter,
      sort: '-data',
    })
  },
  async create(data: Partial<Despesa>, userId: string): Promise<Despesa> {
    const record = await pb.collection('despesas').create<Despesa>({
      ...data,
      user: userId,
    })

    // Automatically create exit transaction for the expense
    await pb.collection('transacoes').create({
      tipo: 'saida',
      descricao: record.descricao,
      categoria: record.categoria,
      valor: record.valor,
      data: record.data,
      consolidado: false,
      user: userId,
    })

    return record
  },
  async update(id: string, data: Partial<Despesa>): Promise<Despesa> {
    return await pb.collection('despesas').update<Despesa>(id, data)
  },
  async delete(id: string): Promise<boolean> {
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
  async fecharMes(params: {
    mes: number
    ano: number
    receita_bruta: number
    despesas: number
    impostos: number
    resultado_liquido: number
    snapshot: any
    userId: string
  }): Promise<Fechamento> {
    const now = new Date().toISOString()
    const record = await pb.collection('fechamentos').create<Fechamento>({
      mes: params.mes,
      ano: params.ano,
      receita_bruta: params.receita_bruta,
      despesas: params.despesas,
      impostos: params.impostos,
      resultado_liquido: params.resultado_liquido,
      snapshot: params.snapshot,
      data_fechamento: now,
      user: params.userId,
    })

    // Mark transactions in this month as consolidado
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

    return record
  },
}
