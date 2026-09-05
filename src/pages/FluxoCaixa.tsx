import React, { useState, useEffect, useMemo } from 'react'
import {
  ArrowLeftRight,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Repeat,
  Building2,
  CheckCircle,
  XCircle,
  Trash2,
  Edit2,
  Loader2,
  DollarSign,
  AlertCircle,
  CheckSquare,
  X,
  UploadCloud,
} from 'lucide-react'
import { ImportarExtratoModal } from '@/components/ImportarExtratoModal'
import { ConverterEmVendaModal } from '@/components/ConverterEmVendaModal'
import { TransacaoService, DespesaService, CategoriaService } from '@/services/imobService'
import {
  Transacao,
  Despesa,
  TransacaoTipo,
  TransacaoCategoria,
  DespesaCategoria,
  DespesaFrequencia,
  CategoriaFinanceira,
} from '@/types'
import { useAuth } from '@/context/AuthContext'
import { usePeriodo, MESES_NOMES } from '@/context/PeriodoContext'
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
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts'

export default function FluxoCaixa() {
  const { user } = useAuth()
  const { periodo, setPeriodo, getPeriodoDates } = usePeriodo()
  const [activeTab, setActiveTab] = useState<'transacoes' | 'despesas'>('transacoes')

  const [transacoes, setTransacoes] = useState<Transacao[]>([])
  const [despesas, setDespesas] = useState<Despesa[]>([])
  const [categoriasCadastradas, setCategoriasCadastradas] = useState<CategoriaFinanceira[]>([])
  const [loading, setLoading] = useState(true)

  // Seleção múltipla (checkboxes)
  const [selectedTransacoesIds, setSelectedTransacoesIds] = useState<string[]>([])
  const [selectedDespesasIds, setSelectedDespesasIds] = useState<string[]>([])
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false)
  const [isDeletingBulk, setIsDeletingBulk] = useState(false)

  // Filtros Transações
  const [searchTerm, setSearchTerm] = useState('')
  const [tipoFilter, setTipoFilter] = useState<string>('todos')
  const [statusFilter, setStatusFilter] = useState<string>('todos')
  const [categoriaFilter, setCategoriaFilter] = useState<string>('todos')

  // Modal Importar Extrato Bancário
  const [isImportarExtratoOpen, setIsImportarExtratoOpen] = useState(false)

  // Modal Converter em Venda
  const [isConverterModalOpen, setIsConverterModalOpen] = useState(false)
  const [convertingTransacao, setConvertingTransacao] = useState<Transacao | null>(null)

  // Modal Nova / Editar Transação
  const [isTransacaoModalOpen, setIsTransacaoModalOpen] = useState(false)
  const [editingTransacao, setEditingTransacao] = useState<Transacao | null>(null)
  const [tTipo, setTTipo] = useState<TransacaoTipo>('entrada')
  const [tDescricao, setTDescricao] = useState('')
  const [tCategoria, setTCategoria] = useState<TransacaoCategoria>('outros')
  const [tValor, setTValor] = useState<number | ''>('')
  const [tData, setTData] = useState(new Date().toISOString().split('T')[0])
  const [tDataCompetencia, setTDataCompetencia] = useState('')
  const [tDataVencimento, setTDataVencimento] = useState('')
  const [tStatus, setTStatus] = useState<'Pendente' | 'Pago' | 'Cancelado'>('Pendente')
  const [tConsolidado, setTConsolidado] = useState(false)
  const [tObservacoes, setTObservacoes] = useState('')
  const [tRecorrenciaMeses, setTRecorrenciaMeses] = useState<number>(1)
  const [savingTransacao, setSavingTransacao] = useState(false)

  // Modal Exclusão de Transação
  const [deletingTransacao, setDeletingTransacao] = useState<Transacao | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeletingTransacao, setIsDeletingTransacao] = useState(false)

  // Loading individual de alternância de status
  const [togglingStatusId, setTogglingStatusId] = useState<string | null>(null)
  const [togglingDespesaStatusId, setTogglingDespesaStatusId] = useState<string | null>(null)

  // Filtros Despesas
  const [searchDespesaTerm, setSearchDespesaTerm] = useState('')
  const [despesaStatusFilter, setDespesaStatusFilter] = useState<string>('todos')
  const [despesaCategoriaFilter, setDespesaCategoriaFilter] = useState<string>('todos')

  // Modal Exclusão de Despesa
  const [deletingDespesa, setDeletingDespesa] = useState<Despesa | null>(null)
  const [isDeleteDespesaModalOpen, setIsDeleteDespesaModalOpen] = useState(false)
  const [isDeletingDespesa, setIsDeletingDespesa] = useState(false)

  // Modal Nova Despesa
  const [isDespesaModalOpen, setIsDespesaModalOpen] = useState(false)
  const [editingDespesa, setEditingDespesa] = useState<Despesa | null>(null)
  const [dDescricao, setDDescricao] = useState('')
  const [dCategoria, setDCategoria] = useState<DespesaCategoria>('outros')
  const [dValor, setDValor] = useState<number | ''>('')
  const [dData, setDData] = useState(new Date().toISOString().split('T')[0])
  const [dDataCompetencia, setDDataCompetencia] = useState('')
  const [dDataVencimento, setDDataVencimento] = useState('')
  const [dStatus, setDStatus] = useState<'Pendente' | 'Pago' | 'Cancelado'>('Pendente')
  const [dRecorrenciaMeses, setDRecorrenciaMeses] = useState<number>(1)
  const [dObservacoes, setDObservacoes] = useState('')
  const [dRecorrente, setDRecorrente] = useState(false)
  const [dFrequencia, setDFrequencia] = useState<DespesaFrequencia>('mensal')
  const [dAtiva, setDAtiva] = useState(true)
  const [savingDespesa, setSavingDespesa] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [tList, dList, catList] = await Promise.all([
        TransacaoService.getAll(),
        DespesaService.getAll(),
        CategoriaService.getAll().catch(() => []),
      ])
      setTransacoes(tList)
      setDespesas(dList)
      setCategoriasCadastradas(catList)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar dados do fluxo de caixa.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const { start, end } = useMemo(() => getPeriodoDates(periodo), [periodo, getPeriodoDates])

  // Filtragem Transações por período
  const transacoesPeriodo = useMemo(() => {
    return transacoes.filter((t) => {
      const d = new Date(t.data)
      if (d < start || d > end) return false

      if (tipoFilter !== 'todos' && t.tipo !== tipoFilter) return false
      if (categoriaFilter !== 'todos' && t.categoria !== categoriaFilter) return false

      const isPago =
        t.status === 'Pago' ||
        (t.consolidado && t.status !== 'Pendente' && t.status !== 'Cancelado')
      const isCancelado = t.status === 'Cancelado'
      const isPendente = !isPago && !isCancelado

      if (statusFilter === 'pago' && !isPago) return false
      if (statusFilter === 'pendente' && !isPendente) return false
      if (statusFilter === 'cancelado' && !isCancelado) return false

      if (searchTerm.trim()) {
        return t.descricao.toLowerCase().includes(searchTerm.toLowerCase())
      }
      return true
    })
  }, [transacoes, start, end, tipoFilter, statusFilter, categoriaFilter, searchTerm])

  // Totais do Período (Entradas, Saídas, Saídas Pagas e Saídas Pendentes)
  const totalEntradas = useMemo(() => {
    return transacoes
      .filter((t) => {
        const d = new Date(t.data)
        return d >= start && d <= end && t.tipo === 'entrada'
      })
      .reduce((sum, t) => sum + (t.valor || 0), 0)
  }, [transacoes, start, end])

  const {
    totalSaidas,
    totalSaidasPagas,
    totalSaidasPendentes,
    totalDespesasPagas,
    totalDespesasPendentes,
  } = useMemo(() => {
    // Totais de transações de saída no período
    let saidasTotal = 0
    let saidasPagas = 0
    let saidasPendentes = 0

    transacoes.forEach((t) => {
      const d = new Date(t.data)
      if (d >= start && d <= end && t.tipo === 'saida') {
        const val = t.valor || 0
        saidasTotal += val
        const isPago =
          t.status === 'Pago' ||
          (t.consolidado && t.status !== 'Pendente' && t.status !== 'Cancelado')
        if (isPago) {
          saidasPagas += val
        } else if (t.status !== 'Cancelado') {
          saidasPendentes += val
        }
      }
    })

    // Totais de despesas no período (por data ou vencimento)
    let despPagas = 0
    let despPendentes = 0
    despesas.forEach((d) => {
      const refDateStr = d.data_vencimento || d.data
      const dt = refDateStr ? new Date(refDateStr) : null
      const inPeriod = !dt || (dt >= start && dt <= end)
      if (inPeriod) {
        const val = d.valor || 0
        if (d.status === 'Pago') {
          despPagas += val
        } else if (d.status !== 'Cancelado') {
          despPendentes += val
        }
      }
    })

    return {
      totalSaidas: saidasTotal,
      totalSaidasPagas: saidasPagas,
      totalSaidasPendentes: saidasPendentes,
      totalDespesasPagas: despPagas,
      totalDespesasPendentes: despPendentes,
    }
  }, [transacoes, despesas, start, end])

  const saldoPeriodo = totalEntradas - totalSaidas

  // Verificação de parcelas recorrentes ocultas pelo filtro de período atual
  const parcelasOcultasInfo = useMemo(() => {
    if (periodo === 'tudo') return { countTransacoes: 0, countDespesas: 0, hasHidden: false }

    const ocultasTransacoes = transacoes.filter((t) => {
      const dt = new Date(t.data)
      const isFora = dt < start || dt > end
      const isRecorrenteDesc = /\(\d+\/\d+\)/.test(t.descricao)
      return isFora && isRecorrenteDesc
    }).length

    const ocultasDespesas = despesas.filter((d) => {
      const refDateStr = d.data_vencimento || d.data
      const dt = refDateStr ? new Date(refDateStr) : null
      const isFora = dt ? dt < start || dt > end : false
      const isRecorrente = d.recorrente || /\(\d+\/\d+\)/.test(d.descricao)
      return isFora && isRecorrente
    }).length

    const totalOcultas = ocultasTransacoes + ocultasDespesas
    return {
      countTransacoes: ocultasTransacoes,
      countDespesas: ocultasDespesas,
      hasHidden: totalOcultas > 0,
      total: totalOcultas,
    }
  }, [transacoes, despesas, periodo, start, end])

  // Abrir modal Converter em Venda
  const handleOpenConverterEmVenda = (t: Transacao) => {
    setConvertingTransacao(t)
    setIsConverterModalOpen(true)
  }

  // Gráfico Entradas x Saídas
  const chartData = useMemo(() => {
    const months = []
    const now = new Date()

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
      const monthLabel = d
        .toLocaleString('pt-BR', { month: 'short' })
        .toUpperCase()
        .replace('.', '')

      const ent = transacoes
        .filter((t) => {
          if (t.tipo !== 'entrada') return false
          const td = new Date(t.data)
          return td >= d && td <= mEnd
        })
        .reduce((sum, t) => sum + (t.valor || 0), 0)

      const sai = transacoes
        .filter((t) => {
          if (t.tipo !== 'saida') return false
          const td = new Date(t.data)
          return td >= d && td <= mEnd
        })
        .reduce((sum, t) => sum + (t.valor || 0), 0)

      months.push({
        month: monthLabel,
        Entradas: ent,
        Saídas: sai,
      })
    }
    return months
  }, [transacoes])

  // Converte data ISO/string de competência em número do mês (1-12) em string ("1" a "12") ou vazio ""
  const getMesFromDate = (dateStr?: string | null): string => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ''
    return String(d.getUTCMonth() + 1)
  }

  // Converte o mês selecionado (1 a 12) em ISO string usando o ano base da transação/despesa ou ano corrente
  const buildCompetenciaIso = (mesStr: string, refDateStr?: string): string | undefined => {
    if (!mesStr) return undefined
    const mesNum = parseInt(mesStr, 10)
    if (isNaN(mesNum) || mesNum < 1 || mesNum > 12) return undefined

    let ano = new Date().getFullYear()
    if (refDateStr) {
      const refDate = new Date(refDateStr)
      if (!isNaN(refDate.getTime())) {
        ano = refDate.getFullYear()
      }
    }
    const mesIdx = mesNum - 1
    return new Date(Date.UTC(ano, mesIdx, 1, 12, 0, 0)).toISOString()
  }

  // Formata a exibição da competência na tabela como nome do mês e ano (ex: agosto de 2026)
  const formatCompetencia = (dateStr?: string | null): string => {
    if (!dateStr) return '—'
    // Suportar tanto ISO completo quanto formato YYYY-MM
    if (typeof dateStr === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(dateStr)) {
      const [anoStr, mesStr] = dateStr.split('-')
      const mesIdx = parseInt(mesStr, 10) - 1
      const mesNome = MESES_NOMES[mesIdx] ? MESES_NOMES[mesIdx].toLowerCase() : ''
      return mesNome ? `${mesNome} de ${anoStr}` : '—'
    }
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return '—'
    const mesIdx = d.getUTCMonth()
    const ano = d.getUTCFullYear()
    const mesNome = MESES_NOMES[mesIdx] ? MESES_NOMES[mesIdx].toLowerCase() : ''
    return mesNome ? `${mesNome} de ${ano}` : '—'
  }

  // Obter formato YYYY-MM a partir de data ISO ou retornar YYYY-MM atual
  const getCompetenciaMesAno = (dateStr?: string | null): string => {
    if (!dateStr) {
      const now = new Date()
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    }
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) {
      const now = new Date()
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    }
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
  }

  // Limpar seleção ao trocar de aba
  const handleTabChange = (tab: 'transacoes' | 'despesas') => {
    setActiveTab(tab)
    setSelectedTransacoesIds([])
    setSelectedDespesasIds([])
  }

  // Ações de seleção múltipla para Transações
  const handleSelectAllTransacoes = (checked: boolean) => {
    if (checked) {
      setSelectedTransacoesIds(transacoesPeriodo.map((t) => t.id))
    } else {
      setSelectedTransacoesIds([])
    }
  }

  const handleToggleSelectTransacao = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setSelectedTransacoesIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  // Filtragem Despesas por período e critérios
  const despesasFiltradas = useMemo(() => {
    return despesas.filter((d) => {
      const refDateStr = d.data_vencimento || d.data
      const dt = refDateStr ? new Date(refDateStr) : null
      if (dt && (dt < start || dt > end)) return false

      if (despesaCategoriaFilter !== 'todos' && d.categoria !== despesaCategoriaFilter) return false

      const isPago = d.status === 'Pago'
      const isCancelado = d.status === 'Cancelado'
      const isPendente = !isPago && !isCancelado

      if (despesaStatusFilter === 'pago' && !isPago) return false
      if (despesaStatusFilter === 'pendente' && !isPendente) return false
      if (despesaStatusFilter === 'cancelado' && !isCancelado) return false

      if (searchDespesaTerm.trim()) {
        return d.descricao.toLowerCase().includes(searchDespesaTerm.toLowerCase())
      }
      return true
    })
  }, [despesas, start, end, despesaStatusFilter, despesaCategoriaFilter, searchDespesaTerm])

  // Ações de seleção múltipla para Despesas
  const handleSelectAllDespesas = (checked: boolean) => {
    if (checked) {
      setSelectedDespesasIds(despesasFiltradas.map((d) => d.id))
    } else {
      setSelectedDespesasIds([])
    }
  }

  const handleToggleSelectDespesa = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setSelectedDespesasIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  // Exclusão em lote (Bulk Delete)
  const handleOpenBulkDelete = () => {
    setIsBulkDeleteModalOpen(true)
  }

  const handleConfirmBulkDelete = async () => {
    setIsDeletingBulk(true)
    try {
      if (activeTab === 'transacoes') {
        const idsToDelete = [...selectedTransacoesIds]
        await Promise.all(idsToDelete.map((id) => TransacaoService.delete(id)))
        setTransacoes((prev) => prev.filter((t) => !idsToDelete.includes(t.id)))
        setSelectedTransacoesIds([])
        toast.success(
          `${idsToDelete.length} transaç${idsToDelete.length > 1 ? 'ões excluídas' : 'ão excluída'} com sucesso!`,
        )
      } else {
        const idsToDelete = [...selectedDespesasIds]
        await Promise.all(idsToDelete.map((id) => DespesaService.delete(id)))
        setDespesas((prev) => prev.filter((d) => !idsToDelete.includes(d.id)))
        setSelectedDespesasIds([])
        toast.success(
          `${idsToDelete.length} despesa${idsToDelete.length > 1 ? 's excluídas' : ' excluída'} com sucesso!`,
        )
      }
      setIsBulkDeleteModalOpen(false)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao excluir registros selecionados.')
    } finally {
      setIsDeletingBulk(false)
    }
  }

  // Reset do Modal de Transação Manual (Criação)
  // Lista combinada de categorias para o formulário de Transações (filtrado pelo tipo entrada/saida)
  const transacaoCategoriasDisponiveis = useMemo(() => {
    const ativas = categoriasCadastradas.filter(
      (c) => c.ativo && (c.tipo === 'ambos' || c.tipo === tTipo),
    )
    const setNomes = new Set(ativas.map((c) => c.nome.toLowerCase()))
    const padroes = [
      { valor: 'comissao', label: 'Comissão', tipo: 'entrada' },
      { valor: 'imposto', label: 'Imposto', tipo: 'saida' },
      { valor: 'repasse', label: 'Repasse', tipo: 'saida' },
      { valor: 'aluguel', label: 'Aluguel', tipo: 'saida' },
      { valor: 'marketing', label: 'Marketing', tipo: 'saida' },
      { valor: 'salarios', label: 'Salários', tipo: 'saida' },
      { valor: 'utilidades', label: 'Utilidades', tipo: 'saida' },
      { valor: 'manutencao', label: 'Manutenção', tipo: 'saida' },
      { valor: 'outros', label: 'Outros', tipo: 'ambos' },
    ]
    const padroesFiltrados = padroes.filter(
      (p) =>
        (p.tipo === 'ambos' || p.tipo === tTipo) &&
        !setNomes.has(p.valor.toLowerCase()) &&
        !setNomes.has(p.label.toLowerCase()),
    )
    return {
      custom: ativas,
      padrao: padroesFiltrados,
    }
  }, [categoriasCadastradas, tTipo])

  // Lista combinada de categorias para o formulário de Despesas (apenas saída ou ambos)
  const despesaCategoriasDisponiveis = useMemo(() => {
    const ativas = categoriasCadastradas.filter(
      (c) => c.ativo && (c.tipo === 'ambos' || c.tipo === 'saida'),
    )
    const setNomes = new Set(ativas.map((c) => c.nome.toLowerCase()))
    const padroes = [
      { valor: 'aluguel', label: 'Aluguel' },
      { valor: 'marketing', label: 'Marketing' },
      { valor: 'salarios', label: 'Salários' },
      { valor: 'utilidades', label: 'Utilidades (Água/Luz/Net)' },
      { valor: 'manutencao', label: 'Manutenção' },
      { valor: 'outros', label: 'Sem categoria / Outros' },
    ]
    const padroesFiltrados = padroes.filter(
      (p) => !setNomes.has(p.valor.toLowerCase()) && !setNomes.has(p.label.toLowerCase()),
    )
    return {
      custom: ativas,
      padrao: padroesFiltrados,
    }
  }, [categoriasCadastradas])

  // Lista de todas as categorias existentes para o filtro da tabela de transações
  const todasCategoriasTransacoes = useMemo(() => {
    const list = new Set<string>()
    categoriasCadastradas.forEach((c) => list.add(c.nome))
    transacoes.forEach((t) => {
      if (t.categoria) list.add(t.categoria)
    })
    ;[
      'comissao',
      'imposto',
      'repasse',
      'aluguel',
      'marketing',
      'salarios',
      'utilidades',
      'manutencao',
      'outros',
    ].forEach((k) => list.add(k))
    return Array.from(list).sort()
  }, [categoriasCadastradas, transacoes])

  // Lista de todas as categorias existentes para o filtro da tabela de despesas
  const todasCategoriasDespesas = useMemo(() => {
    const list = new Set<string>()
    categoriasCadastradas
      .filter((c) => c.tipo === 'saida' || c.tipo === 'ambos')
      .forEach((c) => list.add(c.nome))
    despesas.forEach((d) => {
      if (d.categoria) list.add(d.categoria)
    })
    ;['aluguel', 'marketing', 'salarios', 'utilidades', 'manutencao', 'outros'].forEach((k) =>
      list.add(k),
    )
    return Array.from(list).sort()
  }, [categoriasCadastradas, despesas])

  const handleOpenCreateTransacao = () => {
    setEditingTransacao(null)
    setTTipo('entrada')
    setTDescricao('')
    setTCategoria('outros')
    setTValor('')
    setTData(new Date().toISOString().split('T')[0])
    setTDataCompetencia('')
    setTDataVencimento('')
    setTStatus('Pendente')
    setTConsolidado(false)
    setTObservacoes('')
    setTRecorrenciaMeses(1)
    setIsTransacaoModalOpen(true)
  }

  // Abrir Modal para Edição de Transação
  const handleOpenEditTransacao = (t: Transacao) => {
    setEditingTransacao(t)
    setTTipo(t.tipo)
    setTDescricao(t.descricao)
    setTCategoria(t.categoria || 'outros')
    setTValor(t.valor)
    setTData(
      t.data
        ? new Date(t.data).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
    )
    setTDataCompetencia(getMesFromDate(t.data_competencia))
    setTDataVencimento(
      t.data_vencimento ? new Date(t.data_vencimento).toISOString().split('T')[0] : '',
    )
    const normalizedStatus =
      t.status === 'Pago'
        ? 'Pago'
        : t.status === 'Cancelado'
          ? 'Cancelado'
          : t.consolidado
            ? 'Pago'
            : 'Pendente'
    setTStatus(normalizedStatus)
    setTConsolidado(Boolean(t.consolidado))
    setTObservacoes(t.observacoes || '')
    setTRecorrenciaMeses(1)
    setIsTransacaoModalOpen(true)
  }

  // Salvar (Criar / Editar) Transação Manual
  const handleSaveTransacao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tDescricao.trim() || !tValor || Number(tValor) <= 0 || !user) {
      toast.error('Preencha os campos obrigatórios corretamente.')
      return
    }

    setSavingTransacao(true)
    try {
      const competenciaIso = buildCompetenciaIso(tDataCompetencia, tData)

      if (editingTransacao) {
        // Atualização de transação existente
        const isPaid = tStatus === 'Pago'
        const updatedPayload: Partial<Transacao> = {
          tipo: tTipo,
          descricao: tDescricao.trim(),
          categoria: tCategoria,
          valor: Number(tValor),
          data: new Date(tData + 'T12:00:00Z').toISOString(),
          data_competencia: competenciaIso,
          data_vencimento: tDataVencimento
            ? new Date(tDataVencimento + 'T12:00:00Z').toISOString()
            : undefined,
          status: tStatus,
          consolidado: isPaid,
          observacoes: tObservacoes.trim(),
        }

        const updated = await TransacaoService.update(editingTransacao.id, updatedPayload)

        // Atualizar estado local instantaneamente
        setTransacoes((prev) =>
          prev.map((item) => (item.id === editingTransacao.id ? { ...item, ...updated } : item)),
        )
        toast.success('Transação atualizada com sucesso!')
      } else {
        // Criação de nova transação
        const mesesRecorrencia =
          tTipo === 'saida'
            ? Math.max(1, Math.min(60, Math.floor(Number(tRecorrenciaMeses) || 1)))
            : 1

        if (tTipo === 'saida' && mesesRecorrencia > 1) {
          const created = await TransacaoService.createRecorrente({
            tipo: 'saida',
            descricao: tDescricao.trim() || 'Transação',
            categoria: tCategoria,
            valor: Number(tValor),
            data: tData,
            data_competencia_iso: competenciaIso,
            data_vencimento: tDataVencimento || undefined,
            recorrencia_meses: mesesRecorrencia,
            user: user.id,
          })
          setTransacoes((prev) => [...created, ...prev])
          toast.success(
            `${created.length} parcelas geradas com sucesso! Algumas podem estar ocultas pelo filtro de período atual.`,
            {
              duration: 7000,
              description:
                'Selecione "Todo o período" no seletor de período no topo para visualizar todas as parcelas de uma vez.',
            },
          )
        } else {
          const isPaid = tStatus === 'Pago'
          const created = await TransacaoService.create({
            tipo: tTipo,
            descricao: tDescricao.trim(),
            categoria: tCategoria,
            valor: Number(tValor),
            data: new Date(tData + 'T12:00:00Z').toISOString(),
            data_competencia: competenciaIso,
            data_vencimento: tDataVencimento
              ? new Date(tDataVencimento + 'T12:00:00Z').toISOString()
              : undefined,
            status: tStatus,
            consolidado: isPaid,
            observacoes: tObservacoes.trim(),
            user: user.id,
          })
          setTransacoes((prev) => [created, ...prev])
          toast.success('Transação registrada com sucesso!')
        }
      }

      setIsTransacaoModalOpen(false)
      setEditingTransacao(null)
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao salvar transação.')
    } finally {
      setSavingTransacao(false)
    }
  }

  // Alternar Status / Baixa Direta na Tabela (Toggle Pago <-> Pendente / Aberto)
  const handleToggleStatus = async (t: Transacao) => {
    // Determinar status atual
    const isCurrentlyPaid = t.status === 'Pago' || (t.consolidado && t.status !== 'Pendente')
    const nextStatus = isCurrentlyPaid ? 'Pendente' : 'Pago'
    const nextConsolidado = !isCurrentlyPaid

    setTogglingStatusId(t.id)

    // Atualização otimista imediata na UI tanto em transações quanto em despesas sincronizadas
    const previousTransacoes = transacoes
    const previousDespesas = despesas

    setTransacoes((prev) =>
      prev.map((item) =>
        item.id === t.id ? { ...item, status: nextStatus, consolidado: nextConsolidado } : item,
      ),
    )

    if (t.despesa) {
      setDespesas((prev) =>
        prev.map((d) => (d.id === t.despesa ? { ...d, status: nextStatus } : d)),
      )
    }

    try {
      await TransacaoService.update(t.id, {
        status: nextStatus,
        consolidado: nextConsolidado,
      })

      if (nextConsolidado) {
        toast.success(`Transação "${t.descricao}" marcada como PAGA / Consolidada!`)
      } else {
        toast.info(`Transação "${t.descricao}" marcada como PENDENTE / Aberta.`)
      }
    } catch (err) {
      console.error(err)
      toast.error('Erro ao atualizar status da transação.')
      // Reverter em caso de falha
      setTransacoes(previousTransacoes)
      setDespesas(previousDespesas)
    } finally {
      setTogglingStatusId(null)
    }
  }

  // Abrir Modal de Exclusão de Transação
  const handleOpenDeleteTransacao = (t: Transacao) => {
    setDeletingTransacao(t)
    setIsDeleteModalOpen(true)
  }

  // Confirmar Exclusão de Transação
  const handleConfirmDeleteTransacao = async () => {
    if (!deletingTransacao) return

    setIsDeletingTransacao(true)
    const idToDelete = deletingTransacao.id

    try {
      await TransacaoService.delete(idToDelete)

      // Atualização imediata do estado
      setTransacoes((prev) => prev.filter((item) => item.id !== idToDelete))
      toast.success('Transação excluída com sucesso!')
      setIsDeleteModalOpen(false)
      setDeletingTransacao(null)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao excluir transação.')
    } finally {
      setIsDeletingTransacao(false)
    }
  }

  // Nova / Editar Despesa
  const handleOpenCreateDespesa = () => {
    const today = new Date().toISOString().split('T')[0]
    const currentMonth = today.slice(0, 7) // YYYY-MM
    setEditingDespesa(null)
    setDDescricao('')
    setDCategoria('outros')
    setDValor('')
    setDData(today)
    setDDataCompetencia(currentMonth)
    setDDataVencimento(today)
    setDStatus('Pendente')
    setDRecorrenciaMeses(1)
    setDObservacoes('')
    setDRecorrente(false)
    setDFrequencia('mensal')
    setDAtiva(true)
    setIsDespesaModalOpen(true)
  }

  // Alternar Status Direto na Aba Despesas (Toggle Pago <-> Pendente)
  const handleToggleDespesaStatus = async (d: Despesa) => {
    const isCurrentlyPaid = d.status === 'Pago'
    const nextStatus = isCurrentlyPaid ? 'Pendente' : 'Pago'
    const nextConsolidado = !isCurrentlyPaid

    setTogglingDespesaStatusId(d.id)

    // Atualização otimista imediata na UI tanto em despesas quanto em transações vinculadas
    const previousDespesas = despesas
    const previousTransacoes = transacoes

    setDespesas((prev) =>
      prev.map((item) => (item.id === d.id ? { ...item, status: nextStatus } : item)),
    )

    setTransacoes((prev) =>
      prev.map((t) =>
        t.despesa === d.id ||
        (!t.despesa &&
          t.tipo === 'saida' &&
          t.descricao === d.descricao &&
          Math.abs((t.valor || 0) - (d.valor || 0)) < 0.01)
          ? { ...t, status: nextStatus, consolidado: nextConsolidado }
          : t,
      ),
    )

    try {
      await DespesaService.update(d.id, { status: nextStatus })
      if (nextStatus === 'Pago') {
        toast.success(`Despesa "${d.descricao}" marcada como PAGA!`)
      } else {
        toast.info(`Despesa "${d.descricao}" marcada como PENDENTE.`)
      }
    } catch (err) {
      console.error(err)
      toast.error('Erro ao atualizar status da despesa.')
      // Reverter estado local
      setDespesas(previousDespesas)
      setTransacoes(previousTransacoes)
    } finally {
      setTogglingDespesaStatusId(null)
    }
  }

  const handleOpenEditDespesa = (d: Despesa) => {
    setEditingDespesa(d)
    setDDescricao(d.descricao)
    setDCategoria(d.categoria || 'outros')
    setDValor(d.valor)
    setDData(
      d.data
        ? new Date(d.data).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
    )
    setDDataCompetencia(getCompetenciaMesAno(d.data_competencia || d.data))
    setDDataVencimento(
      d.data_vencimento ? new Date(d.data_vencimento).toISOString().split('T')[0] : '',
    )
    setDStatus(d.status || 'Pendente')
    setDRecorrenciaMeses(1)
    setDObservacoes(d.observacoes || '')
    setDRecorrente(d.recorrente)
    setDFrequencia(d.frequencia || 'mensal')
    setDAtiva(d.ativa !== false)
    setIsDespesaModalOpen(true)
  }

  const handleSaveDespesa = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dValor || Number(dValor) <= 0 || !user) {
      toast.error('Informe um valor válido para a despesa.')
      return
    }
    if (!dDataVencimento) {
      toast.error('Informe a data de vencimento.')
      return
    }

    setSavingDespesa(true)
    try {
      if (editingDespesa) {
        let compIso: string | undefined = undefined
        if (dDataCompetencia) {
          const [anoStr, mesStr] = dDataCompetencia.split('-')
          compIso = new Date(
            Date.UTC(parseInt(anoStr, 10), parseInt(mesStr, 10) - 1, 1, 12, 0, 0),
          ).toISOString()
        }

        const payload: Partial<Despesa> = {
          descricao: dDescricao.trim() || 'Despesa',
          categoria: dCategoria,
          valor: Number(dValor),
          data: new Date(dData + 'T12:00:00Z').toISOString(),
          data_competencia: compIso,
          data_vencimento: new Date(dDataVencimento + 'T12:00:00Z').toISOString(),
          status: dStatus,
          observacoes: dObservacoes.trim(),
          recorrente: dRecorrente,
          frequencia: dRecorrente ? dFrequencia : undefined,
          ativa: dAtiva,
        }

        const updated = await DespesaService.update(editingDespesa.id, payload)
        // Atualizar estado local de despesas imediatamente
        setDespesas((prev) =>
          prev.map((item) => (item.id === editingDespesa.id ? { ...item, ...updated } : item)),
        )
        toast.success('Despesa atualizada com sucesso!')
      } else {
        const mesesRecorrencia = Math.max(
          1,
          Math.min(60, Math.floor(Number(dRecorrenciaMeses) || 1)),
        )

        if (mesesRecorrencia > 1) {
          const created = await DespesaService.createRecorrente(
            {
              descricao: dDescricao.trim() || undefined,
              categoria: dCategoria,
              valor: Number(dValor),
              data_registro: dData,
              data_competencia_mes: dDataCompetencia,
              data_vencimento: dDataVencimento,
              status: dStatus,
              recorrencia_meses: mesesRecorrencia,
              observacoes: dObservacoes.trim(),
            },
            user.id,
          )
          setDespesas((prev) => [...created, ...prev])
          toast.success(
            `${created.length} parcelas geradas. Algumas podem estar ocultas pelo filtro de período atual.`,
            {
              duration: 7000,
              description:
                'Selecione "Todo o período" no seletor de período no topo para visualizar todas as parcelas de uma vez.',
            },
          )
        } else {
          let compIso: string | undefined = undefined
          if (dDataCompetencia) {
            const [anoStr, mesStr] = dDataCompetencia.split('-')
            compIso = new Date(
              Date.UTC(parseInt(anoStr, 10), parseInt(mesStr, 10) - 1, 1, 12, 0, 0),
            ).toISOString()
          } else {
            const venc = new Date(dDataVencimento + 'T12:00:00Z')
            compIso = new Date(
              Date.UTC(venc.getFullYear(), venc.getMonth(), 1, 12, 0, 0),
            ).toISOString()
          }

          const descFinal = dDescricao.trim() || 'Despesa'

          const created = await DespesaService.create(
            {
              descricao: descFinal,
              categoria: dCategoria,
              valor: Number(dValor),
              data: new Date(dData + 'T12:00:00Z').toISOString(),
              data_competencia: compIso,
              data_vencimento: new Date(dDataVencimento + 'T12:00:00Z').toISOString(),
              status: dStatus,
              observacoes: dObservacoes.trim(),
              recorrente: false,
              ativa: true,
            },
            user.id,
          )
          setDespesas((prev) => [created, ...prev])
          toast.success('Despesa cadastrada e transação de saída gerada!')
        }
      }
      setIsDespesaModalOpen(false)
      setEditingDespesa(null)
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao salvar despesa.')
    } finally {
      setSavingDespesa(false)
    }
  }

  // Abrir Modal de Exclusão de Despesa
  const handleOpenDeleteDespesa = (d: Despesa) => {
    setDeletingDespesa(d)
    setIsDeleteDespesaModalOpen(true)
  }

  // Confirmar Exclusão de Despesa
  const handleConfirmDeleteDespesa = async () => {
    if (!deletingDespesa) return

    setIsDeletingDespesa(true)
    const idToDelete = deletingDespesa.id

    try {
      await DespesaService.delete(idToDelete)
      setDespesas((prev) => prev.filter((item) => item.id !== idToDelete))
      toast.success('Despesa removida com sucesso!')
      setIsDeleteDespesaModalOpen(false)
      setDeletingDespesa(null)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao excluir despesa.')
    } finally {
      setIsDeletingDespesa(false)
    }
  }

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  return (
    <div className="space-y-6">
      {/* Aviso de Parcelas Ocultas pelo Filtro de Período Atual */}
      {parcelasOcultasInfo.hasHidden && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 sm:px-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Repeat className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <span className="font-bold text-amber-300">
                Aviso: {parcelasOcultasInfo.total} parcela{parcelasOcultasInfo.total > 1 ? 's' : ''}{' '}
                de recorrência {parcelasOcultasInfo.total > 1 ? 'estão' : 'está'} oculta
                {parcelasOcultasInfo.total > 1 ? 's' : ''} pelo filtro de período atual (
                {getPeriodoDates(periodo).label}).
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Para visualizar todas as parcelas futuras e passadas de uma só vez, altere o seletor
                para Todo o período.
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => setPeriodo('tudo')}
            className="bg-amber-500 hover:bg-amber-600 text-[#0B0E14] font-bold text-xs h-8 px-3 rounded-lg shrink-0 shadow-sm transition-all"
          >
            Ver Todo o período
          </Button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Fluxo de Caixa & Despesas</h2>
          <p className="text-xs text-slate-400">
            Controle de entradas, saídas e automação de despesas recorrentes (
            {getPeriodoDates(periodo).label})
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsImportarExtratoOpen(true)}
            variant="outline"
            className="bg-[#121722] hover:bg-[#1A2234] text-slate-200 border-[#232A3B] hover:border-[#E63946]/40 font-semibold text-xs h-10 px-3.5 rounded-xl flex items-center gap-2 transition-all shadow-sm"
          >
            <UploadCloud className="w-4 h-4 text-[#E63946]" />
            <span>Importar Extrato</span>
          </Button>

          {activeTab === 'transacoes' ? (
            <Button
              onClick={handleOpenCreateTransacao}
              className="bg-[#E63946] hover:bg-[#D62839] text-white font-semibold text-xs h-10 px-4 rounded-xl shadow-lg shadow-[#E63946]/20 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nova Transação</span>
            </Button>
          ) : (
            <Button
              onClick={handleOpenCreateDespesa}
              className="bg-[#E63946] hover:bg-[#D62839] text-white font-semibold text-xs h-10 px-4 rounded-xl shadow-lg shadow-[#E63946]/20 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nova Despesa</span>
            </Button>
          )}
        </div>
      </div>

      {/* Cartões de Métricas e Totais do Período */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Entradas */}
        <div className="bg-[#121722] border border-[#232A3B] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Total de Entradas
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-400 tracking-tight">
              + {formatCurrency(totalEntradas)}
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-3 pt-2 border-t border-[#1C2333]">
            Comissões recebidas e aportes
          </p>
        </div>

        {/* Total Geral de Saídas */}
        <div className="bg-[#121722] border border-[#232A3B] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Total de Saídas
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#E63946]/15 flex items-center justify-center text-red-400">
                <ArrowDownRight className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-red-400 tracking-tight">
              - {formatCurrency(totalSaidas)}
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-2 border-t border-[#1C2333]">
            <span className="text-emerald-400 font-medium">
              Pago: {formatCurrency(totalSaidasPagas)}
            </span>
            <span className="text-amber-400 font-medium">
              Aberto: {formatCurrency(totalSaidasPendentes)}
            </span>
          </div>
        </div>

        {/* Saídas Pagas (Consolidadas) */}
        <div className="bg-[#121722] border border-emerald-500/20 rounded-2xl p-5 shadow-lg flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                Saídas Pagas
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400">
                <CheckCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-400 tracking-tight">
              {formatCurrency(totalSaidasPagas)}
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-3 pt-2 border-t border-[#1C2333]">
            {activeTab === 'despesas'
              ? `Despesas pagas: ${formatCurrency(totalDespesasPagas)}`
              : 'Valores já liquidados / baixados'}
          </p>
        </div>

        {/* Saldo Líquido do Período */}
        <div className="bg-[#121722] border border-[#232A3B] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Saldo Líquido
              </span>
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  saldoPeriodo >= 0
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-red-500/15 text-red-400'
                }`}
              >
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div
              className={`text-2xl font-black tracking-tight ${
                saldoPeriodo >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {formatCurrency(saldoPeriodo)}
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-3 pt-2 border-t border-[#1C2333]">
            Entradas (-) Saídas totais no período
          </p>
        </div>
      </div>

      {/* Gráfico Entradas x Saídas */}
      <div className="bg-[#121722] border border-[#232A3B] rounded-2xl p-5 shadow-lg">
        <h3 className="font-bold text-white text-base mb-1">Evolução de Entradas x Saídas</h3>
        <p className="text-xs text-slate-400 mb-4">Comparativo mensal do fluxo financeiro</p>

        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#232A3B" vertical={false} />
              <XAxis dataKey="month" stroke="#64748B" fontSize={11} tickLine={false} />
              <YAxis
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0E121B',
                  borderColor: '#232A3B',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#fff',
                }}
                formatter={(val: any) => [formatCurrency(Number(val)), '']}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar dataKey="Entradas" fill="#34D399" radius={[4, 4, 0, 0]} barSize={20} />
              <Bar dataKey="Saídas" fill="#E63946" radius={[4, 4, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabs Switcher: Transações vs Despesas */}
      <div className="flex items-center gap-2 border-b border-[#232A3B] pb-3">
        <button
          onClick={() => handleTabChange('transacoes')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'transacoes'
              ? 'bg-[#E63946] text-white shadow-md shadow-[#E63946]/20'
              : 'bg-[#121722] text-slate-400 hover:text-white'
          }`}
        >
          Extrato de Transações ({transacoesPeriodo.length})
        </button>
        <button
          onClick={() => handleTabChange('despesas')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'despesas'
              ? 'bg-[#E63946] text-white shadow-md shadow-[#E63946]/20'
              : 'bg-[#121722] text-slate-400 hover:text-white'
          }`}
        >
          Gestão de Despesas & Recorrências ({despesasFiltradas.length})
        </button>
      </div>

      {/* Bulk Actions Bar (Barra de Ações em Lote) */}
      {((activeTab === 'transacoes' && selectedTransacoesIds.length > 0) ||
        (activeTab === 'despesas' && selectedDespesasIds.length > 0)) && (
        <div className="sticky top-2 z-20 bg-[#171C28] border-2 border-[#E63946]/40 shadow-2xl shadow-[#E63946]/10 rounded-2xl p-3 sm:px-5 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-top duration-200">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="w-8 h-8 rounded-lg bg-[#E63946]/15 border border-[#E63946]/30 flex items-center justify-center text-[#E63946] shrink-0">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">
                {activeTab === 'transacoes'
                  ? selectedTransacoesIds.length
                  : selectedDespesasIds.length}{' '}
                {activeTab === 'transacoes'
                  ? selectedTransacoesIds.length === 1
                    ? 'transação selecionada'
                    : 'transações selecionadas'
                  : selectedDespesasIds.length === 1
                    ? 'despesa selecionada'
                    : 'despesas selecionadas'}
              </span>
              <span className="text-xs text-slate-400 hidden md:inline">
                • {activeTab === 'transacoes' ? 'Extrato de Caixa' : 'Gestão de Despesas'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (activeTab === 'transacoes') setSelectedTransacoesIds([])
                else setSelectedDespesasIds([])
              }}
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
              <span>
                Excluir Selecionados (
                {activeTab === 'transacoes'
                  ? selectedTransacoesIds.length
                  : selectedDespesasIds.length}
                )
              </span>
            </Button>
          </div>
        </div>
      )}

      {/* ABA 1: TRANSAÇÕES */}
      {activeTab === 'transacoes' && (
        <div className="space-y-4">
          {/* Filtros */}
          <div className="bg-[#121722] border border-[#232A3B] rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-md">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Buscar descrição da transação..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-[#0B0E14] border-[#232A3B] pl-9 text-xs text-slate-100 placeholder:text-slate-500 h-9"
              />
            </div>

            <div className="flex items-center gap-2.5 overflow-x-auto pb-1 md:pb-0">
              <div className="flex items-center bg-[#0B0E14] border border-[#232A3B] rounded-lg p-1 text-xs">
                {['todos', 'entrada', 'saida'].map((tp) => (
                  <button
                    key={tp}
                    onClick={() => setTipoFilter(tp)}
                    className={`px-2.5 py-1 rounded-md capitalize font-medium transition-all ${
                      tipoFilter === tp
                        ? 'bg-[#E63946] text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tp === 'todos' ? 'Todos Tipos' : tp === 'entrada' ? 'Entradas' : 'Saídas'}
                  </button>
                ))}
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[#0B0E14] border border-[#232A3B] text-slate-300 text-xs rounded-lg h-9 px-2.5 outline-none"
              >
                <option value="todos">Todos Status</option>
                <option value="pago">Apenas Pagos / Consolidados</option>
                <option value="pendente">Apenas Pendentes / Abertos</option>
                <option value="cancelado">Cancelados</option>
              </select>

              <select
                value={categoriaFilter}
                onChange={(e) => setCategoriaFilter(e.target.value)}
                className="bg-[#0B0E14] border border-[#232A3B] text-slate-300 text-xs rounded-lg h-9 px-2.5 outline-none capitalize"
              >
                <option value="todos">Todas Categorias</option>
                {todasCategoriasTransacoes.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tabela de Transações */}
          <div className="bg-[#121722] border border-[#232A3B] rounded-2xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#232A3B] bg-[#0E121B] text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="py-3.5 px-4 w-10 text-center">
                      <Checkbox
                        checked={
                          transacoesPeriodo.length > 0 &&
                          selectedTransacoesIds.length === transacoesPeriodo.length
                            ? true
                            : selectedTransacoesIds.length > 0
                              ? 'indeterminate'
                              : false
                        }
                        onCheckedChange={(checked) => handleSelectAllTransacoes(Boolean(checked))}
                        aria-label="Selecionar todas as transações"
                        className="data-[state=checked]:bg-[#E63946] data-[state=checked]:border-[#E63946] border-[#343D52]"
                      />
                    </th>
                    <th className="py-3.5 px-4">Tipo</th>
                    <th className="py-3.5 px-4">Descrição</th>
                    <th className="py-3.5 px-4">Categoria</th>
                    <th className="py-3.5 px-4">Data Registro</th>
                    <th className="py-3.5 px-4">Competência</th>
                    <th className="py-3.5 px-4">Vencimento</th>
                    <th className="py-3.5 px-4 text-center">Consolidado</th>
                    <th className="py-3.5 px-4 text-right">Valor</th>
                    <th className="py-3.5 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#232A3B]">
                  {transacoesPeriodo.map((t) => {
                    const isPago =
                      t.status === 'Pago' ||
                      (t.consolidado && t.status !== 'Pendente' && t.status !== 'Cancelado')
                    const isCancelado = t.status === 'Cancelado'
                    const isToggling = togglingStatusId === t.id
                    const isSelected = selectedTransacoesIds.includes(t.id)

                    return (
                      <tr
                        key={t.id}
                        onClick={() => handleToggleSelectTransacao(t.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-[#E63946]/10 hover:bg-[#E63946]/15'
                            : 'hover:bg-[#1A2234]/50'
                        }`}
                      >
                        <td
                          className="py-3.5 px-4 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleToggleSelectTransacao(t.id)}
                            aria-label={`Selecionar transação ${t.descricao}`}
                            className="data-[state=checked]:bg-[#E63946] data-[state=checked]:border-[#E63946] border-[#343D52]"
                          />
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              t.tipo === 'entrada'
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                                : 'bg-red-500/15 text-red-400 border border-red-500/20'
                            }`}
                          >
                            {t.tipo === 'entrada' ? (
                              <ArrowUpRight className="w-3 h-3" />
                            ) : (
                              <ArrowDownRight className="w-3 h-3" />
                            )}
                            {t.tipo}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-100 max-w-[260px]">
                          {t.descricao}
                        </td>
                        <td className="py-3.5 px-4 text-slate-300 capitalize">{t.categoria}</td>
                        <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                          {new Date(t.data).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">
                          {t.data_competencia ? (
                            formatCompetencia(t.data_competencia)
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">
                          {t.data_vencimento ? (
                            new Date(t.data_vencimento).toLocaleDateString('pt-BR')
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td
                          className="py-3.5 px-4 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            disabled={isToggling}
                            onClick={() => handleToggleStatus(t)}
                            title={
                              isPago
                                ? 'Clique para marcar como Aberto / Pendente'
                                : 'Clique para marcar como Pago / Baixar'
                            }
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all duration-150 cursor-pointer border shadow-sm select-none active:scale-95 group ${
                              isPago
                                ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border-emerald-500/30 hover:border-emerald-500/50 hover:shadow-emerald-500/10'
                                : isCancelado
                                  ? 'bg-slate-500/15 hover:bg-slate-500/25 text-slate-400 border-slate-500/30 hover:border-slate-500/50'
                                  : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border-amber-500/30 hover:border-amber-500/50 hover:shadow-amber-500/10 hover:ring-1 hover:ring-amber-500/30'
                            }`}
                          >
                            {isToggling ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : isPago ? (
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                            ) : isCancelado ? (
                              <XCircle className="w-3.5 h-3.5 text-slate-400 group-hover:scale-110 transition-transform" />
                            ) : (
                              <AlertCircle className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
                            )}
                            <span className="font-semibold">
                              {isPago ? 'Pago' : isCancelado ? 'Cancelado' : 'Aberto'}
                            </span>
                          </button>
                        </td>
                        <td
                          className={`py-3.5 px-4 text-right font-bold text-sm tabular-nums whitespace-nowrap ${
                            t.tipo === 'entrada' ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {t.tipo === 'entrada' ? '+' : '-'} {formatCurrency(t.valor)}
                        </td>
                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            {/* Botão Converter em Venda: exclusivo para transações de ENTRADA não vinculadas a vendas */}
                            {t.tipo === 'entrada' && !t.venda && (
                              <Button
                                variant="outline"
                                size="sm"
                                title="Converter esta entrada em Venda (comissões, VGV, corretores e divisões)"
                                onClick={() => handleOpenConverterEmVenda(t)}
                                className="h-7 px-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:border-emerald-500/60 font-semibold text-[11px] rounded-lg gap-1 shadow-sm transition-all active:scale-95"
                              >
                                <Building2 className="w-3 h-3 text-emerald-400" />
                                <span className="hidden sm:inline">Converter</span>
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Editar transação"
                              onClick={() => handleOpenEditTransacao(t)}
                              className="h-7 w-7 text-slate-400 hover:text-white hover:bg-slate-700/50"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Excluir transação"
                              onClick={() => handleOpenDeleteTransacao(t)}
                              className="h-7 w-7 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {transacoesPeriodo.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-500">
                        Nenhuma transação encontrada no período.
                      </td>
                    </tr>
                  )}{' '}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: DESPESAS */}
      {activeTab === 'despesas' && (
        <div className="space-y-4">
          {/* Filtros de Despesas */}
          <div className="bg-[#121722] border border-[#232A3B] rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-md">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Buscar despesa por descrição..."
                value={searchDespesaTerm}
                onChange={(e) => setSearchDespesaTerm(e.target.value)}
                className="bg-[#0B0E14] border-[#232A3B] pl-9 text-xs text-slate-100 placeholder:text-slate-500 h-9"
              />
            </div>

            <div className="flex items-center gap-2.5 overflow-x-auto pb-1 md:pb-0">
              <select
                value={despesaStatusFilter}
                onChange={(e) => setDespesaStatusFilter(e.target.value)}
                className="bg-[#0B0E14] border border-[#232A3B] text-slate-300 text-xs rounded-lg h-9 px-2.5 outline-none"
              >
                <option value="todos">Todos Status</option>
                <option value="pago">Apenas Pagas</option>
                <option value="pendente">Apenas Pendentes</option>
                <option value="cancelado">Canceladas</option>
              </select>

              <select
                value={despesaCategoriaFilter}
                onChange={(e) => setDespesaCategoriaFilter(e.target.value)}
                className="bg-[#0B0E14] border border-[#232A3B] text-slate-300 text-xs rounded-lg h-9 px-2.5 outline-none capitalize"
              >
                <option value="todos">Todas Categorias</option>
                {todasCategoriasDespesas.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-[#121722] border border-[#232A3B] rounded-2xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#232A3B] bg-[#0E121B] text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="py-3.5 px-4 w-10 text-center">
                      <Checkbox
                        checked={
                          despesasFiltradas.length > 0 &&
                          selectedDespesasIds.length === despesasFiltradas.length
                            ? true
                            : selectedDespesasIds.length > 0
                              ? 'indeterminate'
                              : false
                        }
                        onCheckedChange={(checked) => handleSelectAllDespesas(Boolean(checked))}
                        aria-label="Selecionar todas as despesas"
                        className="data-[state=checked]:bg-[#E63946] data-[state=checked]:border-[#E63946] border-[#343D52]"
                      />
                    </th>
                    <th className="py-3.5 px-4">Descrição</th>
                    <th className="py-3.5 px-4">Categoria</th>
                    <th className="py-3.5 px-4">Data Registro</th>
                    <th className="py-3.5 px-4">Competência</th>
                    <th className="py-3.5 px-4">Vencimento</th>
                    <th className="py-3.5 px-4">Recorrência</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Valor</th>
                    <th className="py-3.5 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#232A3B]">
                  {despesasFiltradas.map((d) => {
                    const isSelected = selectedDespesasIds.includes(d.id)
                    return (
                      <tr
                        key={d.id}
                        onClick={() => handleToggleSelectDespesa(d.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-[#E63946]/10 hover:bg-[#E63946]/15'
                            : 'hover:bg-[#1A2234]/50'
                        }`}
                      >
                        <td
                          className="py-3.5 px-4 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleToggleSelectDespesa(d.id)}
                            aria-label={`Selecionar despesa ${d.descricao}`}
                            className="data-[state=checked]:bg-[#E63946] data-[state=checked]:border-[#E63946] border-[#343D52]"
                          />
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-100">{d.descricao}</td>
                        <td className="py-3.5 px-4 text-slate-300 capitalize">{d.categoria}</td>
                        <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                          {d.data ? new Date(d.data).toLocaleDateString('pt-BR') : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">
                          {d.data_competencia ? (
                            formatCompetencia(d.data_competencia)
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">
                          {d.data_vencimento ? (
                            new Date(d.data_vencimento).toLocaleDateString('pt-BR')
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {d.recorrente ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/25 capitalize">
                              <Repeat className="w-3 h-3" /> {d.frequencia || 'Mensal'}
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[11px]">Eventual</span>
                          )}
                        </td>
                        <td
                          className="py-3.5 px-4 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {(() => {
                            const isDespesaPaga = d.status === 'Pago'
                            const isDespesaCancelada = d.status === 'Cancelado'
                            const isTogglingDespesa = togglingDespesaStatusId === d.id

                            return (
                              <button
                                type="button"
                                disabled={isTogglingDespesa}
                                onClick={() => handleToggleDespesaStatus(d)}
                                title={
                                  isDespesaPaga
                                    ? 'Clique para marcar como Pendente'
                                    : 'Clique para marcar como Pago'
                                }
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all duration-150 cursor-pointer border shadow-sm select-none active:scale-95 group ${
                                  isDespesaPaga
                                    ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border-emerald-500/30 hover:border-emerald-500/50 hover:shadow-emerald-500/10'
                                    : isDespesaCancelada
                                      ? 'bg-slate-500/15 hover:bg-slate-500/25 text-slate-400 border-slate-500/30 hover:border-slate-500/50'
                                      : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border-amber-500/30 hover:border-amber-500/50 hover:shadow-amber-500/10 hover:ring-1 hover:ring-amber-500/30'
                                }`}
                              >
                                {isTogglingDespesa ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : isDespesaPaga ? (
                                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                                ) : isDespesaCancelada ? (
                                  <XCircle className="w-3.5 h-3.5 text-slate-400 group-hover:scale-110 transition-transform" />
                                ) : (
                                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
                                )}
                                <span className="font-semibold">
                                  {isDespesaPaga
                                    ? 'Pago'
                                    : isDespesaCancelada
                                      ? 'Cancelado'
                                      : 'Pendente'}
                                </span>
                              </button>
                            )
                          })()}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-red-400 text-sm tabular-nums whitespace-nowrap">
                          {formatCurrency(d.valor)}
                        </td>
                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEditDespesa(d)}
                              className="h-7 w-7 text-slate-400 hover:text-white"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Excluir despesa"
                              onClick={() => handleOpenDeleteDespesa(d)}
                              className="h-7 w-7 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}

                  {despesasFiltradas.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-500">
                        Nenhuma despesa encontrada no período/filtro selecionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova / Editar Transação */}
      <Dialog open={isTransacaoModalOpen} onOpenChange={setIsTransacaoModalOpen}>
        <DialogContent className="bg-[#121722] border-[#232A3B] text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-[#E63946]" />
              {editingTransacao ? 'Editar Transação Financeira' : 'Nova Transação Financeira'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              {editingTransacao
                ? 'Atualize os dados da transação selecionada.'
                : 'Lance uma entrada ou saída direta no fluxo de caixa.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveTransacao} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Tipo de Transação
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTTipo('entrada')}
                  className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                    tTipo === 'entrada'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                      : 'bg-[#0B0E14] border-[#232A3B] text-slate-400 hover:bg-[#1A2234]'
                  }`}
                >
                  Entrada (+)
                </button>
                <button
                  type="button"
                  onClick={() => setTTipo('saida')}
                  className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                    tTipo === 'saida'
                      ? 'bg-red-500/20 border-red-500 text-red-300'
                      : 'bg-[#0B0E14] border-[#232A3B] text-slate-400 hover:bg-[#1A2234]'
                  }`}
                >
                  Saída (-)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Descrição da Transação *
              </label>
              <Input
                type="text"
                placeholder="Ex: Aporte de capital, Aluguel Sede, Material, etc."
                value={tDescricao}
                onChange={(e) => setTDescricao(e.target.value)}
                className="bg-[#0B0E14] border-[#232A3B] text-xs h-9 text-slate-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Categoria</label>
                <select
                  value={tCategoria || 'outros'}
                  onChange={(e) => setTCategoria(e.target.value as TransacaoCategoria)}
                  className="w-full bg-[#0B0E14] border border-[#232A3B] text-slate-100 text-xs rounded-lg h-9 px-2.5 outline-none capitalize"
                >
                  {transacaoCategoriasDisponiveis.custom.length > 0 && (
                    <optgroup label="Categorias Cadastradas">
                      {transacaoCategoriasDisponiveis.custom.map((c) => (
                        <option key={c.id} value={c.nome}>
                          {c.nome}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="Categorias Padrão">
                    {transacaoCategoriasDisponiveis.padrao.map((p) => (
                      <option key={p.valor} value={p.valor}>
                        {p.label}
                      </option>
                    ))}
                  </optgroup>
                  {/* Se categoria atual for personalizada e não estiver na lista acima, manter para visualização */}
                  {tCategoria &&
                    !transacaoCategoriasDisponiveis.custom.some(
                      (c) => c.nome.toLowerCase() === tCategoria.toLowerCase(),
                    ) &&
                    !transacaoCategoriasDisponiveis.padrao.some(
                      (p) => p.valor.toLowerCase() === tCategoria.toLowerCase(),
                    ) && <option value={tCategoria}>{tCategoria}</option>}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Valor (R$) *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 500"
                  value={tValor}
                  onChange={(e) => setTValor(e.target.value ? Number(e.target.value) : '')}
                  className="bg-[#0B0E14] border-[#232A3B] text-xs h-9 text-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Data do Registro *
                </label>
                <Input
                  type="date"
                  value={tData}
                  onChange={(e) => setTData(e.target.value)}
                  className="bg-[#0B0E14] border-[#232A3B] text-xs h-9 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Status (Consolidado)
                </label>
                <select
                  value={tStatus}
                  onChange={(e) => setTStatus(e.target.value as 'Pendente' | 'Pago' | 'Cancelado')}
                  className="w-full bg-[#0B0E14] border border-[#232A3B] text-slate-100 text-xs rounded-lg h-9 px-2.5 outline-none"
                >
                  <option value="Pendente">Pendente (Aberto)</option>
                  <option value="Pago">Pago (Consolidado)</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-[#0B0E14] border border-[#232A3B]">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Data de Competência
                  </label>
                  <p className="text-[10px] text-slate-400 mb-1.5">
                    Mês em que o fato financeiro ocorreu
                  </p>
                  <select
                    value={tDataCompetencia}
                    onChange={(e) => setTDataCompetencia(e.target.value)}
                    className="w-full bg-[#121722] border border-[#232A3B] text-slate-100 text-xs rounded-lg h-9 px-2.5 outline-none"
                  >
                    <option value="">Selecione o mês (opcional)</option>
                    {MESES_NOMES.map((nome, idx) => (
                      <option key={idx + 1} value={String(idx + 1)}>
                        {nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Data de Vencimento
                  </label>
                  <p className="text-[10px] text-slate-400 mb-1.5">
                    Quando a transação vence/é paga
                  </p>
                  <Input
                    type="date"
                    value={tDataVencimento}
                    onChange={(e) => setTDataVencimento(e.target.value)}
                    className="bg-[#121722] border-[#232A3B] text-xs h-9 text-slate-100"
                  />
                </div>
              </div>

              {!editingTransacao && tTipo === 'saida' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    RECORRÊNCIA (MESES)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="60"
                    value={tRecorrenciaMeses}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10)
                      setTRecorrenciaMeses(isNaN(val) || val < 1 ? 1 : val)
                    }}
                    className="bg-[#0B0E14] border-[#232A3B] text-xs h-9 text-slate-100"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Gera parcelas sequenciais automáticas (até 60 meses, ex: 12x)
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Observações
                </label>
                <textarea
                  rows={2}
                  placeholder="Anotações internas sobre esta transação..."
                  value={tObservacoes}
                  onChange={(e) => setTObservacoes(e.target.value)}
                  className="w-full bg-[#0B0E14] border border-[#232A3B] text-slate-100 text-xs rounded-lg p-2.5 outline-none resize-y"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsTransacaoModalOpen(false)}
                className="bg-transparent border-[#232A3B] text-slate-300"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={savingTransacao}
                className="bg-[#E63946] hover:bg-[#D62839] text-white font-bold"
              >
                {savingTransacao ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : editingTransacao ? (
                  'Atualizar Transação'
                ) : (
                  'Lançar Transação'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmação de Exclusão de Transação */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="bg-[#121722] border-[#232A3B] text-slate-100 max-w-sm p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              Excluir Transação
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-300 mt-2">
              Tem certeza que deseja remover permanentemente esta transação?
            </DialogDescription>
          </DialogHeader>

          {deletingTransacao && (
            <div className="my-3 p-3 rounded-xl bg-[#0B0E14] border border-[#232A3B] text-xs space-y-1">
              <p className="font-semibold text-slate-100">{deletingTransacao.descricao}</p>
              <div className="flex items-center justify-between text-slate-400">
                <span>Valor:</span>
                <span
                  className={`font-bold ${
                    deletingTransacao.tipo === 'entrada' ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {formatCurrency(deletingTransacao.valor)}
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={isDeletingTransacao}
              onClick={() => setIsDeleteModalOpen(false)}
              className="bg-transparent border-[#232A3B] text-slate-300 hover:bg-[#1A2234]"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={isDeletingTransacao}
              onClick={handleConfirmDeleteTransacao}
              className="bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              {isDeletingTransacao ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Excluir Definitivamente'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Modal Nova / Editar Despesa */}
      <Dialog open={isDespesaModalOpen} onOpenChange={setIsDespesaModalOpen}>
        <DialogContent className="bg-[#111216] border-[#22252C] text-slate-100 max-w-lg p-6 rounded-2xl shadow-2xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-[#E63946]" />
              {editingDespesa ? 'Editar Despesa' : 'Cadastrar Nova Despesa'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              {editingDespesa
                ? 'Atualize os dados do registro de despesa.'
                : 'Preencha os dados da saída financeira para controle e recorrência.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveDespesa} className="space-y-4 pt-2">
            {/* Campo opcional de Descrição / Título do Imóvel ou Fornecedor */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Descrição / Título
              </label>
              <Input
                type="text"
                placeholder="Ex: Aluguel da Sede, Google Ads, Sistema CRM"
                value={dDescricao}
                onChange={(e) => setDDescricao(e.target.value)}
                className="bg-[#1A1C23] border-[#2A2E39] focus:border-[#E63946] text-xs h-10 text-slate-100 rounded-lg placeholder:text-slate-500"
              />
            </div>

            {/* Linha 1: VALOR * e VENCIMENTO * */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  VALOR *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={dValor}
                  onChange={(e) => setDValor(e.target.value ? Number(e.target.value) : '')}
                  required
                  className="bg-[#1A1C23] border-[#2A2E39] focus:border-[#E63946] text-xs h-10 text-slate-100 rounded-lg placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  VENCIMENTO *
                </label>
                <Input
                  type="date"
                  value={dDataVencimento}
                  onChange={(e) => setDDataVencimento(e.target.value)}
                  required
                  className="bg-[#1A1C23] border-[#2A2E39] focus:border-[#E63946] text-xs h-10 text-slate-100 rounded-lg"
                />
              </div>
            </div>

            {/* Linha 2: COMPETÊNCIA * e CATEGORIA */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  COMPETÊNCIA *
                </label>
                <Input
                  type="month"
                  value={dDataCompetencia}
                  onChange={(e) => setDDataCompetencia(e.target.value)}
                  required
                  className="bg-[#1A1C23] border-[#2A2E39] focus:border-[#E63946] text-xs h-10 text-slate-100 rounded-lg"
                />
                <p className="text-[10px] text-slate-500 mt-1">Mês ao qual a despesa pertence</p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  CATEGORIA
                </label>
                <select
                  value={dCategoria || 'outros'}
                  onChange={(e) => setDCategoria(e.target.value as DespesaCategoria)}
                  className="w-full bg-[#1A1C23] border border-[#2A2E39] focus:border-[#E63946] text-slate-100 text-xs rounded-lg h-10 px-3 outline-none capitalize"
                >
                  {despesaCategoriasDisponiveis.custom.length > 0 && (
                    <optgroup label="Categorias Cadastradas">
                      {despesaCategoriasDisponiveis.custom.map((c) => (
                        <option key={c.id} value={c.nome}>
                          {c.nome}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="Categorias Padrão">
                    {despesaCategoriasDisponiveis.padrao.map((p) => (
                      <option key={p.valor} value={p.valor}>
                        {p.label}
                      </option>
                    ))}
                  </optgroup>
                  {/* Se categoria atual for personalizada e não estiver na lista acima, manter para visualização */}
                  {dCategoria &&
                    !despesaCategoriasDisponiveis.custom.some(
                      (c) => c.nome.toLowerCase() === dCategoria.toLowerCase(),
                    ) &&
                    !despesaCategoriasDisponiveis.padrao.some(
                      (p) => p.valor.toLowerCase() === dCategoria.toLowerCase(),
                    ) && <option value={dCategoria}>{dCategoria}</option>}
                </select>
              </div>
            </div>

            {/* Linha 3: STATUS */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                STATUS
              </label>
              <select
                value={dStatus}
                onChange={(e) => setDStatus(e.target.value as 'Pendente' | 'Pago' | 'Cancelado')}
                className="w-full bg-[#1A1C23] border border-[#2A2E39] focus:border-[#E63946] text-slate-100 text-xs rounded-lg h-10 px-3 outline-none"
              >
                <option value="Pendente">Pendente</option>
                <option value="Pago">Pago</option>
                <option value="Cancelado">Cancelado</option>
              </select>
            </div>

            {/* Linha 4: RECORRÊNCIA (MESES) */}
            {!editingDespesa && (
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  RECORRÊNCIA (MESES)
                </label>
                <Input
                  type="number"
                  min="1"
                  max="60"
                  value={dRecorrenciaMeses}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10)
                    setDRecorrenciaMeses(isNaN(val) || val < 1 ? 1 : val)
                  }}
                  className="bg-[#1A1C23] border-[#2A2E39] focus:border-[#E63946] text-xs h-10 text-slate-100 rounded-lg"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Use mais de 1 para criar parcelas mensais automáticas (ex: aluguel 12x)
                </p>
              </div>
            )}

            {/* Linha 5: OBSERVAÇÕES */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                OBSERVAÇÕES
              </label>
              <textarea
                rows={3}
                placeholder=""
                value={dObservacoes}
                onChange={(e) => setDObservacoes(e.target.value)}
                className="w-full bg-[#1A1C23] border border-[#2A2E39] focus:border-[#E63946] text-slate-100 text-xs rounded-lg p-3 outline-none resize-y"
              />
            </div>

            <DialogFooter className="pt-3 flex flex-row items-center justify-end gap-2 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDespesaModalOpen(false)}
                className="bg-[#1A1C23] border-[#2A2E39] hover:bg-[#232732] text-slate-200 text-xs h-10 px-5 rounded-xl font-medium"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={savingDespesa}
                className="bg-[#D62828] hover:bg-[#C1121F] text-white font-bold text-xs h-10 px-6 rounded-xl shadow-lg shadow-[#D62828]/25"
              >
                {savingDespesa ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmação de Exclusão de Despesa */}
      <Dialog open={isDeleteDespesaModalOpen} onOpenChange={setIsDeleteDespesaModalOpen}>
        <DialogContent className="bg-[#121722] border-[#232A3B] text-slate-100 max-w-sm p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              Excluir Despesa
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-300 mt-2">
              Tem certeza que deseja remover permanentemente esta despesa?
            </DialogDescription>
          </DialogHeader>

          {deletingDespesa && (
            <div className="my-3 p-3 rounded-xl bg-[#0B0E14] border border-[#232A3B] text-xs space-y-1">
              <p className="font-semibold text-slate-100">{deletingDespesa.descricao}</p>
              <div className="flex items-center justify-between text-slate-400">
                <span>Valor:</span>
                <span className="font-bold text-red-400">
                  {formatCurrency(deletingDespesa.valor)}
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={isDeletingDespesa}
              onClick={() => setIsDeleteDespesaModalOpen(false)}
              className="bg-transparent border-[#232A3B] text-slate-300 hover:bg-[#1A2234]"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={isDeletingDespesa}
              onClick={handleConfirmDeleteDespesa}
              className="bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              {isDeletingDespesa ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Excluir Definitivamente'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmação de Exclusão em Lote (Bulk Delete) */}
      <Dialog open={isBulkDeleteModalOpen} onOpenChange={setIsBulkDeleteModalOpen}>
        <DialogContent className="bg-[#121722] border-[#232A3B] text-slate-100 max-w-sm p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              Excluir Itens Selecionados
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-300 mt-2">
              Tem certeza que deseja excluir permanentemente{' '}
              <strong className="text-white">
                {activeTab === 'transacoes'
                  ? `${selectedTransacoesIds.length} ${selectedTransacoesIds.length > 1 ? 'transações' : 'transação'}`
                  : `${selectedDespesasIds.length} ${selectedDespesasIds.length > 1 ? 'despesas' : 'despesa'}`}
              </strong>
              ? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>

          <div className="my-3 p-3.5 rounded-xl bg-[#0B0E14] border border-[#232A3B] text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span>Quantidade selecionada:</span>
              <span className="font-bold text-white">
                {activeTab === 'transacoes'
                  ? selectedTransacoesIds.length
                  : selectedDespesasIds.length}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Valor total acumulado:</span>
              <span className="font-bold text-red-400">
                {formatCurrency(
                  activeTab === 'transacoes'
                    ? transacoes
                        .filter((t) => selectedTransacoesIds.includes(t.id))
                        .reduce((acc, curr) => acc + (curr.valor || 0), 0)
                    : despesas
                        .filter((d) => selectedDespesasIds.includes(d.id))
                        .reduce((acc, curr) => acc + (curr.valor || 0), 0),
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
                `Excluir ${
                  activeTab === 'transacoes'
                    ? selectedTransacoesIds.length
                    : selectedDespesasIds.length
                } ${
                  (
                    activeTab === 'transacoes'
                      ? selectedTransacoesIds.length > 1
                      : selectedDespesasIds.length > 1
                  )
                    ? 'Registros'
                    : 'Registro'
                }`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Importação de Extrato Bancário */}
      <ImportarExtratoModal
        open={isImportarExtratoOpen}
        onOpenChange={setIsImportarExtratoOpen}
        transacoesExistentes={transacoes}
        userId={user?.id || ''}
        onSuccess={() => {
          loadData()
        }}
      />

      {/* Modal Converter em Venda */}
      <ConverterEmVendaModal
        open={isConverterModalOpen}
        onOpenChange={setIsConverterModalOpen}
        transacao={convertingTransacao}
        userId={user?.id || ''}
        onSuccess={() => {
          loadData()
        }}
      />
    </div>
  )
}
