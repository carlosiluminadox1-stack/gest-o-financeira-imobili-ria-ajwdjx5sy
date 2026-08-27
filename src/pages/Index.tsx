import React, { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingUp,
  BadgePercent,
  TrendingDown,
  Wallet,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Award,
  Calendar,
  ChevronRight,
  Clock,
  Sparkles,
  Target,
} from 'lucide-react'
import {
  VendaService,
  TransacaoService,
  MetaService,
  CorretorService,
  ComissaoService,
  DespesaService,
} from '@/services/imobService'
import { Venda, Transacao, MetaVGV, Corretor, Comissao, Despesa } from '@/types'
import { usePeriodo } from '@/context/PeriodoContext'
import { AnimatedCounter } from '@/components/AnimatedCounter'
import { Progress } from '@/components/ui/progress'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Line,
  ComposedChart,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

export default function Dashboard() {
  const { periodo, getPeriodoDates } = usePeriodo()
  const [vendas, setVendas] = useState<Venda[]>([])
  const [transacoes, setTransacoes] = useState<Transacao[]>([])
  const [metas, setMetas] = useState<MetaVGV[]>([])
  const [corretores, setCorretores] = useState<Corretor[]>([])
  const [comissoes, setComissoes] = useState<Comissao[]>([])
  const [despesas, setDespesas] = useState<Despesa[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const [vList, tList, mList, cList, commList, dList] = await Promise.all([
          VendaService.getAll(),
          TransacaoService.getAll(),
          MetaService.getAll(),
          CorretorService.getAll(),
          ComissaoService.getAll(),
          DespesaService.getAll(),
        ])
        setVendas(vList)
        setTransacoes(tList)
        setMetas(mList)
        setCorretores(cList)
        setComissoes(commList)
        setDespesas(dList)
      } catch (err) {
        console.error('Erro ao carregar dados do painel:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Filtragem com base no período global selecionado
  const { start, end } = useMemo(() => getPeriodoDates(periodo), [periodo, getPeriodoDates])

  const vendasPeriodo = useMemo(() => {
    return vendas.filter((v) => {
      const d = new Date(v.data_venda)
      return d >= start && d <= end
    })
  }, [vendas, start, end])

  const transacoesPeriodo = useMemo(() => {
    return transacoes.filter((t) => {
      const d = new Date(t.data)
      return d >= start && d <= end
    })
  }, [transacoes, start, end])

  // KPIs
  const vgvPeriodo = useMemo(() => {
    return vendasPeriodo
      .filter((v) => v.status === 'realizada')
      .reduce((acc, v) => acc + (v.valor_vgv || 0), 0)
  }, [vendasPeriodo])

  const comissoesRecebidas = useMemo(() => {
    return transacoesPeriodo
      .filter((t) => t.tipo === 'entrada' && t.categoria === 'comissao')
      .reduce((acc, t) => acc + (t.valor || 0), 0)
  }, [transacoesPeriodo])

  const despesasPeriodo = useMemo(() => {
    return transacoesPeriodo
      .filter((t) => t.tipo === 'saida' && t.categoria !== 'imposto' && t.categoria !== 'repasse')
      .reduce((acc, t) => acc + (t.valor || 0), 0)
  }, [transacoesPeriodo])

  const todasEntradas = useMemo(() => {
    return transacoesPeriodo
      .filter((t) => t.tipo === 'entrada')
      .reduce((acc, t) => acc + (t.valor || 0), 0)
  }, [transacoesPeriodo])

  const todasSaidas = useMemo(() => {
    return transacoesPeriodo
      .filter((t) => t.tipo === 'saida')
      .reduce((acc, t) => acc + (t.valor || 0), 0)
  }, [transacoesPeriodo])

  const resultadoLiquido = todasEntradas - todasSaidas

  // Meta do período (mensal ou compatível)
  const metaAtual = useMemo(() => {
    const metaDoPeriodo = metas.find((m) => {
      const mStart = new Date(m.data_inicio)
      const mEnd = new Date(m.data_fim)
      return start <= mEnd && end >= mStart
    })
    return metaDoPeriodo?.valor_meta || 2500000
  }, [metas, start, end])

  const atingimentoMeta = metaAtual > 0 ? (vgvPeriodo / metaAtual) * 100 : 0

  // Alertas Urgentes
  const alertas = useMemo(() => {
    const list: { id: string; tipo: 'alerta' | 'aviso'; msg: string; link: string }[] = []

    if (atingimentoMeta < 70) {
      list.push({
        id: 'meta-baixa',
        tipo: 'alerta',
        msg: `VGV atingido (${atingimentoMeta.toFixed(1)}%) está abaixo de 70% da meta prevista. Intensifique as conversões!`,
        link: '/metas',
      })
    }

    // Comissão pendente > 30 dias
    const now = new Date()
    const pendentesAntigas = comissoes.filter((c) => {
      if (c.status !== 'pendente') return false
      const createdDate = new Date(c.created)
      const diffDays = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 3600 * 24))
      return diffDays > 30
    })

    if (pendentesAntigas.length > 0) {
      list.push({
        id: 'comissao-atraso',
        tipo: 'alerta',
        msg: `Existem ${pendentesAntigas.length} comissões pendentes de recebimento há mais de 30 dias.`,
        link: '/comissoes',
      })
    }

    // Despesa recorrente ativa
    const despesasAtivas = despesas.filter((d) => d.recorrente && d.ativa)
    if (despesasAtivas.length > 0) {
      list.push({
        id: 'despesa-recorrente',
        tipo: 'aviso',
        msg: `${despesasAtivas.length} despesas recorrentes ativas programadas para o ciclo.`,
        link: '/fluxo',
      })
    }

    return list
  }, [atingimentoMeta, comissoes, despesas])

  // Gráfico: VGV vs Meta (últimos 6 meses)
  const vgvVsMetaChartData = useMemo(() => {
    const months: { month: string; vgv: number; meta: number }[] = []
    const now = new Date()

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
      const monthLabel = d
        .toLocaleString('pt-BR', { month: 'short' })
        .toUpperCase()
        .replace('.', '')

      const totalVgv = vendas
        .filter((v) => {
          if (v.status !== 'realizada') return false
          const vd = new Date(v.data_venda)
          return vd >= d && vd <= mEnd
        })
        .reduce((sum, v) => sum + (v.valor_vgv || 0), 0)

      const metaMes = metas.find((m) => m.periodo === 'mensal')?.valor_meta || 2500000

      months.push({
        month: monthLabel,
        vgv: totalVgv,
        meta: metaMes,
      })
    }
    return months
  }, [vendas, metas])

  // Gráfico: Entradas x Saídas (últimos 6 meses)
  const cashflowChartData = useMemo(() => {
    const months: { month: string; entradas: number; saidas: number }[] = []
    const now = new Date()

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
      const monthLabel = d
        .toLocaleString('pt-BR', { month: 'short' })
        .toUpperCase()
        .replace('.', '')

      const entradas = transacoes
        .filter((t) => {
          if (t.tipo !== 'entrada') return false
          const td = new Date(t.data)
          return td >= d && td <= mEnd
        })
        .reduce((sum, t) => sum + (t.valor || 0), 0)

      const saidas = transacoes
        .filter((t) => {
          if (t.tipo !== 'saida') return false
          const td = new Date(t.data)
          return td >= d && td <= mEnd
        })
        .reduce((sum, t) => sum + (t.valor || 0), 0)

      months.push({
        month: monthLabel,
        entradas,
        saidas,
      })
    }
    return months
  }, [transacoes])

  // Gráfico Donut: Despesas por Categoria
  const despesasCategoriaData = useMemo(() => {
    const catMap: Record<string, number> = {}
    transacoesPeriodo
      .filter((t) => t.tipo === 'saida')
      .forEach((t) => {
        const cat = t.categoria || 'outros'
        catMap[cat] = (catMap[cat] || 0) + (t.valor || 0)
      })

    const labels: Record<string, string> = {
      aluguel: 'Aluguel',
      marketing: 'Marketing',
      salarios: 'Salários',
      utilidades: 'Utilidades',
      manutencao: 'Manutenção',
      imposto: 'Impostos (6%)',
      repasse: 'Repasses Corretores',
      outros: 'Outros',
    }

    const COLORS = [
      '#E63946',
      '#F97316',
      '#FBBF24',
      '#34D399',
      '#38BDF8',
      '#818CF8',
      '#A855F7',
      '#EC4899',
    ]

    return Object.entries(catMap).map(([key, val], idx) => ({
      name: labels[key] || key,
      value: val,
      color: COLORS[idx % COLORS.length],
    }))
  }, [transacoesPeriodo])

  // Ranking Rápido Top 3 Corretores
  const topCorretores = useMemo(() => {
    const map: Record<string, { nome: string; vgv: number; count: number; comissao: number }> = {}

    corretores.forEach((c) => {
      map[c.id] = { nome: c.nome, vgv: 0, count: 0, comissao: 0 }
    })

    vendasPeriodo
      .filter((v) => v.status === 'realizada')
      .forEach((v) => {
        if (v.corretor && map[v.corretor]) {
          map[v.corretor].vgv += v.valor_vgv
          map[v.corretor].count += 1
          map[v.corretor].comissao += v.valor_comissao * 0.4 // estimativa repasse
        }
      })

    return Object.values(map)
      .filter((item) => item.vgv > 0)
      .sort((a, b) => b.vgv - a.vgv)
      .slice(0, 3)
  }, [corretores, vendasPeriodo])

  // Transações Recentes (últimas 8)
  const ultimasTransacoes = useMemo(() => {
    return [...transacoes]
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
      .slice(0, 8)
  }, [transacoes])

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const formatNumberShort = (val: number) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`
    if (val >= 1000) return `${(val / 1000).toFixed(0)}k`
    return val.toString()
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Alertas Urgentes */}
      {alertas.length > 0 && (
        <div className="space-y-2">
          {alertas.map((al) => (
            <div
              key={al.id}
              className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs md:text-sm transition-all ${
                al.tipo === 'alerta'
                  ? 'bg-red-500/10 border-red-500/30 text-red-300'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <AlertTriangle
                  className={`w-4 h-4 shrink-0 ${
                    al.tipo === 'alerta' ? 'text-[#E63946]' : 'text-amber-400'
                  }`}
                />
                <span className="font-medium text-slate-200">{al.msg}</span>
              </div>
              <Link
                to={al.link}
                className="inline-flex items-center gap-1 font-semibold text-xs text-white hover:underline shrink-0 bg-[#121722] px-2.5 py-1 rounded-lg border border-[#232A3B]"
              >
                Verificar
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* 4 Cartões KPI com Animação de Contagem */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* VGV no Período */}
        <div className="bg-[#121722] border border-[#232A3B] rounded-2xl p-5 relative overflow-hidden group hover:border-[#E63946]/50 transition-all shadow-lg shadow-black/20">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              VGV no Período
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#E63946]/15 flex items-center justify-center text-[#E63946]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white tracking-tight">
            <AnimatedCounter value={vgvPeriodo} prefix="R$ " decimals={0} />
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 font-semibold">
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] ${
                  atingimentoMeta >= 100
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : atingimentoMeta >= 70
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-red-500/20 text-red-400'
                }`}
              >
                {atingimentoMeta.toFixed(1)}% da meta
              </span>
            </div>
            <span className="text-slate-500 text-[11px]">Meta: {formatCurrency(metaAtual)}</span>
          </div>
        </div>

        {/* Comissões Recebidas */}
        <div className="bg-[#121722] border border-[#232A3B] rounded-2xl p-5 relative overflow-hidden group hover:border-emerald-500/40 transition-all shadow-lg shadow-black/20">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Comissões Recebidas
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400">
              <BadgePercent className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white tracking-tight">
            <AnimatedCounter value={comissoesRecebidas} prefix="R$ " decimals={2} />
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
            <span>Imobiliária consolidada</span>
          </div>
        </div>

        {/* Despesas no Período */}
        <div className="bg-[#121722] border border-[#232A3B] rounded-2xl p-5 relative overflow-hidden group hover:border-amber-500/40 transition-all shadow-lg shadow-black/20">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Despesas Operacionais
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white tracking-tight">
            <AnimatedCounter value={despesasPeriodo} prefix="R$ " decimals={2} />
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
            <span className="text-[11px] text-slate-400">Exclui repasses e impostos</span>
          </div>
        </div>

        {/* Resultado Líquido */}
        <div className="bg-[#121722] border border-[#232A3B] rounded-2xl p-5 relative overflow-hidden group hover:border-[#E63946]/50 transition-all shadow-lg shadow-black/20">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Resultado Líquido
            </span>
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                resultadoLiquido >= 0
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-red-500/15 text-[#E63946]'
              }`}
            >
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-2xl font-black tracking-tight ${
              resultadoLiquido >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            <AnimatedCounter value={resultadoLiquido} prefix="R$ " decimals={2} />
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs">
            {resultadoLiquido >= 0 ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5" /> Lucro operacional no período
              </span>
            ) : (
              <span className="text-red-400 flex items-center gap-1">
                <ArrowDownRight className="w-3.5 h-3.5" /> Saldo negativo no período
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Seção Gráficos Principais: VGV vs Meta & Entradas x Saídas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico VGV vs Meta */}
        <div className="bg-[#121722] border border-[#232A3B] rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-white text-base">VGV vs. Meta Mensal</h3>
              <p className="text-xs text-slate-400">Evolução do volume geral dos últimos 6 meses</p>
            </div>
            <Target className="w-4 h-4 text-amber-400" />
          </div>

          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={vgvVsMetaChartData}
                margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="vgvGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#E63946" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#F97316" stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#64748B"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={formatNumberShort}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0E121B',
                    borderColor: '#232A3B',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  formatter={(val: any) => [formatCurrency(Number(val)), '']}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  formatter={(value) => (value === 'vgv' ? 'VGV Realizado' : 'Meta Mensal')}
                />
                <Bar dataKey="vgv" fill="url(#vgvGrad)" radius={[6, 6, 0, 0]} barSize={28} />
                <Line
                  type="monotone"
                  dataKey="meta"
                  stroke="#FBBF24"
                  strokeWidth={2.5}
                  strokeDasharray="4 4"
                  dot={{ r: 4, fill: '#FBBF24' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico Entradas x Saídas */}
        <div className="bg-[#121722] border border-[#232A3B] rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-white text-base">Entradas x Saídas</h3>
              <p className="text-xs text-slate-400">
                Fluxo financeiro consolidado dos últimos 6 meses
              </p>
            </div>
            <ArrowLeftRight className="w-4 h-4 text-emerald-400" />
          </div>

          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={cashflowChartData}
                margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
              >
                <XAxis dataKey="month" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#64748B"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={formatNumberShort}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0E121B',
                    borderColor: '#232A3B',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  formatter={(val: any) => [formatCurrency(Number(val)), '']}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  formatter={(value) => (value === 'entradas' ? 'Entradas (+)' : 'Saídas (-)')}
                />
                <Bar dataKey="entradas" fill="#34D399" radius={[4, 4, 0, 0]} barSize={16} />
                <Bar dataKey="saidas" fill="#E63946" radius={[4, 4, 0, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Grid Inferior: Despesas por Categoria, Ranking Rápido e Metas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Despesas por Categoria (Donut) */}
        <div className="bg-[#121722] border border-[#232A3B] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-white text-base">Despesas por Categoria</h3>
            <p className="text-xs text-slate-400 mb-2">Composição de saídas do período</p>
          </div>

          <div className="h-[200px] w-full relative">
            {despesasCategoriaData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={despesasCategoriaData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {despesasCategoriaData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        stroke="#121722"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0E121B',
                      borderColor: '#232A3B',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(val: any) => [formatCurrency(Number(val)), '']}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                Sem despesas registradas no período
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-1.5 mt-2">
            {despesasCategoriaData.slice(0, 4).map((d) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: d.color }}
                />
                <span className="text-slate-300 truncate">{d.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Ranking Rápido (Top 3 Pódio) */}
        <div className="bg-[#121722] border border-[#232A3B] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-base">Top Corretores</h3>
              <p className="text-xs text-slate-400">Pódio de performance no período</p>
            </div>
            <Link
              to="/ranking"
              className="text-xs text-red-400 hover:underline font-semibold flex items-center gap-0.5"
            >
              Ver todos <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-3 my-3">
            {topCorretores.length > 0 ? (
              topCorretores.map((corr, idx) => {
                const medalColors = [
                  'from-amber-400 to-yellow-600 text-amber-950', // 1º Ouro
                  'from-slate-300 to-slate-400 text-slate-900', // 2º Prata
                  'from-amber-700 to-amber-800 text-amber-100', // 3º Bronze
                ]
                return (
                  <div
                    key={corr.nome}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[#0B0E14] border border-[#232A3B]"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-7 h-7 rounded-lg bg-gradient-to-br ${medalColors[idx]} font-black text-xs flex items-center justify-center shadow-md`}
                      >
                        {idx + 1}º
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-100">{corr.nome}</p>
                        <p className="text-[11px] text-slate-400">
                          {corr.count} {corr.count === 1 ? 'venda' : 'vendas'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-emerald-400">
                        {formatCurrency(corr.vgv)}
                      </p>
                      <p className="text-[10px] text-slate-500">VGV total</p>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="py-8 text-center text-xs text-slate-500">
                Nenhuma venda realizada no período
              </div>
            )}
          </div>

          <Link
            to="/ranking"
            className="w-full text-center py-2 rounded-lg bg-[#1A2234] hover:bg-[#232A3B] text-xs font-semibold text-slate-200 transition-colors"
          >
            Acessar Ranking Completo
          </Link>
        </div>

        {/* Metas em Andamento */}
        <div className="bg-[#121722] border border-[#232A3B] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-base">Metas em Andamento</h3>
              <p className="text-xs text-slate-400">Acompanhamento dos objetivos</p>
            </div>
            <Link
              to="/metas"
              className="text-xs text-red-400 hover:underline font-semibold flex items-center gap-0.5"
            >
              Gerenciar <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-4 my-3">
            {metas.slice(0, 3).map((m) => {
              const perc = m.valor_meta > 0 ? Math.min((vgvPeriodo / m.valor_meta) * 100, 100) : 0
              return (
                <div key={m.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-200 truncate">{m.titulo}</span>
                    <span className="font-bold text-red-400">{perc.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 w-full bg-[#0B0E14] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#E63946] transition-all duration-300"
                      style={{ width: `${perc}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{formatCurrency(vgvPeriodo)}</span>
                    <span>{formatCurrency(m.valor_meta)}</span>
                  </div>
                </div>
              )
            })}
          </div>

          <Link
            to="/metas"
            className="w-full text-center py-2 rounded-lg bg-[#1A2234] hover:bg-[#232A3B] text-xs font-semibold text-slate-200 transition-colors"
          >
            Ver Todas as Metas
          </Link>
        </div>
      </div>

      {/* Transações Recentes */}
      <div className="bg-[#121722] border border-[#232A3B] rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-white text-base">Transações Recentes</h3>
            <p className="text-xs text-slate-400">Últimas movimentações financeiras no fluxo</p>
          </div>
          <Link
            to="/fluxo"
            className="text-xs text-red-400 hover:underline font-semibold flex items-center gap-0.5"
          >
            Ver tudo <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#232A3B] text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-3">Tipo</th>
                <th className="py-2.5 px-3">Descrição</th>
                <th className="py-2.5 px-3">Categoria</th>
                <th className="py-2.5 px-3">Data</th>
                <th className="py-2.5 px-3 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#232A3B]">
              {ultimasTransacoes.map((t) => (
                <tr key={t.id} className="hover:bg-[#1A2234]/50 transition-colors">
                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        t.tipo === 'entrada'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-red-500/15 text-red-400'
                      }`}
                    >
                      {t.tipo}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-medium text-slate-200 max-w-[280px] truncate">
                    {t.descricao}
                  </td>
                  <td className="py-3 px-3 text-slate-400 capitalize">{t.categoria}</td>
                  <td className="py-3 px-3 text-slate-400">
                    {new Date(t.data).toLocaleDateString('pt-BR')}
                  </td>
                  <td
                    className={`py-3 px-3 text-right font-bold tabular-nums ${
                      t.tipo === 'entrada' ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {t.tipo === 'entrada' ? '+' : '-'} {formatCurrency(t.valor)}
                  </td>
                </tr>
              ))}
              {ultimasTransacoes.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500">
                    Nenhuma transação recente encontrada.
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
