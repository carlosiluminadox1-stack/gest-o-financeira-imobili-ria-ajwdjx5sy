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
import { usePeriodo } from '@/context/PeriodoContext'
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

  // Modal Nova Transação Manual
  const [isTransacaoModalOpen, setIsTransacaoModalOpen] = useState(false)
  const [tTipo, setTTipo] = useState<TransacaoTipo>('entrada')
  const [tDescricao, setTDescricao] = useState('')
  const [tCategoria, setTCategoria] = useState<TransacaoCategoria>('outros')
  const [tValor, setTValor] = useState<number | ''>('')
  const [tData, setTData] = useState(new Date().toISOString().split('T')[0])
  const [savingTransacao, setSavingTransacao] = useState(false)

  // Modal Nova Despesa
  const [isDespesaModalOpen, setIsDespesaModalOpen] = useState(false)
  const [editingDespesa, setEditingDespesa] = useState<Despesa | null>(null)
  const [dDescricao, setDDescricao] = useState('')
  const [dCategoria, setDCategoria] = useState<DespesaCategoria>('outros')
  const [dValor, setDValor] = useState<number | ''>('')
  const [dData, setDData] = useState(new Date().toISOString().split('T')[0])
  const [dRecorrente, setDRecorrente] = useState(true)
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

  // Nova Transação Manual
  const handleSaveTransacao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tDescricao.trim() || !tValor || Number(tValor) <= 0 || !user) {
      toast.error('Preencha os campos obrigatórios corretamente.')
      return
    }

    setSavingTransacao(true)
    try {
      await TransacaoService.create({
        tipo: tTipo,
        descricao: tDescricao,
        categoria: tCategoria,
        valor: Number(tValor),
        data: new Date(tData + 'T12:00:00Z').toISOString(),
        consolidado: false,
        user: user.id,
      })
      toast.success('Transação registrada com sucesso!')
      setIsTransacaoModalOpen(false)
      setTDescricao('')
      setTValor('')
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao registrar transação.')
    } finally {
      setSavingTransacao(false)
    }
  }

  // Nova / Editar Despesa
  const handleOpenCreateDespesa = () => {
    setEditingDespesa(null)
    setDDescricao('')
    setDCategoria('aluguel')
    setDValor('')
    setDData(new Date().toISOString().split('T')[0])
    setDRecorrente(true)
    setDFrequencia('mensal')
    setDAtiva(true)
    setIsDespesaModalOpen(true)
  }

  const handleOpenEditDespesa = (d: Despesa) => {
    setEditingDespesa(d)
    setDDescricao(d.descricao)
    setDCategoria(d.categoria)
    setDValor(d.valor)
    setDData(new Date(d.data).toISOString().split('T')[0])
    setDRecorrente(d.recorrente)
    setDFrequencia(d.frequencia || 'mensal')
    setDAtiva(d.ativa)
    setIsDespesaModalOpen(true)
  }

  const handleSaveDespesa = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dDescricao.trim() || !dValor || Number(dValor) <= 0 || !user) {
      toast.error('Preencha os campos obrigatórios.')
      return
    }

    setSavingDespesa(true)
    try {
      if (editingDespesa) {
        await DespesaService.update(editingDespesa.id, {
          descricao: dDescricao,
          categoria: dCategoria,
          valor: Number(dValor),
          data: new Date(dData + 'T12:00:00Z').toISOString(),
          recorrente: dRecorrente,
          frequencia: dRecorrente ? dFrequencia : undefined,
          ativa: dAtiva,
        })
        toast.success('Despesa atualizada com sucesso!')
      } else {
        await DespesaService.create(
          {
            descricao: dDescricao,
            categoria: dCategoria,
            valor: Number(dValor),
            data: new Date(dData + 'T12:00:00Z').toISOString(),
            recorrente: dRecorrente,
            frequencia: dRecorrente ? dFrequencia : undefined,
            ativa: dAtiva,
          },
          user.id,
        )
        toast.success('Despesa cadastrada e transação de saída gerada!')
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
      toast.success('Despesa removida!')
      loadData()
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
            Controle de entradas, saídas e automação de despesas recorrentes
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'transacoes' ? (
            <Button
              onClick={() => setIsTransacaoModalOpen(true)}
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
                    <th className="py-3.5 px-4">Data</th>
                    <th className="py-3.5 px-4 text-center">Consolidado</th>
                    <th className="py-3.5 px-4 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#232A3B]">
                  {transacoesPeriodo.map((t) => (
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
                      <td className="py-3.5 px-4 font-semibold text-slate-100 max-w-[320px]">
                        {t.descricao}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 capitalize">{t.categoria}</td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {new Date(t.data).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {t.consolidado ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                            <CheckCircle className="w-3 h-3" /> Fechado
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500">Aberto</span>
                        )}
                      </td>
                      <td
                        className={`py-3.5 px-4 text-right font-bold text-sm tabular-nums ${
                          t.tipo === 'entrada' ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {t.tipo === 'entrada' ? '+' : '-'} {formatCurrency(t.valor)}
                      </td>
                    </tr>
                  ))}

                  {transacoesPeriodo.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        Nenhuma transação encontrada no período.
                      </td>
                    </tr>
                  )}
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
                    <th className="py-3.5 px-4">Recorrência & Ciclo</th>
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
                        {d.ativa ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400">
                            Ativa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-500/15 text-slate-400">
                            Inativa
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-red-400 text-sm tabular-nums">
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
                      <td colSpan={6} className="py-12 text-center text-slate-500">
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

      {/* Modal Nova Transação Manual */}
      <Dialog open={isTransacaoModalOpen} onOpenChange={setIsTransacaoModalOpen}>
        <DialogContent className="bg-[#121722] border-[#232A3B] text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-[#E63946]" />
              Nova Transação Financeira
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Lance uma entrada ou saída direta no fluxo de caixa.
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
                placeholder="Ex: Aporte de capital, Material de reforma, etc."
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
                  placeholder="Ex: 500"
                  value={tValor}
                  onChange={(e) => setTValor(e.target.value ? Number(e.target.value) : '')}
                  className="bg-[#0B0E14] border-[#232A3B] text-xs h-9 text-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Data</label>
              <Input
                type="date"
                value={tData}
                onChange={(e) => setTData(e.target.value)}
                className="bg-[#0B0E14] border-[#232A3B] text-xs h-9 text-slate-100"
              />
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
                ) : (
                  'Lançar Transação'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Nova / Editar Despesa */}
      <Dialog open={isDespesaModalOpen} onOpenChange={setIsDespesaModalOpen}>
        <DialogContent className="bg-[#121722] border-[#232A3B] text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-[#E63946]" />
              {editingDespesa ? 'Editar Despesa' : 'Cadastrar Nova Despesa'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Despesas ativas e recorrentes geram transações financeiras automaticamente.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveDespesa} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Descrição da Despesa *
              </label>
              <Input
                type="text"
                placeholder="Ex: Aluguel da Sede, Google Ads, Sistema CRM"
                value={dDescricao}
                onChange={(e) => setDDescricao(e.target.value)}
                className="bg-[#0B0E14] border-[#232A3B] text-xs h-9 text-slate-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Categoria</label>
                <select
                  value={dCategoria}
                  onChange={(e) => setDCategoria(e.target.value as DespesaCategoria)}
                  className="w-full bg-[#0B0E14] border border-[#232A3B] text-slate-100 text-xs rounded-lg h-9 px-2.5 outline-none"
                >
                  <option value="aluguel">Aluguel</option>
                  <option value="marketing">Marketing</option>
                  <option value="salarios">Salários</option>
                  <option value="utilidades">Utilidades</option>
                  <option value="manutencao">Manutenção</option>
                  <option value="outros">Outros</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Valor (R$) *
                </label>
                <Input
                  type="number"
                  placeholder="Ex: 2500"
                  value={dValor}
                  onChange={(e) => setDValor(e.target.value ? Number(e.target.value) : '')}
                  className="bg-[#0B0E14] border-[#232A3B] text-xs h-9 text-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Data de Vencimento / Início
              </label>
              <Input
                type="date"
                value={dData}
                onChange={(e) => setDData(e.target.value)}
                className="bg-[#0B0E14] border-[#232A3B] text-xs h-9 text-slate-100"
              />
            </div>

            <div className="p-3.5 rounded-xl bg-[#0B0E14] border border-[#232A3B] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-200">Despesa Recorrente</p>
                  <p className="text-[11px] text-slate-400">Repetir cobrança automaticamente</p>
                </div>
                <Switch checked={dRecorrente} onCheckedChange={setDRecorrente} />
              </div>

              {dRecorrente && (
                <div className="pt-2 border-t border-[#232A3B]">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Frequência do Ciclo
                  </label>
                  <select
                    value={dFrequencia}
                    onChange={(e) => setDFrequencia(e.target.value as DespesaFrequencia)}
                    className="w-full bg-[#121722] border border-[#232A3B] text-slate-100 text-xs rounded-lg h-9 px-2.5 outline-none"
                  >
                    <option value="mensal">Mensal</option>
                    <option value="trimestral">Trimestral</option>
                    <option value="semestral">Semestral</option>
                    <option value="anual">Anual</option>
                  </select>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-[#232A3B]">
                <div>
                  <p className="text-xs font-semibold text-slate-200">Status Ativa</p>
                  <p className="text-[11px] text-slate-400">
                    Permitir processamento no cron diário
                  </p>
                </div>
                <Switch checked={dAtiva} onCheckedChange={setDAtiva} />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDespesaModalOpen(false)}
                className="bg-transparent border-[#232A3B] text-slate-300"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={savingDespesa}
                className="bg-[#E63946] hover:bg-[#D62839] text-white font-bold"
              >
                {savingDespesa ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Despesa'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
