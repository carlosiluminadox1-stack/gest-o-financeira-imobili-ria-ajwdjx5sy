import React, { useState, useEffect, useMemo } from 'react'
import {
  Plus,
  Search,
  ArrowUpDown,
  Trash2,
  Edit2,
  TrendingUp,
  Building,
  User,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  Layers,
  Receipt,
  PieChart as PieChartIcon,
  HelpCircle,
  Users,
  X,
} from 'lucide-react'
import { VendaService, CorretorService, ConfigService } from '@/services/imobService'
import {
  Venda,
  Corretor,
  VendaStatus,
  Configuracoes,
  SituacaoRecebimento,
  FormaPagamento,
} from '@/types'
import { useAuth } from '@/context/AuthContext'
import { usePeriodo } from '@/context/PeriodoContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

export default function Vendas() {
  const { user } = useAuth()
  const { periodo, getPeriodoDates } = usePeriodo()
  const [vendas, setVendas] = useState<Venda[]>([])
  const [corretores, setCorretores] = useState<Corretor[]>([])
  const [config, setConfig] = useState<Configuracoes | null>(null)
  const [loading, setLoading] = useState(true)

  // Filtros & Busca
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('todos')
  const [recebimentoFilter, setRecebimentoFilter] = useState<string>('todos')
  const [formaFilter, setFormaFilter] = useState<string>('todos')
  const [sortField, setSortField] = useState<'data_venda' | 'valor_vgv'>('data_venda')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // Modal Nova Venda / Edição
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingVenda, setEditingVenda] = useState<Venda | null>(null)
  const [saving, setSaving] = useState(false)

  // Campos do formulário
  const [formTitulo, setFormTitulo] = useState('')
  const [formCliente, setFormCliente] = useState('')
  const [formCorretor, setFormCorretor] = useState('')
  const [formCaptadores, setFormCaptadores] = useState<string[]>([])
  const [formVgv, setFormVgv] = useState<number | ''>('')
  const [formPctComissao, setFormPctComissao] = useState<number>(6)
  const [formValorComissaoManual, setFormValorComissaoManual] = useState<number | ''>('')
  const [isComissaoManual, setIsComissaoManual] = useState(false)
  const [formFormaPagamento, setFormFormaPagamento] = useState<FormaPagamento>('Centralizada')
  const [formSituacaoRecebimento, setFormSituacaoRecebimento] =
    useState<SituacaoRecebimento>('Recebido')
  const [formValorRecebido, setFormValorRecebido] = useState<number | ''>('')
  const [formDataVenda, setFormDataVenda] = useState(new Date().toISOString().split('T')[0])
  const [formStatus, setFormStatus] = useState<VendaStatus>('realizada')
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Modal Exclusão
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [vList, cList, userConfig] = await Promise.all([
        VendaService.getAll(),
        CorretorService.getAll(),
        user ? ConfigService.getForUser(user.id) : null,
      ])
      setVendas(vList)
      setCorretores(cList)
      setConfig(userConfig)
      if (userConfig?.percentual_comissao_padrao) {
        setFormPctComissao(userConfig.percentual_comissao_padrao)
      }
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar vendas.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user])

  const { start, end } = useMemo(() => getPeriodoDates(periodo), [periodo, getPeriodoDates])

  // Filtragem e ordenação
  const filteredVendas = useMemo(() => {
    return vendas
      .filter((v) => {
        // Período
        const d = new Date(v.data_venda)
        if (d < start || d > end) return false

        // Status
        if (statusFilter !== 'todos' && v.status !== statusFilter) return false

        // Situação do Recebimento
        if (recebimentoFilter !== 'todos') {
          const sit = v.situacao_recebimento || 'Recebido'
          if (sit !== recebimentoFilter) return false
        }

        // Forma de Pagamento
        if (formaFilter !== 'todos') {
          const forma = v.forma_pagamento || 'Centralizada'
          if (forma !== formaFilter) return false
        }

        // Busca
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase()
          const matchTitulo = v.titulo_imovel.toLowerCase().includes(term)
          const matchCliente = v.cliente?.toLowerCase().includes(term)
          const matchCorretor = v.expand?.corretor?.nome?.toLowerCase().includes(term)
          return matchTitulo || matchCliente || matchCorretor
        }
        return true
      })
      .sort((a, b) => {
        if (sortField === 'data_venda') {
          const da = new Date(a.data_venda).getTime()
          const db = new Date(b.data_venda).getTime()
          return sortDirection === 'asc' ? da - db : db - da
        } else {
          return sortDirection === 'asc' ? a.valor_vgv - b.valor_vgv : b.valor_vgv - a.valor_vgv
        }
      })
  }, [
    vendas,
    start,
    end,
    statusFilter,
    recebimentoFilter,
    formaFilter,
    searchTerm,
    sortField,
    sortDirection,
  ])

  // Cálculo da comissão total
  const vgvNumber = typeof formVgv === 'number' ? formVgv : 0
  const valorComissaoCalculado =
    isComissaoManual && typeof formValorComissaoManual === 'number'
      ? formValorComissaoManual
      : (vgvNumber * formPctComissao) / 100

  // Base efetiva de cálculo sobre o que a imobiliária recebeu
  const valorBaseCalculo = useMemo(() => {
    if (formSituacaoRecebimento === 'Recebido') {
      return valorComissaoCalculado
    }
    return typeof formValorRecebido === 'number' ? formValorRecebido : 0
  }, [formSituacaoRecebimento, valorComissaoCalculado, formValorRecebido])

  // Percentuais configurados
  const pctImobConfig = config?.percentual_imobiliaria ?? 50
  const numCaptadores = formCaptadores.length
  const hasCaptador = numCaptadores > 0
  const pctCorrConfig = hasCaptador ? (config?.percentual_corretor ?? 40) : 100 - pctImobConfig
  const pctCaptTotalConfig = hasCaptador ? (config?.percentual_captador ?? 10) : 0
  const pctPorCaptador = numCaptadores > 0 ? pctCaptTotalConfig / numCaptadores : 0
  const pctImpostoConfig = 6 // Alíquota do Simples Nacional (6%)

  // Valores calculados sobre a base recebida
  const valCorr = (valorBaseCalculo * pctCorrConfig) / 100
  const valCaptTotal = hasCaptador ? (valorBaseCalculo * pctCaptTotalConfig) / 100 : 0
  const valPorCaptador = numCaptadores > 0 ? valCaptTotal / numCaptadores : 0

  // Parte da imobiliária (ex: 50% ou restante)
  const pctParteImob = 100 - pctCorrConfig - pctCaptTotalConfig
  const valBaseImobiliaria = (valorBaseCalculo * pctParteImob) / 100

  // Imposto conforme forma de pagamento:
  // Centralizada: 6% sobre o valor TOTAL recebido
  // Separada: 6% APENAS sobre a parte da imobiliária
  const valImposto =
    formFormaPagamento === 'Separada'
      ? (valBaseImobiliaria * pctImpostoConfig) / 100
      : (valorBaseCalculo * pctImpostoConfig) / 100

  // Líquido Imobiliária:
  // Na Centralizada: Recebido total - Repasse Corretor - Repasse Captador - Imposto (6% total) = 44% no padrão (ex: 8.800 de 20.000)
  // Na Separada: Parte Imob (50%) - Imposto (6% sobre 50% = 3%) = 47% do total (ou 50% - 6% da parte imob)
  const valImobLiquido = valorBaseCalculo - valCorr - valCaptTotal - valImposto
  const valImobBruto = (valorBaseCalculo * pctImobConfig) / 100

  // Auxiliar para obter a lista de corretores captadores de uma venda
  const getCaptadoresVenda = (v: Venda): Corretor[] => {
    if (
      v.expand?.captadores &&
      Array.isArray(v.expand.captadores) &&
      v.expand.captadores.length > 0
    ) {
      return v.expand.captadores
    }
    if (v.captadores && v.captadores.length > 0) {
      return v.captadores
        .map((id) => corretores.find((c) => c.id === id))
        .filter((c): c is Corretor => Boolean(c))
    }
    if (v.expand?.captador) {
      return [v.expand.captador]
    }
    if (v.captador) {
      const found = corretores.find((c) => c.id === v.captador)
      return found ? [found] : []
    }
    return []
  }

  const handleOpenCreateModal = () => {
    setEditingVenda(null)
    setFormTitulo('')
    setFormCliente('')
    setFormCorretor(corretores.find((c) => c.ativo)?.id || '')
    setFormCaptadores([])
    setFormVgv('')
    setFormPctComissao(config?.percentual_comissao_padrao ?? 6)
    setIsComissaoManual(false)
    setFormValorComissaoManual('')
    setFormFormaPagamento('Centralizada')
    setFormSituacaoRecebimento('Recebido')
    setFormValorRecebido('')
    setFormDataVenda(new Date().toISOString().split('T')[0])
    setFormStatus('realizada')
    setFormErrors({})
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (venda: Venda) => {
    setEditingVenda(venda)
    setFormTitulo(venda.titulo_imovel)
    setFormCliente(venda.cliente || '')
    setFormCorretor(venda.corretor)

    // Carregar múltiplos captadores se existirem
    if (venda.captadores && venda.captadores.length > 0) {
      setFormCaptadores(venda.captadores)
    } else if (venda.captador) {
      setFormCaptadores([venda.captador])
    } else {
      setFormCaptadores([])
    }

    setFormVgv(venda.valor_vgv)
    setFormPctComissao(venda.percentual_comissao)
    setIsComissaoManual(false)
    setFormValorComissaoManual(venda.valor_comissao)
    setFormFormaPagamento(venda.forma_pagamento || 'Centralizada')
    const sit = venda.situacao_recebimento || 'Recebido'
    setFormSituacaoRecebimento(sit)
    setFormValorRecebido(venda.valor_recebido ?? (sit === 'Recebido' ? venda.valor_comissao : ''))
    setFormDataVenda(new Date(venda.data_venda).toISOString().split('T')[0])
    setFormStatus(venda.status)
    setFormErrors({})
    setIsModalOpen(true)
  }

  const validateForm = () => {
    const errs: Record<string, string> = {}
    if (!formTitulo.trim()) errs.titulo = 'Título do imóvel é obrigatório'
    if (!formCorretor) errs.corretor = 'Selecione um corretor'
    if (!formVgv || Number(formVgv) <= 0) errs.vgv = 'Informe um valor de VGV válido'
    if (!formPctComissao || formPctComissao <= 0) errs.comissao = 'Informe o percentual'
    if (!formDataVenda) errs.data = 'Informe a data da venda'

    if (formSituacaoRecebimento === 'Parcial') {
      if (formValorRecebido === '' || Number(formValorRecebido) <= 0) {
        errs.valorRecebido = 'Informe o valor efetivamente recebido nesta etapa'
      } else if (Number(formValorRecebido) > valorComissaoCalculado) {
        errs.valorRecebido = 'O valor recebido não pode ser maior que a comissão total'
      }
    }

    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSaveVenda = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm() || !user) return

    setSaving(true)
    try {
      const dataIso = new Date(formDataVenda + 'T12:00:00Z').toISOString()
      const valRecFinal =
        formSituacaoRecebimento === 'Recebido' ? valorComissaoCalculado : Number(formValorRecebido)

      if (editingVenda) {
        await VendaService.update(
          editingVenda.id,
          {
            titulo_imovel: formTitulo,
            cliente: formCliente,
            corretor: formCorretor,
            captador: formCaptadores.length > 0 ? formCaptadores[0] : undefined,
            captadores: formCaptadores,
            valor_vgv: Number(formVgv),
            percentual_comissao: formPctComissao,
            forma_pagamento: formFormaPagamento,
            situacao_recebimento: formSituacaoRecebimento,
            valor_recebido: valRecFinal,
            data_venda: dataIso,
            status: formStatus,
          },
          user.id,
        )
        toast.success('Venda atualizada com sucesso!')
      } else {
        await VendaService.create({
          titulo_imovel: formTitulo,
          cliente: formCliente,
          corretor: formCorretor,
          captador: formCaptadores.length > 0 ? formCaptadores[0] : undefined,
          captadores: formCaptadores,
          valor_vgv: Number(formVgv),
          percentual_comissao: formPctComissao,
          forma_pagamento: formFormaPagamento,
          situacao_recebimento: formSituacaoRecebimento,
          valor_recebido: valRecFinal,
          data_venda: dataIso,
          status: formStatus,
          userId: user.id,
        })
        toast.success('Venda cadastrada e fluxos financeiros gerados com sucesso!')
      }
      setIsModalOpen(false)
      loadData()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || 'Erro ao salvar venda.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await VendaService.delete(deleteId)
      toast.success('Venda e transações vinculadas excluídas com sucesso!')
      setDeleteId(null)
      loadData()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao excluir venda.')
    } finally {
      setDeleting(false)
    }
  }

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const getStatusBadge = (st: VendaStatus) => {
    switch (st) {
      case 'realizada':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> Realizada
          </span>
        )
      case 'pendente':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3" /> Pendente
          </span>
        )
      case 'cancelada':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/20">
            <XCircle className="w-3 h-3" /> Cancelada
          </span>
        )
    }
  }

  const getSituacaoBadge = (sit?: SituacaoRecebimento) => {
    if (sit === 'Parcial') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
          <Clock className="w-3 h-3" /> Parcial
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
        <CheckCircle2 className="w-3 h-3" /> Recebido Total
      </span>
    )
  }

  const getFormaBadge = (forma?: FormaPagamento) => {
    if (forma === 'Separada') {
      return (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30"
          title="Cada parte recebe direto na sua conta. Imposto de 6% incide apenas sobre a parte da imobiliária."
        >
          Separada
        </span>
      )
    }
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30"
        title="Cliente paga tudo na conta da imobiliária. Imposto de 6% sobre o valor total."
      >
        Centralizada
      </span>
    )
  }

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-white tracking-tight truncate">
            Gestão de Vendas & VGV
          </h2>
          <p className="text-xs text-slate-400">
            Registro de negociações, divisões proporcionais e geração automática de entradas e
            saídas
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0 self-stretch sm:self-auto justify-between sm:justify-end">
          <span className="inline-flex px-3 py-2 rounded-xl bg-[#121722] border border-[#232A3B] text-xs font-semibold text-red-400">
            {getPeriodoDates(periodo).label}
          </span>
          <Button
            onClick={handleOpenCreateModal}
            className="bg-[#E63946] hover:bg-[#D62839] text-white font-bold text-xs h-10 px-4 rounded-xl shadow-lg shadow-[#E63946]/20 flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Venda</span>
          </Button>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-[#121722] border border-[#232A3B] rounded-2xl p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 shadow-md w-full">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            type="text"
            placeholder="Buscar por imóvel, cliente ou corretor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-[#0B0E14] border-[#232A3B] pl-9 text-xs text-slate-100 placeholder:text-slate-500 h-9 w-full"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro Status */}
          <div className="flex items-center bg-[#0B0E14] border border-[#232A3B] rounded-lg p-1 text-xs">
            {['todos', 'realizada', 'pendente', 'cancelada'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-md capitalize font-medium transition-all ${
                  statusFilter === st
                    ? 'bg-[#E63946] text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st === 'todos' ? 'Todos' : st}
              </button>
            ))}
          </div>

          {/* Filtro Forma de Pagamento */}
          <div className="flex items-center bg-[#0B0E14] border border-[#232A3B] rounded-lg p-1 text-xs">
            {[
              { id: 'todos', label: 'Todas Formas' },
              { id: 'Centralizada', label: 'Centralizada' },
              { id: 'Separada', label: 'Separada' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFormaFilter(f.id)}
                className={`px-2 py-1 rounded-md font-medium transition-all ${
                  formaFilter === f.id
                    ? 'bg-[#1A2234] text-white border border-[#232A3B]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Filtro Situação Recebimento */}
          <div className="flex items-center bg-[#0B0E14] border border-[#232A3B] rounded-lg p-1 text-xs">
            {[
              { id: 'todos', label: 'Todas Situações' },
              { id: 'Recebido', label: 'Recebido' },
              { id: 'Parcial', label: 'Parcial' },
            ].map((sit) => (
              <button
                key={sit.id}
                onClick={() => setRecebimentoFilter(sit.id)}
                className={`px-2 py-1 rounded-md font-medium transition-all ${
                  recebimentoFilter === sit.id
                    ? 'bg-[#1A2234] text-white border border-[#232A3B]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {sit.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              if (sortField === 'data_venda') {
                setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
              } else {
                setSortField('data_venda')
                setSortDirection('desc')
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B0E14] border border-[#232A3B] text-xs text-slate-300 hover:bg-[#1A2234] shrink-0"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {sortField === 'data_venda'
                ? `Data (${sortDirection === 'desc' ? 'Recentes' : 'Antigas'})`
                : 'Data'}
            </span>
          </button>
        </div>
      </div>

      {/* Vendas Table */}
      <div className="bg-[#121722] border border-[#232A3B] rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#232A3B] bg-[#0E121B] text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Imóvel & Cliente</th>
                <th className="py-3.5 px-4">Corretor / Captador</th>
                <th className="py-3.5 px-4 text-right">VGV</th>
                <th className="py-3.5 px-4 text-right">Comissão Total</th>
                <th className="py-3.5 px-4 text-right">Valor Recebido</th>
                <th className="py-3.5 px-4 text-center">Forma</th>
                <th className="py-3.5 px-4 text-center">Situação</th>
                <th className="py-3.5 px-4">Data</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#232A3B]">
              {filteredVendas.map((v) => {
                const situacao = v.situacao_recebimento || 'Recebido'
                const valorRec =
                  v.valor_recebido ?? (situacao === 'Recebido' ? v.valor_comissao : 0)

                return (
                  <tr key={v.id} className="hover:bg-[#1A2234]/50 transition-colors">
                    <td className="py-3.5 px-4 max-w-[220px]">
                      <div className="font-semibold text-slate-100 truncate">{v.titulo_imovel}</div>
                      <div className="text-[11px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                        <User className="w-3 h-3 text-slate-500" />
                        {v.cliente || 'Cliente não informado'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-200">
                        {v.expand?.corretor?.nome || 'Corretor'}
                      </div>
                      {(() => {
                        const capts = getCaptadoresVenda(v)
                        if (capts.length === 0) return null
                        if (capts.length === 1) {
                          return (
                            <div className="text-[11px] text-amber-400/90 font-medium mt-0.5">
                              Captador: {capts[0].nome} (10%)
                            </div>
                          )
                        }
                        return (
                          <div className="text-[11px] text-amber-400/90 font-medium mt-0.5">
                            <span className="text-amber-300 font-semibold">
                              Captadores (50% cada):{' '}
                            </span>
                            {capts.map((c) => c.nome).join(' + ')}
                          </div>
                        )
                      })()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-white tabular-nums">
                      {formatCurrency(v.valor_vgv)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-200 tabular-nums">
                      {formatCurrency(v.valor_comissao)}
                      <span className="block text-[10px] text-slate-400 font-normal">
                        ({v.percentual_comissao}%)
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-400 tabular-nums">
                      {formatCurrency(valorRec)}
                    </td>
                    <td className="py-3.5 px-4 text-center">{getFormaBadge(v.forma_pagamento)}</td>
                    <td className="py-3.5 px-4 text-center">{getSituacaoBadge(situacao)}</td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {new Date(v.data_venda).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3.5 px-4 text-center">{getStatusBadge(v.status)}</td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEditModal(v)}
                          title="Editar venda / Complementar valor recebido"
                          className="h-7 w-7 text-slate-400 hover:text-white hover:bg-[#1A2234]"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(v.id)}
                          title="Excluir venda"
                          className="h-7 w-7 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}

              {filteredVendas.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Building className="w-8 h-8 text-slate-600" />
                      <p className="font-medium">
                        Nenhuma venda encontrada para os filtros atuais.
                      </p>
                      <p className="text-[11px] text-slate-600">
                        Clique no botão "+ Nova Venda" para registrar uma transação.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Cadastro / Edição com Prévia de Divisão ao Vivo */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-[#121722] border-[#232A3B] text-slate-100 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#E63946]" />
              {editingVenda ? 'Editar Venda & Recebimento' : 'Cadastrar Nova Venda'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Informe os dados da transação. As comissões, repasses e impostos serão calculados
              estritamente sobre o valor recebido pela imobiliária.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveVenda} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Título do Imóvel *
              </label>
              <Input
                type="text"
                placeholder="Ex: Apartamento Jardins 180m² - Ed. Bauhaus"
                value={formTitulo}
                onChange={(e) => setFormTitulo(e.target.value)}
                className="bg-[#0B0E14] border-[#232A3B] text-xs h-9 text-slate-100"
              />
              {formErrors.titulo && (
                <p className="text-[11px] text-red-400 mt-0.5">{formErrors.titulo}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nome do Cliente / Comprador
              </label>
              <Input
                type="text"
                placeholder="Ex: Roberto Silveira"
                value={formCliente}
                onChange={(e) => setFormCliente(e.target.value)}
                className="bg-[#0B0E14] border-[#232A3B] text-xs h-9 text-slate-100"
              />
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Corretor Responsável (Fechador) *
                </label>
                <select
                  value={formCorretor}
                  onChange={(e) => setFormCorretor(e.target.value)}
                  className="w-full bg-[#0B0E14] border border-[#232A3B] text-slate-100 text-xs rounded-lg h-9 px-2.5 outline-none focus:border-[#E63946]"
                >
                  <option value="">Selecione o corretor...</option>
                  {corretores
                    .filter((c) => c.ativo)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome} {c.creci ? `(CRECI ${c.creci})` : ''}
                      </option>
                    ))}
                </select>
                {formErrors.corretor && (
                  <p className="text-[11px] text-red-400 mt-0.5">{formErrors.corretor}</p>
                )}
              </div>

              {/* Seção Múltiplos Captadores */}
              <div className="p-3.5 rounded-xl bg-[#0B0E14] border border-[#232A3B] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-amber-400" />
                    <label className="text-xs font-semibold text-slate-200">
                      Captador(es) do Imóvel (Opcional)
                    </label>
                  </div>
                  {formCaptadores.length > 1 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Captação Conjunta ({100 / formCaptadores.length}% cada)
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-400">
                  Adicione um ou mais corretores que realizaram a captação juntos. O percentual
                  total de captação ({pctCaptTotalConfig}%) será dividido igualmente entre eles (50%
                  para cada em captação dupla).
                </p>

                {/* Seleção de corretor para adicionar */}
                <div className="flex gap-2">
                  <select
                    id="select-add-captador"
                    defaultValue=""
                    onChange={(e) => {
                      const newId = e.target.value
                      if (newId && !formCaptadores.includes(newId)) {
                        setFormCaptadores([...formCaptadores, newId])
                      }
                      e.target.value = ''
                    }}
                    className="flex-1 bg-[#121722] border border-[#232A3B] text-slate-100 text-xs rounded-lg h-9 px-2.5 outline-none focus:border-amber-400"
                  >
                    <option value="">+ Selecionar corretor captador para adicionar...</option>
                    {corretores
                      .filter((c) => c.ativo && !formCaptadores.includes(c.id))
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome} {c.creci ? `(CRECI ${c.creci})` : ''}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Tags de Captadores Selecionados */}
                {formCaptadores.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {formCaptadores.map((cId, idx) => {
                      const corr = corretores.find((c) => c.id === cId)
                      const pctItem = pctCaptTotalConfig / formCaptadores.length
                      const valItem = valCaptTotal / formCaptadores.length
                      return (
                        <div
                          key={cId}
                          className="flex items-center gap-2 bg-[#121722] border border-amber-500/40 rounded-lg px-3 py-1.5 text-xs text-slate-200 shadow-sm"
                        >
                          <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-[10px]">
                            {idx + 1}
                          </span>
                          <span className="font-semibold">{corr?.nome || 'Corretor'}</span>
                          <span className="text-[10px] text-amber-400 font-medium bg-amber-500/10 px-1.5 py-0.5 rounded">
                            {pctItem}% ({formatCurrency(valItem)})
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setFormCaptadores(formCaptadores.filter((id) => id !== cId))
                            }
                            className="text-slate-400 hover:text-red-400 ml-0.5 transition-colors"
                            title="Remover captador"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-500 italic bg-[#121722]/50 p-2 rounded-lg border border-[#232A3B]">
                    Nenhum captador adicional selecionado. 100% da comissão da parte dos corretores
                    fica com o corretor fechador.
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Valor do VGV (R$) *
                </label>
                <Input
                  type="number"
                  placeholder="Ex: 1200000"
                  value={formVgv}
                  onChange={(e) => setFormVgv(e.target.value ? Number(e.target.value) : '')}
                  className="bg-[#0B0E14] border-[#232A3B] text-xs h-9 text-slate-100"
                />
                {formErrors.vgv && (
                  <p className="text-[11px] text-red-400 mt-0.5">{formErrors.vgv}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  % Comissão Total *
                </label>
                <Input
                  type="number"
                  step="0.5"
                  value={formPctComissao}
                  onChange={(e) => {
                    setFormPctComissao(Number(e.target.value))
                    setIsComissaoManual(false)
                  }}
                  className="bg-[#0B0E14] border-[#232A3B] text-xs h-9 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Data da Venda *
                </label>
                <Input
                  type="date"
                  value={formDataVenda}
                  onChange={(e) => setFormDataVenda(e.target.value)}
                  className="bg-[#0B0E14] border-[#232A3B] text-xs h-9 text-slate-100"
                />
              </div>
            </div>

            {/* Seção Forma de Pagamento & Situação de Recebimento */}
            <div className="p-4 rounded-xl bg-[#0B0E14] border border-[#232A3B] space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-[#232A3B]">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-[#E63946]" />
                  <span className="font-bold text-xs text-white uppercase tracking-wider">
                    Forma de Pagamento & Recebimento
                  </span>
                </div>
                <span className="text-xs text-slate-400">
                  Comissão Total Negociada:{' '}
                  <strong className="text-white font-bold">
                    {formatCurrency(valorComissaoCalculado)}
                  </strong>
                </span>
              </div>

              {/* Escolha da Forma de Pagamento: Centralizada vs Separada */}
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-2">
                  Forma de Pagamento da Comissão *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div
                    onClick={() => setFormFormaPagamento('Centralizada')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      formFormaPagamento === 'Centralizada'
                        ? 'bg-[#1A2234] border-[#E63946] ring-1 ring-[#E63946]/50 shadow-md'
                        : 'bg-[#121722] border-[#232A3B] hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${formFormaPagamento === 'Centralizada' ? 'bg-[#E63946]' : 'bg-slate-600'}`}
                        />
                        Centralizada
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-red-500/20 text-red-300">
                        Imposto 6% s/ Total
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Cliente paga tudo na conta da imobiliária. A imobiliária desconta 6% de
                      imposto sobre o valor total e depois paga corretor e captador.
                    </p>
                  </div>

                  <div
                    onClick={() => setFormFormaPagamento('Separada')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      formFormaPagamento === 'Separada'
                        ? 'bg-[#1A2234] border-[#E63946] ring-1 ring-[#E63946]/50 shadow-md'
                        : 'bg-[#121722] border-[#232A3B] hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${formFormaPagamento === 'Separada' ? 'bg-[#E63946]' : 'bg-slate-600'}`}
                        />
                        Separada
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-emerald-500/20 text-emerald-300">
                        Imposto 6% s/ Parte Imob
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Cada parte recebe direto na sua própria conta. Imposto de 6% incide apenas
                      sobre a parte da imobiliária.
                    </p>
                  </div>
                </div>
              </div>

              {/* Situação do Recebimento (Recebido total ou Parcial) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#232A3B]/60">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Situação do Recebimento *
                  </label>
                  <select
                    value={formSituacaoRecebimento}
                    onChange={(e) =>
                      setFormSituacaoRecebimento(e.target.value as SituacaoRecebimento)
                    }
                    className="w-full bg-[#121722] border border-[#232A3B] text-slate-100 text-xs rounded-lg h-9 px-2.5 font-semibold outline-none focus:border-[#E63946]"
                  >
                    <option value="Recebido">Recebido (Comissão Total na Conta)</option>
                    <option value="Parcial">Parcial (Cliente pagou parte)</option>
                  </select>
                </div>

                {formSituacaoRecebimento === 'Parcial' && (
                  <div>
                    <label className="block text-xs font-semibold text-amber-400 mb-1">
                      Valor Recebido Efetivamente (R$) *
                    </label>
                    <Input
                      type="number"
                      placeholder="Ex: 10000"
                      value={formValorRecebido}
                      onChange={(e) =>
                        setFormValorRecebido(e.target.value ? Number(e.target.value) : '')
                      }
                      className="bg-[#121722] border-amber-500/50 text-xs h-9 text-white font-bold"
                    />
                    {formErrors.valorRecebido && (
                      <p className="text-[11px] text-red-400 mt-0.5">{formErrors.valorRecebido}</p>
                    )}
                  </div>
                )}
              </div>

              {formSituacaoRecebimento === 'Parcial' && (
                <div className="text-[11px] text-amber-300/90 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                  <span>
                    <strong>Situação Parcial:</strong> Corretor e captador só recebem proporcional
                    ao que foi recebido. Nada é pago antes. Ao receber o restante, edite a venda e
                    aumente o valor recebido para gerar as saídas complementares.
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Status da Negociação
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'realizada', label: 'Realizada', color: 'emerald' },
                  { id: 'pendente', label: 'Pendente', color: 'amber' },
                  { id: 'cancelada', label: 'Cancelada', color: 'red' },
                ].map((st) => (
                  <button
                    type="button"
                    key={st.id}
                    onClick={() => setFormStatus(st.id as VendaStatus)}
                    className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                      formStatus === st.id
                        ? 'bg-[#E63946]/20 border-[#E63946] text-white'
                        : 'bg-[#0B0E14] border-[#232A3B] text-slate-400 hover:bg-[#1A2234]'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Preview Box of Commission Distribution */}
            <div className="p-4 rounded-xl bg-gradient-to-b from-[#0E121B] to-[#0B0E14] border border-[#232A3B] space-y-3">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-[#232A3B]">
                <div className="flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
                    Prévia da Divisão ao Vivo (Base: {formatCurrency(valorBaseCalculo)})
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Entrada Gerada:</span>
                  <span className="font-extrabold text-emerald-400 text-sm">
                    + {formatCurrency(valorBaseCalculo)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-center text-xs">
                {/* Imobiliária Líquido */}
                <div className="p-2.5 rounded-xl bg-[#121722] border border-[#E63946]/30 text-left relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider">
                      Imobiliária (Líquido)
                    </p>
                    <span className="text-[9px] px-1 rounded bg-red-500/20 text-red-300 font-bold">
                      {valorBaseCalculo > 0
                        ? ((valImobLiquido / valorBaseCalculo) * 100).toFixed(1)
                        : 0}
                      %
                    </span>
                  </div>
                  <p className="font-black text-white text-base mt-1">
                    {formatCurrency(valImobLiquido)}
                  </p>
                  <p className="text-[9px] text-slate-400 mt-0.5">Livre após repasses & imposto</p>
                </div>

                {/* Corretor Fechador */}
                <div className="p-2.5 rounded-xl bg-[#121722] border border-blue-500/30 text-left">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">
                      Corretor ({pctCorrConfig}%)
                    </p>
                    <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-300 font-medium">
                      Saída Pendente
                    </span>
                  </div>
                  <p className="font-black text-white text-base mt-1">{formatCurrency(valCorr)}</p>
                  <p className="text-[9px] text-slate-400 mt-0.5">Repasse automático</p>
                </div>

                {/* Captador(es) */}
                <div className="p-2.5 rounded-xl bg-[#121722] border border-amber-500/30 text-left">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                      {numCaptadores > 1
                        ? `Captadores (${pctCaptTotalConfig}%)`
                        : `Captador (${pctCaptTotalConfig}%)`}
                    </p>
                    <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-300 font-medium">
                      {numCaptadores > 1 ? `${numCaptadores} Saídas` : 'Saída Pendente'}
                    </span>
                  </div>
                  <p className="font-black text-white text-base mt-1">
                    {formatCurrency(valCaptTotal)}
                  </p>
                  <p className="text-[9px] text-slate-400 mt-0.5">
                    {numCaptadores > 1
                      ? `${formatCurrency(valPorCaptador)} cada (${pctPorCaptador}%)`
                      : 'Repasse captação'}
                  </p>
                </div>

                {/* Imposto (6%) */}
                <div className="p-2.5 rounded-xl bg-[#121722] border border-red-500/30 text-left">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider">
                      Imposto (6%)
                    </p>
                    <span className="text-[9px] px-1 rounded bg-red-500/20 text-red-300 font-medium">
                      Saída Pendente
                    </span>
                  </div>
                  <p className="font-black text-red-400 text-base mt-1">
                    {formatCurrency(valImposto)}
                  </p>
                  <p className="text-[9px] text-slate-400 mt-0.5">
                    {formFormaPagamento === 'Separada'
                      ? '6% s/ parte Imob (R$ ' + formatCurrency(valBaseImobiliaria) + ')'
                      : '6% s/ valor total'}
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="bg-transparent border-[#232A3B] text-slate-300 hover:bg-[#1A2234]"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-[#E63946] hover:bg-[#D62839] text-white font-bold"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Salvando...
                  </>
                ) : editingVenda ? (
                  'Salvar Alterações'
                ) : (
                  'Cadastrar Venda'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmação de Exclusão */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="bg-[#121722] border-[#232A3B] text-slate-100 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              Excluir Venda
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Tem certeza de que deseja excluir este registro e todas as transações financeiras
              vinculadas?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteId(null)}
              className="bg-transparent border-[#232A3B] text-slate-300"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleting}
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 font-semibold"
            >
              {deleting ? 'Excluindo...' : 'Confirmar Exclusão'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
