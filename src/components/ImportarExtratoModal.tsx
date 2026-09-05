import React, { useState, useMemo, useRef } from 'react'
import {
  UploadCloud,
  FileText,
  AlertTriangle,
  CheckCircle2,
  X,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Filter,
  CheckSquare,
  Square,
  RefreshCw,
  Building2,
  Calendar,
  Sparkles,
  Info,
  ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Transacao, TransacaoCategoria, TransacaoTipo } from '@/types'
import { TransacaoService } from '@/services/imobService'
import { processExtratoFile } from '@/lib/extrato/extratoProcessor'
import { detectarDuplicados } from '@/lib/extrato/duplicateDetector'
import { ExtratoItemRaw, ExtratoParseResult, formatMoedaPtBr } from '@/lib/extrato/types'

interface ImportarExtratoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transacoesExistentes: Transacao[]
  userId: string
  onSuccess: () => void
}

const CATEGORIAS_CONFIG: { id: TransacaoCategoria; label: string }[] = [
  { id: 'comissao', label: 'Comissão' },
  { id: 'imposto', label: 'Imposto (6%)' },
  { id: 'repasse', label: 'Repasse' },
  { id: 'aluguel', label: 'Aluguel' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'salarios', label: 'Salários' },
  { id: 'utilidades', label: 'Utilidades' },
  { id: 'manutencao', label: 'Manutenção' },
  { id: 'outros', label: 'Outros' },
]

export const ImportarExtratoModal: React.FC<ImportarExtratoModalProps> = ({
  open,
  onOpenChange,
  transacoesExistentes,
  userId,
  onSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Estados de Upload & Parsing
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [parseResult, setParseResult] = useState<ExtratoParseResult | null>(null)
  const [itens, setItens] = useState<ExtratoItemRaw[]>([])
  const [anoCompetencia, setAnoCompetencia] = useState<number>(new Date().getFullYear())

  // Estados da Tela de Revisão
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'entrada' | 'saida'>('todos')
  const [filtroStatusDuplicado, setFiltroStatusDuplicado] = useState<
    'todos' | 'duplicados' | 'novos'
  >('todos')
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(
    null,
  )

  // Reseta estado ao fechar
  const handleClose = () => {
    if (isImporting) return
    onOpenChange(false)
    setTimeout(() => {
      setFile(null)
      setParseResult(null)
      setItens([])
      setSearchTerm('')
      setImportProgress(null)
    }, 200)
  }

  // Processa o arquivo selecionado
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return
    await processFile(selected)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile) {
      await processFile(droppedFile)
    }
  }

  const processFile = async (targetFile: File) => {
    setFile(targetFile)
    setIsProcessing(true)

    try {
      const res = await processExtratoFile(targetFile, { anoFallback: anoCompetencia })
      setParseResult(res)

      if (res.periodoExtrato?.anoInferido) {
        setAnoCompetencia(res.periodoExtrato.anoInferido)
      }

      // Detecção de duplicados contra as transações existentes no sistema
      const checkedItens = detectarDuplicados(res.itens, transacoesExistentes)
      setItens(checkedItens)

      const totalDups = checkedItens.filter((i) => i.isDuplicado).length
      if (checkedItens.length > 0) {
        toast.success(
          `${checkedItens.length} lançamentos encontrados (${res.qtdEntradas} entradas, ${res.qtdSaidas} saídas)${
            totalDups > 0 ? ` • ${totalDups} possível(is) duplicado(s)` : ''
          }`,
        )
      } else {
        toast.warning('Nenhum lançamento foi identificado no arquivo.')
      }
    } catch (err: any) {
      console.error('Erro ao processar extrato:', err)
      toast.error(err?.message || 'Erro ao processar arquivo de extrato.')
    } finally {
      setIsProcessing(false)
    }
  }

  // Re-analisar quando o ano de competência for alterado manualmente
  const handleAnoChange = (novoAno: number) => {
    setAnoCompetencia(novoAno)
    if (file) {
      setItens((prev) =>
        prev.map((it) => {
          const [dia, mes] = it.dataStr.includes('/') ? it.dataStr.split('/') : ['01', '01']
          const novaDataIso = `${novoAno}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`
          return {
            ...it,
            dataIso: novaDataIso,
          }
        }),
      )
    }
  }

  // Ações de linha
  const handleToggleSelect = (id: string) => {
    setItens((prev) =>
      prev.map((it) => (it.id === id ? { ...it, selecionado: !it.selecionado } : it)),
    )
  }

  const handleSelectAll = (selecionar: boolean) => {
    setItens((prev) =>
      prev.map((it) => {
        // Se estiver filtrando, aplica apenas nos filtrados
        if (itensFiltrados.some((f) => f.id === it.id)) {
          return { ...it, selecionado: selecionar }
        }
        return it
      }),
    )
  }

  const handleUpdateItemCategoria = (id: string, categoria: TransacaoCategoria) => {
    setItens((prev) =>
      prev.map((it) => (it.id === id ? { ...it, categoriaSugerida: categoria } : it)),
    )
  }

  const handleUpdateItemStatus = (id: string, status: 'Pago' | 'Pendente') => {
    setItens((prev) => prev.map((it) => (it.id === id ? { ...it, status } : it)))
  }

  const handleUpdateItemTipo = (id: string, tipo: TransacaoTipo) => {
    setItens((prev) =>
      prev.map((it) =>
        it.id === id ? { ...it, tipo, sinal: tipo === 'entrada' ? 'C' : 'D' } : it,
      ),
    )
  }

  const handleUpdateItemDescricao = (id: string, descricao: string) => {
    setItens((prev) => prev.map((it) => (it.id === id ? { ...it, descricao } : it)))
  }

  // Filtragem dos itens exibidos
  const itensFiltrados = useMemo(() => {
    return itens.filter((it) => {
      if (filtroTipo !== 'todos' && it.tipo !== filtroTipo) return false
      if (filtroStatusDuplicado === 'duplicados' && !it.isDuplicado) return false
      if (filtroStatusDuplicado === 'novos' && it.isDuplicado) return false

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase()
        const matchDesc = it.descricao.toLowerCase().includes(term)
        const matchDoc = it.documento?.toLowerCase().includes(term)
        const matchValor = it.valor.toString().includes(term)
        return matchDesc || matchDoc || matchValor
      }

      return true
    })
  }, [itens, filtroTipo, filtroStatusDuplicado, searchTerm])

  // Estatísticas dos selecionados para importação
  const estatisticas = useMemo(() => {
    const selecionados = itens.filter((it) => it.selecionado)
    const entradas = selecionados.filter((it) => it.tipo === 'entrada')
    const saidas = selecionados.filter((it) => it.tipo === 'saida')

    const valorEntradas = entradas.reduce((s, it) => s + it.valor, 0)
    const valorSaidas = saidas.reduce((s, it) => s + it.valor, 0)
    const saldo = valorEntradas - valorSaidas

    return {
      qtdTotal: itens.length,
      qtdSelecionados: selecionados.length,
      qtdEntradas: entradas.length,
      qtdSaidas: saidas.length,
      valorEntradas,
      valorSaidas,
      saldo,
      duplicadosCount: itens.filter((i) => i.isDuplicado).length,
    }
  }, [itens])

  // Confirmar importação em lote
  const handleConfirmarImportacao = async () => {
    const selecionados = itens.filter((it) => it.selecionado)
    if (selecionados.length === 0) {
      toast.warning('Selecione pelo menos um lançamento para importar.')
      return
    }

    setIsImporting(true)
    setImportProgress({ current: 0, total: selecionados.length })

    let criados = 0
    let erros = 0

    try {
      for (let i = 0; i < selecionados.length; i++) {
        const item = selecionados[i]

        // Competência: 1º dia do mês correspondente à data em UTC
        const itemDate = new Date(item.dataIso + 'T12:00:00Z')
        const compDate = new Date(
          Date.UTC(itemDate.getUTCFullYear(), itemDate.getUTCMonth(), 1, 12, 0, 0),
        )

        const payload: Partial<Transacao> = {
          tipo: item.tipo,
          descricao: item.descricao,
          categoria: item.categoriaSugerida,
          valor: item.valor,
          data: itemDate.toISOString(),
          data_competencia: compDate.toISOString(),
          data_vencimento: itemDate.toISOString(),
          status: item.status,
          consolidado: item.status === 'Pago',
          observacoes: item.detalhesComplementares
            ? `Importado via Extrato Bancário SICOOB\n${item.detalhesComplementares}`
            : 'Importado via Extrato Bancário SICOOB',
          user: userId,
        }

        try {
          await TransacaoService.create(payload)
          criados++
        } catch (e) {
          console.error(`Erro ao criar transação para ${item.descricao}:`, e)
          erros++
        }

        setImportProgress({ current: i + 1, total: selecionados.length })
      }

      if (criados > 0) {
        toast.success(
          `${criados} lançamento${criados > 1 ? 's importados' : ' importado'} com sucesso no Fluxo de Caixa!`,
        )
        onSuccess()
        handleClose()
      } else {
        toast.error('Não foi possível importar os lançamentos. Verifique as permissões.')
      }
    } catch (err: any) {
      console.error(err)
      toast.error('Erro durante a importação em lote.')
    } finally {
      setIsImporting(false)
      setImportProgress(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !isImporting && onOpenChange(val)}>
      <DialogContent className="max-w-6xl w-[96vw] max-h-[92vh] flex flex-col p-0 bg-[#0E121B] border border-[#232A3B] text-slate-100 shadow-2xl overflow-hidden rounded-2xl">
        {/* Header */}
        <DialogHeader className="p-5 pb-4 border-b border-[#1F2637] bg-[#121622] flex flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E63946]/15 border border-[#E63946]/30 flex items-center justify-center text-[#E63946]">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                <span>Importar Extrato Bancário</span>
                <Badge className="bg-[#E63946]/20 text-[#E63946] border-[#E63946]/40 text-[10px] font-semibold uppercase">
                  SICOOB / SISBR & Mais
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400 mt-0.5">
                Faça o upload do extrato em PDF (SICOOB), CSV ou Planilha Excel para reconciliação
                automática.
              </DialogDescription>
            </div>
          </div>

          {/* Ano de Competência / Período */}
          <div className="flex items-center gap-2 mr-6">
            <span className="text-xs text-slate-400 hidden sm:inline">Ano de Referência:</span>
            <div className="flex items-center bg-[#0B0E14] border border-[#232A3B] rounded-lg px-2.5 py-1 text-xs text-white">
              <Calendar className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
              <input
                type="number"
                min={2020}
                max={2035}
                value={anoCompetencia}
                onChange={(e) => handleAnoChange(parseInt(e.target.value, 10) || 2026)}
                className="bg-transparent w-14 font-semibold text-center focus:outline-none text-slate-100"
              />
            </div>
          </div>
        </DialogHeader>

        {/* Corpo do Modal */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Seção 1: Upload (se não houver itens ou para trocar de arquivo) */}
          {itens.length === 0 ? (
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
                isProcessing
                  ? 'border-[#E63946] bg-[#E63946]/5'
                  : 'border-[#2A344A] hover:border-[#E63946]/70 hover:bg-[#151B28]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.csv,.xlsx,.xls,.txt"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="max-w-md mx-auto flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-[#E63946]/10 border border-[#E63946]/30 flex items-center justify-center text-[#E63946] mb-4 shadow-lg shadow-[#E63946]/10">
                  {isProcessing ? (
                    <RefreshCw className="w-8 h-8 animate-spin" />
                  ) : (
                    <UploadCloud className="w-8 h-8" />
                  )}
                </div>

                <h3 className="text-base font-bold text-white mb-1">
                  {isProcessing
                    ? 'Lendo e interpretando extrato...'
                    : 'Arraste seu extrato bancário ou clique para selecionar'}
                </h3>
                <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                  Compatível nativamente com o formato <strong>SICOOB SISBR (PDF)</strong> com
                  separação automática de entradas e saídas (C/D), além de planilhas{' '}
                  <strong>CSV</strong> e <strong>XLSX</strong>.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Badge
                    variant="outline"
                    className="bg-[#1A2234] border-[#2E3952] text-slate-300 text-[11px] py-1"
                  >
                    <FileText className="w-3.5 h-3.5 mr-1 text-red-400" />
                    PDF SICOOB (.pdf)
                  </Badge>
                  <Badge
                    variant="outline"
                    className="bg-[#1A2234] border-[#2E3952] text-slate-300 text-[11px] py-1"
                  >
                    Planilha CSV (.csv)
                  </Badge>
                  <Badge
                    variant="outline"
                    className="bg-[#1A2234] border-[#2E3952] text-slate-300 text-[11px] py-1"
                  >
                    Excel (.xlsx, .xls)
                  </Badge>
                </div>
              </div>
            </div>
          ) : (
            /* Seção 2: Informações do Extrato e Ações de Filtro */
            <div className="space-y-4">
              {/* Barra superior de contexto do arquivo */}
              <div className="bg-[#131825] border border-[#232A3B] rounded-xl p-3 sm:px-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">
                        {parseResult?.bancoDetectado === 'SICOOB'
                          ? 'SICOOB SISBR'
                          : 'Extrato Bancário'}
                      </span>
                      {parseResult?.conta && (
                        <span className="text-[11px] text-slate-400 font-mono">
                          Conta: {parseResult.conta}
                        </span>
                      )}
                      {parseResult?.empresa && (
                        <span className="text-[11px] text-slate-400 hidden md:inline">
                          • {parseResult.empresa}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Arquivo: <span className="text-slate-300 font-medium">{file?.name}</span>
                      {parseResult?.periodoExtrato?.inicio && (
                        <span>
                          {' '}
                          • Período: {parseResult.periodoExtrato.inicio} a{' '}
                          {parseResult.periodoExtrato.fim}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setItens([])
                      setParseResult(null)
                      setFile(null)
                    }}
                    className="bg-[#0B0E14] border-[#232A3B] text-slate-300 hover:text-white hover:bg-[#1A2234] text-xs h-8"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    Trocar Arquivo
                  </Button>
                </div>
              </div>

              {/* Cards de Resumo e Totais dos Selecionados */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[#121722] border border-[#232A3B] rounded-xl p-3.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase">
                      Total a Importar
                    </span>
                    <CheckSquare className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <div className="text-xl font-bold text-white">
                    {estatisticas.qtdSelecionados}{' '}
                    <span className="text-xs text-slate-500 font-normal">
                      / {estatisticas.qtdTotal} itens
                    </span>
                  </div>
                </div>

                <div className="bg-[#121722] border border-emerald-500/20 rounded-xl p-3.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-semibold text-emerald-400 uppercase flex items-center gap-1">
                      <ArrowUpRight className="w-3 h-3" /> Entradas (C)
                    </span>
                    <Badge className="bg-emerald-500/20 text-emerald-300 text-[10px] px-1.5 py-0 h-4">
                      {estatisticas.qtdEntradas}
                    </Badge>
                  </div>
                  <div className="text-xl font-bold text-emerald-400">
                    + {formatMoedaPtBr(estatisticas.valorEntradas)}
                  </div>
                </div>

                <div className="bg-[#121722] border border-red-500/20 rounded-xl p-3.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-semibold text-red-400 uppercase flex items-center gap-1">
                      <ArrowDownRight className="w-3 h-3" /> Saídas (D)
                    </span>
                    <Badge className="bg-red-500/20 text-red-300 text-[10px] px-1.5 py-0 h-4">
                      {estatisticas.qtdSaidas}
                    </Badge>
                  </div>
                  <div className="text-xl font-bold text-red-400">
                    - {formatMoedaPtBr(estatisticas.valorSaidas)}
                  </div>
                </div>

                <div className="bg-[#121722] border border-[#232A3B] rounded-xl p-3.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase">
                      Saldo Selecionado
                    </span>
                    <Sparkles className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <div
                    className={`text-xl font-bold ${
                      estatisticas.saldo >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {formatMoedaPtBr(estatisticas.saldo)}
                  </div>
                </div>
              </div>

              {/* Barra de Filtros e Busca */}
              <div className="bg-[#121722] border border-[#232A3B] rounded-xl p-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type="text"
                    placeholder="Filtrar por descrição, documento ou valor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-[#0B0E14] border-[#232A3B] pl-9 text-xs text-slate-100 placeholder:text-slate-500 h-9"
                  />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                  {/* Filtro Tipo */}
                  <div className="flex items-center bg-[#0B0E14] border border-[#232A3B] rounded-lg p-1 text-xs">
                    {(['todos', 'entrada', 'saida'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setFiltroTipo(t)}
                        className={`px-2.5 py-1 rounded capitalize font-medium transition-all ${
                          filtroTipo === t
                            ? 'bg-[#E63946] text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {t === 'todos' ? 'Todos' : t === 'entrada' ? 'Entradas' : 'Saídas'}
                      </button>
                    ))}
                  </div>

                  {/* Filtro Duplicados */}
                  {estatisticas.duplicadosCount > 0 && (
                    <select
                      value={filtroStatusDuplicado}
                      onChange={(e: any) => setFiltroStatusDuplicado(e.target.value)}
                      className="bg-[#0B0E14] border border-[#232A3B] text-slate-300 text-xs rounded-lg h-9 px-2.5 outline-none"
                    >
                      <option value="todos">Todos ({itens.length})</option>
                      <option value="novos">
                        Apenas Novos ({itens.length - estatisticas.duplicadosCount})
                      </option>
                      <option value="duplicados">
                        Possíveis Duplicados ({estatisticas.duplicadosCount})
                      </option>
                    </select>
                  )}

                  {/* Ações em massa: Marcar / Desmarcar */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectAll(true)}
                    className="bg-[#0B0E14] border-[#232A3B] text-slate-300 hover:text-white text-xs h-9 px-3"
                  >
                    Marcar Todas
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectAll(false)}
                    className="bg-[#0B0E14] border-[#232A3B] text-slate-300 hover:text-white text-xs h-9 px-3"
                  >
                    Desmarcar Todas
                  </Button>
                </div>
              </div>

              {/* Tabela de Revisão dos Lançamentos */}
              <div className="bg-[#121722] border border-[#232A3B] rounded-xl shadow-lg overflow-hidden">
                <div className="overflow-x-auto max-h-[460px]">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 z-10 bg-[#0E121B] border-b border-[#232A3B] text-slate-400 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-3 w-10 text-center">
                          <Checkbox
                            checked={
                              itensFiltrados.length > 0 &&
                              itensFiltrados.every((i) => i.selecionado)
                                ? true
                                : itensFiltrados.some((i) => i.selecionado)
                                  ? 'indeterminate'
                                  : false
                            }
                            onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                            aria-label="Selecionar visíveis"
                            className="data-[state=checked]:bg-[#E63946] data-[state=checked]:border-[#E63946] border-[#343D52]"
                          />
                        </th>
                        <th className="py-3 px-3 w-24">Data</th>
                        <th className="py-3 px-3 w-28">Tipo</th>
                        <th className="py-3 px-3">Descrição / Histórico</th>
                        <th className="py-3 px-3 w-40">Categoria</th>
                        <th className="py-3 px-3 w-28">Status</th>
                        <th className="py-3 px-3 w-32 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1F2637]">
                      {itensFiltrados.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-10 text-slate-400">
                            Nenhum lançamento encontrado para os filtros selecionados.
                          </td>
                        </tr>
                      ) : (
                        itensFiltrados.map((item) => {
                          const isEntrada = item.tipo === 'entrada'

                          return (
                            <tr
                              key={item.id}
                              className={`transition-colors ${
                                item.selecionado
                                  ? 'bg-[#151B28] hover:bg-[#1A2234]'
                                  : 'bg-[#0E121B]/60 opacity-60 hover:opacity-100 hover:bg-[#151B28]'
                              } ${item.isDuplicado ? 'border-l-4 border-l-amber-500' : ''}`}
                            >
                              {/* Checkbox */}
                              <td className="py-3 px-3 text-center">
                                <Checkbox
                                  checked={item.selecionado}
                                  onCheckedChange={() => handleToggleSelect(item.id)}
                                  className="data-[state=checked]:bg-[#E63946] data-[state=checked]:border-[#E63946] border-[#343D52]"
                                />
                              </td>

                              {/* Data */}
                              <td className="py-3 px-3 font-mono text-slate-300">
                                <div className="font-semibold text-white">{item.dataStr}</div>
                                <div className="text-[10px] text-slate-500">{item.dataIso}</div>
                              </td>

                              {/* Tipo (Entrada/Saída) */}
                              <td className="py-3 px-3">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateItemTipo(item.id, isEntrada ? 'saida' : 'entrada')
                                  }
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold transition-transform hover:scale-105 ${
                                    isEntrada
                                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                      : 'bg-[#E63946]/15 text-red-400 border border-[#E63946]/30'
                                  }`}
                                  title="Clique para alternar Entrada/Saída"
                                >
                                  {isEntrada ? (
                                    <>
                                      <ArrowUpRight className="w-3 h-3" />
                                      <span>Entrada (C)</span>
                                    </>
                                  ) : (
                                    <>
                                      <ArrowDownRight className="w-3 h-3" />
                                      <span>Saída (D)</span>
                                    </>
                                  )}
                                </button>
                              </td>

                              {/* Descrição */}
                              <td className="py-3 px-3">
                                <div className="space-y-1">
                                  <input
                                    type="text"
                                    value={item.descricao}
                                    onChange={(e) =>
                                      handleUpdateItemDescricao(item.id, e.target.value)
                                    }
                                    className="w-full bg-transparent hover:bg-[#0B0E14] focus:bg-[#0B0E14] px-1.5 py-0.5 rounded border border-transparent hover:border-[#232A3B] focus:border-[#E63946] text-xs text-white focus:outline-none transition-colors"
                                  />

                                  {/* Alerta de Duplicado */}
                                  {item.isDuplicado && (
                                    <div className="flex items-center gap-1 text-[11px] text-amber-400 font-medium bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded w-fit">
                                      <AlertTriangle className="w-3 h-3 shrink-0" />
                                      <span>Possível duplicado</span>
                                      {item.motivoDuplicado && (
                                        <span
                                          className="text-[10px] text-amber-300/80 cursor-help underline ml-1"
                                          title={item.motivoDuplicado}
                                        >
                                          (detalhes)
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  {item.documento && (
                                    <span className="text-[10px] text-slate-500 block">
                                      Doc: {item.documento}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Categoria */}
                              <td className="py-3 px-3">
                                <select
                                  value={item.categoriaSugerida}
                                  onChange={(e: any) =>
                                    handleUpdateItemCategoria(item.id, e.target.value)
                                  }
                                  className="w-full bg-[#0B0E14] border border-[#232A3B] text-slate-200 text-xs rounded-lg px-2 py-1.5 focus:border-[#E63946] outline-none"
                                >
                                  {CATEGORIAS_CONFIG.map((cat) => (
                                    <option key={cat.id} value={cat.id}>
                                      {cat.label}
                                    </option>
                                  ))}
                                </select>
                              </td>

                              {/* Status */}
                              <td className="py-3 px-3">
                                <select
                                  value={item.status}
                                  onChange={(e: any) =>
                                    handleUpdateItemStatus(item.id, e.target.value)
                                  }
                                  className={`w-full bg-[#0B0E14] border border-[#232A3B] text-xs font-semibold rounded-lg px-2 py-1.5 outline-none ${
                                    item.status === 'Pago' ? 'text-emerald-400' : 'text-amber-400'
                                  }`}
                                >
                                  <option value="Pago">Pago</option>
                                  <option value="Pendente">Aberto</option>
                                </select>
                              </td>

                              {/* Valor */}
                              <td className="py-3 px-3 text-right">
                                <div
                                  className={`font-black font-mono text-sm ${
                                    isEntrada ? 'text-emerald-400' : 'text-red-400'
                                  }`}
                                >
                                  {isEntrada ? '+ ' : '- '}
                                  {formatMoedaPtBr(item.valor)}
                                </div>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 border-t border-[#1F2637] bg-[#121622] flex flex-row items-center justify-between shrink-0">
          <div className="text-xs text-slate-400">
            {itens.length > 0 && (
              <span>
                {estatisticas.qtdSelecionados} de {estatisticas.qtdTotal} selecionados para gravação
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isImporting}
              onClick={handleClose}
              className="bg-[#0B0E14] border-[#232A3B] text-slate-300 hover:bg-[#1A2234] hover:text-white text-xs h-9 px-4 rounded-xl"
            >
              Cancelar
            </Button>

            {itens.length > 0 && (
              <Button
                type="button"
                disabled={isImporting || estatisticas.qtdSelecionados === 0}
                onClick={handleConfirmarImportacao}
                className="bg-[#E63946] hover:bg-[#D62839] text-white font-bold text-xs h-9 px-5 rounded-xl shadow-lg shadow-[#E63946]/20 flex items-center gap-2 transition-all"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>
                      Importando{' '}
                      {importProgress ? `${importProgress.current}/${importProgress.total}` : ''}...
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirmar Importação ({estatisticas.qtdSelecionados})</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
