import React, { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import {
  Transacao,
  Corretor,
  Configuracoes,
  TipoVenda,
  FormaPagamento,
  SituacaoRecebimento,
  VendaStatus,
} from '@/types'
import {
  VendaService,
  CorretorService,
  ConfigService,
  TransacaoService,
} from '@/services/imobService'
import { calcularDivisaoComissao } from '@/lib/comissaoCalculator'
import {
  Building2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  X,
  Split,
  Percent,
  DollarSign,
  ArrowRight,
} from 'lucide-react'

export interface ConverterEmVendaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transacao: Transacao | null
  userId: string
  onSuccess: () => void
}

interface VendaPartForm {
  id: string
  titulo: string
  cliente: string
  tipo: TipoVenda
  competencia: string // YYYY-MM
  dataRecebimento: string // YYYY-MM-DD
  formaPagamento: FormaPagamento
  modoCalculo: '%_vgv' | 'valor_fixo'
  vgv: number | ''
  pctNegociacao: number | ''
  valorComissao: number
  situacaoRecebimento: SituacaoRecebimento
  valorRecebido: number | ''
  status: VendaStatus
  corretorPrincipal: string
  corretorSecundario: string
  showSecondCorretor: boolean
  captadores: string[]
  showSecondCaptador: boolean
  pctImobiliaria: number
  pctCorretor: number
  pctCaptador: number
  observacoes: string
}

export const ConverterEmVendaModal: React.FC<ConverterEmVendaModalProps> = ({
  open,
  onOpenChange,
  transacao,
  userId,
  onSuccess,
}) => {
  const [corretores, setCorretores] = useState<Corretor[]>([])
  const [config, setConfig] = useState<Configuracoes | null>(null)
  const [saving, setSaving] = useState(false)
  const [loadingInitial, setLoadingInitial] = useState(false)

  // Múltiplas partes (se o usuário quiser dividir a transação em 2 ou mais vendas)
  const [activePartIndex, setActivePartIndex] = useState(0)
  const [partes, setPartes] = useState<VendaPartForm[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Carregar dados de corretores e configuração de comissões
  useEffect(() => {
    if (!open) return
    let isMounted = true

    const fetchDeps = async () => {
      setLoadingInitial(true)
      try {
        const [cList, conf] = await Promise.all([
          CorretorService.getAll().catch(() => []),
          userId ? ConfigService.getForUser(userId).catch(() => null) : null,
        ])
        if (isMounted) {
          setCorretores(cList)
          setConfig(conf)
        }
      } catch (e) {
        console.error('Erro ao carregar dados auxiliares:', e)
      } finally {
        if (isMounted) setLoadingInitial(false)
      }
    }

    fetchDeps()
    return () => {
      isMounted = false
    }
  }, [open, userId])

  // Inicializar o formulário a partir da transação recebida
  useEffect(() => {
    if (!open || !transacao) return

    const valorTransacao = Number(transacao.valor) || 0

    // Data de competência da transação (ou da data da transação)
    let compStr = ''
    if (transacao.data_competencia) {
      const dt = new Date(transacao.data_competencia)
      if (!isNaN(dt.getTime())) {
        compStr = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}`
      }
    }
    if (!compStr) {
      const dt = new Date(transacao.data)
      if (!isNaN(dt.getTime())) {
        compStr = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}`
      } else {
        const now = new Date()
        compStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      }
    }

    // Data de recebimento
    let dataRecStr = ''
    if (transacao.data) {
      try {
        dataRecStr = new Date(transacao.data).toISOString().split('T')[0]
      } catch {
        dataRecStr = new Date().toISOString().split('T')[0]
      }
    } else {
      dataRecStr = new Date().toISOString().split('T')[0]
    }

    const defaultPctImob = config?.percentual_imobiliaria ?? 50
    const defaultPctCorr = config?.percentual_corretor ?? 40
    const defaultPctCapt = config?.percentual_captador ?? 10
    const defaultPctComissaoPadrao = config?.percentual_comissao_padrao ?? 6

    const initialPart: VendaPartForm = {
      id: 'part_1',
      titulo: transacao.descricao || 'Comissão de Venda',
      cliente: '',
      tipo: 'venda',
      competencia: compStr,
      dataRecebimento: dataRecStr,
      formaPagamento: 'Centralizada',
      modoCalculo: 'valor_fixo',
      vgv: '',
      pctNegociacao: defaultPctComissaoPadrao,
      valorComissao: valorTransacao,
      situacaoRecebimento: 'Recebido',
      valorRecebido: valorTransacao,
      status: 'realizada',
      corretorPrincipal: '',
      corretorSecundario: '',
      showSecondCorretor: false,
      captadores: [],
      showSecondCaptador: false,
      pctImobiliaria: defaultPctImob,
      pctCorretor: defaultPctCorr,
      pctCaptador: defaultPctCapt,
      observacoes: transacao.observacoes || `Convertido da transação: ${transacao.descricao}`,
    }

    setPartes([initialPart])
    setActivePartIndex(0)
    setErrors({})
  }, [open, transacao, config])

  const currentPart = partes[activePartIndex] || partes[0]

  const totalTransacao = transacao ? Number(transacao.valor) || 0 : 0
  const somaComissoesPartes = useMemo(() => {
    return partes.reduce((acc, p) => acc + (Number(p.valorComissao) || 0), 0)
  }, [partes])

  const diferencaDivisao = Math.round((totalTransacao - somaComissoesPartes) * 100) / 100
  const valorBate = Math.abs(diferencaDivisao) < 0.01

  // Atualizador de campo da parte atual
  const updateCurrentPart = (updates: Partial<VendaPartForm>) => {
    setPartes((prev) => {
      const next = [...prev]
      if (next[activePartIndex]) {
        next[activePartIndex] = { ...next[activePartIndex], ...updates }
      }
      return next
    })
  }

  // Divisão ao vivo da parte ativa
  const divisaoAoVivo = useMemo(() => {
    if (!currentPart) {
      return calcularDivisaoComissao({
        valorBase: 0,
        formaPagamento: 'Centralizada',
      })
    }

    const valorBase =
      currentPart.situacaoRecebimento === 'Recebido'
        ? currentPart.valorComissao
        : typeof currentPart.valorRecebido === 'number'
          ? currentPart.valorRecebido
          : 0

    return calcularDivisaoComissao({
      valorBase,
      formaPagamento: currentPart.formaPagamento,
      temCaptador: currentPart.pctCaptador > 0,
      numCaptadores: currentPart.captadores.length || (currentPart.pctCaptador > 0 ? 1 : 0),
      pctImobConfig: currentPart.pctImobiliaria,
      pctCorrConfig: currentPart.pctCorretor,
      pctCaptConfig: currentPart.pctCaptador,
      aliquotaImposto: 6,
    })
  }, [currentPart])

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  // Adicionar nova parte
  const handleAdicionarParte = () => {
    if (!currentPart) return
    const sobra = Math.max(0, diferencaDivisao)
    const valorSugerido = sobra > 0 ? sobra : Math.max(0, currentPart.valorComissao / 2)

    const novaParte: VendaPartForm = {
      id: `part_${Date.now()}_${partes.length + 1}`,
      titulo: `${transacao?.descricao || 'Comissão de Venda'} (Parte ${partes.length + 1})`,
      cliente: '',
      tipo: currentPart.tipo,
      competencia: currentPart.competencia,
      dataRecebimento: currentPart.dataRecebimento,
      formaPagamento: currentPart.formaPagamento,
      modoCalculo: 'valor_fixo',
      vgv: '',
      pctNegociacao: currentPart.pctNegociacao,
      valorComissao: valorSugerido,
      situacaoRecebimento: currentPart.situacaoRecebimento,
      valorRecebido: valorSugerido,
      status: 'realizada',
      corretorPrincipal: '',
      corretorSecundario: '',
      showSecondCorretor: false,
      captadores: [],
      showSecondCaptador: false,
      pctImobiliaria: currentPart.pctImobiliaria,
      pctCorretor: currentPart.pctCorretor,
      pctCaptador: currentPart.pctCaptador,
      observacoes: currentPart.observacoes,
    }

    setPartes((prev) => [...prev, novaParte])
    setActivePartIndex(partes.length)
  }

  // Remover uma parte
  const handleRemoverParte = (idx: number) => {
    if (partes.length <= 1) return
    setPartes((prev) => prev.filter((_, i) => i !== idx))
    setActivePartIndex((prev) => (prev >= idx ? Math.max(0, prev - 1) : prev))
  }

  // Validação completa antes do salvamento
  const validateAll = (): boolean => {
    const errs: Record<string, string> = {}

    if (!valorBate) {
      errs.divisao = `A soma das partes (${formatCurrency(somaComissoesPartes)}) deve ser igual ao valor da transação (${formatCurrency(totalTransacao)}). Diferença: ${formatCurrency(diferencaDivisao)}`
    }

    partes.forEach((p, idx) => {
      const prefix = `p${idx}_`
      if (!p.titulo.trim()) {
        errs[`${prefix}titulo`] = `Parte ${idx + 1}: Informe a descrição do imóvel`
      }
      if (!p.corretorPrincipal) {
        errs[`${prefix}corretor`] = `Parte ${idx + 1}: Selecione o corretor responsável`
      }
      if (!p.competencia) {
        errs[`${prefix}competencia`] = `Parte ${idx + 1}: Informe a competência`
      }
      if (p.valorComissao <= 0) {
        errs[`${prefix}comissao`] = `Parte ${idx + 1}: Valor da comissão deve ser maior que zero`
      }
      if (p.situacaoRecebimento === 'Parcial') {
        if (!p.valorRecebido || Number(p.valorRecebido) <= 0) {
          errs[`${prefix}recebido`] = `Parte ${idx + 1}: Informe o valor recebido nesta etapa`
        } else if (Number(p.valorRecebido) > p.valorComissao) {
          errs[`${prefix}recebido`] =
            `Parte ${idx + 1}: Valor recebido não pode ser maior que a comissão`
        }
      }
    })

    setErrors(errs)
    if (Object.keys(errs).length > 0) {
      const firstMsg = Object.values(errs)[0]
      toast.error(firstMsg)
      return false
    }
    return true
  }

  // Confirmação e Execução da Conversão com Proteção de Atomicidade
  const handleConfirmarConversao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateAll() || !transacao) return

    setSaving(true)
    const criadasIds: string[] = []

    try {
      // 1. Criar cada uma das vendas e seus lançamentos financeiros
      for (const p of partes) {
        const [anoComp, mesComp] = p.competencia.split('-')
        const dataCompetenciaIso = new Date(
          Date.UTC(Number(anoComp), Number(mesComp) - 1, 1, 12, 0, 0),
        ).toISOString()

        const dataRecebimentoIso = p.dataRecebimento
          ? new Date(p.dataRecebimento + 'T12:00:00.000Z').toISOString()
          : dataCompetenciaIso

        const finalVgv = p.modoCalculo === '%_vgv' ? Number(p.vgv) : Number(p.vgv || 0)
        const finalPct = p.modoCalculo === '%_vgv' ? Number(p.pctNegociacao) : 0
        const finalComissao = Number(p.valorComissao)
        const finalRecebido =
          p.situacaoRecebimento === 'Recebido' ? finalComissao : Number(p.valorRecebido)

        const finalCaptadores = p.captadores.filter(Boolean)

        const createdVenda = await VendaService.create({
          titulo_imovel: p.titulo.trim(),
          cliente: p.cliente.trim(),
          corretor: p.corretorPrincipal,
          captador: finalCaptadores.length > 0 ? finalCaptadores[0] : undefined,
          captadores: finalCaptadores,
          valor_vgv: finalVgv,
          percentual_comissao: finalPct,
          valor_comissao: finalComissao,
          tipo_venda: p.tipo,
          data_recebimento: dataRecebimentoIso,
          is_valor_fixo: p.modoCalculo === 'valor_fixo',
          pct_imobiliaria: p.pctImobiliaria,
          pct_corretor: p.pctCorretor,
          pct_captador: p.pctCaptador,
          forma_pagamento: p.formaPagamento,
          situacao_recebimento: p.situacaoRecebimento,
          valor_recebido: finalRecebido,
          data_venda: dataCompetenciaIso,
          status: p.status,
          userId: userId || transacao.user,
        })

        criadasIds.push(createdVenda.id)
      }

      // 2. Agora que todas as vendas foram criadas com sucesso, excluir a transação bruta de extrato
      // Desta forma, a transação original nunca é perdida se a criação de alguma venda falhar
      await TransacaoService.delete(transacao.id)

      toast.success(
        partes.length === 1
          ? 'Transação convertida em Venda com sucesso! A transação original foi substituída.'
          : `${partes.length} vendas criadas com sucesso! A transação original foi substituída.`,
      )

      onOpenChange(false)
      onSuccess()
    } catch (err: any) {
      console.error('Erro na conversão em venda:', err)
      // Se criou alguma venda parcial antes de falhar, alertar o usuário
      if (criadasIds.length > 0) {
        toast.error(
          `Erro durante o processo de conversão. Algumas vendas parciais foram registradas. A transação original foi mantida para segurança.`,
        )
      } else {
        toast.error(err?.message || 'Erro ao converter transação em venda.')
      }
    } finally {
      setSaving(false)
    }
  }

  if (!transacao) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#121722] border-[#232A3B] text-slate-100 w-[calc(100vw-1.5rem)] sm:w-[94vw] max-w-3xl max-h-[92vh] flex flex-col p-0 shadow-2xl rounded-2xl overflow-hidden">
        {/* Header Fixo */}
        <DialogHeader className="p-4 sm:p-5 pb-3 sm:pb-4 border-b border-[#232A3B]/80 bg-[#121722] shrink-0 text-left">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-sm sm:text-base font-black text-white tracking-wider uppercase truncate">
                  CONVERTER EM VENDA
                </DialogTitle>
              </div>
            </div>
            <span className="text-xs sm:text-sm font-extrabold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/25 shrink-0 tabular-nums">
              {formatCurrency(totalTransacao)}
            </span>
          </div>
          <DialogDescription className="text-[11px] sm:text-xs text-slate-400 mt-1 leading-relaxed">
            Transforme esta transação de entrada em uma venda completa com VGV, corretores,
            captadores e repasses automáticos. A transação bruta original será substituída.
          </DialogDescription>
        </DialogHeader>

        {loadingInitial ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#E63946]" />
            <span className="text-xs">Carregando dados...</span>
          </div>
        ) : (
          <form
            onSubmit={handleConfirmarConversao}
            className="flex-1 min-h-0 flex flex-col overflow-hidden"
          >
            {/* Corpo Rolável */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
              {/* Bloco de Contexto da Transação Original */}
              <div className="p-3.5 rounded-xl bg-[#0B0E14] border border-[#232A3B] text-xs space-y-1.5 overflow-hidden">
                <div className="flex items-center justify-between text-slate-400 gap-2">
                  <span className="font-semibold text-slate-300 shrink-0">
                    Transação Bruta do Extrato:
                  </span>
                  <span className="font-bold text-emerald-400 tabular-nums shrink-0">
                    {formatCurrency(totalTransacao)}
                  </span>
                </div>
                <p
                  className="text-slate-200 text-xs leading-relaxed break-words font-medium"
                  title={transacao.descricao}
                >
                  {transacao.descricao}
                </p>
                <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 border-t border-[#232A3B]/50">
                  <span className="shrink-0">
                    Data: {new Date(transacao.data).toLocaleDateString('pt-BR')}
                  </span>
                  {transacao.observacoes && (
                    <span className="break-words min-w-0">Obs: {transacao.observacoes}</span>
                  )}
                </div>
              </div>

              {/* Controle de Divisão em Múltiplas Vendas */}
              <div className="p-3 rounded-xl bg-[#171C28] border border-[#232A3B] space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Split className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-white block">
                        Dividir em múltiplas vendas?
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Útil quando o banco soma mais de uma comissão na mesma linha do extrato.
                      </span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAdicionarParte}
                    className="bg-[#0B0E14] border-[#232A3B] hover:bg-[#1A2234] text-xs text-amber-300 hover:text-white h-8 px-2.5 gap-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Outra Venda</span>
                  </Button>
                </div>

                {/* Abas/Pílulas de Partes quando houver mais de 1 */}
                {partes.length > 1 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#232A3B]/60">
                    {partes.map((p, idx) => {
                      const isActive = idx === activePartIndex
                      return (
                        <div
                          key={p.id}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all border ${
                            isActive
                              ? 'bg-[#E63946] text-white border-[#E63946]'
                              : 'bg-[#0B0E14] text-slate-300 border-[#232A3B] hover:border-slate-500'
                          }`}
                          onClick={() => setActivePartIndex(idx)}
                        >
                          <span>Venda {idx + 1}</span>
                          <span className="opacity-80 tabular-nums">
                            ({formatCurrency(Number(p.valorComissao) || 0)})
                          </span>
                          {partes.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRemoverParte(idx)
                              }}
                              className="ml-1 text-slate-400 hover:text-white hover:bg-black/20 rounded p-0.5"
                              title="Remover esta parte"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Indicador de Balanço do Valor Total */}
                <div
                  className={`flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg border ${
                    valorBate
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-red-500/10 border-red-500/30 text-red-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {valorBate ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    )}
                    <span>
                      Soma das vendas: <strong>{formatCurrency(somaComissoesPartes)}</strong> de{' '}
                      <strong>{formatCurrency(totalTransacao)}</strong>
                    </span>
                  </div>
                  {!valorBate && (
                    <span className="font-bold tabular-nums">
                      {diferencaDivisao > 0
                        ? `Falta: ${formatCurrency(diferencaDivisao)}`
                        : `Passou: ${formatCurrency(Math.abs(diferencaDivisao))}`}
                    </span>
                  )}
                </div>
              </div>

              {/* FORMULÁRIO DA PARTE SELECIONADA */}
              {currentPart && (
                <div className="space-y-4 pt-1">
                  {partes.length > 1 && (
                    <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      <span>Editando Dados da Venda {activePartIndex + 1}:</span>
                    </div>
                  )}

                  {/* Linha 1: TIPO e COMPETÊNCIA */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                        TIPO *
                      </label>
                      <select
                        value={currentPart.tipo}
                        onChange={(e) => updateCurrentPart({ tipo: e.target.value as TipoVenda })}
                        className="w-full bg-[#0B0E14] border border-[#232A3B] text-slate-100 text-xs rounded-lg h-10 px-3 outline-none focus:border-[#E63946]"
                      >
                        <option value="venda">Comissão de Venda</option>
                        <option value="locacao">Comissão de locação</option>
                        <option value="administracao">Comissão de Administração</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                        COMPETÊNCIA *
                      </label>
                      <div className="relative">
                        <Input
                          type="month"
                          value={currentPart.competencia}
                          onChange={(e) => updateCurrentPart({ competencia: e.target.value })}
                          className="w-full bg-[#0B0E14] border-[#232A3B] text-slate-100 text-xs rounded-lg h-10 px-3 pr-8 outline-none focus:border-[#E63946]"
                        />
                        <Calendar className="w-4 h-4 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Linha 2: DATA DE RECEBIMENTO e CLIENTE */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                        DATA DE RECEBIMENTO
                      </label>
                      <div className="relative">
                        <Input
                          type="date"
                          value={currentPart.dataRecebimento}
                          onChange={(e) => updateCurrentPart({ dataRecebimento: e.target.value })}
                          className="w-full bg-[#0B0E14] border-[#232A3B] text-slate-100 text-xs rounded-lg h-10 px-3 pr-8 outline-none focus:border-[#E63946]"
                        />
                        <Calendar className="w-4 h-4 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                        CLIENTE COMPRADOR
                      </label>
                      <Input
                        type="text"
                        placeholder="Nome do cliente"
                        value={currentPart.cliente}
                        onChange={(e) => updateCurrentPart({ cliente: e.target.value })}
                        className="bg-[#0B0E14] border-[#232A3B] text-xs h-10 text-slate-100 placeholder:text-slate-600"
                      />
                    </div>
                  </div>

                  {/* Linha 3: DESCRIÇÃO (IMÓVEL) */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      DESCRIÇÃO (IMÓVEL) *
                    </label>
                    <Input
                      type="text"
                      placeholder="Ex: Apartamento Bela Vista ou descrição da venda"
                      value={currentPart.titulo}
                      onChange={(e) => updateCurrentPart({ titulo: e.target.value })}
                      className="bg-[#0B0E14] border-[#232A3B] text-xs h-10 text-slate-100 placeholder:text-slate-600"
                    />
                  </div>

                  {/* Bloco: FORMA DE PAGAMENTO DA COMISSÃO */}
                  <div className="p-3.5 rounded-xl bg-[#0B0E14]/70 border border-[#232A3B] space-y-2">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      FORMA DE PAGAMENTO DA COMISSÃO
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* Opção Centralizada */}
                      <div
                        onClick={() => updateCurrentPart({ formaPagamento: 'Centralizada' })}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                          currentPart.formaPagamento === 'Centralizada'
                            ? 'bg-[#151C2A] border-[#E63946] ring-1 ring-[#E63946]/40'
                            : 'bg-[#0E121B] border-[#232A3B] hover:border-slate-600'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`forma_pagamento_${currentPart.id}`}
                          checked={currentPart.formaPagamento === 'Centralizada'}
                          onChange={() => updateCurrentPart({ formaPagamento: 'Centralizada' })}
                          className="mt-0.5 accent-[#E63946] cursor-pointer"
                        />
                        <div>
                          <span className="text-xs font-bold text-white block">Centralizada</span>
                          <span className="text-[10px] text-slate-400 leading-tight block mt-0.5">
                            Imobiliária recebe tudo (6% imposto sobre o total)
                          </span>
                        </div>
                      </div>

                      {/* Opção Separada */}
                      <div
                        onClick={() => updateCurrentPart({ formaPagamento: 'Separada' })}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                          currentPart.formaPagamento === 'Separada'
                            ? 'bg-[#151C2A] border-[#E63946] ring-1 ring-[#E63946]/40'
                            : 'bg-[#0E121B] border-[#232A3B] hover:border-slate-600'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`forma_pagamento_${currentPart.id}`}
                          checked={currentPart.formaPagamento === 'Separada'}
                          onChange={() => updateCurrentPart({ formaPagamento: 'Separada' })}
                          className="mt-0.5 accent-[#E63946] cursor-pointer"
                        />
                        <div>
                          <span className="text-xs font-bold text-white block">Separada</span>
                          <span className="text-[10px] text-slate-400 leading-tight block mt-0.5">
                            Cada um recebe direto (6% só sobre parte da imobiliária)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Seletor: % sobre VGV vs Valor Fixo */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const vgvVal = Number(currentPart.vgv) || 0
                        const pctVal = Number(currentPart.pctNegociacao) || 6
                        const calcComissao =
                          vgvVal > 0 ? (vgvVal * pctVal) / 100 : currentPart.valorComissao
                        updateCurrentPart({
                          modoCalculo: '%_vgv',
                          valorComissao: calcComissao,
                        })
                      }}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                        currentPart.modoCalculo === '%_vgv'
                          ? 'bg-[#E63946] text-white shadow-md'
                          : 'bg-[#0B0E14] border border-[#232A3B] text-slate-400 hover:text-white'
                      }`}
                    >
                      <Percent className="w-3.5 h-3.5" />
                      <span>% sobre VGV</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateCurrentPart({ modoCalculo: 'valor_fixo' })}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                        currentPart.modoCalculo === 'valor_fixo'
                          ? 'bg-[#E63946] text-white shadow-md'
                          : 'bg-[#0B0E14] border border-[#232A3B] text-slate-400 hover:text-white'
                      }`}
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>Valor Fixo</span>
                    </button>
                  </div>

                  {/* VGV e Comissão */}
                  {currentPart.modoCalculo === '%_vgv' ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                          VALOR DO IMÓVEL (VGV) *
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Ex: 250000"
                          value={currentPart.vgv}
                          onChange={(e) => {
                            const vgvVal = e.target.value !== '' ? Number(e.target.value) : ''
                            const pctVal = Number(currentPart.pctNegociacao) || 0
                            const calculated =
                              typeof vgvVal === 'number' ? (vgvVal * pctVal) / 100 : 0
                            updateCurrentPart({
                              vgv: vgvVal,
                              valorComissao: calculated,
                              valorRecebido:
                                currentPart.situacaoRecebimento === 'Recebido'
                                  ? calculated
                                  : currentPart.valorRecebido,
                            })
                          }}
                          className="bg-[#E9EEF9] text-[#0B0E14] font-bold text-sm h-10 border-0 focus:ring-2 focus:ring-[#E63946]"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">
                          Usado para cálculo de metas
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                            % DA NEGOCIAÇÃO *
                          </label>
                          <Input
                            type="number"
                            step="0.1"
                            placeholder="6"
                            value={currentPart.pctNegociacao}
                            onChange={(e) => {
                              const pctVal = e.target.value !== '' ? Number(e.target.value) : ''
                              const vgvVal = Number(currentPart.vgv) || 0
                              const calculated =
                                typeof pctVal === 'number' ? (vgvVal * pctVal) / 100 : 0
                              updateCurrentPart({
                                pctNegociacao: pctVal,
                                valorComissao: calculated,
                                valorRecebido:
                                  currentPart.situacaoRecebimento === 'Recebido'
                                    ? calculated
                                    : currentPart.valorRecebido,
                              })
                            }}
                            className="bg-[#0B0E14] border-[#232A3B] text-slate-100 font-bold text-xs h-10"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                            COMISSÃO CALCULADA
                          </label>
                          <div className="bg-[#0B0E14] border border-[#232A3B] text-slate-100 font-black text-sm h-10 px-3 flex items-center rounded-lg">
                            {formatCurrency(currentPart.valorComissao)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                            VALOR DO IMÓVEL (VGV - OPCIONAL)
                          </label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={currentPart.vgv}
                            onChange={(e) =>
                              updateCurrentPart({
                                vgv: e.target.value ? Number(e.target.value) : '',
                              })
                            }
                            className="bg-[#0B0E14] text-slate-100 text-xs h-10 border-[#232A3B]"
                          />
                          <p className="text-[10px] text-slate-400 mt-1">
                            Usado para cálculo de metas
                          </p>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                            VALOR DA COMISSÃO *
                          </label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Ex: 15000"
                            value={currentPart.valorComissao}
                            onChange={(e) => {
                              const val = e.target.value !== '' ? Number(e.target.value) : 0
                              updateCurrentPart({
                                valorComissao: val,
                                valorRecebido:
                                  currentPart.situacaoRecebimento === 'Recebido'
                                    ? val
                                    : currentPart.valorRecebido,
                              })
                            }}
                            className="bg-[#E9EEF9] text-[#0B0E14] font-bold text-sm h-10 border-0 focus:ring-2 focus:ring-[#E63946]"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SEÇÃO DIVISÃO DA COMISSÃO */}
                  <div className="p-4 rounded-xl bg-[#0B0E14]/80 border border-[#232A3B] space-y-3">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      DIVISÃO DA COMISSÃO
                    </label>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                          % IMOBILIÁRIA
                        </label>
                        <Input
                          type="number"
                          value={currentPart.pctImobiliaria}
                          onChange={(e) =>
                            updateCurrentPart({ pctImobiliaria: Number(e.target.value) })
                          }
                          className="bg-[#0B0E14] border-[#232A3B] text-slate-100 font-bold text-xs h-10 text-center"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                          % CORRETOR
                        </label>
                        <Input
                          type="number"
                          value={currentPart.pctCorretor}
                          onChange={(e) =>
                            updateCurrentPart({ pctCorretor: Number(e.target.value) })
                          }
                          className="bg-[#0B0E14] border-[#232A3B] text-slate-100 font-bold text-xs h-10 text-center"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                          % CAPTADOR
                        </label>
                        <Input
                          type="number"
                          value={currentPart.pctCaptador}
                          onChange={(e) =>
                            updateCurrentPart({ pctCaptador: Number(e.target.value) })
                          }
                          className="bg-[#0B0E14] border-[#232A3B] text-slate-100 font-bold text-xs h-10 text-center"
                        />
                      </div>
                    </div>

                    {/* Resumo da divisão em R$ */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#232A3B]/60 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">
                          Imobiliária:
                        </span>
                        <span className="font-bold text-emerald-400 block tabular-nums">
                          {formatCurrency(divisaoAoVivo.valorImobiliariaLiquido)}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">
                          Corretor:
                        </span>
                        <span className="font-bold text-white block tabular-nums">
                          {formatCurrency(divisaoAoVivo.valorCorretor)}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">
                          Captador:
                        </span>
                        <span className="font-bold text-white block tabular-nums">
                          {formatCurrency(divisaoAoVivo.valorCaptadorTotal)}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">
                          Imposto 6%:
                        </span>
                        <span className="font-bold text-red-500 block tabular-nums">
                          {formatCurrency(divisaoAoVivo.valorImposto)}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#232A3B]/40 flex items-center justify-between">
                      <span className="text-xs text-slate-400">Líquido para imobiliária:</span>
                      <span className="text-sm font-black text-emerald-400 tabular-nums">
                        {formatCurrency(divisaoAoVivo.valorImobiliariaLiquido)}
                      </span>
                    </div>
                  </div>

                  {/* SELEÇÃO DE CORRETOR E CAPTADOR */}
                  <div className="p-3.5 rounded-xl bg-[#0B0E14]/60 border border-[#232A3B] space-y-3">
                    {/* Corretor Principal */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                          CORRETOR RESPONSÁVEL *
                        </label>
                        {!currentPart.showSecondCorretor && (
                          <button
                            type="button"
                            onClick={() => updateCurrentPart({ showSecondCorretor: true })}
                            className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#121722] border border-[#232A3B] text-slate-300 hover:text-white"
                          >
                            + 2º Corretor
                          </button>
                        )}
                      </div>
                      <select
                        value={currentPart.corretorPrincipal}
                        onChange={(e) => updateCurrentPart({ corretorPrincipal: e.target.value })}
                        className="w-full bg-[#121722] border border-[#232A3B] text-slate-100 text-xs rounded-lg h-9 px-2.5 outline-none focus:border-[#E63946]"
                      >
                        <option value="">Selecione o corretor...</option>
                        {corretores
                          .filter((c) => c.ativo)
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nome} {c.creci ? `(CRECI ${c.creci})` : ''}
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* 2º Corretor */}
                    {currentPart.showSecondCorretor && (
                      <div className="pt-2 border-t border-[#232A3B]/50 flex items-center gap-2">
                        <select
                          value={currentPart.corretorSecundario}
                          onChange={(e) =>
                            updateCurrentPart({ corretorSecundario: e.target.value })
                          }
                          className="flex-1 bg-[#121722] border border-[#232A3B] text-slate-100 text-xs rounded-lg h-9 px-2.5 outline-none focus:border-[#E63946]"
                        >
                          <option value="">Selecione 2º corretor...</option>
                          {corretores
                            .filter((c) => c.ativo && c.id !== currentPart.corretorPrincipal)
                            .map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.nome} {c.creci ? `(CRECI ${c.creci})` : ''}
                              </option>
                            ))}
                        </select>
                        <button
                          type="button"
                          onClick={() =>
                            updateCurrentPart({
                              showSecondCorretor: false,
                              corretorSecundario: '',
                            })
                          }
                          className="text-slate-400 hover:text-red-400 p-1.5"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {/* Captador(es) */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                          CAPTADOR
                        </label>
                        {!currentPart.showSecondCaptador && (
                          <button
                            type="button"
                            onClick={() => updateCurrentPart({ showSecondCaptador: true })}
                            className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#121722] border border-[#232A3B] text-slate-300 hover:text-white"
                          >
                            + 2º Captador
                          </button>
                        )}
                      </div>
                      <select
                        value={currentPart.captadores[0] || ''}
                        onChange={(e) => {
                          const id = e.target.value
                          if (id) {
                            updateCurrentPart({
                              captadores: [id, ...currentPart.captadores.slice(1)],
                            })
                          } else {
                            updateCurrentPart({
                              captadores: currentPart.captadores.slice(1),
                            })
                          }
                        }}
                        className="w-full bg-[#121722] border border-[#232A3B] text-slate-100 text-xs rounded-lg h-9 px-2.5 outline-none focus:border-amber-400"
                      >
                        <option value="">Selecione o captador...</option>
                        {corretores
                          .filter((c) => c.ativo)
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nome} {c.creci ? `(CRECI ${c.creci})` : ''}
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* 2º Captador */}
                    {currentPart.showSecondCaptador && (
                      <div className="pt-2 border-t border-[#232A3B]/50 flex items-center gap-2">
                        <select
                          value={currentPart.captadores[1] || ''}
                          onChange={(e) => {
                            const id = e.target.value
                            const first = currentPart.captadores[0] || ''
                            if (id) {
                              updateCurrentPart({
                                captadores: first ? [first, id] : [id],
                              })
                            } else {
                              updateCurrentPart({
                                captadores: first ? [first] : [],
                              })
                            }
                          }}
                          className="flex-1 bg-[#121722] border border-[#232A3B] text-slate-100 text-xs rounded-lg h-9 px-2.5 outline-none focus:border-amber-400"
                        >
                          <option value="">Selecione 2º captador...</option>
                          {corretores
                            .filter((c) => c.ativo && c.id !== currentPart.captadores[0])
                            .map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.nome} {c.creci ? `(CRECI ${c.creci})` : ''}
                              </option>
                            ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            updateCurrentPart({
                              showSecondCaptador: false,
                              captadores: currentPart.captadores.slice(0, 1),
                            })
                          }}
                          className="text-slate-400 hover:text-red-400 p-1.5"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Situação do Recebimento & Status */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                        SITUAÇÃO DO RECEBIMENTO
                      </label>
                      <select
                        value={currentPart.situacaoRecebimento}
                        onChange={(e) => {
                          const sit = e.target.value as SituacaoRecebimento
                          updateCurrentPart({
                            situacaoRecebimento: sit,
                            valorRecebido:
                              sit === 'Recebido'
                                ? currentPart.valorComissao
                                : currentPart.valorRecebido || currentPart.valorComissao,
                          })
                        }}
                        className="w-full bg-[#0B0E14] border border-[#232A3B] text-slate-100 text-xs rounded-lg h-9 px-2.5 outline-none focus:border-[#E63946]"
                      >
                        <option value="Recebido">Recebido Total</option>
                        <option value="Parcial">Parcial (Recebeu parte)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                        STATUS DA VENDA
                      </label>
                      <select
                        value={currentPart.status}
                        onChange={(e) =>
                          updateCurrentPart({ status: e.target.value as VendaStatus })
                        }
                        className="w-full bg-[#0B0E14] border border-[#232A3B] text-slate-100 text-xs rounded-lg h-9 px-2.5 outline-none focus:border-[#E63946]"
                      >
                        <option value="realizada">Realizada</option>
                        <option value="pendente">Pendente</option>
                        <option value="cancelada">Cancelada</option>
                      </select>
                    </div>
                  </div>

                  {currentPart.situacaoRecebimento === 'Parcial' && (
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-amber-400 mb-1">
                        VALOR RECEBIDO NESTA ETAPA (R$) *
                      </label>
                      <Input
                        type="number"
                        placeholder="Ex: 10000"
                        value={currentPart.valorRecebido}
                        onChange={(e) =>
                          updateCurrentPart({
                            valorRecebido: e.target.value ? Number(e.target.value) : '',
                          })
                        }
                        className="bg-[#0B0E14] border-amber-500/50 text-xs h-9 text-white font-bold"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Rodapé Fixo */}
            <DialogFooter className="p-3.5 sm:p-4 px-4 sm:px-6 border-t border-[#232A3B]/80 bg-[#0E121B] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
              <div className="text-[11px] text-slate-400">
                A transação original será <strong className="text-red-400">substituída</strong> pela
                venda.
              </div>

              <div className="flex items-center gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={saving}
                  className="bg-transparent border-[#232A3B] text-slate-300 hover:bg-[#1A2234] text-xs h-9"
                >
                  Cancelar
                </Button>

                <Button
                  type="submit"
                  disabled={saving || !valorBate}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 text-xs h-9 shadow-md shadow-emerald-900/20"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Convertendo...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {partes.length > 1
                          ? `Criar ${partes.length} Vendas & Substituir`
                          : 'Converter em Venda'}
                      </span>
                    </>
                  )}
                </Button>
              </div>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
