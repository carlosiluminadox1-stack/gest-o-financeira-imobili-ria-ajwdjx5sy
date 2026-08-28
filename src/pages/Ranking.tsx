import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  Trophy,
  Medal,
  Award,
  Crown,
  TrendingUp,
  Percent,
  Download,
  Share2,
  Calendar,
  Sparkles,
  Users,
  Building2,
  Printer,
  FileDown,
  Check,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts'
import { VendaService, CorretorService, MetaVGVService } from '@/services/imobService'
import { Venda, Corretor, MetaVGV } from '@/types'
import { useAuth } from '@/context/AuthContext'
import { usePeriodo } from '@/context/PeriodoContext'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { AnimatedCounter } from '@/components/AnimatedCounter'

interface RankingItem {
  id: string
  nome: string
  email: string
  creci?: string
  totalVgv: number
  totalComissao: number
  totalVendas: number
  ticketMedio: number
  percentualMeta: number
}

export default function Ranking() {
  const { user } = useAuth()
  const { periodo, getPeriodoDates } = usePeriodo()
  const [vendas, setVendas] = useState<Venda[]>([])
  const [corretores, setCorretores] = useState<Corretor[]>([])
  const [metas, setMetas] = useState<MetaVGV[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  const printAreaRef = useRef<HTMLDivElement>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const [vList, cList, mList] = await Promise.all([
        VendaService.getAll(),
        CorretorService.getAll(),
        MetaVGVService.getAll(),
      ])
      setVendas(vList)
      setCorretores(cList)
      setMetas(mList)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar ranking.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user])

  const {
    start,
    end,
    label: periodoLabel,
  } = useMemo(() => getPeriodoDates(periodo), [periodo, getPeriodoDates])

  // Calcular ranking dos corretores
  const rankingData = useMemo<RankingItem[]>(() => {
    // Filtrar vendas do período com status realizada
    const periodoVendas = vendas.filter((v) => {
      const d = new Date(v.data_venda)
      return d >= start && d <= end && v.status === 'realizada'
    })

    return corretores
      .map((corr) => {
        const cVendas = periodoVendas.filter((v) => v.corretor === corr.id)
        const totalVgv = cVendas.reduce((acc, v) => acc + v.valor_vgv, 0)
        const totalComissao = cVendas.reduce((acc, v) => acc + v.valor_comissao, 0)
        const totalVendas = cVendas.length
        const ticketMedio = totalVendas > 0 ? totalVgv / totalVendas : 0

        // Meta
        const userMeta = metas.find((m) => m.corretor === corr.id && m.periodo === periodo)
        const percentualMeta =
          userMeta && userMeta.valor_meta > 0 ? (totalVgv / userMeta.valor_meta) * 100 : 0

        return {
          id: corr.id,
          nome: corr.nome,
          email: corr.email,
          creci: corr.creci,
          totalVgv,
          totalComissao,
          totalVendas,
          ticketMedio,
          percentualMeta,
        }
      })
      .sort((a, b) => b.totalVgv - a.totalVgv)
  }, [vendas, corretores, metas, start, end, periodo])

  const totalGeralVgv = useMemo(
    () => rankingData.reduce((acc, r) => acc + r.totalVgv, 0),
    [rankingData],
  )
  const totalGeralVendas = useMemo(
    () => rankingData.reduce((acc, r) => acc + r.totalVendas, 0),
    [rankingData],
  )

  // Top 3 do Pódio
  const top1 = rankingData[0]
  const top2 = rankingData[1]
  const top3 = rankingData[2]

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  // Função para imprimir/gerar PDF formatado exatamente como na tela
  const handlePrintPDF = () => {
    window.print()
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-full overflow-hidden">
      {/* Top Header Controls (Não impresso) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-400" />
            Ranking & Pódio de Vendas
          </h2>
          <p className="text-xs text-slate-400">
            Destaque dos melhores corretores por VGV, comissão e conversão no período
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-stretch sm:self-auto justify-between sm:justify-end">
          <span className="inline-flex px-3 py-1.5 rounded-xl bg-[#121722] border border-[#232A3B] text-xs font-semibold text-amber-400">
            {periodoLabel}
          </span>
          <Button
            onClick={handlePrintPDF}
            className="bg-[#E63946] hover:bg-[#D62839] text-white font-bold text-xs h-9 px-3.5 rounded-xl shadow-lg shadow-[#E63946]/20 flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir / Gerar PDF</span>
          </Button>
        </div>
      </div>

      {/* ÁREA DE CONTEÚDO IMPRIMÍVEL (Exatamente como aparece na tela) */}
      <div
        ref={printAreaRef}
        className="space-y-6 print:m-0 print:p-4 print:bg-white print:text-black"
      >
        {/* Cabeçalho da Impressão */}
        <div className="hidden print:flex items-center justify-between border-b pb-4 mb-4 border-slate-300">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Imob<span className="text-[#E63946]">Gestor</span> • Ranking de Corretores
            </h1>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              Relatório de Desempenho e Classificação Geral de Vendas
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold px-3 py-1 bg-slate-100 border border-slate-300 rounded-lg text-slate-800">
              Período: {periodoLabel}
            </span>
            <p className="text-[10px] text-slate-500 mt-1">
              Emitido em: {new Date().toLocaleDateString('pt-BR')} às{' '}
              {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        {/* Resumo do Período */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-[#121722] border border-[#232A3B] shadow-md print:bg-slate-50 print:border-slate-200">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1 print:text-slate-600">
              <span>VGV Total do Período</span>
              <TrendingUp className="w-4 h-4 text-[#E63946]" />
            </div>
            <div className="text-2xl font-extrabold text-white print:text-slate-900">
              <AnimatedCounter value={totalGeralVgv} formatter={formatCurrency} />
            </div>
            <p className="text-[11px] text-slate-400 print:text-slate-500 mt-1">
              Soma de todas as negociações
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#121722] border border-[#232A3B] shadow-md print:bg-slate-50 print:border-slate-200">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1 print:text-slate-600">
              <span>Total de Imóveis Vendidos</span>
              <Building2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-400 print:text-emerald-700">
              {totalGeralVendas} {totalGeralVendas === 1 ? 'venda' : 'vendas'}
            </div>
            <p className="text-[11px] text-slate-400 print:text-slate-500 mt-1">
              Negociações concluídas
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#121722] border border-[#232A3B] shadow-md print:bg-slate-50 print:border-slate-200">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1 print:text-slate-600">
              <span>Corretores Atuantes</span>
              <Users className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-extrabold text-amber-400 print:text-amber-700">
              {rankingData.filter((r) => r.totalVendas > 0).length} de {corretores.length}
            </div>
            <p className="text-[11px] text-slate-400 print:text-slate-500 mt-1">
              Corretores com vendas no período
            </p>
          </div>
        </div>

        {/* PÓDIO TOP 3 VISUAL COM MEDALHAS */}
        <div className="bg-[#121722] border border-[#232A3B] rounded-2xl p-6 shadow-xl relative overflow-hidden print:bg-slate-50 print:border-slate-200">
          <div className="flex items-center justify-between pb-4 border-b border-[#232A3B] mb-6 print:border-slate-200">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-white text-base print:text-slate-900">
                Pódio dos Campeões de Vendas
              </h3>
            </div>
            <span className="text-xs text-slate-400 print:text-slate-600 font-medium">
              Classificação por VGV
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-4">
            {/* 2º LUGAR (Prata) */}
            <div className="order-2 md:order-1 flex flex-col items-center text-center p-5 rounded-2xl bg-[#0B0E14] border border-slate-700/60 shadow-lg relative print:bg-white print:border-slate-300">
              <div className="w-14 h-14 rounded-full bg-slate-300/20 border-2 border-slate-300 flex items-center justify-center mb-3 shadow-md">
                <Medal className="w-7 h-7 text-slate-300" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-300/20 text-slate-300 border border-slate-300/30 mb-2">
                2º Lugar • Prata
              </span>
              <h4 className="font-extrabold text-white text-base truncate max-w-full print:text-slate-900">
                {top2 ? top2.nome : 'Sem vendas'}
              </h4>
              <p className="text-[11px] text-slate-400 print:text-slate-500 mb-3">
                {top2?.creci ? `CRECI: ${top2.creci}` : 'Corretor'}
              </p>

              <div className="w-full pt-3 border-t border-[#232A3B] print:border-slate-200 space-y-1 text-xs">
                <div className="flex justify-between text-slate-300 print:text-slate-700">
                  <span>VGV:</span>
                  <span className="font-bold text-white print:text-slate-900">
                    {top2 ? formatCurrency(top2.totalVgv) : 'R$ 0,00'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400 print:text-slate-600 text-[11px]">
                  <span>Vendas:</span>
                  <span className="font-semibold text-slate-200 print:text-slate-800">
                    {top2 ? `${top2.totalVendas} negociações` : '0'}
                  </span>
                </div>
              </div>
            </div>

            {/* 1º LUGAR (Ouro - Destaque Central) */}
            <div className="order-1 md:order-2 flex flex-col items-center text-center p-6 rounded-2xl bg-gradient-to-b from-amber-500/15 via-[#0B0E14] to-[#0B0E14] border-2 border-amber-500/60 shadow-2xl relative transform md:-translate-y-3 print:bg-white print:border-amber-500">
              <div className="w-16 h-16 rounded-full bg-amber-400/20 border-2 border-amber-400 flex items-center justify-center mb-3 shadow-lg animate-pulse">
                <Crown className="w-8 h-8 text-amber-400" />
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-amber-400 text-slate-950 shadow-md mb-2">
                1º Lugar • Ouro (Campeão)
              </span>
              <h4 className="font-black text-white text-lg truncate max-w-full print:text-slate-900">
                {top1 ? top1.nome : 'Sem vendas'}
              </h4>
              <p className="text-xs text-amber-300/80 mb-4 font-medium">
                {top1?.creci ? `CRECI: ${top1.creci}` : 'Top Performer'}
              </p>

              <div className="w-full pt-3 border-t border-amber-500/30 print:border-slate-200 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-200 print:text-slate-700">
                  <span className="font-medium">VGV Acumulado:</span>
                  <span className="font-black text-amber-400 text-sm print:text-amber-700">
                    {top1 ? formatCurrency(top1.totalVgv) : 'R$ 0,00'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-300 print:text-slate-600 text-[11px]">
                  <span>Total Vendas:</span>
                  <span className="font-bold text-white print:text-slate-900">
                    {top1 ? `${top1.totalVendas} imóveis vendidos` : '0'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400 print:text-slate-600 text-[11px]">
                  <span>Ticket Médio:</span>
                  <span className="font-medium text-slate-300 print:text-slate-800">
                    {top1 ? formatCurrency(top1.ticketMedio) : 'R$ 0,00'}
                  </span>
                </div>
              </div>
            </div>

            {/* 3º LUGAR (Bronze) */}
            <div className="order-3 flex flex-col items-center text-center p-5 rounded-2xl bg-[#0B0E14] border border-amber-800/50 shadow-lg relative print:bg-white print:border-slate-300">
              <div className="w-14 h-14 rounded-full bg-amber-700/20 border-2 border-amber-700 flex items-center justify-center mb-3 shadow-md">
                <Award className="w-7 h-7 text-amber-600" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-700/20 text-amber-500 border border-amber-700/30 mb-2">
                3º Lugar • Bronze
              </span>
              <h4 className="font-extrabold text-white text-base truncate max-w-full print:text-slate-900">
                {top3 ? top3.nome : 'Sem vendas'}
              </h4>
              <p className="text-[11px] text-slate-400 print:text-slate-500 mb-3">
                {top3?.creci ? `CRECI: ${top3.creci}` : 'Corretor'}
              </p>

              <div className="w-full pt-3 border-t border-[#232A3B] print:border-slate-200 space-y-1 text-xs">
                <div className="flex justify-between text-slate-300 print:text-slate-700">
                  <span>VGV:</span>
                  <span className="font-bold text-white print:text-slate-900">
                    {top3 ? formatCurrency(top3.totalVgv) : 'R$ 0,00'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400 print:text-slate-600 text-[11px]">
                  <span>Vendas:</span>
                  <span className="font-semibold text-slate-200 print:text-slate-800">
                    {top3 ? `${top3.totalVendas} negociações` : '0'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TABELA COMPLETA DE CLASSIFICAÇÃO */}
        <div className="bg-[#121722] border border-[#232A3B] rounded-2xl shadow-lg overflow-hidden print:bg-white print:border-slate-300">
          <div className="p-4 border-b border-[#232A3B] flex items-center justify-between print:border-slate-300">
            <h3 className="font-bold text-white text-sm print:text-slate-900">
              Classificação Geral dos Corretores
            </h3>
            <span className="text-xs text-slate-400 print:text-slate-600">
              Total de {rankingData.length} profissionais
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#232A3B] bg-[#0E121B] text-slate-400 font-semibold uppercase tracking-wider print:bg-slate-100 print:text-slate-700 print:border-slate-300">
                  <th className="py-3 px-4 text-center w-12">Pos.</th>
                  <th className="py-3 px-4">Corretor</th>
                  <th className="py-3 px-4 text-center">Vendas Fechadas</th>
                  <th className="py-3 px-4 text-right">VGV Total</th>
                  <th className="py-3 px-4 text-right">Ticket Médio</th>
                  <th className="py-3 px-4 text-right">Comissões Geradas</th>
                  <th className="py-3 px-4 text-right">Atingimento da Meta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#232A3B] print:divide-slate-200">
                {rankingData.map((r, index) => {
                  const position = index + 1
                  return (
                    <tr
                      key={r.id}
                      className={`hover:bg-[#1A2234]/50 transition-colors print:hover:bg-transparent ${
                        position === 1 ? 'bg-amber-500/5 print:bg-amber-50' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center">
                        {position === 1 ? (
                          <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-black inline-flex items-center justify-center text-xs shadow">
                            1
                          </span>
                        ) : position === 2 ? (
                          <span className="w-6 h-6 rounded-full bg-slate-300 text-slate-900 font-bold inline-flex items-center justify-center text-xs shadow">
                            2
                          </span>
                        ) : position === 3 ? (
                          <span className="w-6 h-6 rounded-full bg-amber-700 text-white font-bold inline-flex items-center justify-center text-xs shadow">
                            3
                          </span>
                        ) : (
                          <span className="font-bold text-slate-500">{position}º</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-100 print:text-slate-900">
                          {r.nome}
                        </div>
                        <div className="text-[11px] text-slate-400 print:text-slate-500">
                          {r.email} {r.creci ? `• CRECI ${r.creci}` : ''}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-200 print:text-slate-800">
                        {r.totalVendas}
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-white print:text-slate-900 tabular-nums">
                        {formatCurrency(r.totalVgv)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-300 print:text-slate-700 tabular-nums">
                        {formatCurrency(r.ticketMedio)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-400 print:text-emerald-700 tabular-nums">
                        {formatCurrency(r.totalComissao)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {r.percentualMeta > 0 ? (
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                              r.percentualMeta >= 100
                                ? 'bg-emerald-500/20 text-emerald-400 print:text-emerald-800'
                                : 'bg-blue-500/20 text-blue-400 print:text-blue-800'
                            }`}
                          >
                            {r.percentualMeta.toFixed(0)}% da meta
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">-</span>
                        )}
                      </td>
                    </tr>
                  )
                })}

                {rankingData.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-500">
                      Nenhum dado encontrado para o período selecionado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
