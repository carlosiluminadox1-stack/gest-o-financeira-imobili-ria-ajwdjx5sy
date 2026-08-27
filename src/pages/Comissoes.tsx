import React, { useState, useEffect, useMemo } from 'react'
import {
  BadgePercent,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Search,
  Building,
  User,
  DollarSign,
  FileText,
  Loader2,
  HelpCircle,
  AlertCircle,
} from 'lucide-react'
import { ComissaoService } from '@/services/imobService'
import { Comissao, ComissaoParte, ComissaoStatus } from '@/types'
import { useAuth } from '@/context/AuthContext'
import { usePeriodo } from '@/context/PeriodoContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

export default function Comissoes() {
  const { user } = useAuth()
  const { periodo, getPeriodoDates } = usePeriodo()
  const [comissoes, setComissoes] = useState<Comissao[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [parteFilter, setParteFilter] = useState<string>('todos')
  const [statusFilter, setStatusFilter] = useState<string>('todos')

  // Modais de Ação
  const [receivingId, setReceivingId] = useState<Comissao | null>(null)
  const [payingId, setPayingId] = useState<Comissao | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const loadComissoes = async () => {
    setLoading(true)
    try {
      const list = await ComissaoService.getAll()
      setComissoes(list)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar comissões.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadComissoes()
  }, [])

  const { start, end } = useMemo(() => getPeriodoDates(periodo), [periodo, getPeriodoDates])

  // Filtragem por período, parte e status
  const filteredComissoes = useMemo(() => {
    return comissoes.filter((c) => {
      // Período
      const refDate = c.data_recebimento ? new Date(c.data_recebimento) : new Date(c.created)
      if (refDate < start || refDate > end) return false

      // Parte
      if (parteFilter !== 'todos' && c.parte !== parteFilter) return false

      // Status
      if (statusFilter !== 'todos' && c.status !== statusFilter) return false

      // Busca por imóvel ou corretor
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase()
        const vendaNome = c.expand?.venda?.titulo_imovel?.toLowerCase() || ''
        const corretorNome = c.expand?.corretor?.nome?.toLowerCase() || ''
        return vendaNome.includes(term) || corretorNome.includes(term)
      }

      return true
    })
  }, [comissoes, start, end, parteFilter, statusFilter, searchTerm])

  // 3 Cartões Resumo
  const totalAReceber = useMemo(() => {
    return comissoes
      .filter((c) => c.status === 'pendente')
      .reduce((sum, c) => sum + (c.valor || 0), 0)
  }, [comissoes])

  const totalRecebidasImob = useMemo(() => {
    return filteredComissoes
      .filter((c) => c.parte === 'imobiliaria' && c.status === 'recebida')
      .reduce((sum, c) => sum + (c.valor || 0), 0)
  }, [filteredComissoes])

  const totalRepassesPagos = useMemo(() => {
    return filteredComissoes
      .filter((c) => (c.parte === 'corretor' || c.parte === 'captador') && c.status === 'paga')
      .reduce((sum, c) => sum + (c.valor || 0), 0)
  }, [filteredComissoes])

  // Confirmar Recebimento Imobiliária
  const handleConfirmRecebimento = async () => {
    if (!receivingId || !user) return
    setActionLoading(true)
    try {
      await ComissaoService.registrarRecebimento(receivingId.id, user.id)
      toast.success(
        'Recebimento registrado! Entrada financeira, Nota Fiscal e Imposto de 6% gerados automaticamente.',
      )
      setReceivingId(null)
      loadComissoes()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || 'Erro ao registrar recebimento.')
    } finally {
      setActionLoading(false)
    }
  }

  // Confirmar Pagamento Repasse (Corretor/Captador)
  const handleConfirmPagamento = async () => {
    if (!payingId || !user) return
    setActionLoading(true)
    try {
      await ComissaoService.registrarPagamento(payingId.id, user.id)
      toast.success('Pagamento registrado! Transação de saída de repasse criada com sucesso.')
      setPayingId(null)
      loadComissoes()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || 'Erro ao registrar pagamento.')
    } finally {
      setActionLoading(false)
    }
  }

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const getParteBadge = (parte: ComissaoParte) => {
    switch (parte) {
      case 'imobiliaria':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#E63946]/15 text-red-400 border border-[#E63946]/30">
            <Building className="w-3 h-3" /> Imobiliária
          </span>
        )
      case 'corretor':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
            <User className="w-3 h-3" /> Corretor
          </span>
        )
      case 'captador':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <User className="w-3 h-3" /> Captador
          </span>
        )
    }
  }

  const getStatusBadge = (status: ComissaoStatus) => {
    switch (status) {
      case 'recebida':
      case 'paga':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
            <CheckCircle2 className="w-3 h-3" /> {status === 'recebida' ? 'Recebida' : 'Paga'}
          </span>
        )
      case 'pendente':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/25">
            <Clock className="w-3 h-3" /> Pendente
          </span>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">
          Controle & Divisão de Comissões
        </h2>
        <p className="text-xs text-slate-400">
          Gerencie recebimentos da imobiliária e repasses com emissão automática de NF (6%)
        </p>
      </div>

      {/* 3 Cartões Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* A Receber */}
        <div className="bg-[#121722] border border-[#232A3B] rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Geral Pendente
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-400 tracking-tight">
            {formatCurrency(totalAReceber)}
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Comissões pendentes (imobiliária + repasses)
          </p>
        </div>

        {/* Recebidas Imobiliária */}
        <div className="bg-[#121722] border border-[#232A3B] rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Recebidas no Período (Imob)
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#E63946]/15 flex items-center justify-center text-red-400">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white tracking-tight">
            {formatCurrency(totalRecebidasImob)}
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Parte retida pela imobiliária no período
          </p>
        </div>

        {/* Repasses Pagos */}
        <div className="bg-[#121722] border border-[#232A3B] rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Repasses Pagos no Período
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400 tracking-tight">
            {formatCurrency(totalRepassesPagos)}
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Valores já transferidos a corretores e captadores
          </p>
        </div>
      </div>

      {/* Toolbar de Filtros */}
      <div className="bg-[#121722] border border-[#232A3B] rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-md">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            type="text"
            placeholder="Buscar por imóvel ou corretor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-[#0B0E14] border-[#232A3B] pl-9 text-xs text-slate-100 placeholder:text-slate-500 h-9"
          />
        </div>

        <div className="flex items-center gap-3 overflow-x-auto pb-1 md:pb-0">
          {/* Filtro por Parte */}
          <div className="flex items-center bg-[#0B0E14] border border-[#232A3B] rounded-lg p-1 text-xs">
            {[
              { id: 'todos', label: 'Todas Partes' },
              { id: 'imobiliaria', label: 'Imobiliária' },
              { id: 'corretor', label: 'Corretor' },
              { id: 'captador', label: 'Captador' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setParteFilter(p.id)}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  parteFilter === p.id
                    ? 'bg-[#E63946] text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Filtro por Status */}
          <div className="flex items-center bg-[#0B0E14] border border-[#232A3B] rounded-lg p-1 text-xs">
            {['todos', 'pendente', 'recebida', 'paga'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-md capitalize font-medium transition-all ${
                  statusFilter === st
                    ? 'bg-[#1A2234] text-white border border-[#232A3B]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st === 'todos' ? 'Todos Status' : st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabela de Comissões */}
      <div className="bg-[#121722] border border-[#232A3B] rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#232A3B] bg-[#0E121B] text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Imóvel / Venda</th>
                <th className="py-3.5 px-4">Parte & Destinatário</th>
                <th className="py-3.5 px-4 text-center">% Divisão</th>
                <th className="py-3.5 px-4 text-right">Valor da Comissão</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4">Data Pag./Rec.</th>
                <th className="py-3.5 px-4 text-right">Ação Financeira</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#232A3B]">
              {filteredComissoes.map((c) => (
                <tr key={c.id} className="hover:bg-[#1A2234]/50 transition-colors">
                  <td className="py-3.5 px-4 max-w-[220px]">
                    <div className="font-semibold text-slate-100 truncate">
                      {c.expand?.venda?.titulo_imovel || 'Imóvel'}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      VGV: {c.expand?.venda ? formatCurrency(c.expand.venda.valor_vgv) : '—'}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      {getParteBadge(c.parte)}
                      <span className="font-medium text-slate-300">
                        {c.parte === 'imobiliaria'
                          ? 'Imobiliária Sede'
                          : c.expand?.corretor?.nome || 'Corretor'}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-slate-300">
                    {c.percentual}%
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-emerald-400 tabular-nums">
                    {formatCurrency(c.valor)}
                  </td>
                  <td className="py-3.5 px-4 text-center">{getStatusBadge(c.status)}</td>
                  <td className="py-3.5 px-4 text-slate-400">
                    {c.data_recebimento
                      ? new Date(c.data_recebimento).toLocaleDateString('pt-BR')
                      : '—'}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {c.status === 'pendente' && c.parte === 'imobiliaria' && (
                      <Button
                        size="sm"
                        onClick={() => setReceivingId(c)}
                        className="bg-[#E63946] hover:bg-[#D62839] text-white text-xs h-7 px-3 rounded-lg font-semibold shadow-sm"
                      >
                        Registrar Recebimento
                      </Button>
                    )}

                    {c.status === 'pendente' &&
                      (c.parte === 'corretor' || c.parte === 'captador') && (
                        <Button
                          size="sm"
                          onClick={() => setPayingId(c)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 px-3 rounded-lg font-semibold shadow-sm"
                        >
                          Registrar Pagamento
                        </Button>
                      )}

                    {c.status !== 'pendente' && (
                      <span className="text-[11px] text-slate-500 font-medium">Consolidado</span>
                    )}
                  </td>
                </tr>
              ))}

              {filteredComissoes.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <BadgePercent className="w-8 h-8 text-slate-600" />
                      <p className="font-medium">Nenhum registro de comissão encontrado.</p>
                      <p className="text-[11px] text-slate-600">
                        Comissões são geradas automaticamente ao criar vendas com status
                        "Realizada".
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Confirmação de Recebimento Imobiliária (com NF 6%) */}
      <Dialog open={!!receivingId} onOpenChange={() => setReceivingId(null)}>
        <DialogContent className="bg-[#121722] border-[#232A3B] text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#E63946]" />
              Confirmar Recebimento de Comissão
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Ao confirmar o recebimento, as seguintes operações serão processadas automaticamente:
            </DialogDescription>
          </DialogHeader>

          {receivingId && (
            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 rounded-xl bg-[#0B0E14] border border-[#232A3B] space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Imóvel:</span>
                  <span className="font-semibold text-white">
                    {receivingId.expand?.venda?.titulo_imovel || 'Imóvel'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Valor Bruto Recebido:</span>
                  <span className="font-bold text-emerald-400 text-sm">
                    {formatCurrency(receivingId.valor)}
                  </span>
                </div>
              </div>

              <div className="space-y-2 p-3 rounded-xl bg-[#1A2234]/60 border border-[#232A3B]">
                <p className="font-semibold text-slate-200">Automações disparadas:</p>
                <ul className="space-y-1 text-slate-400 list-disc list-inside text-[11px]">
                  <li>
                    <strong className="text-slate-300">Entrada Financeira:</strong> +{' '}
                    {formatCurrency(receivingId.valor)}
                  </li>
                  <li>
                    <strong className="text-slate-300">Emissão de Nota Fiscal:</strong> Taxa de 6%
                  </li>
                  <li>
                    <strong className="text-slate-300">Saída de Imposto (6%):</strong> -{' '}
                    {formatCurrency((receivingId.valor * 6) / 100)}
                  </li>
                </ul>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReceivingId(null)}
              className="bg-transparent border-[#232A3B] text-slate-300"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={actionLoading}
              onClick={handleConfirmRecebimento}
              className="bg-[#E63946] hover:bg-[#D62839] text-white font-bold"
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Confirmar & Emitir NF'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmação de Pagamento de Repasse */}
      <Dialog open={!!payingId} onOpenChange={() => setPayingId(null)}>
        <DialogContent className="bg-[#121722] border-[#232A3B] text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              Confirmar Repasse de Comissão
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Registrar transferência de pagamento ao corretor/captador.
            </DialogDescription>
          </DialogHeader>

          {payingId && (
            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 rounded-xl bg-[#0B0E14] border border-[#232A3B] space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Destinatário:</span>
                  <span className="font-semibold text-white">
                    {payingId.expand?.corretor?.nome || 'Corretor'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tipo de Repasse:</span>
                  <span className="capitalize text-slate-200">{payingId.parte}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Valor a Pagar:</span>
                  <span className="font-bold text-emerald-400 text-sm">
                    {formatCurrency(payingId.valor)}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400">
                Uma transação de saída do tipo <strong>"Repasse"</strong> será automaticamente
                criada no Fluxo de Caixa.
              </p>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPayingId(null)}
              className="bg-transparent border-[#232A3B] text-slate-300"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={actionLoading}
              onClick={handleConfirmPagamento}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar Pagamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
