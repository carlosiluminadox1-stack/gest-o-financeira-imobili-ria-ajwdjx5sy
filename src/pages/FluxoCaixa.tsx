import React, { useState, useEffect, useMemo } from 'react'
import {
  ArrowLeftRight,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Search,
  Calendar,
  Layers,
  Repeat,
  CheckCircle,
  XCircle,
  Trash2,
  Edit2,
  Loader2,
  DollarSign,
  AlertCircle,
} from 'lucide-react'
import { TransacaoService, DespesaService } from '@/services/imobService'
import {
  Transacao,
  Despesa,
  TransacaoTipo,
  TransacaoCategoria,
  DespesaCategoria,
  DespesaFrequencia,
} from '@/types'
import { useAuth } from '@/context/AuthContext'
import { usePeriodo, MESES_NOMES } from '@/context/PeriodoContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
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
  const { periodo, getPeriodoDates } = usePeriodo()
  const [activeTab, setActiveTab] = useState<'transacoes' | 'despesas'>('transacoes')

  const [transacoes, setTransacoes] = useState<Transacao[]>([])
  const [despesas, setDespesas] = useState<Despesa[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros Transações
  const [searchTerm, setSearchTerm] = useState('')
  const [tipoFilter, setTipoFilter] = useState<string>('todos')
  const [categoriaFilter, setCategoriaFilter] = useState<string>('todos')

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
      const [tList, dList] = await Promise.all([TransacaoService.getAll(), DespesaService.getAll()])
      setTransacoes(tList)
      setDespesas(dList)
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

      if (searchTerm.trim()) {
        return t.descricao.toLowerCase().includes(searchTerm.toLowerCase())
      }
      return true
    })
  }, [transacoes, start, end, tipoFilter, categoriaFilter, searchTerm])

  // 3 Cartões de Saldo no Período
  const totalEntradas = useMemo(() => {
    return transacoes
      .filter((t) => {
        const d = new Date(t.data)
        return d >= start && d <= end && t.tipo === 'entrada'
      })
      .reduce((sum, t) => sum + (t.valor || 0), 0)
  }, [transacoes, start, end])

  const totalSaidas = useMemo(() => {
    return transacoes
      .filter((t) => {
        const d = new Date(t.data)
        return d >= start && d <= end && t.tipo === 'saida'
      })
      .reduce((sum, t) => sum + (t.valor || 0), 0)
  }, [transacoes, start, end])

  const saldoPeriodo = totalEntradas - totalSaidas

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

  // Reset do Modal de Transação Manual (Criação)
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
            descricao: tDescricao.trim(),
            categoria: tCategoria,
            valor: Number(tValor),
            data: tData,
            data_competencia_iso: competenciaIso,
            data_vencimento: tDataVencimento || undefined,
            recorrencia_meses: mesesRecorrencia,
            user: user.id,
          })
          setTransacoes((prev) => [...created, ...prev])
          toast.success(`${created.length} parcelas de transação geradas com sucesso!`)
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

    // Atualização otimista imediata na UI
    setTransacoes((prev) =>
      prev.map((item) =>
        item.id === t.id ? { ...item, status: nextStatus, consolidado: nextConsolidado } : item,
      ),
    )

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
      setTransacoes((prev) => prev.map((item) => (item.id === t.id ? t : item)))
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

        const payload = {
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

        await DespesaService.update(editingDespesa.id, payload)
        toast.success('Despesa atualizada com sucesso!')
      } else {
        const mesesRecorrencia = Math.max(1, Math.floor(Number(dRecorrenciaMeses) || 1))

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
          toast.success(`${created.length} parcelas de despesa geradas com sucesso!`)
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

          await DespesaService.create(
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
          toast.success('Despesa cadastrada e transação de saída gerada!')
        }
      }
      setIsDespesaModalOpen(false)
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao salvar despesa.')
    } finally {
      setSavingDespesa(false)
    }
  }

  const handleDeleteDespesa = async (id: string) => {
    if (!confirm('Deseja realmente remover esta despesa?')) return
    try {
      await DespesaService.delete(id)
      setDespesas((prev) => prev.filter((item) => item.id !== id))
      toast.success('Despesa removida!')
    } catch (err) {
      toast.error('Erro ao excluir despesa.')
    }
  }

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  return (
    <div className="space-y-6">
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

      {/* 3 Cartões de Saldo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Entradas */}
        <div className="bg-[#121722] border border-[#232A3B] rounded-2xl p-5 shadow-lg">
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
          <p className="text-[11px] text-slate-500 mt-2">Comissões recebidas e aportes</p>
        </div>

        {/* Saídas */}
        <div className="bg-[#121722] border border-[#232A3B] rounded-2xl p-5 shadow-lg">
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
          <p className="text-[11px] text-slate-500 mt-2">
            Despesas operacionais, impostos e repasses
          </p>
        </div>

        {/* Saldo do Período */}
        <div className="bg-[#121722] border border-[#232A3B] rounded-2xl p-5 shadow-lg">
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
          <p className="text-[11px] text-slate-500 mt-2">Resultado no período selecionado</p>
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
          onClick={() => setActiveTab('transacoes')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'transacoes'
              ? 'bg-[#E63946] text-white shadow-md shadow-[#E63946]/20'
              : 'bg-[#121722] text-slate-400 hover:text-white'
          }`}
        >
          Extrato de Transações ({transacoesPeriodo.length})
        </button>
        <button
          onClick={() => setActiveTab('despesas')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'despesas'
              ? 'bg-[#E63946] text-white shadow-md shadow-[#E63946]/20'
              : 'bg-[#121722] text-slate-400 hover:text-white'
          }`}
        >
          Gestão de Despesas & Recorrências ({despesas.length})
        </button>
      </div>

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
                value={categoriaFilter}
                onChange={(e) => setCategoriaFilter(e.target.value)}
                className="bg-[#0B0E14] border border-[#232A3B] text-slate-300 text-xs rounded-lg h-9 px-2.5 outline-none"
              >
                <option value="todos">Todas Categorias</option>
                <option value="comissao">Comissão</option>
                <option value="imposto">Imposto (6%)</option>
                <option value="repasse">Repasse</option>
                <option value="aluguel">Aluguel</option>
                <option value="marketing">Marketing</option>
                <option value="salarios">Salários</option>
                <option value="utilidades">Utilidades</option>
                <option value="manutencao">Manutenção</option>
                <option value="outros">Outros</option>
              </select>
            </div>
          </div>

          {/* Tabela de Transações */}
          <div className="bg-[#121722] border border-[#232A3B] rounded-2xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#232A3B] bg-[#0E121B] text-slate-400 font-semibold uppercase tracking-wider">
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

                    return (
                      <tr key={t.id} className="hover:bg-[#1A2234]/50 transition-colors">
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
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            disabled={isToggling}
                            onClick={() => handleToggleStatus(t)}
                            title={
                              isPago
                                ? 'Clique para marcar como Aberto / Pendente'
                                : 'Clique para marcar como Pago / Baixar'
                            }
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer border ${
                              isPago
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                                : isCancelado
                                  ? 'bg-slate-500/15 text-slate-400 border-slate-500/30 hover:bg-slate-500/25'
                                  : 'bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25'
                            }`}
                          >
                            {isToggling ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : isPago ? (
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                            ) : isCancelado ? (
                              <XCircle className="w-3.5 h-3.5 text-slate-400" />
                            ) : (
                              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                            )}
                            <span>{isPago ? 'Pago' : isCancelado ? 'Cancelado' : 'Aberto'}</span>
                          </button>
                        </td>
                        <td
                          className={`py-3.5 px-4 text-right font-bold text-sm tabular-nums whitespace-nowrap ${
                            t.tipo === 'entrada' ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {t.tipo === 'entrada' ? '+' : '-'} {formatCurrency(t.valor)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
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
                      <td colSpan={9} className="py-12 text-center text-slate-500">
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
          <div className="bg-[#121722] border border-[#232A3B] rounded-2xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#232A3B] bg-[#0E121B] text-slate-400 font-semibold uppercase tracking-wider">
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
                  {despesas.map((d) => (
                    <tr key={d.id} className="hover:bg-[#1A2234]/50 transition-colors">
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
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            d.status === 'Pago'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                              : d.status === 'Cancelado'
                                ? 'bg-slate-500/15 text-slate-400 border border-slate-500/20'
                                : 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {d.status || (d.ativa ? 'Pendente' : 'Inativa')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-red-400 text-sm tabular-nums whitespace-nowrap">
                        {formatCurrency(d.valor)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
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
                            onClick={() => handleDeleteDespesa(d.id)}
                            className="h-7 w-7 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {despesas.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-500">
                        Nenhuma despesa cadastrada.
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
                  value={tCategoria}
                  onChange={(e) => setTCategoria(e.target.value as TransacaoCategoria)}
                  className="w-full bg-[#0B0E14] border border-[#232A3B] text-slate-100 text-xs rounded-lg h-9 px-2.5 outline-none"
                >
                  <option value="comissao">Comissão</option>
                  <option value="aluguel">Aluguel</option>
                  <option value="marketing">Marketing</option>
                  <option value="salarios">Salários</option>
                  <option value="utilidades">Utilidades</option>
                  <option value="manutencao">Manutenção</option>
                  <option value="imposto">Imposto</option>
                  <option value="repasse">Repasse</option>
                  <option value="outros">Outros</option>
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
                  value={dCategoria}
                  onChange={(e) => setDCategoria(e.target.value as DespesaCategoria)}
                  className="w-full bg-[#1A1C23] border border-[#2A2E39] focus:border-[#E63946] text-slate-100 text-xs rounded-lg h-10 px-3 outline-none"
                >
                  <option value="outros">Sem categoria / Outros</option>
                  <option value="aluguel">Aluguel</option>
                  <option value="marketing">Marketing</option>
                  <option value="salarios">Salários</option>
                  <option value="utilidades">Utilidades (Água/Luz/Net)</option>
                  <option value="manutencao">Manutenção</option>
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
    </div>
  )
}
