import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Download,
  Calendar,
  DollarSign,
  TrendingUp,
  ArrowDownRight,
  ArrowUpRight,
  Percent,
  Receipt,
  Building,
  Loader2,
  Printer,
  PieChart as PieChartIcon,
  BarChart3,
  Sparkles,
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
} from 'recharts'
import {
  FechamentoService,
  VendaService,
  DespesaService,
  NotaFiscalService,
  TransacaoService,
} from '@/services/imobService'
import { Fechamento, Venda, Despesa, NotaFiscal, Transacao } from '@/types'
import { useAuth } from '@/context/AuthContext'
import { usePeriodo } from '@/context/PeriodoContext'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { AnimatedCounter } from '@/components/AnimatedCounter'

const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

export default function FechamentoPage() {
  const { user } = useAuth()
  const { periodo } = usePeriodo()

  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  const [selectedMes, setSelectedMes] = useState<number>(currentMonth)
  const [selectedAno, setSelectedAno] = useState<number>(currentYear)

  const [fechamento, setFechamento] = useState<Fechamento | null>(null)
  const [vendas, setVendas] = useState<Venda[]>([])
  const [despesas, setDespesas] = useState<Despesa[]>([])
  const [transacoes, setTransacoes] = useState<Transacao[]>([])
  const [notas, setNotas] = useState<NotaFiscal[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)

  const printReportRef = useRef<HTMLDivElement>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const [vList, dList, tList, nList, fCurrent] = await Promise.all([
        VendaService.getAll(),
        DespesaService.getAll(),
        TransacaoService.getAll(),
        NotaFiscalService.getAll(),
        FechamentoService.getByMesAno(selectedMes, selectedAno),
      ])

      setVendas(vList)
      setDespesas(dList)
      setTransacoes(tList)
      setNotas(nList)
      setFechamento(fCurrent)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar dados do fechamento.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [selectedMes, selectedAno, user])

  // Filtrar dados do mês selecionado
  const monthData = useMemo(() => {
    const start = new Date(selectedAno, selectedMes - 1, 1)
    const end = new Date(selectedAno, selectedMes, 0, 23, 59, 59)

    // Vendas realizadas do mês
    const mVendas = vendas.filter((v) => {
      const d = new Date(v.data_venda)
      return d >= start && d <= end && v.status === 'realizada'
    })

    const totalVgv = mVendas.reduce((acc, v) => acc + v.valor_vgv, 0)
    const totalComissoesVenda = mVendas.reduce((acc, v) => acc + v.valor_comissao, 0)

    // Comissões de Venda vs Captação calculadas
    let comissaoVendaCorretor = 0
    let comissaoCaptacaoCorretor = 0
    let repasseImobiliariaBruto = 0

    mVendas.forEach((v) => {
      const sit = v.situacao_recebimento || 'Recebido'
      const baseRec = sit === 'Recebido' ? v.valor_comissao : v.valor_recebido || 0
      const hasCaptador = Boolean((v.captadores && v.captadores.length > 0) || v.captador)

      const pctCorr = hasCaptador ? 40 : 50
      const pctCapt = hasCaptador ? 10 : 0

      comissaoVendaCorretor += (baseRec * pctCorr) / 100
      comissaoCaptacaoCorretor += (baseRec * pctCapt) / 100
      repasseImobiliariaBruto += baseRec * 0.5
    })

    // Transações do mês (Fluxo de Caixa)
    const mTransacoes = transacoes.filter((t) => {
      const d = new Date(t.data)
      return d >= start && d <= end
    })

    const entradasEfetivas = mTransacoes
      .filter((t) => t.tipo === 'entrada' && t.status === 'confirmado')
      .reduce((acc, t) => acc + t.valor, 0)

    const saidasEfetivas = mTransacoes
      .filter((t) => t.tipo === 'saida' && t.status === 'confirmado')
      .reduce((acc, t) => acc + t.valor, 0)

    // Despesas operacionais ativas do mês
    const mDespesas = despesas.filter((d) => {
      const dt = new Date(d.data_vencimento || d.created)
      return dt >= start && dt <= end && d.ativa
    })
    const totalDespesas = mDespesas.reduce((acc, d) => acc + d.valor, 0)

    // Lucro Líquido
    const lucroLiquido = entradasEfetivas - saidasEfetivas

    // Imposto Simples Nacional (6% do faturado)
    const impostoEstimado = entradasEfetivas * 0.06

    return {
      vendas: mVendas,
      totalVgv,
      totalComissoesVenda,
      comissaoVendaCorretor,
      comissaoCaptacaoCorretor,
      repasseImobiliariaBruto,
      entradasEfetivas,
      saidasEfetivas,
      totalDespesas,
      lucroLiquido,
      impostoEstimado,
      qtdVendas: mVendas.length,
    }
  }, [vendas, transacoes, despesas, selectedMes, selectedAno])

  // Gráficos do Relatório
  const chartDataComposicao = useMemo(() => {
    return [
      { name: 'Imobiliária (Bruto)', valor: monthData.repasseImobiliariaBruto, color: '#E63946' },
      {
        name: 'Comissão Venda (Corretores)',
        valor: monthData.comissaoVendaCorretor,
        color: '#3B82F6',
      },
      { name: 'Comissão Captação', valor: monthData.comissaoCaptacaoCorretor, color: '#F59E0B' },
      { name: 'Despesas Operacionais', valor: monthData.totalDespesas, color: '#8B5CF6' },
    ].filter((i) => i.valor > 0)
  }, [monthData])

  const chartDataBalanco = useMemo(() => {
    return [
      { name: 'Entradas (Faturamento)', valor: monthData.entradasEfetivas, fill: '#10B981' },
      { name: 'Saídas & Repasses', valor: monthData.saidasEfetivas, fill: '#E63946' },
      { name: 'Lucro Líquido', valor: Math.max(0, monthData.lucroLiquido), fill: '#3B82F6' },
    ]
  }, [monthData])

  // Ações de Fechamento
  const handleFecharMes = async () => {
    if (!user) return
    if (
      !confirm(`Deseja realmente fechar o mês de ${MONTHS[selectedMes - 1]} de ${selectedAno}?`)
    ) {
      return
    }

    setActionLoading(true)
    try {
      await FechamentoService.fecharMes({
        mes: selectedMes,
        ano: selectedAno,
        total_vgv: monthData.totalVgv,
        total_comissoes: monthData.totalComissoesVenda,
        total_entradas: monthData.entradasEfetivas,
        total_saidas: monthData.saidasEfetivas,
        lucro_liquido: monthData.lucroLiquido,
        fechado_por: user.id,
      })
      toast.success(`Mês de ${MONTHS[selectedMes - 1]} fechado com sucesso!`)
      loadData()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao realizar fechamento.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReabrirMes = async () => {
    if (!fechamento) return
    if (
      !confirm(`Deseja reabrir o mês de ${MONTHS[selectedMes - 1]} de ${selectedAno} para edição?`)
    ) {
      return
    }

    setActionLoading(true)
    try {
      await FechamentoService.reabrirMes(fechamento.id)
      toast.success(`Mês de ${MONTHS[selectedMes - 1]} reaberto!`)
      loadData()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao reabrir mês.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleImprimirRelatorio = () => {
    window.print()
  }

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-full overflow-hidden">
      {/* Top Header Controls (Oculto na impressão) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Lock className="w-6 h-6 text-[#E63946]" />
            Fechamento Financeiro & Balanço Mensal
          </h2>
          <p className="text-xs text-slate-400">
            Consolidação do exercício mensal, conciliação de receitas, comissões, despesas e emissão
            de relatórios
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Seletores de Mês e Ano */}
          <div className="flex items-center gap-2 bg-[#121722] border border-[#232A3B] rounded-xl p-1">
            <select
              value={selectedMes}
              onChange={(e) => setSelectedMes(Number(e.target.value))}
              className="bg-[#0B0E14] text-slate-200 text-xs rounded-lg px-2.5 py-1.5 border border-[#232A3B] outline-none font-semibold"
            >
              {MONTHS.map((m, idx) => (
                <option key={m} value={idx + 1}>
                  {m}
                </option>
              ))}
            </select>

            <select
              value={selectedAno}
              onChange={(e) => setSelectedAno(Number(e.target.value))}
              className="bg-[#0B0E14] text-slate-200 text-xs rounded-lg px-2.5 py-1.5 border border-[#232A3B] outline-none font-semibold"
            >
              {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Botão de Relatório do Período */}
          <Button
            onClick={handleImprimirRelatorio}
            className="bg-[#E63946] hover:bg-[#D62839] text-white font-bold text-xs h-9 px-3.5 rounded-xl shadow-lg shadow-[#E63946]/20 flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            <span>Gerar Relatório do Período</span>
          </Button>
        </div>
      </div>

      {/* ÁREA DE RELATÓRIO IMPRIMÍVEL (Com gráficos e consolidações completas) */}
      <div
        ref={printReportRef}
        className="space-y-6 print:m-0 print:p-4 print:bg-white print:text-black"
      >
        {/* Cabeçalho de Impressão */}
        <div className="hidden print:flex items-center justify-between border-b pb-4 mb-4 border-slate-300">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Imob<span className="text-[#E63946]">Gestor</span> • Relatório de Fechamento Mensal
            </h1>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              Demonstrativo Financeiro Consolidado de Vendas, Comissões e Despesas
            </p>
          </div>
          <div className="text-right">
            <span className="text-sm font-black px-3 py-1 bg-slate-100 border border-slate-300 rounded-lg text-slate-900">
              {MONTHS[selectedMes - 1]} / {selectedAno}
            </span>
            <p className="text-[10px] text-slate-500 mt-1">
              Emitido em: {new Date().toLocaleDateString('pt-BR')} às{' '}
              {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        {/* Status do Mês & Banner de Fechamento */}
        <div className="bg-[#121722] border border-[#232A3B] rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:bg-slate-50 print:border-slate-200">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                fechamento?.status === 'fechado'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}
            >
              {fechamento?.status === 'fechado' ? (
                <Lock className="w-6 h-6" />
              ) : (
                <Unlock className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white print:text-slate-900">
                  Exercício: {MONTHS[selectedMes - 1]} / {selectedAno}
                </h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    fechamento?.status === 'fechado'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {fechamento?.status === 'fechado'
                    ? 'Mês Fechado / Consolidado'
                    : 'Mês Aberto (Em Andamento)'}
                </span>
              </div>
              <p className="text-xs text-slate-400 print:text-slate-600 mt-0.5">
                {fechamento?.status === 'fechado'
                  ? `Fechamento registrado em ${new Date(fechamento.data_fechamento).toLocaleDateString('pt-BR')}`
                  : 'Valores prévios calculados em tempo real com base no fluxo de vendas e despesas'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            {fechamento?.status === 'fechado' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReabrirMes}
                disabled={actionLoading}
                className="bg-transparent border-[#232A3B] text-slate-300 hover:text-white text-xs gap-1.5"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Reabrir Mês</span>
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleFecharMes}
                disabled={actionLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5"
              >
                {actionLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>Fechar Mês</span>
              </Button>
            )}
          </div>
        </div>

        {/* 4 Cards Principais de Indicadores */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* VGV Total */}
          <div className="p-4 rounded-2xl bg-[#121722] border border-[#232A3B] shadow-md print:bg-slate-50 print:border-slate-200">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1 print:text-slate-600">
              <span>VGV Transacionado</span>
              <TrendingUp className="w-4 h-4 text-[#E63946]" />
            </div>
            <div className="text-xl font-extrabold text-white print:text-slate-900">
              <AnimatedCounter value={monthData.totalVgv} formatter={formatCurrency} />
            </div>
            <p className="text-[11px] text-slate-400 print:text-slate-500 mt-1">
              {monthData.qtdVendas}{' '}
              {monthData.qtdVendas === 1 ? 'venda realizada' : 'vendas realizadas'}
            </p>
          </div>

          {/* Faturamento / Entradas Efetivas */}
          <div className="p-4 rounded-2xl bg-[#121722] border border-emerald-500/30 shadow-md print:bg-slate-50 print:border-slate-200">
            <div className="flex items-center justify-between text-xs text-emerald-400 mb-1">
              <span className="font-semibold">Entradas Efetivas</span>
              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl font-extrabold text-emerald-400 print:text-emerald-700">
              <AnimatedCounter value={monthData.entradasEfetivas} formatter={formatCurrency} />
            </div>
            <p className="text-[11px] text-slate-400 print:text-slate-500 mt-1">
              Comissões recebidas em conta
            </p>
          </div>

          {/* Saídas & Repasses */}
          <div className="p-4 rounded-2xl bg-[#121722] border border-red-500/30 shadow-md print:bg-slate-50 print:border-slate-200">
            <div className="flex items-center justify-between text-xs text-red-400 mb-1">
              <span className="font-semibold">Saídas & Repasses</span>
              <ArrowDownRight className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-xl font-extrabold text-red-400 print:text-red-700">
              <AnimatedCounter value={monthData.saidasEfetivas} formatter={formatCurrency} />
            </div>
            <p className="text-[11px] text-slate-400 print:text-slate-500 mt-1">
              Corretores, captadores & despesas
            </p>
          </div>

          {/* Lucro Líquido Real */}
          <div className="p-4 rounded-2xl bg-gradient-to-b from-[#121722] to-[#0E121B] border border-blue-500/40 shadow-lg print:bg-slate-50 print:border-slate-200">
            <div className="flex items-center justify-between text-xs text-blue-400 mb-1">
              <span className="font-bold">Resultado Líquido</span>
              <DollarSign className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-xl font-black text-blue-400 print:text-blue-800">
              <AnimatedCounter value={monthData.lucroLiquido} formatter={formatCurrency} />
            </div>
            <p className="text-[11px] text-slate-400 print:text-slate-500 mt-1">
              Sobrou na imobiliária
            </p>
          </div>
        </div>

        {/* ============================================================== */}
        {/* GRÁFICOS ANALÍTICOS DO RELATÓRIO */}
        {/* ============================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Gráfico 1: Balanço de Entradas x Saídas x Lucro */}
          <div className="bg-[#121722] border border-[#232A3B] rounded-2xl p-5 shadow-lg print:bg-white print:border-slate-300 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-[#232A3B] print:border-slate-200 mb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#E63946]" />
                <h3 className="font-bold text-white text-sm print:text-slate-900">
                  Balanço Financeiro Consolidado
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 print:text-slate-600">
                Entradas vs Saídas
              </span>
            </div>

            <div className="h-[220px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartDataBalanco}
                  margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                >
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
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
                    }}
                    formatter={(value: any) => [formatCurrency(Number(value)), '']}
                  />
                  <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                    {chartDataBalanco.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico 2: Composição da Divisão de Receitas e Despesas */}
          <div className="bg-[#121722] border border-[#232A3B] rounded-2xl p-5 shadow-lg print:bg-white print:border-slate-300 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-[#232A3B] print:border-slate-200 mb-3">
              <div className="flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-white text-sm print:text-slate-900">
                  Composição da Divisão & Custos
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 print:text-slate-600">
                Repasses e despesas
              </span>
            </div>

            <div className="h-[220px] w-full relative flex items-center justify-center">
              {chartDataComposicao.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartDataComposicao}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="valor"
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
                      formatter={(value: any) => [formatCurrency(Number(value)), 'Total']}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '11px' }}
                      formatter={(val) => (
                        <span className="text-slate-300 print:text-slate-700">{val}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-slate-500 text-xs">Sem movimentação registrada no mês</div>
              )}
            </div>
          </div>
        </div>

        {/* Detalhamento Demonstrativo (DRE Simplificado) */}
        <div className="bg-[#121722] border border-[#232A3B] rounded-2xl p-5 shadow-lg print:bg-white print:border-slate-300 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#232A3B] print:border-slate-200">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#E63946]" />
              <h3 className="font-bold text-white text-base print:text-slate-900">
                Demonstrativo de Resultados do Exercício (DRE)
              </h3>
            </div>
            <span className="text-xs text-slate-400 print:text-slate-600">
              {MONTHS[selectedMes - 1]} de {selectedAno}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-3 rounded-xl bg-[#0B0E14] print:bg-slate-50 flex items-center justify-between font-semibold">
              <span className="text-slate-300 print:text-slate-700">
                (+) Receita Bruta de Comissões (Faturado)
              </span>
              <span className="text-emerald-400 print:text-emerald-700 font-bold text-sm">
                {formatCurrency(monthData.entradasEfetivas)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#0B0E14] print:bg-slate-50 flex items-center justify-between font-medium">
              <span className="text-slate-400 print:text-slate-600">
                (-) Repasses aos Corretores Fechadores (40% / 50%)
              </span>
              <span className="text-red-400 print:text-red-700 font-bold">
                - {formatCurrency(monthData.comissaoVendaCorretor)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#0B0E14] print:bg-slate-50 flex items-center justify-between font-medium">
              <span className="text-slate-400 print:text-slate-600">
                (-) Repasses aos Captadores (10%)
              </span>
              <span className="text-red-400 print:text-red-700 font-bold">
                - {formatCurrency(monthData.comissaoCaptacaoCorretor)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#0B0E14] print:bg-slate-50 flex items-center justify-between font-medium">
              <span className="text-slate-400 print:text-slate-600">
                (-) Despesas Operacionais Fixas & Variáveis
              </span>
              <span className="text-red-400 print:text-red-700 font-bold">
                - {formatCurrency(monthData.totalDespesas)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#0B0E14] print:bg-slate-50 flex items-center justify-between font-medium">
              <span className="text-slate-400 print:text-slate-600">
                (-) Provisão Imposto Simples Nacional (~6%)
              </span>
              <span className="text-red-400 print:text-red-700 font-bold">
                - {formatCurrency(monthData.impostoEstimado)}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#E63946]/10 border border-[#E63946]/30 print:bg-slate-100 print:border-slate-300 flex items-center justify-between font-bold text-sm mt-3">
              <span className="text-white print:text-slate-900">
                (=) RESULTADO LÍQUIDO DISPONÍVEL
              </span>
              <span className="text-emerald-400 print:text-emerald-800 font-black text-base">
                {formatCurrency(monthData.lucroLiquido)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
