import React, { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Search,
  Link2,
  AlertTriangle,
  CheckCircle2,
  Building2,
  User,
  Clock,
  ArrowRight,
} from 'lucide-react'
import { Transacao, Venda } from '@/types'
import { VendaService } from '@/services/imobService'
import { useToast } from '@/hooks/use-toast'
import { round2 } from '@/lib/comissaoCalculator'

interface VincularAVendaModalProps {
  isOpen: boolean
  onClose: () => void
  transacao: Transacao | null
  userId: string
  onSuccess: () => void
}

export const VincularAVendaModal: React.FC<VincularAVendaModalProps> = ({
  isOpen,
  onClose,
  transacao,
  userId,
  onSuccess,
}) => {
  const { toast } = useToast()
  const [vendas, setVendas] = useState<Venda[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedVendaId, setSelectedVendaId] = useState<string | null>(null)
  const [confirmarExcesso, setConfirmarExcesso] = useState(false)

  // Carregar vendas com saldo a receber > 0
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('')
      setSelectedVendaId(null)
      setConfirmarExcesso(false)
      loadVendas()
    }
  }, [isOpen])

  const loadVendas = async () => {
    setLoading(true)
    try {
      const data = await VendaService.getAll()
      // Manter vendas que têm saldo a receber > 0 (ou que ainda não foram totalmente quitadas)
      setVendas(data)
    } catch (err) {
      console.error('Erro ao carregar vendas:', err)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as vendas disponíveis.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // Filtrar vendas candidatas
  const vendasComSaldo = useMemo(() => {
    return vendas
      .map((v) => {
        const previsto = round2(v.valor_previsto_imobiliaria ?? v.valor_comissao)
        const recebido = round2(v.valor_recebido || 0)
        const saldo = Math.max(0, round2(previsto - recebido))
        const situacao =
          recebido >= previsto && previsto > 0 ? 'Recebida' : recebido > 0 ? 'Parcial' : 'A Receber'
        return {
          ...v,
          _previsto: previsto,
          _recebido: recebido,
          _saldo: saldo,
          _situacao: situacao,
        }
      })
      .filter((v) => {
        // Exibir se tiver saldo > 0 ou se for a venda já vinculada
        if (transacao?.venda && v.id === transacao.venda) return true
        return v._saldo > 0 && v.status !== 'cancelada'
      })
  }, [vendas, transacao])

  const vendasFiltradas = useMemo(() => {
    const term = searchTerm.toLowerCase().trim()
    if (!term) return vendasComSaldo
    return vendasComSaldo.filter(
      (v) =>
        (v.codigo_referencia && v.codigo_referencia.toLowerCase().includes(term)) ||
        (v.titulo_imovel && v.titulo_imovel.toLowerCase().includes(term)) ||
        (v.cliente && v.cliente.toLowerCase().includes(term)),
    )
  }, [vendasComSaldo, searchTerm])

  const selectedVenda = useMemo(() => {
    return vendasComSaldo.find((v) => v.id === selectedVendaId) || null
  }, [vendasComSaldo, selectedVendaId])

  const valorEntrada = transacao ? round2(transacao.valor) : 0
  const excedeSaldo =
    selectedVenda && valorEntrada > selectedVenda._saldo && selectedVenda._saldo > 0

  const handleVincular = async () => {
    if (!transacao || !selectedVendaId) return

    if (excedeSaldo && !confirmarExcesso) {
      setConfirmarExcesso(true)
      return
    }

    setSubmitting(true)
    try {
      await VendaService.vincularTransacaoAVenda({
        transacaoId: transacao.id,
        vendaId: selectedVendaId,
        userId,
      })

      toast({
        title: 'Vínculo realizado com sucesso!',
        description: `Entrada de R$ ${valorEntrada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} vinculada à venda ${selectedVenda?.codigo_referencia || selectedVenda?.titulo_imovel}.`,
      })

      onSuccess()
      onClose()
    } catch (err) {
      console.error('Erro ao vincular transação à venda:', err)
      toast({
        title: 'Erro ao vincular',
        description: 'Não foi possível vincular esta entrada à venda selecionada.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen || !transacao) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-zinc-950 border border-zinc-800 text-zinc-100 max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-white">
                Vincular Entrada a uma Venda
              </DialogTitle>
              <DialogDescription className="text-sm text-zinc-400">
                Selecione a venda para abater o saldo a receber e atualizar o status
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Resumo da Transação de Entrada */}
        <div className="px-6 py-3 bg-zinc-900/60 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div>
            <span className="text-xs text-zinc-400 block">Entrada Selecionada</span>
            <span className="font-semibold text-white">{transacao.descricao}</span>
            <span className="text-xs text-zinc-400 ml-2">
              ({new Date(transacao.data).toLocaleDateString('pt-BR')})
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs text-zinc-400 block">Valor da Entrada</span>
            <span className="text-lg font-bold text-emerald-400">
              R$ {valorEntrada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Busca e Lista de Vendas com saldo */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Buscar por código (ex: VENDA-2026-0001), cliente ou imóvel..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-zinc-900 border-zinc-800 text-zinc-200 placeholder:text-zinc-600 focus:border-emerald-500"
            />
          </div>

          {loading ? (
            <div className="py-12 text-center text-zinc-500 text-sm">
              Carregando vendas com saldo a receber...
            </div>
          ) : vendasFiltradas.length === 0 ? (
            <div className="py-10 text-center border border-dashed border-zinc-800 rounded-xl p-6">
              <Building2 className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-zinc-400">
                {searchTerm
                  ? 'Nenhuma venda encontrada com os termos buscados.'
                  : 'Nenhuma venda pendente de recebimento encontrada.'}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Cadastre uma nova venda em Vendas antes de vincular esta entrada.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Vendas com Saldo a Receber ({vendasFiltradas.length})
              </p>
              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {vendasFiltradas.map((v) => {
                  const isSelected = selectedVendaId === v.id
                  return (
                    <div
                      key={v.id}
                      onClick={() => {
                        setSelectedVendaId(v.id)
                        setConfirmarExcesso(false)
                      }}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/5'
                          : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {v.codigo_referencia ? (
                              <span className="font-mono text-xs px-2 py-0.5 rounded bg-zinc-800 text-emerald-400 font-semibold border border-zinc-700">
                                {v.codigo_referencia}
                              </span>
                            ) : null}
                            <h4 className="font-semibold text-white text-sm truncate">
                              {v.titulo_imovel}
                            </h4>
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                v._situacao === 'Recebida'
                                  ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
                                  : v._situacao === 'Parcial'
                                    ? 'border-amber-500/40 text-amber-400 bg-amber-500/10'
                                    : 'border-blue-500/40 text-blue-400 bg-blue-500/10'
                              }`}
                            >
                              {v._situacao}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-xs text-zinc-400">
                            {v.cliente && (
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3 text-zinc-500" />
                                {v.cliente}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-zinc-500" />
                              {new Date(v.data_venda).toLocaleDateString('pt-BR')}
                            </span>
                            <span className="text-zinc-500">
                              Forma:{' '}
                              <strong className="text-zinc-300">
                                {v.forma_pagamento || 'Centralizada'}
                              </strong>
                            </span>
                          </div>
                        </div>

                        {/* Valores da Venda */}
                        <div className="text-right shrink-0">
                          <span className="text-[11px] text-zinc-500 block">Saldo a receber</span>
                          <span className="text-sm font-bold text-amber-400">
                            R$ {v._saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] text-zinc-500 block">
                            Prev: R${' '}
                            {v._previsto.toLocaleString('pt-BR', { minimumFractionDigits: 0 })} ·
                            Rec: R${' '}
                            {v._recebido.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Comparação e Aviso se selecionada */}
          {selectedVenda && (
            <div className="mt-4 p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400 font-medium">Comparação do Recebimento</span>
                <span className="text-zinc-400">
                  {selectedVenda.codigo_referencia || selectedVenda.titulo_imovel}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800">
                  <span className="text-zinc-500 block text-[11px]">Previsto Imobiliária</span>
                  <span className="font-semibold text-zinc-200 text-sm">
                    R${' '}
                    {selectedVenda._previsto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800">
                  <span className="text-zinc-500 block text-[11px]">Esta Entrada</span>
                  <span className="font-bold text-emerald-400 text-sm">
                    + R$ {valorEntrada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800">
                  <span className="text-zinc-500 block text-[11px]">Novo Saldo Restante</span>
                  <span
                    className={`font-semibold text-sm ${
                      valorEntrada >= selectedVenda._saldo ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    R${' '}
                    {Math.max(0, round2(selectedVenda._saldo - valorEntrada)).toLocaleString(
                      'pt-BR',
                      { minimumFractionDigits: 2 },
                    )}
                  </span>
                </div>
              </div>

              {excedeSaldo && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-300">
                      O valor da entrada (R${' '}
                      {valorEntrada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) é maior
                      que o saldo a receber (R${' '}
                      {selectedVenda._saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}).
                    </p>
                    <p className="mt-0.5 text-zinc-400">
                      Isso pode ocorrer em recebimento a maior (ex: juros ou correção). A venda será
                      marcada como &quot;Recebida&quot;.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="p-4 px-6 border-t border-zinc-800 bg-zinc-950 flex sm:justify-between items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={submitting}
            className="text-zinc-400 hover:text-white hover:bg-zinc-900"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={handleVincular}
            disabled={!selectedVendaId || submitting}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
          >
            {submitting ? (
              'Vinculando...'
            ) : excedeSaldo && !confirmarExcesso ? (
              'Confirmar Excesso e Vincular'
            ) : (
              <>
                <Link2 className="w-4 h-4 mr-2" />
                Vincular à Venda
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
export default VincularAVendaModal
