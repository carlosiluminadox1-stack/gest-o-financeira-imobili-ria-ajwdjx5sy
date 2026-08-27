import React, { useState, useEffect, useMemo } from 'react'
import {
  FileText,
  Plus,
  Search,
  Filter,
  Eye,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  Building,
  User,
  Calendar,
  DollarSign,
  Receipt,
  Download,
  Loader2,
  X,
} from 'lucide-react'
import { NotaFiscalService, VendaService } from '@/services/imobService'
import { NotaFiscal, Venda, NotaFiscalStatus } from '@/types'
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

export default function NotasFiscais() {
  const { user } = useAuth()
  const { periodo, getPeriodoDates } = usePeriodo()
  const [notas, setNotas] = useState<NotaFiscal[]>([])
  const [vendas, setVendas] = useState<Venda[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('todos')

  // Drawer Lateral de Detalhes da Nota
  const [selectedNota, setSelectedNota] = useState<NotaFiscal | null>(null)

  // Modal Nova NF Manual
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formNumero, setFormNumero] = useState('')
  const [formVenda, setFormVenda] = useState('')
  const [formCliente, setFormCliente] = useState('')
  const [formValor, setFormValor] = useState<number | ''>('')
  const [formTaxa, setFormTaxa] = useState<number>(6)
  const [formDataEmissao, setFormDataEmissao] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)

  // Cancelar NF
  const [cancelId, setCancelId] = useState<string | null>(null)
  const [canceling, setCanceling] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [nList, vList] = await Promise.all([NotaFiscalService.getAll(), VendaService.getAll()])
      setNotas(nList)
      setVendas(vList)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar notas fiscais.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const { start, end } = useMemo(() => getPeriodoDates(periodo), [periodo, getPeriodoDates])

  const filteredNotas = useMemo(() => {
    return notas.filter((n) => {
      const d = new Date(n.data_emissao)
      if (d < start || d > end) return false

      if (statusFilter !== 'todos' && n.status !== statusFilter) return false

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase()
        const matchNum = n.numero.toLowerCase().includes(term)
        const matchCli = n.cliente.toLowerCase().includes(term)
        const matchVen = n.expand?.venda?.titulo_imovel?.toLowerCase().includes(term)
        return matchNum || matchCli || matchVen
      }
      return true
    })
  }, [notas, start, end, statusFilter, searchTerm])

  // Resumo
  const totalImpostosPeriodo = useMemo(() => {
    return filteredNotas
      .filter((n) => n.status === 'emitida')
      .reduce((sum, n) => sum + (n.valor_imposto || 0), 0)
  }, [filteredNotas])

  const totalEmitidasCount = useMemo(() => {
    return filteredNotas.filter((n) => n.status === 'emitida').length
  }, [filteredNotas])

  const valorComissaoForm = typeof formValor === 'number' ? formValor : 0
  const valorImpostoPreview = (valorComissaoForm * formTaxa) / 100

  const handleOpenCreate = () => {
    setFormNumero('')
    setFormVenda('')
    setFormCliente('')
    setFormValor('')
    setFormTaxa(6)
    setFormDataEmissao(new Date().toISOString().split('T')[0])
    setIsModalOpen(true)
  }

  const handleSelectVenda = (vendaId: string) => {
    setFormVenda(vendaId)
    const selected = vendas.find((v) => v.id === vendaId)
    if (selected) {
      setFormCliente(selected.cliente || '')
      // Sugerir comissão da imobiliária (50% do total)
      setFormValor(selected.valor_comissao * 0.5)
    }
  }

  const handleSaveNF = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formCliente.trim() || !formValor || Number(formValor) <= 0 || !user) {
      toast.error('Preencha os campos obrigatórios.')
      return
    }

    setSaving(true)
    try {
      await NotaFiscalService.create({
        numero: formNumero,
        venda: formVenda || undefined,
        cliente: formCliente,
        valor: Number(formValor),
        taxa: formTaxa,
        data_emissao: new Date(formDataEmissao + 'T12:00:00Z').toISOString(),
        userId: user.id,
      })
      toast.success('Nota Fiscal emitida com sucesso!')
      setIsModalOpen(false)
      loadData()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || 'Erro ao emitir nota fiscal.')
    } finally {
      setSaving(false)
    }
  }

  const handleCancelNF = async () => {
    if (!cancelId) return
    setCanceling(true)
    try {
      await NotaFiscalService.cancel(cancelId)
      toast.success('Nota Fiscal cancelada!')
      setCancelId(null)
      if (selectedNota?.id === cancelId) {
        setSelectedNota(null)
      }
      loadData()
    } catch (err) {
      toast.error('Erro ao cancelar nota fiscal.')
    } finally {
      setCanceling(false)
    }
  }

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Notas Fiscais & Gestão de Impostos (6%)
          </h2>
          <p className="text-xs text-slate-400">
            Cálculo automatizado do Simples Nacional sobre comissões de corretagem
          </p>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="bg-[#E63946] hover:bg-[#D62839] text-white font-semibold text-xs h-10 px-4 rounded-xl shadow-lg shadow-[#E63946]/20 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>+ Nova Nota Fiscal</span>
        </Button>
      </div>

      {/* 2 Cartões Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Total de Impostos 6% */}
        <div className="bg-[#121722] border border-[#232A3B] rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Imposto Retido (6%)
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#E63946]/15 flex items-center justify-center text-red-400">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-red-400 tracking-tight">
            {formatCurrency(totalImpostosPeriodo)}
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Impostos provisionados sobre faturamento no período
          </p>
        </div>

        {/* NFs Emitidas */}
        <div className="bg-[#121722] border border-[#232A3B] rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Notas Emitidas no Período
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white tracking-tight">
            {totalEmitidasCount}{' '}
            <span className="text-sm font-semibold text-slate-400">documentos</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Geradas automaticamente no recebimento ou avulsas
          </p>
        </div>
      </div>

      {/* Toolbar Filtros */}
      <div className="bg-[#121722] border border-[#232A3B] rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-md">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            type="text"
            placeholder="Buscar por número NF, cliente ou venda..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-[#0B0E14] border-[#232A3B] pl-9 text-xs text-slate-100 placeholder:text-slate-500 h-9"
          />
        </div>

        <div className="flex items-center bg-[#0B0E14] border border-[#232A3B] rounded-lg p-1 text-xs">
          {['todos', 'emitida', 'cancelada'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-md capitalize font-medium transition-all ${
                statusFilter === st
                  ? 'bg-[#E63946] text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {st === 'todos' ? 'Todas' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela de Notas Fiscais */}
      <div className="bg-[#121722] border border-[#232A3B] rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#232A3B] bg-[#0E121B] text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Número da NF</th>
                <th className="py-3.5 px-4">Cliente / Tomador</th>
                <th className="py-3.5 px-4">Venda Vinculada</th>
                <th className="py-3.5 px-4 text-right">Valor Bruto</th>
                <th className="py-3.5 px-4 text-center">Taxa</th>
                <th className="py-3.5 px-4 text-right">Imposto (6%)</th>
                <th className="py-3.5 px-4">Emissão</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#232A3B]">
              {filteredNotas.map((nf) => (
                <tr key={nf.id} className="hover:bg-[#1A2234]/50 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-red-400">{nf.numero}</td>
                  <td className="py-3.5 px-4 font-medium text-slate-100">{nf.cliente}</td>
                  <td className="py-3.5 px-4 text-slate-400 max-w-[200px] truncate">
                    {nf.expand?.venda?.titulo_imovel || 'Avulsa / Não vinculada'}
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-white tabular-nums">
                    {formatCurrency(nf.valor)}
                  </td>
                  <td className="py-3.5 px-4 text-center font-semibold text-slate-400">
                    {nf.taxa}%
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-red-400 tabular-nums">
                    {formatCurrency(nf.valor_imposto)}
                  </td>
                  <td className="py-3.5 px-4 text-slate-400">
                    {new Date(nf.data_emissao).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {nf.status === 'emitida' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                        <CheckCircle2 className="w-3 h-3" /> Emitida
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/15 text-red-400 border border-red-500/25">
                        <XCircle className="w-3 h-3" /> Cancelada
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedNota(nf)}
                      className="bg-[#0B0E14] border-[#232A3B] text-slate-300 hover:text-white hover:bg-[#1A2234] text-xs h-7 px-2.5 gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Detalhes</span>
                    </Button>
                  </td>
                </tr>
              ))}

              {filteredNotas.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    Nenhuma nota fiscal encontrada no período.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer Lateral com Detalhes da Nota e Cálculo Destacado */}
      {selectedNota && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedNota(null)}
          />

          <div className="relative w-full max-w-md bg-[#0E121B] border-l border-[#232A3B] h-full z-10 shadow-2xl p-6 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
            <div>
              {/* Header Drawer */}
              <div className="flex items-center justify-between pb-4 border-b border-[#232A3B]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#E63946]/15 flex items-center justify-center text-[#E63946]">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Espelho da Nota Fiscal</h3>
                    <p className="text-xs text-slate-400 font-mono">{selectedNota.numero}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedNota(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#1A2234]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Badge */}
              <div className="my-4 flex items-center justify-between">
                <span className="text-xs text-slate-400">Situação Cadastral:</span>
                {selectedNota.status === 'emitida' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Emitida & Ativa
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/15 text-red-400">
                    <XCircle className="w-3.5 h-3.5" /> Cancelada
                  </span>
                )}
              </div>

              {/* Detalhes Cadastrais */}
              <div className="space-y-3 bg-[#121722] border border-[#232A3B] rounded-xl p-4 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">
                    Tomador do Serviço (Cliente):
                  </span>
                  <span className="font-semibold text-white text-sm">{selectedNota.cliente}</span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Venda Relacionada:</span>
                  <span className="text-slate-200">
                    {selectedNota.expand?.venda?.titulo_imovel || 'Serviço Avulso'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Data de Emissão:</span>
                  <span className="text-slate-200">
                    {new Date(selectedNota.data_emissao).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>

              {/* Destaque do Cálculo do Imposto em Vermelho */}
              <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-red-500/10 to-red-500/5 border border-[#E63946]/30 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300 font-medium">Valor Bruto do Serviço:</span>
                  <span className="font-bold text-white text-sm">
                    {formatCurrency(selectedNota.valor)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300 font-medium">Alíquota Simples Nacional:</span>
                  <span className="font-bold text-red-400">{selectedNota.taxa}%</span>
                </div>

                <div className="pt-2 border-t border-red-500/20 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                    Total Imposto Devido:
                  </span>
                  <span className="text-lg font-black text-[#E63946] tabular-nums">
                    {formatCurrency(selectedNota.valor_imposto)}
                  </span>
                </div>
              </div>
            </div>

            {/* Ações do Drawer */}
            <div className="pt-6 border-t border-[#232A3B] space-y-2">
              {selectedNota.status === 'emitida' && (
                <Button
                  variant="destructive"
                  onClick={() => setCancelId(selectedNota.id)}
                  className="w-full bg-red-600 hover:bg-red-700 text-xs font-semibold h-9"
                >
                  Cancelar Esta Nota Fiscal
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setSelectedNota(null)}
                className="w-full bg-[#121722] border-[#232A3B] text-slate-300 hover:bg-[#1A2234] text-xs h-9"
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova NF Manual */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-[#121722] border-[#232A3B] text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#E63946]" />
              Emitir Nova Nota Fiscal
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Lançamento para comissões recebidas ou serviços imobiliários avulsos.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveNF} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Vincular a uma Venda Realizada (Opcional)
              </label>
              <select
                value={formVenda}
                onChange={(e) => handleSelectVenda(e.target.value)}
                className="w-full bg-[#0B0E14] border border-[#232A3B] text-slate-100 text-xs rounded-lg h-9 px-2.5 outline-none focus:border-[#E63946]"
              >
                <option value="">Nenhuma venda vinculada (Avulsa)</option>
                {vendas.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.titulo_imovel} - {formatCurrency(v.valor_vgv)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nome do Cliente / Empresa Tomadora *
              </label>
              <Input
                type="text"
                placeholder="Ex: Construtora Alfa Ltda"
                value={formCliente}
                onChange={(e) => setFormCliente(e.target.value)}
                className="bg-[#0B0E14] border-[#232A3B] text-xs h-9 text-slate-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Valor dos Serviços (R$) *
                </label>
                <Input
                  type="number"
                  placeholder="Ex: 36000"
                  value={formValor}
                  onChange={(e) => setFormValor(e.target.value ? Number(e.target.value) : '')}
                  className="bg-[#0B0E14] border-[#232A3B] text-xs h-9 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Taxa (%)</label>
                <Input
                  type="number"
                  value={formTaxa}
                  onChange={(e) => setFormTaxa(Number(e.target.value))}
                  className="bg-[#0B0E14] border-[#232A3B] text-xs h-9 text-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Data de Emissão
              </label>
              <Input
                type="date"
                value={formDataEmissao}
                onChange={(e) => setFormDataEmissao(e.target.value)}
                className="bg-[#0B0E14] border-[#232A3B] text-xs h-9 text-slate-100"
              />
            </div>

            {/* Prévia ao vivo do imposto */}
            <div className="p-3 rounded-xl bg-[#0B0E14] border border-[#232A3B] flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Imposto Calculado (6%):</span>
                <span className="font-bold text-white">{formTaxa}% sobre faturamento</span>
              </div>
              <span className="font-black text-red-400 text-base">
                {formatCurrency(valorImpostoPreview)}
              </span>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="bg-transparent border-[#232A3B] text-slate-300"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-[#E63946] hover:bg-[#D62839] text-white font-bold"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Emitir Nota Fiscal'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Cancelar NF */}
      <Dialog open={!!cancelId} onOpenChange={() => setCancelId(null)}>
        <DialogContent className="bg-[#121722] border-[#232A3B] text-slate-100 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Cancelar Nota Fiscal
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Tem certeza que deseja marcar esta nota fiscal como cancelada?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCancelId(null)}
              className="bg-transparent border-[#232A3B] text-slate-300"
            >
              Voltar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={canceling}
              onClick={handleCancelNF}
              className="bg-red-600 hover:bg-red-700"
            >
              {canceling ? 'Cancelando...' : 'Confirmar Cancelamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
