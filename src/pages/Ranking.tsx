import React, { useState, useEffect, useMemo } from 'react'
import { Trophy, Award, TrendingUp, Medal, Users, Target, ChevronDown } from 'lucide-react'
import { CorretorService, VendaService, ComissaoService } from '@/services/imobService'
import { Corretor, Venda, Comissao } from '@/types'
import { usePeriodo } from '@/context/PeriodoContext'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
} from 'recharts'

export default function Ranking() {
  const { periodo, getPeriodoDates } = usePeriodo()
  const [corretores, setCorretores] = useState<Corretor[]>([])
  const [vendas, setVendas] = useState<Venda[]>([])
  const [comissoes, setComissoes] = useState<Comissao[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [cList, vList, commList] = await Promise.all([
          CorretorService.getAll(),
          VendaService.getAll(),
          ComissaoService.getAll(),
        ])
        setCorretores(cList)
        setVendas(vList)
        setComissoes(commList)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const { start, end } = useMemo(() => getPeriodoDates(periodo), [periodo, getPeriodoDates])

  // Processar dados dos corretores no período
  const rankingData = useMemo(() => {
    const vendasPeriodoRealizadas = vendas.filter((v) => {
      if (v.status !== 'realizada') return false
      const d = new Date(v.data_venda)
      return d >= start && d <= end
    })

    const totalVgvPeriodo = vendasPeriodoRealizadas.reduce((sum, v) => sum + (v.valor_vgv || 0), 0)

    const map: Record<
      string,
      {
        id: string
        nome: string
        creci?: string
        vgv: number
        comissao: number
        vendasCount: number
        percentualTotal: number
      }
    > = {}

    corretores.forEach((c) => {
      map[c.id] = {
        id: c.id,
        nome: c.nome,
        creci: c.creci,
        vgv: 0,
        comissao: 0,
        vendasCount: 0,
        percentualTotal: 0,
      }
    })

    vendasPeriodoRealizadas.forEach((v) => {
      if (v.corretor && map[v.corretor]) {
        map[v.corretor].vgv += v.valor_vgv
        map[v.corretor].vendasCount += 1
      }
      if (v.captador && map[v.captador] && v.captador !== v.corretor) {
        // captador também contabiliza contatos se aplicável
      }
    })

    // Calcular comissões exatas recebidas/pagas a partir da coleção de comissões
    comissoes.forEach((comm) => {
      if (comm.corretor && map[comm.corretor]) {
        const d = comm.data_recebimento ? new Date(comm.data_recebimento) : new Date(comm.created)
        if (d >= start && d <= end) {
          map[comm.corretor].comissao += comm.valor
        }
      }
    })

    // Ordenar por VGV decrescente
    const list = Object.values(map)
      .map((item) => ({
        ...item,
        percentualTotal: totalVgvPeriodo > 0 ? (item.vgv / totalVgvPeriodo) * 100 : 0,
      }))
      .sort((a, b) => b.vgv - a.vgv)

    return { list, totalVgvPeriodo }
  }, [corretores, vendas, comissoes, start, end])

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const PALETTE = ['#E63946', '#F97316', '#FBBF24', '#34D399', '#38BDF8', '#818CF8', '#A855F7']

  const top3 = rankingData.list.slice(0, 3)

  // Gráfico Horizontal VGV por Corretor
  const barChartData = rankingData.list.map((item, idx) => ({
    name: item.nome.split(' ')[0],
    fullName: item.nome,
    vgv: item.vgv,
    color: PALETTE[idx % PALETTE.length],
  }))

  // Gráfico Donut de Participação
  const pieChartData = rankingData.list
    .filter((item) => item.vgv > 0)
    .map((item, idx) => ({
      name: item.nome,
      value: item.vgv,
      color: PALETTE[idx % PALETTE.length],
    }))

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Ranking de Performance dos Corretores
          </h2>
          <p className="text-xs text-slate-400">
            Resultados de vendas, volume de VGV gerado e repasses de comissão no período
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Filtrando por:</span>
          <span className="px-3 py-1 rounded-xl bg-[#121722] border border-[#232A3B] text-xs font-semibold text-red-400 shadow-sm">
            {getPeriodoDates(periodo).label}
          </span>
        </div>
      </div>

      {/* PÓDIO TOP 3 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        {/* 2º Lugar - Prata */}
        <div className="bg-[#121722] border border-[#232A3B] rounded-2xl p-5 shadow-lg flex flex-col justify-between order-2 md:order-1 relative overflow-hidden group hover:border-slate-400/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-200 to-slate-400 flex items-center justify-center font-black text-slate-900 shadow-md text-sm">
                2º
              </div>
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Prata
              </span>
            </div>
            <Medal className="w-5 h-5 text-slate-300" />
          </div>

          <div>
            <h3 className="font-bold text-white text-lg truncate">
              {top3[1]?.nome || 'Sem dados'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {top3[1]?.vendasCount || 0} {top3[1]?.vendasCount === 1 ? 'venda' : 'vendas'}{' '}
              realizadas
            </p>

            <div className="grid grid-cols-2 gap-2 mt-4 p-3 rounded-xl bg-[#0B0E14] border border-[#232A3B] text-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-medium">VGV Total</span>
                <p className="font-bold text-emerald-400 text-sm mt-0.5">
                  {formatCurrency(top3[1]?.vgv || 0)}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-medium">Repasses</span>
                <p className="font-bold text-white text-sm mt-0.5">
                  {formatCurrency(top3[1]?.comissao || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 1º Lugar - Ouro (Destaque Maior) */}
        <div className="bg-[#121722] border-2 border-[#FBBF24]/50 rounded-2xl p-6 shadow-xl shadow-amber-500/10 flex flex-col justify-between order-1 md:order-2 relative overflow-hidden group hover:border-[#FBBF24] transition-all transform md:-translate-y-2 bg-gradient-to-b from-[#121722] to-[#1a1c1e]">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#FBBF24]/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-300 to-yellow-600 flex items-center justify-center font-black text-amber-950 shadow-lg text-base">
                1º
              </div>
              <div>
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block leading-none">
                  Campeão do Período
                </span>
                <span className="text-[10px] text-slate-400">Medalha de Ouro</span>
              </div>
            </div>
            <Trophy className="w-6 h-6 text-[#FBBF24]" />
          </div>

          <div>
            <h3 className="font-extrabold text-white text-xl truncate">
              {top3[0]?.nome || 'Sem dados'}
            </h3>
            <p className="text-xs text-amber-400/90 font-medium mt-0.5">
              {top3[0]?.vendasCount || 0} {top3[0]?.vendasCount === 1 ? 'venda' : 'vendas'}{' '}
              realizadas ({top3[0]?.percentualTotal?.toFixed(1) || 0}% do total)
            </p>

            <div className="grid grid-cols-2 gap-2 mt-4 p-3.5 rounded-xl bg-[#0B0E14] border border-[#FBBF24]/20 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-medium">VGV Total</span>
                <p className="font-extrabold text-emerald-400 text-base mt-0.5">
                  {formatCurrency(top3[0]?.vgv || 0)}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-medium">Repasses Ganhos</span>
                <p className="font-extrabold text-amber-400 text-base mt-0.5">
                  {formatCurrency(top3[0]?.comissao || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 3º Lugar - Bronze */}
        <div className="bg-[#121722] border border-[#232A3B] rounded-2xl p-5 shadow-lg flex flex-col justify-between order-3 relative overflow-hidden group hover:border-amber-700/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-600 to-amber-900 flex items-center justify-center font-black text-amber-100 shadow-md text-sm">
                3º
              </div>
              <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">
                Bronze
              </span>
            </div>
            <Medal className="w-5 h-5 text-amber-600" />
          </div>

          <div>
            <h3 className="font-bold text-white text-lg truncate">
              {top3[2]?.nome || 'Sem dados'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {top3[2]?.vendasCount || 0} {top3[2]?.vendasCount === 1 ? 'venda' : 'vendas'}{' '}
              realizadas
            </p>

            <div className="grid grid-cols-2 gap-2 mt-4 p-3 rounded-xl bg-[#0B0E14] border border-[#232A3B] text-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-medium">VGV Total</span>
                <p className="font-bold text-emerald-400 text-sm mt-0.5">
                  {formatCurrency(top3[2]?.vgv || 0)}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-medium">Repasses</span>
                <p className="font-bold text-white text-sm mt-0.5">
                  {formatCurrency(top3[2]?.comissao || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos de Ranking: Barras Horizontais & Rosca de Participação */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico Barras VGV por Corretor */}
        <div className="bg-[#121722] border border-[#232A3B] rounded-2xl p-5 shadow-lg">
          <h3 className="font-bold text-white text-base mb-1">VGV por Corretor</h3>
          <p className="text-xs text-slate-400 mb-4">Volume total negociado no período</p>

          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barChartData}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
              >
                <XAxis
                  type="number"
                  stroke="#64748B"
                  fontSize={11}
                  tickFormatter={(v) =>
                    v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : `${v / 1000}k`
                  }
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0E121B',
                    borderColor: '#232A3B',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#fff',
                  }}
                  formatter={(val: any) => [formatCurrency(Number(val)), 'VGV Total']}
                />
                <Bar dataKey="vgv" radius={[0, 6, 6, 0]} barSize={18}>
                  {barChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico Rosca Participação */}
        <div className="bg-[#121722] border border-[#232A3B] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-white text-base mb-1">Participação no VGV</h3>
            <p className="text-xs text-slate-400 mb-2">Fatia de contribuição de cada corretor</p>
          </div>

          <div className="h-[180px] w-full">
            {pieChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell
                        key={`cell-pie-${index}`}
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
                    formatter={(val: any) => [formatCurrency(Number(val)), 'VGV']}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                Sem vendas registradas no período
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
            {pieChartData.map((d) => (
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
      </div>

      {/* Tabela Ranking Completa */}
      <div className="bg-[#121722] border border-[#232A3B] rounded-2xl shadow-lg overflow-hidden">
        <div className="p-4 border-b border-[#232A3B] flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-base">Tabela de Classificação Geral</h3>
            <p className="text-xs text-slate-400">Detalhamento individual de vendas e comissões</p>
          </div>
          <Users className="w-5 h-5 text-slate-500" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#232A3B] bg-[#0E121B] text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4 text-center">Posição</th>
                <th className="py-3.5 px-4">Corretor</th>
                <th className="py-3.5 px-4 text-center">Nº Vendas</th>
                <th className="py-3.5 px-4 text-right">VGV Realizado</th>
                <th className="py-3.5 px-4 text-center">% do Total</th>
                <th className="py-3.5 px-4 text-right">Comissões Recebidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#232A3B]">
              {rankingData.list.map((c, idx) => (
                <tr key={c.id} className="hover:bg-[#1A2234]/50 transition-colors">
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs ${
                        idx === 0
                          ? 'bg-amber-400/20 text-amber-400 border border-amber-400/30'
                          : idx === 1
                            ? 'bg-slate-300/20 text-slate-300 border border-slate-300/30'
                            : idx === 2
                              ? 'bg-amber-700/20 text-amber-500 border border-amber-700/30'
                              : 'text-slate-500'
                      }`}
                    >
                      {idx + 1}º
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-semibold text-slate-100">{c.nome}</span>
                    {c.creci && (
                      <span className="block text-[11px] text-slate-500">CRECI: {c.creci}</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-slate-200">
                    {c.vendasCount}
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-emerald-400 tabular-nums">
                    {formatCurrency(c.vgv)}
                  </td>
                  <td className="py-3.5 px-4 text-center font-medium text-slate-300">
                    {c.percentualTotal.toFixed(1)}%
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-white tabular-nums">
                    {formatCurrency(c.comissao)}
                  </td>
                </tr>
              ))}

              {rankingData.list.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    Nenhum corretor cadastrado.
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
