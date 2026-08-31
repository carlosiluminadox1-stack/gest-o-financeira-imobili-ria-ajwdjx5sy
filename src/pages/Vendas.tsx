import React, { useState, useEffect, useMemo } from 'react'
import {
  Plus,
  Search,
  ArrowUpDown,
  Trash2,
  Edit2,
  Building,
  User,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  X,
  Calendar,
  CheckSquare,
} from 'lucide-react'
import { VendaService, CorretorService, ConfigService } from '@/services/imobService'
import {
  Venda,
  Corretor,
  VendaStatus,
  Configuracoes,
  SituacaoRecebimento,
  FormaPagamento,
  TipoVenda,
} from '@/types'
import { calcularDivisaoComissao } from '@/lib/comissaoCalculator'
import { useAuth } from '@/context/AuthContext'
import { usePeriodo } from '@/context/PeriodoContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
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

  // Seleção múltipla (checkboxes)
  const [selectedVendasIds, setSelectedVendasIds] = useState<string[]>([])
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false)
  const [isDeletingBulk, setIsDeletingBulk] = useState(false)

  // Filtros & Busca
  const [searchTerm, setSearchTerm] = useState('')
  const [tipoFilter, setTipoFilter] = useState<string>('todos')
  const [statusFilter, setStatusFilter] = useState<string>('todos')
  const [recebimentoFilter, setRecebimentoFilter] = useState<string>('todos')
  const [formaFilter, setFormaFilter] = useState<string>('todos')
  const [sortField, setSortField] = useState<'data_venda' | 'valor_vgv'>('data_venda')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // Modal Nova Entrada / Edição
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingVenda, setEditingVenda] = useState<Venda | null>(null)
  const [saving, setSaving] = useState(false)

  // Campos do formulário (correspondentes aos prints)
  const [formTipo, setFormTipo] = useState<TipoVenda>('venda')
  const [formCompetencia, setFormCompetencia] = useState<string>(() => {
    const d = new Date()
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    return `${year}-${month}`
  })
  const [formDataRecebimento, setFormDataRecebimento] = useState<string>(
    new Date().toISOString().split('T')[0],
  )
  const [formCliente, setFormCliente] = useState('')
  const [formTitulo, setFormTitulo] = useState('')
  const [formFormaPagamento, setFormFormaPagamento] = useState<FormaPagamento>('Centralizada')
  const [modoCalculo, setModoCalculo] = useState<'%_vgv' | 'valor_fixo'>('%_vgv')

  // VGV e Comissão
  const [formVgv, setFormVgv] = useState<number | ''>('')
  const [formPctNegociacao, setFormPctNegociacao] = useState<number | ''>(6)
  const [formValorFixoComissao, setFormValorFixoComissao] = useState<number | ''>('')

  // Divisão da Comissão (%)
  const [pctImobiliaria, setPctImobiliaria] = useState<number>(50)
  const [pctCorretor, setPctCorretor] = useState<number>(40)
  const [pctCaptador, setPctCaptador] = useState<number>(10)

  // Seleção de Corretores (Fechador + até 2º fechador, Captadores + 2º captador)
  const [formCorretorPrincipal, setFormCorretorPrincipal] = useState('')
  const [formCorretorSecundario, setFormCorretorSecundario] = useState('')
  const [formCaptadores, setFormCaptadores] = useState<string[]>([])
  const [showSecondCorretor, setShowSecondCorretor] = useState(false)
  const [showSecondCaptador, setShowSecondCaptador] = useState(false)

  const [formSituacaoRecebimento, setFormSituacaoRecebimento] =
    useState<SituacaoRecebimento>('Recebido')
  const [formValorRecebido, setFormValorRecebido] = useState<number | ''>('')
  const [formStatus, setFormStatus] = useState<VendaStatus>('realizada')
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Modal Exclusão Individual
  const [deletingVenda, setDeletingVenda] = useState<Venda | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
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

  // Helpers de formatação e cálculo
  const vgvNumber = typeof formVgv === 'number' ? formVgv : 0
  const pctNegNumber = typeof formPctNegociacao === 'number' ? formPctNegociacao : 0

  const comissaoTotalCalculada = useMemo(() => {
    if (modoCalculo === 'valor_fixo') {
      return typeof formValorFixoComissao === 'number' ? formValorFixoComissao : 0
    }
    return (vgvNumber * pctNegNumber) / 100
  }, [modoCalculo, formValorFixoComissao, vgvNumber, pctNegNumber])

  // Base efetiva de cálculo
  const valorBaseCalculo = useMemo(() => {
    if (formSituacaoRecebimento === 'Recebido') {
      return comissaoTotalCalculada
    }
    return typeof formValorRecebido === 'number' ? formValorRecebido : 0
  }, [formSituacaoRecebimento, comissaoTotalCalculada, formValorRecebido])

  // Cálculo da Divisão ao vivo estritamente de acordo com as regras dos prints
  const divisaoAoVivo = useMemo(() => {
    return calcularDivisaoComissao({
      valorBase: valorBaseCalculo,
      formaPagamento: formFormaPagamento,
      temCaptador: pctCaptador > 0,
      numCaptadores: formCaptadores.length || (pctCaptador > 0 ? 1 : 0),
      pctImobConfig: pctImobiliaria,
      pctCorrConfig: pctCorretor,
      pctCaptConfig: pctCaptador,
      aliquotaImposto: 6,
    })
  }, [
    valorBaseCalculo,
    formFormaPagamento,
    pctImobiliaria,
    pctCorretor,
    pctCaptador,
    formCaptadores.length,
  ])

  // Filtragem e ordenação
  const filteredVendas = useMemo(() => {
    return vendas
      .filter((v) => {
        // Período
        const d = new Date(v.data_venda)
        if (d < start || d > end) return false

        // Tipo de Venda
        if (tipoFilter !== 'todos' && (v.tipo_venda || 'venda') !== tipoFilter) return false

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
    tipoFilter,
    statusFilter,
    recebimentoFilter,
    formaFilter,
    searchTerm,
    sortField,
    sortDirection,
  ])

  const formatCurrency = (val: number) => {
    return (
      'R$ ' +
      val.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    )
  }

  const formatNumberBR = (val: number) => {
    return val.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  // Ações de seleção múltipla para Vendas
  const handleSelectAllVendas = (checked: boolean) => {
    if (checked) {
      setSelectedVendasIds(filteredVendas.map((v) => v.id))
    } else {
      setSelectedVendasIds([])
    }
  }

  const handleToggleSelectVenda = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setSelectedVendasIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  // Exclusão em lote (Bulk Delete)
  const handleOpenBulkDelete = () => {
    setIsBulkDeleteModalOpen(true)
  }

  const handleConfirmBulkDelete = async () => {
    setIsDeletingBulk(true)
    const idsToDelete = [...selectedVendasIds]
    try {
      await Promise.all(idsToDelete.map((id) => VendaService.delete(id)))
      setVendas((prev) => prev.filter((v) => !idsToDelete.includes(v.id)))
      setSelectedVendasIds([])
      setIsBulkDeleteModalOpen(false)
      toast.success(
        `${idsToDelete.length} ${idsToDelete.length > 1 ? 'vendas excluídas' : 'venda excluída'} com sucesso!`,
      )
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || 'Erro ao excluir vendas selecionadas.')
    } finally {
      setIsDeletingBulk(false)
    }
  }

  // Auxiliar para obter a lista de captadores
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
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const todayIso = now.toISOString().split('T')[0]

    setEditingVenda(null)
    setFormTipo('venda')
    setFormCompetencia(`${year}-${month}`)
    setFormDataRecebimento(todayIso)
    setFormCliente('')
    setFormTitulo('')
    setFormFormaPagamento('Centralizada')
    setModoCalculo('%_vgv')
    setFormVgv('')
    setFormPctNegociacao(config?.percentual_comissao_padrao ?? 6)
    setFormValorFixoComissao('')

    setPctImobiliaria(config?.percentual_imobiliaria ?? 50)
    setPctCorretor(config?.percentual_corretor ?? 40)
    setPctCaptador(config?.percentual_captador ?? 10)

    setFormCorretorPrincipal('')
    setFormCorretorSecundario('')
    setFormCaptadores([])
    setShowSecondCorretor(false)
    setShowSecondCaptador(false)

    setFormSituacaoRecebimento('Recebido')
    setFormValorRecebido('')
    setFormStatus('realizada')
    setFormErrors({})
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (venda: Venda) => {
    setEditingVenda(venda)
    setFormTipo(venda.tipo_venda || 'venda')

    // Competência
    const dVenda = new Date(venda.data_venda)
    const year = dVenda.getUTCFullYear()
    const month = String(dVenda.getUTCMonth() + 1).padStart(2, '0')
    setFormCompetencia(`${year}-${month}`)

    // Data recebimento
    if (venda.data_recebimento) {
      setFormDataRecebimento(new Date(venda.data_recebimento).toISOString().split('T')[0])
    } else {
      setFormDataRecebimento(new Date(venda.data_venda).toISOString().split('T')[0])
    }

    setFormCliente(venda.cliente || '')
    setFormTitulo(venda.titulo_imovel || '')
    setFormFormaPagamento(venda.forma_pagamento || 'Centralizada')

    const isFixo = Boolean(venda.is_valor_fixo)
    setModoCalculo(isFixo ? 'valor_fixo' : '%_vgv')
    setFormVgv(venda.valor_vgv)
    setFormPctNegociacao(venda.percentual_comissao)
    setFormValorFixoComissao(venda.valor_comissao)

    // Corretores
    setFormCorretorPrincipal(venda.corretor)
    setFormCorretorSecundario('')
    setShowSecondCorretor(false)

    // Captadores
    if (venda.captadores && venda.captadores.length > 0) {
      setFormCaptadores(venda.captadores)
      setShowSecondCaptador(venda.captadores.length > 1)
    } else if (venda.captador) {
      setFormCaptadores([venda.captador])
      setShowSecondCaptador(false)
    } else {
      setFormCaptadores([])
      setShowSecondCaptador(false)
    }

    setPctImobiliaria(50)
    setPctCorretor(40)
    setPctCaptador(10)

    const sit = venda.situacao_recebimento || 'Recebido'
    setFormSituacaoRecebimento(sit)
    setFormValorRecebido(venda.valor_recebido ?? (sit === 'Recebido' ? venda.valor_comissao : ''))
    setFormStatus(venda.status)
    setFormErrors({})
    setIsModalOpen(true)
  }

  const validateForm = () => {
    const errs: Record<string, string> = {}
    if (!formTitulo.trim()) errs.titulo = 'Descrição (imóvel) é obrigatória'
    if (!formCorretorPrincipal) errs.corretor = 'Selecione o corretor responsável'
    if (!formCompetencia) errs.competencia = 'Selecione o mês/ano de competência'

    if (modoCalculo === '%_vgv') {
      if (!formVgv || Number(formVgv) <= 0) errs.vgv = 'Informe o valor do imóvel (VGV)'
      if (formPctNegociacao === '' || Number(formPctNegociacao) <= 0) {
        errs.pctNeg = 'Informe o % da negociação'
      }
    } else {
      if (!formValorFixoComissao || Number(formValorFixoComissao) <= 0) {
        errs.comissaoFixa = 'Informe o valor fixo da comissão'
      }
    }

    if (formSituacaoRecebimento === 'Parcial') {
      if (formValorRecebido === '' || Number(formValorRecebido) <= 0) {
        errs.valorRecebido = 'Informe o valor efetivamente recebido nesta etapa'
      } else if (Number(formValorRecebido) > comissaoTotalCalculada) {
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
      // Competência salva no primeiro dia do mês correspondente: YYYY-MM-01T12:00:00.000Z
      const [anoComp, mesComp] = formCompetencia.split('-')
      const dataCompetenciaIso = new Date(
        Date.UTC(Number(anoComp), Number(mesComp) - 1, 1, 12, 0, 0),
      ).toISOString()

      // Data de recebimento
      const dataRecebimentoIso = formDataRecebimento
        ? new Date(formDataRecebimento + 'T12:00:00.000Z').toISOString()
        : dataCompetenciaIso

      const finalVgv = modoCalculo === '%_vgv' ? Number(formVgv) : Number(formVgv || 0)
      const finalPct = modoCalculo === '%_vgv' ? Number(formPctNegociacao) : 0
      const finalValorComissao = comissaoTotalCalculada
      const valRecFinal =
        formSituacaoRecebimento === 'Recebido' ? finalValorComissao : Number(formValorRecebido)

      // Montar lista de captadores
      const finalCaptadores = formCaptadores.filter(Boolean)

      if (editingVenda) {
        const updated = await VendaService.update(
          editingVenda.id,
          {
            titulo_imovel: formTitulo,
            cliente: formCliente,
            corretor: formCorretorPrincipal,
            captador: finalCaptadores.length > 0 ? finalCaptadores[0] : undefined,
            captadores: finalCaptadores,
            valor_vgv: finalVgv,
            percentual_comissao: finalPct,
            valor_comissao: finalValorComissao,
            tipo_venda: formTipo,
            data_recebimento: dataRecebimentoIso,
            is_valor_fixo: modoCalculo === 'valor_fixo',
            forma_pagamento: formFormaPagamento,
            situacao_recebimento: formSituacaoRecebimento,
            valor_recebido: valRecFinal,
            data_venda: dataCompetenciaIso,
            status: formStatus,
            pct_imobiliaria: pctImobiliaria,
            pct_corretor: pctCorretor,
            pct_captador: pctCaptador,
          },
          user.id,
        )

        // Atualização otimista imediata no estado local
        const corretorObj = corretores.find((c) => c.id === formCorretorPrincipal)
        const captadoresObjs = finalCaptadores
          .map((cid) => corretores.find((c) => c.id === cid))
          .filter((c): c is Corretor => Boolean(c))

        setVendas((prev) =>
          prev.map((item) =>
            item.id === editingVenda.id
              ? {
                  ...item,
                  ...updated,
                  expand: {
                    ...item.expand,
                    corretor: corretorObj,
                    captadores: captadoresObjs,
                    captador: captadoresObjs[0],
                  },
                }
              : item,
          ),
        )

        toast.success('Entrada atualizada com sucesso!')
      } else {
        const created = await VendaService.create({
          titulo_imovel: formTitulo,
          cliente: formCliente,
          corretor: formCorretorPrincipal,
          captador: finalCaptadores.length > 0 ? finalCaptadores[0] : undefined,
          captadores: finalCaptadores,
          valor_vgv: finalVgv,
          percentual_comissao: finalPct,
          valor_comissao: finalValorComissao,
          tipo_venda: formTipo,
          data_recebimento: dataRecebimentoIso,
          is_valor_fixo: modoCalculo === 'valor_fixo',
          pct_imobiliaria: pctImobiliaria,
          pct_corretor: pctCorretor,
          pct_captador: pctCaptador,
          forma_pagamento: formFormaPagamento,
          situacao_recebimento: formSituacaoRecebimento,
          valor_recebido: valRecFinal,
          data_venda: dataCompetenciaIso,
          status: formStatus,
          userId: user.id,
        })

        const corretorObj = corretores.find((c) => c.id === formCorretorPrincipal)
        const captadoresObjs = finalCaptadores
          .map((cid) => corretores.find((c) => c.id === cid))
          .filter((c): c is Corretor => Boolean(c))

        setVendas((prev) => [
          {
            ...created,
            expand: {
              ...created.expand,
              corretor: corretorObj,
              captadores: captadoresObjs,
              captador: captadoresObjs[0],
            },
          },
          ...prev,
        ])

        toast.success('Entrada cadastrada e fluxos financeiros gerados com sucesso!')
      }
      setIsModalOpen(false)
      setEditingVenda(null)
      loadData()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || 'Erro ao salvar entrada.')
    } finally {
      setSaving(false)
    }
  }

  // Abrir Modal de Exclusão Individual
  const handleOpenDeleteModal = (venda: Venda) => {
    setDeletingVenda(venda)
    setIsDeleteModalOpen(true)
  }

  // Confirmar Exclusão Individual
  const handleConfirmDelete = async () => {
    if (!deletingVenda) return
    const idToDelete = deletingVenda.id
    setDeleting(true)
    try {
      await VendaService.delete(idToDelete)
      // Atualização otimista imediata no estado local
      setVendas((prev) => prev.filter((v) => v.id !== idToDelete))
      setSelectedVendasIds((prev) => prev.filter((id) => id !== idToDelete))
      toast.success('Venda e transações vinculadas excluídas com sucesso!')
      setIsDeleteModalOpen(false)
      setDeletingVenda(null)
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || 'Erro ao excluir venda.')
    } finally {
      setDeleting(false)
    }
  }

  const getTipoLabel = (tipo?: TipoVenda) => {
    switch (tipo) {
      case 'locacao':
        return 'Locação'
      case 'administracao':
        return 'Administração'
      default:
        return 'Venda'
    }
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

  const getFormaBadge = (forma?: FormaPagamento) => {
    if (forma === 'Separada') {
      return (
        <span
          className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
          title="Separada: Cada um recebe direto (6% só sobre parte da imobiliária)"
        >
          Separada
        </span>
      )
    }
    return (
      <span
        className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30"
        title="Centralizada: Imobiliária recebe tudo (6% imposto sobre o total)"
      >
        Centralizada
      </span>
    )
  }

  return (
    <div className="space-y-6 w-full min-w-0 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-white tracking-tight truncate">
            Gestão de Vendas & Entradas
          </h2>
          <p className="text-xs text-slate-400">
            Registro de negociações, divisões proporcionais e geração automática de entradas e
            saídas
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
          <span className="inline-flex px-3 py-2 rounded-xl bg-[#121722] border border-[#232A3B] text-xs font-semibold text-red-400 shrink-0">
            {getPeriodoDates(periodo).label}
          </span>
          <Button
            onClick={handleOpenCreateModal}
            className="bg-[#E63946] hover:bg-[#D62839] text-white font-bold text-xs h-10 px-4 rounded-xl shadow-lg shadow-[#E63946]/20 flex items-center gap-2 whitespace-nowrap shrink-0 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Entrada</span>
          </Button>
        </div>
      </div>

      {/* Bulk Actions Bar (Barra de Ações em Lote) */}
      {selectedVendasIds.length > 0 && (
        <div className="sticky top-2 z-20 bg-[#171C28] border-2 border-[#E63946]/40 shadow-2xl shadow-[#E63946]/10 rounded-2xl p-3 sm:px-5 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-top duration-200">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="w-8 h-8 rounded-lg bg-[#E63946]/15 border border-[#E63946]/30 flex items-center justify-center text-[#E63946] shrink-0">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">
                {selectedVendasIds.length}{' '}
                {selectedVendasIds.length === 1 ? 'venda selecionada' : 'vendas selecionadas'}
              </span>
              <span className="text-xs text-slate-400 hidden md:inline">
                • VGV:{' '}
                <strong className="text-slate-200">
                  {formatCurrency(
                    vendas
                      .filter((v) => selectedVendasIds.includes(v.id))
                      .reduce((acc, curr) => acc + (curr.valor_vgv || 0), 0),
                  )}
                </strong>{' '}
                | Comissão:{' '}
                <strong className="text-emerald-400">
                  {formatCurrency(
                    vendas
                      .filter((v) => selectedVendasIds.includes(v.id))
                      .reduce((acc, curr) => acc + (curr.valor_comissao || 0), 0),
                  )}
                </strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedVendasIds([])}
              className="bg-[#0B0E14] border-[#232A3B] hover:bg-[#1A2234] text-slate-300 text-xs h-9 px-3 rounded-xl gap-1.5"
            >
              <X className="w-3.5 h-3.5" />
              <span>Desmarcar</span>
            </Button>

            <Button
              type="button"
              onClick={handleOpenBulkDelete}
              className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-lg shadow-red-600/20 flex items-center gap-1.5 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Excluir Selecionados ({selectedVendasIds.length})</span>
            </Button>
          </div>
        </div>
      )}

      {/* Filters & Search Toolbar */}
      <div className="bg-[#121722] border border-[#232A3B] rounded-2xl p-4 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 shadow-md w-full min-w-0">
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
          {/* Filtro Tipo */}
          <div className="flex flex-wrap items-center bg-[#0B0E14] border border-[#232A3B] rounded-lg p-1 text-xs">
            {[
              { id: 'todos', label: 'Todos Tipos' },
              { id: 'venda', label: 'Venda' },
              { id: 'locacao', label: 'Locação' },
              { id: 'administracao', label: 'Admin' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTipoFilter(t.id)}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  tipoFilter === t.id
                    ? 'bg-[#E63946] text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Filtro Status */}
          <div className="flex flex-wrap items-center bg-[#0B0E14] border border-[#232A3B] rounded-lg p-1 text-xs">
            {['todos', 'realizada', 'pendente', 'cancelada'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-md capitalize font-medium transition-all ${
                  statusFilter === st
                    ? 'bg-[#1A2234] text-white border border-[#232A3B]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st === 'todos' ? 'Status' : st}
              </button>
            ))}
          </div>

          {/* Filtro Forma de Pagamento */}
          <div className="flex flex-wrap items-center bg-[#0B0E14] border border-[#232A3B] rounded-lg p-1 text-xs">
            {[
              { id: 'todos', label: 'Formas' },
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

      {/* Table */}
      <div className="bg-[#121722] border border-[#232A3B] rounded-2xl shadow-lg overflow-hidden w-full min-w-0">
        <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-[#232A3B]">
          <table className="w-full min-w-[950px] text-left text-xs">
            <thead>
              <tr className="border-b border-[#232A3B] bg-[#0E121B] text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4 w-10 text-center">
                  <Checkbox
                    checked={
                      filteredVendas.length > 0 &&
                      selectedVendasIds.length === filteredVendas.length
                        ? true
                        : selectedVendasIds.length > 0
                          ? 'indeterminate'
                          : false
                    }
                    onCheckedChange={(checked) => handleSelectAllVendas(Boolean(checked))}
                    aria-label="Selecionar todas as vendas"
                    className="data-[state=checked]:bg-[#E63946] data-[state=checked]:border-[#E63946] border-[#343D52]"
                  />
                </th>
                <th className="py-3.5 px-4 min-w-[180px]">Imóvel & Cliente</th>
                <th className="py-3.5 px-4 min-w-[90px]">Tipo</th>
                <th className="py-3.5 px-4 min-w-[150px]">Corretor / Captador</th>
                <th className="py-3.5 px-4 text-right min-w-[110px]">VGV / Valor</th>
                <th className="py-3.5 px-4 text-right min-w-[120px]">Comissão Total</th>
                <th className="py-3.5 px-4 text-center min-w-[95px]">Forma</th>
                <th className="py-3.5 px-4 min-w-[100px]">Competência</th>
                <th className="py-3.5 px-4 min-w-[100px]">Recebimento</th>
                <th className="py-3.5 px-4 text-center min-w-[95px]">Status</th>
                <th className="py-3.5 px-4 text-right min-w-[80px]">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#232A3B]">
              {filteredVendas.map((v) => {
                const isSelected = selectedVendasIds.includes(v.id)
                const situacao = v.situacao_recebimento || 'Recebido'
                const dVenda = new Date(v.data_venda)
                const compStr = dVenda.toLocaleDateString('pt-BR', {
                  month: 'short',
                  year: 'numeric',
                })
                const dtRecStr = v.data_recebimento
                  ? new Date(v.data_recebimento).toLocaleDateString('pt-BR')
                  : dVenda.toLocaleDateString('pt-BR')

                return (
                  <tr
                    key={v.id}
                    onClick={() => handleToggleSelectVenda(v.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-[#E63946]/10 hover:bg-[#E63946]/15' : 'hover:bg-[#1A2234]/50'
                    }`}
                  >
                    <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleSelectVenda(v.id)}
                        aria-label={`Selecionar venda ${v.titulo_imovel}`}
                        className="data-[state=checked]:bg-[#E63946] data-[state=checked]:border-[#E63946] border-[#343D52]"
                      />
                    </td>
                    <td className="py-3.5 px-4 max-w-[220px]">
                      <div
                        className="font-semibold text-slate-100 truncate"
                        title={v.titulo_imovel}
                      >
                        {v.titulo_imovel}
                      </div>
                      <div
                        className="text-[11px] text-slate-400 truncate flex items-center gap-1 mt-0.5"
                        title={v.cliente || 'Cliente não informado'}
                      >
                        <User className="w-3 h-3 text-slate-500 shrink-0" />
                        <span>{v.cliente || 'Cliente não informado'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-[#0B0E14] border border-[#232A3B] text-[11px] font-medium text-slate-300">
                        {getTipoLabel(v.tipo_venda)}
                      </span>
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
                            <span className="text-amber-300 font-semibold">Captadores: </span>
                            {capts.map((c) => c.nome).join(' + ')}
                          </div>
                        )
                      })()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-white tabular-nums">
                      {v.is_valor_fixo && v.valor_vgv === 0 ? '-' : formatCurrency(v.valor_vgv)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-200 tabular-nums">
                      {formatCurrency(v.valor_comissao)}
                      {!v.is_valor_fixo && (
                        <span className="block text-[10px] text-slate-400 font-normal">
                          ({v.percentual_comissao}%)
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">{getFormaBadge(v.forma_pagamento)}</td>
                    <td className="py-3.5 px-4 text-slate-300 capitalize whitespace-nowrap">
                      {compStr}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">{dtRecStr}</td>
                    <td className="py-3.5 px-4 text-center">{getStatusBadge(v.status)}</td>
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEditModal(v)}
                          title="Editar venda"
                          className="h-7 w-7 text-slate-400 hover:text-white hover:bg-slate-700/50"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDeleteModal(v)}
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
                  <td colSpan={11} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Building className="w-8 h-8 text-slate-600" />
                      <p className="font-medium">Nenhuma entrada encontrada para os filtros.</p>
                      <p className="text-[11px] text-slate-600">
                        Clique no botão "+ Nova Entrada" para registrar uma comissão.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal NOVA ENTRADA / EDITAR ENTRADA exatamente conforme os prints */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-[#121722] border-[#232A3B] text-slate-100 max-w-xl max-h-[92vh] overflow-y-auto p-5 sm:p-6 shadow-2xl">
          <DialogHeader className="pb-2 border-b border-[#232A3B]/60">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-sm sm:text-base font-black text-[#E63946] tracking-wider uppercase">
                {editingVenda ? 'EDITAR ENTRADA' : 'NOVA ENTRADA'}
              </DialogTitle>
            </div>
            <DialogDescription className="text-[11px] text-slate-400">
              Preencha os dados da negociação para calcular e dividir a comissão automaticamente.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveVenda} className="space-y-4 pt-2">
            {/* Linha 1: TIPO e COMPETÊNCIA */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  TIPO *
                </label>
                <select
                  value={formTipo}
                  onChange={(e) => setFormTipo(e.target.value as TipoVenda)}
                  className="w-full bg-[#0B0E14] border border-[#232A3B] text-slate-100 text-xs rounded-lg h-10 px-3 outline-none focus:border-[#E63946]"
                >
                  <option value="venda">Comissão de Venda</option>
                  <option value="locacao">Comissão de locação</option>
                  <option value="administracao">Comissão de Administração</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  COMPETÊNCIA *
                </label>
                <div className="relative">
                  <Input
                    type="month"
                    value={formCompetencia}
                    onChange={(e) => setFormCompetencia(e.target.value)}
                    className="w-full bg-[#0B0E14] border-[#232A3B] text-slate-100 text-xs rounded-lg h-10 px-3 pr-8 outline-none focus:border-[#E63946]"
                  />
                  <Calendar className="w-4 h-4 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                {formErrors.competencia && (
                  <p className="text-[10px] text-red-400 mt-0.5">{formErrors.competencia}</p>
                )}
              </div>
            </div>

            {/* Linha 2: DATA DE RECEBIMENTO e CLIENTE COMPRADOR */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  DATA DE RECEBIMENTO
                </label>
                <div className="relative">
                  <Input
                    type="date"
                    value={formDataRecebimento}
                    onChange={(e) => setFormDataRecebimento(e.target.value)}
                    className="w-full bg-[#0B0E14] border-[#232A3B] text-slate-100 text-xs rounded-lg h-10 px-3 pr-8 outline-none focus:border-[#E63946]"
                  />
                  <Calendar className="w-4 h-4 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  CLIENTE COMPRADOR
                </label>
                <Input
                  type="text"
                  placeholder="Nome do cliente"
                  value={formCliente}
                  onChange={(e) => setFormCliente(e.target.value)}
                  className="bg-[#0B0E14] border-[#232A3B] text-xs h-10 text-slate-100 placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* Linha 3: DESCRIÇÃO (IMÓVEL) */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                DESCRIÇÃO (IMÓVEL) *
              </label>
              <Input
                type="text"
                placeholder="Ex: Apartamento Bela Vista"
                value={formTitulo}
                onChange={(e) => setFormTitulo(e.target.value)}
                className="bg-[#0B0E14] border-[#232A3B] text-xs h-10 text-slate-100 placeholder:text-slate-600"
              />
              {formErrors.titulo && (
                <p className="text-[10px] text-red-400 mt-0.5">{formErrors.titulo}</p>
              )}
            </div>

            {/* Bloco: FORMA DE PAGAMENTO DA COMISSÃO */}
            <div className="p-3.5 rounded-xl bg-[#0B0E14]/70 border border-[#232A3B] space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                FORMA DE PAGAMENTO DA COMISSÃO
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Opção Centralizada */}
                <div
                  onClick={() => setFormFormaPagamento('Centralizada')}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                    formFormaPagamento === 'Centralizada'
                      ? 'bg-[#151C2A] border-[#E63946] ring-1 ring-[#E63946]/40'
                      : 'bg-[#0E121B] border-[#232A3B] hover:border-slate-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="forma_pagamento"
                    checked={formFormaPagamento === 'Centralizada'}
                    onChange={() => setFormFormaPagamento('Centralizada')}
                    className="mt-0.5 accent-[#E63946] cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-white block">Centralizada</span>
                    <span className="text-[10px] text-slate-400 leading-tight block mt-0.5">
                      Imobiliária recebe tudo (6% imposto sobre o total)
                    </span>
                  </div>
                </div>

                {/* Opção Separada */}
                <div
                  onClick={() => setFormFormaPagamento('Separada')}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                    formFormaPagamento === 'Separada'
                      ? 'bg-[#151C2A] border-[#E63946] ring-1 ring-[#E63946]/40'
                      : 'bg-[#0E121B] border-[#232A3B] hover:border-slate-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="forma_pagamento"
                    checked={formFormaPagamento === 'Separada'}
                    onChange={() => setFormFormaPagamento('Separada')}
                    className="mt-0.5 accent-[#E63946] cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-white block">Separada</span>
                    <span className="text-[10px] text-slate-400 leading-tight block mt-0.5">
                      Cada um recebe direto (6% só sobre parte da imobiliária)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Seletor: % sobre VGV vs Valor Fixo */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setModoCalculo('%_vgv')}
                className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all ${
                  modoCalculo === '%_vgv'
                    ? 'bg-[#E63946] text-white shadow-md'
                    : 'bg-[#0B0E14] border border-[#232A3B] text-slate-400 hover:text-white'
                }`}
              >
                % sobre VGV
              </button>
              <button
                type="button"
                onClick={() => setModoCalculo('valor_fixo')}
                className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all ${
                  modoCalculo === 'valor_fixo'
                    ? 'bg-[#E63946] text-white shadow-md'
                    : 'bg-[#0B0E14] border border-[#232A3B] text-slate-400 hover:text-white'
                }`}
              >
                Valor Fixo
              </button>
            </div>

            {/* Campos de VGV e % Negociação OU Valor Fixo */}
            {modoCalculo === '%_vgv' ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                    VALOR DO IMÓVEL (VGV) *
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Ex: 250000"
                    value={formVgv}
                    onChange={(e) =>
                      setFormVgv(e.target.value !== '' ? Number(e.target.value) : '')
                    }
                    className="bg-[#E9EEF9] text-[#0B0E14] font-bold text-sm h-10 border-0 focus:ring-2 focus:ring-[#E63946]"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Usado para cálculo de metas</p>
                  {formErrors.vgv && (
                    <p className="text-[10px] text-red-400 mt-0.5">{formErrors.vgv}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                    % DA NEGOCIAÇÃO *
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="6"
                    value={formPctNegociacao}
                    onChange={(e) =>
                      setFormPctNegociacao(e.target.value !== '' ? Number(e.target.value) : '')
                    }
                    className="bg-[#0B0E14] border-[#232A3B] text-slate-100 font-bold text-xs h-10"
                  />
                  {formErrors.pctNeg && (
                    <p className="text-[10px] text-red-400 mt-0.5">{formErrors.pctNeg}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                    COMISSÃO TOTAL (CALCULADO)
                  </label>
                  <div className="bg-[#0B0E14] border border-[#232A3B] text-slate-100 font-black text-sm h-10 px-3 flex items-center rounded-lg">
                    {formatNumberBR(comissaoTotalCalculada)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                    VALOR DO IMÓVEL (VGV - OPCIONAL P/ METAS)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0"
                    value={formVgv}
                    onChange={(e) => setFormVgv(e.target.value ? Number(e.target.value) : '')}
                    className="bg-[#0B0E14] text-slate-100 text-xs h-10 border-[#232A3B]"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Usado para cálculo de metas</p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                    COMISSÃO TOTAL (VALOR FIXO) *
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Ex: 15000"
                    value={formValorFixoComissao}
                    onChange={(e) =>
                      setFormValorFixoComissao(e.target.value !== '' ? Number(e.target.value) : '')
                    }
                    className="bg-[#E9EEF9] text-[#0B0E14] font-bold text-sm h-10 border-0 focus:ring-2 focus:ring-[#E63946]"
                  />
                  {formErrors.comissaoFixa && (
                    <p className="text-[10px] text-red-400 mt-0.5">{formErrors.comissaoFixa}</p>
                  )}
                </div>
              </div>
            )}

            {/* SEÇÃO DIVISÃO DA COMISSÃO EXATAMENTE CONFORME OS PRINTS */}
            <div className="p-4 rounded-xl bg-[#0B0E14]/80 border border-[#232A3B] space-y-3">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                DIVISÃO DA COMISSÃO
              </label>

              {/* 3 Inputs de %: % IMOBILIÁRIA, % CORRETOR, % CAPTADOR */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                    % IMOBILIÁRIA
                  </label>
                  <Input
                    type="number"
                    value={pctImobiliaria}
                    onChange={(e) => setPctImobiliaria(Number(e.target.value))}
                    className="bg-[#0B0E14] border-[#232A3B] text-slate-100 font-bold text-xs h-10 text-center"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                    % CORRETOR
                  </label>
                  <Input
                    type="number"
                    value={pctCorretor}
                    onChange={(e) => setPctCorretor(Number(e.target.value))}
                    className="bg-[#0B0E14] border-[#232A3B] text-slate-100 font-bold text-xs h-10 text-center"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                    % CAPTADOR
                  </label>
                  <Input
                    type="number"
                    value={pctCaptador}
                    onChange={(e) => setPctCaptador(Number(e.target.value))}
                    className="bg-[#0B0E14] border-[#232A3B] text-slate-100 font-bold text-xs h-10 text-center"
                  />
                </div>
              </div>

              {/* Linha de Resumo dos Valores em R$ */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#232A3B]/60 text-xs">
                {/* Imobiliária */}
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Imobiliária:</span>
                  <span className="font-bold text-emerald-400 block tabular-nums">
                    {formatCurrency(divisaoAoVivo.valorImobiliariaLiquido)}
                  </span>
                </div>

                {/* Corretor */}
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Corretor:</span>
                  <span className="font-bold text-white block tabular-nums">
                    {formatCurrency(divisaoAoVivo.valorCorretor)}
                  </span>
                </div>

                {/* Captador */}
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Captador:</span>
                  <span className="font-bold text-white block tabular-nums">
                    {formatCurrency(divisaoAoVivo.valorCaptadorTotal)}
                  </span>
                </div>

                {/* Imposto 6% */}
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Imposto 6%:</span>
                  <span className="font-bold text-red-500 block tabular-nums">
                    {formatCurrency(divisaoAoVivo.valorImposto)}
                  </span>
                </div>
              </div>

              {/* Destaque Líquido para Imobiliária */}
              <div className="pt-2 border-t border-[#232A3B]/40 flex items-center justify-between">
                <span className="text-xs text-slate-400">Líquido para imobiliária:</span>
                <span className="text-sm font-black text-emerald-400 tabular-nums">
                  {formatCurrency(divisaoAoVivo.valorImobiliariaLiquido)}
                </span>
              </div>
            </div>

            {/* SELEÇÃO DE CORRETOR E CAPTADOR COM BOTÕES + 2º */}
            <div className="p-3.5 rounded-xl bg-[#0B0E14]/60 border border-[#232A3B] space-y-3">
              {/* Corretor Principal */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                    CORRETOR RESPONSÁVEL *
                  </label>
                  {!showSecondCorretor && (
                    <button
                      type="button"
                      onClick={() => setShowSecondCorretor(true)}
                      className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#121722] border border-[#232A3B] text-slate-300 hover:text-white"
                    >
                      + 2º
                    </button>
                  )}
                </div>
                <select
                  value={formCorretorPrincipal}
                  onChange={(e) => setFormCorretorPrincipal(e.target.value)}
                  className="w-full bg-[#121722] border border-[#232A3B] text-slate-100 text-xs rounded-lg h-9 px-2.5 outline-none focus:border-[#E63946]"
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
                  <p className="text-[10px] text-red-400 mt-0.5">{formErrors.corretor}</p>
                )}
              </div>

              {/* 2º Corretor (Opcional) */}
              {showSecondCorretor && (
                <div className="pt-2 border-t border-[#232A3B]/50 flex items-center gap-2">
                  <select
                    value={formCorretorSecundario}
                    onChange={(e) => setFormCorretorSecundario(e.target.value)}
                    className="flex-1 bg-[#121722] border border-[#232A3B] text-slate-100 text-xs rounded-lg h-9 px-2.5 outline-none focus:border-[#E63946]"
                  >
                    <option value="">Selecione 2º corretor...</option>
                    {corretores
                      .filter((c) => c.ativo && c.id !== formCorretorPrincipal)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome} {c.creci ? `(CRECI ${c.creci})` : ''}
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSecondCorretor(false)
                      setFormCorretorSecundario('')
                    }}
                    className="text-slate-400 hover:text-red-400 p-1.5"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Captador(es) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                    CAPTADOR
                  </label>
                  {!showSecondCaptador && (
                    <button
                      type="button"
                      onClick={() => setShowSecondCaptador(true)}
                      className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#121722] border border-[#232A3B] text-slate-300 hover:text-white"
                    >
                      + 2º
                    </button>
                  )}
                </div>
                <select
                  value={formCaptadores[0] || ''}
                  onChange={(e) => {
                    const id = e.target.value
                    if (id) {
                      setFormCaptadores([id, ...formCaptadores.slice(1)])
                    } else {
                      setFormCaptadores(formCaptadores.slice(1))
                    }
                  }}
                  className="w-full bg-[#121722] border border-[#232A3B] text-slate-100 text-xs rounded-lg h-9 px-2.5 outline-none focus:border-amber-400"
                >
                  <option value="">Selecione o captador...</option>
                  {corretores
                    .filter((c) => c.ativo)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome} {c.creci ? `(CRECI ${c.creci})` : ''}
                      </option>
                    ))}
                </select>
              </div>

              {/* 2º Captador (Opcional) */}
              {showSecondCaptador && (
                <div className="pt-2 border-t border-[#232A3B]/50 flex items-center gap-2">
                  <select
                    value={formCaptadores[1] || ''}
                    onChange={(e) => {
                      const id = e.target.value
                      const first = formCaptadores[0] || ''
                      if (id) {
                        setFormCaptadores(first ? [first, id] : [id])
                      } else {
                        setFormCaptadores(first ? [first] : [])
                      }
                    }}
                    className="flex-1 bg-[#121722] border border-[#232A3B] text-slate-100 text-xs rounded-lg h-9 px-2.5 outline-none focus:border-amber-400"
                  >
                    <option value="">Selecione 2º captador...</option>
                    {corretores
                      .filter((c) => c.ativo && c.id !== formCaptadores[0])
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome} {c.creci ? `(CRECI ${c.creci})` : ''}
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSecondCaptador(false)
                      if (formCaptadores.length > 1) {
                        setFormCaptadores([formCaptadores[0]])
                      }
                    }}
                    className="text-slate-400 hover:text-red-400 p-1.5"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Situação do Recebimento & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                  SITUAÇÃO DO RECEBIMENTO
                </label>
                <select
                  value={formSituacaoRecebimento}
                  onChange={(e) =>
                    setFormSituacaoRecebimento(e.target.value as SituacaoRecebimento)
                  }
                  className="w-full bg-[#0B0E14] border border-[#232A3B] text-slate-100 text-xs rounded-lg h-9 px-2.5 outline-none focus:border-[#E63946]"
                >
                  <option value="Recebido">Recebido Total</option>
                  <option value="Parcial">Parcial (Recebeu parte)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                  STATUS
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as VendaStatus)}
                  className="w-full bg-[#0B0E14] border border-[#232A3B] text-slate-100 text-xs rounded-lg h-9 px-2.5 outline-none focus:border-[#E63946]"
                >
                  <option value="realizada">Realizada</option>
                  <option value="pendente">Pendente</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>
            </div>

            {formSituacaoRecebimento === 'Parcial' && (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-amber-400 mb-1">
                  VALOR RECEBIDO NESTA ETAPA (R$) *
                </label>
                <Input
                  type="number"
                  placeholder="Ex: 10000"
                  value={formValorRecebido}
                  onChange={(e) =>
                    setFormValorRecebido(e.target.value ? Number(e.target.value) : '')
                  }
                  className="bg-[#0B0E14] border-amber-500/50 text-xs h-9 text-white font-bold"
                />
                {formErrors.valorRecebido && (
                  <p className="text-[10px] text-red-400 mt-0.5">{formErrors.valorRecebido}</p>
                )}
              </div>
            )}

            <DialogFooter className="pt-3 border-t border-[#232A3B]/60">
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
                  'Salvar Entrada'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmação de Exclusão Individual */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="bg-[#121722] border-[#232A3B] text-slate-100 max-w-sm p-6 rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              Excluir Venda
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-300 mt-2">
              Tem certeza que deseja remover permanentemente esta venda e todas as transações
              financeiras e comissões vinculadas?
            </DialogDescription>
          </DialogHeader>

          {deletingVenda && (
            <div className="my-3 p-3 rounded-xl bg-[#0B0E14] border border-[#232A3B] text-xs space-y-1.5">
              <p className="font-semibold text-slate-100">{deletingVenda.titulo_imovel}</p>
              {deletingVenda.cliente && (
                <p className="text-[11px] text-slate-400">Cliente: {deletingVenda.cliente}</p>
              )}
              <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-[#232A3B]">
                <span>Comissão:</span>
                <span className="font-bold text-emerald-400">
                  {formatCurrency(deletingVenda.valor_comissao)}
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={deleting}
              onClick={() => setIsDeleteModalOpen(false)}
              className="bg-transparent border-[#232A3B] text-slate-300 hover:bg-[#1A2234]"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={deleting}
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Excluir Definitivamente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmação de Exclusão em Lote (Bulk Delete) */}
      <Dialog open={isBulkDeleteModalOpen} onOpenChange={setIsBulkDeleteModalOpen}>
        <DialogContent className="bg-[#121722] border-[#232A3B] text-slate-100 max-w-sm p-6 rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              Excluir Vendas Selecionadas
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-300 mt-2">
              Tem certeza que deseja excluir permanentemente{' '}
              <strong className="text-white">
                {selectedVendasIds.length}{' '}
                {selectedVendasIds.length > 1 ? 'vendas selecionadas' : 'venda selecionada'}
              </strong>{' '}
              e seus respectivos lançamentos financeiros? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>

          <div className="my-3 p-3.5 rounded-xl bg-[#0B0E14] border border-[#232A3B] text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span>Quantidade de vendas:</span>
              <span className="font-bold text-white">{selectedVendasIds.length}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>VGV total acumulado:</span>
              <span className="font-bold text-white">
                {formatCurrency(
                  vendas
                    .filter((v) => selectedVendasIds.includes(v.id))
                    .reduce((acc, curr) => acc + (curr.valor_vgv || 0), 0),
                )}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Comissão total acumulada:</span>
              <span className="font-bold text-emerald-400">
                {formatCurrency(
                  vendas
                    .filter((v) => selectedVendasIds.includes(v.id))
                    .reduce((acc, curr) => acc + (curr.valor_comissao || 0), 0),
                )}
              </span>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={isDeletingBulk}
              onClick={() => setIsBulkDeleteModalOpen(false)}
              className="bg-transparent border-[#232A3B] text-slate-300 hover:bg-[#1A2234]"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={isDeletingBulk}
              onClick={handleConfirmBulkDelete}
              className="bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              {isDeletingBulk ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                `Excluir ${selectedVendasIds.length} ${
                  selectedVendasIds.length > 1 ? 'Vendas' : 'Venda'
                }`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
