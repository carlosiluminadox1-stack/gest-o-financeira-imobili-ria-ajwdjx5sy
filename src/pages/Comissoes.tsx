import React, { useState, useEffect, useMemo } from 'react'
import {
  BadgePercent,
  TrendingUp,
  CheckCircle2,
  Clock,
  ArrowRight,
  Filter,
  Users,
  Search,
  Building,
  ArrowUpRight,
  Sparkles,
  PieChart as PieChartIcon,
  BarChart3,
  Calendar,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from 'recharts'
import { ComissaoService, CorretorService, TransacaoService } from '@/services/imobService'
import { Comissao, Corretor, ComissaoTipo, SituacaoRecebimento } from '@/types'
import { useAuth } from '@/context/AuthContext'
import { usePeriodo } from '@/context/PeriodoContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { AnimatedCounter } from '@/components/AnimatedCounter'

const COLORS = ['#E63946', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4']

export default function Comissoes() {
  const { user } = useAuth()
  const { periodo, getPeriodoDates } = usePeriodo()
  const [comissoes, setComissoes] = useState<Comissao[]>([])
  const [corretores, setCorretores] = useState<Corretor[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [selectedCorretor, setSelectedCorretor] = useState<string>('todos')
  const [selectedTipo, setSelectedTipo] = useState<string>('todos')
  const [selectedStatus, setSelectedStatus] = useState<string>('todos')
  const [selectedSituacao, setSelectedSituacao] = useState<string>('todos')
  const [searchTerm, setSearchTerm] = useState('')

  const loadData = async () => {
    setLoading(true)
    try {
      const [cList, corrList] = await Promise.all([
        ComissaoService.getAll(),
        CorretorService.getAll(),
      ])
      setComissoes(cList)
      setCorretores(corrList)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar comissões.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user])

  const { start, end } = useMemo(() => getPeriodoDates(periodo), [periodo, getPeriodoDates])

  // Filtragem conforme período e seleções do usuário
  const filteredComissoes = useMemo(() => {
    return comissoes.filter((c) => {
      // Período
      const d = new Date(c.created)
      if (d < start || d > end) return false

      // Corretor
      if (selectedCorretor !== 'todos' && c.corretor !== selectedCorretor) return false

      // Tipo (venda x captacao)
      if (selectedTipo !== 'todos' && c.tipo !== selectedTipo) return false

      // Status (pago x pendente)
      if (selectedStatus !== 'todos' && c.status !== selectedStatus) return false

      // Situação da venda relacionada
      if (selectedSituacao !== 'todos') {
        const sitVenda = c.expand?.venda?.situacao_recebimento || 'Recebido'
        if (sitVenda !== selectedSituacao) return false
      }

      // Busca texto
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase()
        const matchCorretor = c.expand?.corretor?.nome?.toLowerCase().includes(term)
        const matchImovel = c.expand?.venda?.titulo_imovel?.toLowerCase().includes(term)
        const matchCliente = c.expand?.venda?.cliente?.toLowerCase().includes(term)
        return matchCorretor || matchImovel || matchCliente
      }

      return true
    })
  }, [
    comissoes,
    start,
    end,
    selectedCorretor,
    selectedTipo,
    selectedStatus,
    selectedSituacao,
    searchTerm,
  ])

  // Totais & Métricas
  const totalComissoes = useMemo(() => {
    return filteredComissoes.reduce((acc, c) => acc + c.valor, 0)
  }, [filteredComissoes])

  const totalPagas = useMemo(() => {
    return filteredComissoes.filter((c) => c.status === 'pago').reduce((acc, c) => acc + c.valor, 0)
  }, [filteredComissoes])

  const totalPendentes = useMemo(() => {
    return filteredComissoes
      .filter((c) => c.status === 'pendente')
      .reduce((acc, c) => acc + c.valor, 0)
  }, [filteredComissoes])

  const totalVendaDireta = useMemo(() => {
    return filteredComissoes.filter((c) => c.tipo === 'venda').reduce((acc, c) => acc + c.valor, 0)
  }, [filteredComissoes])

  const totalCaptacao = useMemo(() => {
    return filteredComissoes
      .filter((c) => c.tipo === 'captacao')
      .reduce((acc, c) => acc + c.valor, 0)
  }, [filteredComissoes])

  // --- DADOS PARA OS GRÁFICOS DINÂMICOS ---

  // 1. Gráfico de Barras: Comissões por Corretor
  const chartDataPorCorretor = useMemo(() => {
    const map: Record<string, { nome: string; total: number; pago: number; pendente: number }> = {}

    filteredComissoes.forEach((c) => {
      const nome = c.expand?.corretor?.nome || 'Corretor'
      if (!map[nome]) {
        map[nome] = { nome, total: 0, pago: 0, pendente: 0 }
      }
      map[nome].total += c.valor
      if (c.status === 'pago') map[nome].pago += c.valor
      else map[nome].pendente += c.valor
    })

    return Object.values(map)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
  }, [filteredComissoes])

  // 2. Gráfico de Rosca: Composição (Venda x Captação)
  const chartDataComposicao = useMemo(() => {
    const list = [
      { name: 'Venda Fechador', value: totalVendaDireta, color: '#3B82F6' },
      { name: 'Captação', value: totalCaptacao, color: '#F59E0B' },
    ]
    return list.filter((i) => i.value > 0)
  }, [totalVendaDireta, totalCaptacao])

  // 3. Gráfico de Situação (Pago vs Pendente)
  const chartDataStatus = useMemo(() => {
    const list = [
      { name: 'Pago / Repassado', value: totalPagas, color: '#10B981' },
      { name: 'Pendente', value: totalPendentes, color: '#E63946' },
    ]
    return list.filter((i) => i.value > 0)
  }, [totalPagas, totalPendentes])

  // 4. Gráfico Temporal: Evolução das Comissões ao longo do tempo
  const chartDataEvolucao = useMemo(() => {
    const map: Record<string, { data: string; total: number; timestamp: number }> = {}

    filteredComissoes.forEach((c) => {
      const dateObj = new Date(c.created)
      const key = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}`
      if (!map[key]) {
        map[key] = { data: key, total: 0, timestamp: dateObj.getTime() }
      }
      map[key].total += c.valor
    })

    return Object.values(map).sort((a, b) => a.timestamp - b.timestamp)
  }, [filteredComissoes])

  const handleMarcarComoPago = async (comissao: Comissao) => {
    try {
      await ComissaoService.markAsPaid(comissao.id)
      toast.success('Comissão marcada como paga! Fluxo de saída baixado com sucesso.')
      loadData()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao liquidar comissão.')
    }
  }

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-full overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <BadgePercent className="w-6 h-6 text-[#E63946]" />
            Comissões & Repasses a Corretores
          </h2>
          <p className="text-xs text-slate-400">
            Acompanhamento analítico e controle de pagamentos proporcionais das comissões
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex px-3 py-1.5 rounded-xl bg-[#121722] border border-[#232A3B] text-xs font-semibold text-red-400">
            {getPeriodoDates(periodo).label}
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Geral de Comissões */}
        <div className="p-4 rounded-2xl bg-[#121722] border border-[#232A3B] shadow-md">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Total em Comissões</span>
            <BadgePercent className="w-4 h-4 text-[#E63946]" />
          </div>
          <div className="text-xl font-extrabold text-white">
            <AnimatedCounter value={totalComissoes} formatter={formatCurrency} />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {filteredComissoes.length} lançamentos filtrados
          </p>
        </div>

        {/* Total Repassado / Pago */}
        <div className="p-4 rounded-2xl bg-[#121722] border border-emerald-500/30 shadow-md">
          <div className="flex items-center justify-between text-xs text-emerald-400 mb-1">
            <span className="font-semibold">Já Repassado (Pago)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-extrabold text-emerald-400">
            <AnimatedCounter value={totalPagas} formatter={formatCurrency} />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {totalComissoes > 0 ? Math.round((totalPagas / totalComissoes) * 100) : 0}% do total
          </p>
        </div>

        {/* Pendente de Repasse */}
        <div className="p-4 rounded-2xl bg-[#121722] border border-amber-500/30 shadow-md">
          <div className="flex items-center justify-between text-xs text-amber-400 mb-1">
            <span className="font-semibold">Pendente de Pagamento</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-extrabold text-amber-400">
            <AnimatedCounter value={totalPendentes} formatter={formatCurrency} />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Aguardando liberação / liquidação</p>
        </div>

        {/* Venda vs Captação */}
        <div className="p-4 rounded-2xl bg-[#121722] border border-[#232A3B] shadow-md">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Venda vs Captação</span>
            <PieChartIcon className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex items-center justify-between text-xs font-bold pt-1">
            <span className="text-blue-400">Venda: {formatCurrency(totalVendaDireta)}</span>
          </div>
          <div className="flex items-center justify-between text-xs font-bold pt-0.5">
            <span className="text-amber-400">Captação: {formatCurrency(totalCaptacao)}</span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* FILTROS INTERATIVOS QUE ATUALIZAM OS GRÁFICOS */}
      {/* ============================================================== */}
      <div className="bg-[#121722] border border-[#232A3B] rounded-2xl p-4 space-y-3 shadow-md">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
          <Filter className="w-4 h-4 text-[#E63946]" />
          <span>Filtros Dinâmicos (Os gráficos e tabela reagem instantaneamente)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {/* Corretor */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Corretor / Profissional</label>
            <select
              value={selectedCorretor}
              onChange={(e) => setSelectedCorretor(e.target.value)}
              className="w-full bg-[#0B0E14] border border-[#232A3B] text-slate-100 text-xs rounded-lg h-9 px-2.5 outline-none focus:border-[#E63946]"
            >
              <option value="todos">Todos os Corretores</option>
              {corretores.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Tipo de Comissão */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Tipo de Comissão</label>
            <select
              value={selectedTipo}
              onChange={(e) => setSelectedTipo(e.target.value)}
              className="w-full bg-[#0B0E14] border border-[#232A3B] text-slate-100 text-xs rounded-lg h-9 px-2.5 outline-none focus:border-[#E63946]"
            >
              <option value="todos">Todos os Tipos</option>
              <option value="venda">Venda (Fechador)</option>
              <option value="captacao">Captação (Imóvel)</option>
            </select>
          </div>

          {/* Situação da Comissão (Pago/Pendente) */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Status do Pagamento</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-[#0B0E14] border border-[#232A3B] text-slate-100 text-xs rounded-lg h-9 px-2.5 outline-none focus:border-[#E63946]"
            >
              <option value="todos">Todos os Status</option>
              <option value="pago">Pago / Repassado</option>
              <option value="pendente">Pendente</option>
            </select>
          </div>

          {/* Situação Recebimento da Venda */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Situação da Venda</label>
            <select
              value={selectedSituacao}
              onChange={(e) => setSelectedSituacao(e.target.value)}
              className="w-full bg-[#0B0E14] border border-[#232A3B] text-slate-100 text-xs rounded-lg h-9 px-2.5 outline-none focus:border-[#E63946]"
            >
              <option value="todos">Todas as Situações</option>
              <option value="Recebido">Recebimento Total</option>
              <option value="Parcial">Recebimento Parcial</option>
            </select>
          </div>

          {/* Busca Geral */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Buscar</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Imóvel ou cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-[#0B0E14] border-[#232A3B] pl-8 text-xs text-slate-100 h-9"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* SEÇÃO DE GRÁFICOS DINÂMICOS CONFORME AS OPÇÕES ESCOLHIDAS */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Gráfico 1: Comissões por Corretor (Barras) */}
        <div className="lg:col-span-2 bg-[#121722] border border-[#232A3B] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-[#232A3B] mb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#E63946]" />
              <h3 className="font-bold text-white text-sm">Total de Comissões por Corretor</h3>
            </div>
            <span className="text-[11px] text-slate-400">Filtrado pelo período e seleção</span>
          </div>

          <div className="h-[260px] w-full pt-2">
            {chartDataPorCorretor.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartDataPorCorretor}
                  margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                >
                  <XAxis
                    dataKey="nome"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={10}
                    tickLine={false}
                    tickFormatter={(v) => `R$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0E121B',
                      borderColor: '#232A3B',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#F8FAFC',
                    }}
                    formatter={(value: any) => [formatCurrency(Number(value)), '']}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                    formatter={(val) => <span className="text-slate-300">{val}</span>}
                  />
                  <Bar
                    dataKey="pago"
                    name="Pago / Repassado"
                    fill="#10B981"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar dataKey="pendente" name="Pendente" fill="#E63946" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
                Nenhum dado encontrado para os filtros selecionados.
              </div>
            )}
          </div>
        </div>

        {/* Gráfico 2: Composição (Venda x Captação) */}
        <div className="bg-[#121722] border border-[#232A3B] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-[#232A3B] mb-3">
            <div className="flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-blue-400" />
              <h3 className="font-bold text-white text-sm">Origem da Comissão</h3>
            </div>
            <span className="text-[11px] text-slate-400">Venda x Captação</span>
          </div>

          <div className="h-[260px] w-full relative flex items-center justify-center">
            {chartDataComposicao.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartDataComposicao}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {chartDataComposicao.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0E121B',
                      borderColor: '#232A3B',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: any) => [formatCurrency(Number(value)), 'Valor']}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '11px' }}
                    formatter={(val) => <span className="text-slate-300">{val}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-slate-500 text-xs">Sem dados no período</div>
            )}
          </div>
        </div>
      </div>

      {/* Gráfico 3: Evolução Temporal das Comissões */}
      {chartDataEvolucao.length > 1 && (
        <div className="bg-[#121722] border border-[#232A3B] rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-[#232A3B] mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-white text-sm">Evolução Temporal das Comissões</h3>
            </div>
            <span className="text-[11px] text-slate-400">Lançamentos ao longo do período</span>
          </div>

          <div className="h-[180px] w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartDataEvolucao}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorComissao" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E63946" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#E63946" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="data" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  tickFormatter={(v) => `R$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0E121B',
                    borderColor: '#232A3B',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#F8FAFC',
                  }}
                  formatter={(value: any) => [formatCurrency(Number(value)), 'Total']}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#E63946"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorComissao)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tabela Detalhada de Comissões */}
      <div className="bg-[#121722] border border-[#232A3B] rounded-2xl shadow-lg overflow-hidden">
        <div className="p-4 border-b border-[#232A3B] flex items-center justify-between">
          <h3 className="font-bold text-white text-sm">Detalhamento dos Lançamentos</h3>
          <span className="text-xs text-slate-400">
            Exibindo {filteredComissoes.length} registros
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#232A3B] bg-[#0E121B] text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Corretor</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Imóvel & Cliente</th>
                <th className="py-3 px-4 text-right">Percentual</th>
                <th className="py-3 px-4 text-right">Valor da Comissão</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#232A3B]">
              {filteredComissoes.map((c) => (
                <tr key={c.id} className="hover:bg-[#1A2234]/50 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-100">
                    {c.expand?.corretor?.nome || 'Corretor'}
                  </td>
                  <td className="py-3.5 px-4">
                    {c.tipo === 'venda' ? (
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/20">
                        Venda Fechador
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/20">
                        Captação
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 max-w-[200px]">
                    <div className="font-semibold text-slate-200 truncate">
                      {c.expand?.venda?.titulo_imovel || 'Imóvel'}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {c.expand?.venda?.cliente || 'Cliente'}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right font-medium text-slate-300">
                    {c.percentual}%
                  </td>
                  <td className="py-3.5 px-4 text-right font-extrabold text-white tabular-nums">
                    {formatCurrency(c.valor)}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {c.status === 'pago' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" /> Pago
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/20">
                        <Clock className="w-3 h-3" /> Pendente
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {c.status === 'pendente' && (
                      <Button
                        size="sm"
                        onClick={() => handleMarcarComoPago(c)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] h-7 px-2.5 font-bold rounded-lg gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Marcar como Pago</span>
                      </Button>
                    )}
                  </td>
                </tr>
              ))}

              {filteredComissoes.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    Nenhuma comissão encontrada para os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
