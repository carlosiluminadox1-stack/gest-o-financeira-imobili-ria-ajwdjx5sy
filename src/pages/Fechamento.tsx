import React, { useState, useEffect, useMemo } from 'react'
import {
  Lock,
  Unlock,
  Calendar,
  CheckCircle2,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  AlertCircle,
  Receipt,
  Layers,
  ChevronRight,
  ShieldCheck,
  Loader2,
} from 'lucide-react'
import { FechamentoService, TransacaoService } from '@/services/imobService'
import { Fechamento, Transacao } from '@/types'
import { useAuth } from '@/context/AuthContext'
import { usePeriodo } from '@/context/PeriodoContext'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

export default function FechamentoPage() {
  const { user } = useAuth()
  const { periodo, getPeriodoDates, selecionarMesEspecifico } = usePeriodo()
  const now = new Date()
  const periodoInfo = getPeriodoDates(periodo)

  const [selectedMes, setSelectedMes] = useState<number>(periodoInfo.mes || now.getMonth() + 1)
  const [selectedAno, setSelectedAno] = useState<number>(periodoInfo.ano || now.getFullYear())

  const [fechamentos, setFechamentos] = useState<Fechamento[]>([])
  const [transacoes, setTransacoes] = useState<Transacao[]>([])
  const [loading, setLoading] = useState(true)

  // Modal Confirmação de Fechamento
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [closing, setClosing] = useState(false)

  const MESES = [
    { num: 1, nome: 'Janeiro' },
    { num: 2, nome: 'Fevereiro' },
    { num: 3, nome: 'Março' },
    { num: 4, nome: 'Abril' },
    { num: 5, nome: 'Maio' },
    { num: 6, nome: 'Junho' },
    { num: 7, nome: 'Julho' },
    { num: 8, nome: 'Agosto' },
    { num: 9, nome: 'Setembro' },
    { num: 10, nome: 'Outubro' },
    { num: 11, nome: 'Novembro' },
    { num: 12, nome: 'Dezembro' },
  ]

  const loadData = async () => {
    setLoading(true)
    try {
      const [fList, tList] = await Promise.all([
        FechamentoService.getAll(),
        TransacaoService.getAll(),
      ])
      setFechamentos(fList)
      setTransacoes(tList)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar fechamentos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Sincronizar quando o período global mudar para um mês específico ou ano
  useEffect(() => {
    const info = getPeriodoDates(periodo)
    if (info.mes) {
      setSelectedMes(info.mes)
    }
    if (info.ano) {
      setSelectedAno(info.ano)
    }
  }, [periodo, getPeriodoDates])

  const handleMesChange = (mes: number) => {
    setSelectedMes(mes)
    selecionarMesEspecifico(selectedAno, mes)
  }

  const handleAnoChange = (ano: number) => {
    setSelectedAno(ano)
    selecionarMesEspecifico(ano, selectedMes)
  }

  // Verificar se o mês atual selecionado já foi fechado
  const fechamentoAtual = useMemo(() => {
    return fechamentos.find((f) => f.mes === selectedMes && f.ano === selectedAno)
  }, [fechamentos, selectedMes, selectedAno])

  // Transações do mês selecionado
  const transacoesDoMes = useMemo(() => {
    const start = new Date(selectedAno, selectedMes - 1, 1, 0, 0, 0)
    const end = new Date(selectedAno, selectedMes, 0, 23, 59, 59)

    return transacoes.filter((t) => {
      const d = new Date(t.data)
      return d >= start && d <= end
    })
  }, [transacoes, selectedMes, selectedAno])

  // Cálculos consolidados do mês
  const receitaBruta = useMemo(() => {
    return transacoesDoMes
      .filter((t) => t.tipo === 'entrada')
      .reduce((sum, t) => sum + (t.valor || 0), 0)
  }, [transacoesDoMes])

  const impostos = useMemo(() => {
    return transacoesDoMes
      .filter((t) => t.tipo === 'saida' && t.categoria === 'imposto')
      .reduce((sum, t) => sum + (t.valor || 0), 0)
  }, [transacoesDoMes])

  const despesasOperacionais = useMemo(() => {
    return transacoesDoMes
      .filter((t) => t.tipo === 'saida' && t.categoria !== 'imposto')
      .reduce((sum, t) => sum + (t.valor || 0), 0)
  }, [transacoesDoMes])

  const resultadoLiquido = receitaBruta - despesasOperacionais - impostos

  // Agrupamento de transações por categoria
  const categoriasAgrupadas = useMemo(() => {
    const map: Record<string, { total: number; count: number; tipo: string }> = {}

    transacoesDoMes.forEach((t) => {
      const cat = t.categoria || 'outros'
      if (!map[cat]) {
        map[cat] = { total: 0, count: 0, tipo: t.tipo }
      }
      map[cat].total += t.valor
      map[cat].count += 1
    })

    return Object.entries(map).map(([categoria, dados]) => ({
      categoria,
      ...dados,
    }))
  }, [transacoesDoMes])

  const handleExecutarFechamento = async () => {
    if (!user) return
    setClosing(true)
    try {
      const snapshot = {
        transacoes: transacoesDoMes,
        categorias: categoriasAgrupadas,
        totalTransacoes: transacoesDoMes.length,
        geradoEm: new Date().toISOString(),
      }

      await FechamentoService.fecharMes({
        mes: selectedMes,
        ano: selectedAno,
        receita_bruta: receitaBruta,
        despesas: despesasOperacionais,
        impostos,
        resultado_liquido: resultadoLiquido,
        snapshot,
        userId: user.id,
      })

      toast.success(
        `Fechamento de ${MESES.find((m) => m.num === selectedMes)?.nome}/${selectedAno} consolidado com sucesso!`,
      )
      setIsConfirmOpen(false)
      loadData()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || 'Erro ao realizar fechamento.')
    } finally {
      setClosing(false)
    }
  }

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header com Seletor Mês/Ano & Botão Fechar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Fechamento Mensal</h2>
          <p className="text-xs text-slate-400">
            Consolidação contábil, apuração de lucro líquido e congelamento de extrato
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Seletor Mês */}
          <select
            value={selectedMes}
            onChange={(e) => handleMesChange(Number(e.target.value))}
            className="bg-[#121722] border border-[#232A3B] text-slate-100 text-xs rounded-xl h-10 px-3 font-semibold outline-none hover:border-[#E63946] focus:border-[#E63946] transition-colors"
          >
            {MESES.map((m) => (
              <option key={m.num} value={m.num} className="bg-[#121722] text-slate-100">
                {m.nome}
              </option>
            ))}
          </select>

          {/* Seletor Ano */}
          <select
            value={selectedAno}
            onChange={(e) => handleAnoChange(Number(e.target.value))}
            className="bg-[#121722] border border-[#232A3B] text-slate-100 text-xs rounded-xl h-10 px-3 font-semibold outline-none hover:border-[#E63946] focus:border-[#E63946] transition-colors"
          >
            {[2023, 2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y} className="bg-[#121722] text-slate-100">
                {y}
              </option>
            ))}
          </select>

          {/* Botão Fechar Mês */}
          {fechamentoAtual ? (
            <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Mês Fechado</span>
            </div>
          ) : (
            <Button
              onClick={() => setIsConfirmOpen(true)}
              className="bg-[#E63946] hover:bg-[#D62839] text-white font-semibold text-xs h-10 px-4 rounded-xl shadow-lg shadow-[#E63946]/20 flex items-center gap-2"
            >
              <Lock className="w-4 h-4" />
              <span>Fechar Mês</span>
            </Button>
          )}
        </div>
      </div>

      {/* Status Alert se já Fechado */}
      {fechamentoAtual && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3 text-xs text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Este período foi consolidado em{' '}
              <strong>
                {new Date(fechamentoAtual.data_fechamento).toLocaleDateString('pt-BR')} às{' '}
                {new Date(fechamentoAtual.data_fechamento).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </strong>
              . Todas as transações estão marcadas como consolidadas.
            </span>
          </div>
        </div>
      )}

      {/* 4 Cards de Resumo do Mês Selecionado */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Receita Bruta */}
        <div className="bg-[#121722] border border-[#232A3B] rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Receita Bruta (Entradas)
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400 tracking-tight">
            + {formatCurrency(receitaBruta)}
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Comissões recebidas pela imobiliária</p>
        </div>

        {/* Despesas Operacionais */}
        <div className="bg-[#121722] border border-[#232A3B] rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Despesas & Repasses
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white tracking-tight">
            - {formatCurrency(despesasOperacionais)}
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Custos operacionais e corretores</p>
        </div>

        {/* Impostos 6% */}
        <div className="bg-[#121722] border border-[#232A3B] rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Impostos (6%)
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#E63946]/15 flex items-center justify-center text-red-400">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-red-400 tracking-tight">
            - {formatCurrency(impostos)}
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Simples Nacional sobre notas fiscais</p>
        </div>

        {/* Resultado Líquido */}
        <div className="bg-[#121722] border border-[#232A3B] rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Resultado Líquido
            </span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                resultadoLiquido >= 0
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-red-500/15 text-red-400'
              }`}
            >
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-2xl font-black tracking-tight ${
              resultadoLiquido >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {formatCurrency(resultadoLiquido)}
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Lucro líquido contábil final</p>
        </div>
      </div>

      {/* Tabela Agrupada por Categoria */}
      <div className="bg-[#121722] border border-[#232A3B] rounded-2xl shadow-lg overflow-hidden">
        <div className="p-4 border-b border-[#232A3B] flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-base">Demonstrativo por Categoria</h3>
            <p className="text-xs text-slate-400">
              Detalhamento de movimentações do mês de{' '}
              {MESES.find((m) => m.num === selectedMes)?.nome}/{selectedAno}
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-400">
            {transacoesDoMes.length} lançamentos
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#232A3B] bg-[#0E121B] text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Categoria</th>
                <th className="py-3.5 px-4">Tipo Fluxo</th>
                <th className="py-3.5 px-4 text-center">Nº Lançamentos</th>
                <th className="py-3.5 px-4 text-right">Valor Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#232A3B]">
              {categoriasAgrupadas.map((cat) => (
                <tr key={cat.categoria} className="hover:bg-[#1A2234]/50 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-200 capitalize">
                    {cat.categoria}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        cat.tipo === 'entrada'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-red-500/15 text-red-400'
                      }`}
                    >
                      {cat.tipo}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center text-slate-300">{cat.count}</td>
                  <td
                    className={`py-3.5 px-4 text-right font-bold text-sm tabular-nums ${
                      cat.tipo === 'entrada' ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {cat.tipo === 'entrada' ? '+' : '-'} {formatCurrency(cat.total)}
                  </td>
                </tr>
              ))}

              {categoriasAgrupadas.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-500">
                    Nenhuma movimentação financeira registrada neste mês.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Histórico de Fechamentos Anteriores */}
      <div className="bg-[#121722] border border-[#232A3B] rounded-2xl shadow-lg overflow-hidden">
        <div className="p-4 border-b border-[#232A3B]">
          <h3 className="font-bold text-white text-base">Histórico de Meses Fechados</h3>
          <p className="text-xs text-slate-400">Registros históricos e snapshots arquivados</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#232A3B] bg-[#0E121B] text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Mês / Ano</th>
                <th className="py-3.5 px-4 text-right">Receita Bruta</th>
                <th className="py-3.5 px-4 text-right">Despesas</th>
                <th className="py-3.5 px-4 text-right">Impostos (6%)</th>
                <th className="py-3.5 px-4 text-right">Resultado Líquido</th>
                <th className="py-3.5 px-4">Data do Fechamento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#232A3B]">
              {fechamentos.map((f) => (
                <tr key={f.id} className="hover:bg-[#1A2234]/50 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-100 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    {MESES.find((m) => m.num === f.mes)?.nome} / {f.ano}
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-emerald-400 tabular-nums">
                    {formatCurrency(f.receita_bruta)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-white tabular-nums">
                    {formatCurrency(f.despesas)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-red-400 tabular-nums">
                    {formatCurrency(f.impostos)}
                  </td>
                  <td
                    className={`py-3.5 px-4 text-right font-bold tabular-nums ${
                      f.resultado_liquido >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {formatCurrency(f.resultado_liquido)}
                  </td>
                  <td className="py-3.5 px-4 text-slate-400">
                    {new Date(f.data_fechamento).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))}

              {fechamentos.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Nenhum mês fechado anteriormente.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Confirmação de Fechamento */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="bg-[#121722] border-[#232A3B] text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#E63946]" />
              Confirmar Fechamento de Mês
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Você está prestes a fechar o período contábil de{' '}
              <strong className="text-slate-200">
                {MESES.find((m) => m.num === selectedMes)?.nome}/{selectedAno}
              </strong>
              .
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="p-3.5 rounded-xl bg-[#0B0E14] border border-[#232A3B] space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Receita Bruta:</span>
                <span className="font-bold text-emerald-400">{formatCurrency(receitaBruta)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Despesas & Repasses:</span>
                <span className="font-bold text-white">{formatCurrency(despesasOperacionais)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Impostos (6%):</span>
                <span className="font-bold text-red-400">{formatCurrency(impostos)}</span>
              </div>
              <div className="pt-2 border-t border-[#232A3B] flex justify-between">
                <span className="font-bold text-slate-200">Resultado Líquido:</span>
                <span
                  className={`font-black text-sm ${
                    resultadoLiquido >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {formatCurrency(resultadoLiquido)}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              Ao fechar, as {transacoesDoMes.length} transações do período serão marcadas como
              consolidadas e um snapshot financeiro será salvo.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsConfirmOpen(false)}
              className="bg-transparent border-[#232A3B] text-slate-300"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={closing}
              onClick={handleExecutarFechamento}
              className="bg-[#E63946] hover:bg-[#D62839] text-white font-bold"
            >
              {closing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar & Fechar Mês'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
