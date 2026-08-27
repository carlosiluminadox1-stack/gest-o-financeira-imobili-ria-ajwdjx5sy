import React, { useState, useEffect, useMemo } from 'react'
import {
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  MoreVertical,
  Trash2,
  Edit2,
  TrendingUp,
  Building,
  User,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
} from 'lucide-react'
import { VendaService, CorretorService, ConfigService } from '@/services/imobService'
import { Venda, Corretor, VendaStatus, Configuracoes } from '@/types'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'

export default function Vendas() {
  const { user } = useAuth()
  const { periodo, getPeriodoDates } = usePeriodo()
  const [vendas, setVendas] = useState<Venda[]>([])
  const [corretores, setCorretores] = useState<Corretor[]>([])
  const [config, setConfig] = useState<Configuracoes | null>(null)
  const [loading, setLoading] = useState(true)

  // Filtros & Busca
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('todos')
  const [sortField, setSortField] = useState<'data_venda' | 'valor_vgv'>('data_venda')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // Modal Nova Venda / Edição
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingVenda, setEditingVenda] = useState<Venda | null>(null)
  const [saving, setSaving] = useState(false)

  // Campos do formulário
  const [formTitulo, setFormTitulo] = useState('')
  const [formCliente, setFormCliente] = useState('')
  const [formCorretor, setFormCorretor] = useState('')
  const [formCaptador, setFormCaptador] = useState('')
  const [formVgv, setFormVgv] = useState<number | ''>('')
  const [formPctComissao, setFormPctComissao] = useState<number>(6)
  const [formDataVenda, setFormDataVenda] = useState(new Date().toISOString().split('T')[0])
  const [formStatus, setFormStatus] = useState<VendaStatus>('realizada')
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Modal Exclusão
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [vList, cList, userConfig] = await Promise.all([
        VendaService.getAll(),
        CorretorService.getAll(),
        user ? ConfigService.getForUser(user.id) : null,
      ])
      setVendas(vList)
      setCorretores(cList)
      setConfig(userConfig)
      if (userConfig?.percentual_comissao_padrao) {
        setFormPctComissao(userConfig.percentual_comissao_padrao)
      }
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar vendas.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user])

  const { start, end } = useMemo(() => getPeriodoDates(periodo), [periodo, getPeriodoDates])

  // Filtragem e ordenação
  const filteredVendas = useMemo(() => {
    return vendas
      .filter((v) => {
        // Período
        const d = new Date(v.data_venda)
        if (d < start || d > end) return false

        // Status
        if (statusFilter !== 'todos' && v.status !== statusFilter) return false

        // Busca
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase()
          const matchTitulo = v.titulo_imovel.toLowerCase().includes(term)
          const matchCliente = v.cliente?.toLowerCase().includes(term)
          const matchCorretor = v.expand?.corretor?.nome?.toLowerCase().includes(term)
          return matchTitulo || matchCliente || matchCorretor
        }
        return true
      })
      .sort((a, b) => {
        if (sortField === 'data_venda') {
          const da = new Date(a.data_venda).getTime()
          const db = new Date(b.data_venda).getTime()
          return sortDirection === 'asc' ? da - db : db - da
        } else {
          return sortDirection === 'asc' ? a.valor_vgv - b.valor_vgv : b.valor_vgv - a.valor_vgv
        }
      })
  }, [vendas, start, end, statusFilter, searchTerm, sortField, sortDirection])

  // Cálculo prévia da divisão ao vivo
  const vgvNumber = typeof formVgv === 'number' ? formVgv : 0
  const valorComissaoPreview = (vgvNumber * formPctComissao) / 100

  const pctImob = config?.percentual_imobiliaria ?? 50
  const hasCaptador = Boolean(formCaptador && formCaptador.trim().length > 0)
  const pctCorr = hasCaptador ? (config?.percentual_corretor ?? 40) : 100 - pctImob
  const pctCapt = hasCaptador ? (config?.percentual_captador ?? 10) : 0

  const valImob = (valorComissaoPreview * pctImob) / 100
  const valCorr = (valorComissaoPreview * pctCorr) / 100
  const valCapt = hasCaptador ? (valorComissaoPreview * pctCapt) / 100 : 0

  const handleOpenCreateModal = () => {
    setEditingVenda(null)
    setFormTitulo('')
    setFormCliente('')
    setFormCorretor(corretores.find((c) => c.ativo)?.id || '')
    setFormCaptador('')
    setFormVgv('')
    setFormPctComissao(config?.percentual_comissao_padrao ?? 6)
    setFormDataVenda(new Date().toISOString().split('T')[0])
    setFormStatus('realizada')
    setFormErrors({})
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (venda: Venda) => {
    setEditingVenda(venda)
    setFormTitulo(venda.titulo_imovel)
    setFormCliente(venda.cliente || '')
    setFormCorretor(venda.corretor)
    setFormCaptador(venda.captador || '')
    setFormVgv(venda.valor_vgv)
    setFormPctComissao(venda.percentual_comissao)
    setFormDataVenda(new Date(venda.data_venda).toISOString().split('T')[0])
    setFormStatus(venda.status)
    setFormErrors({})
    setIsModalOpen(true)
  }

  const validateForm = () => {
    const errs: Record<string, string> = {}
    if (!formTitulo.trim()) errs.titulo = 'Título do imóvel é obrigatório'
    if (!formCorretor) errs.corretor = 'Selecione um corretor'
    if (!formVgv || Number(formVgv) <= 0) errs.vgv = 'Informe um valor de VGV válido'
    if (!formPctComissao || formPctComissao <= 0) errs.comissao = 'Informe o percentual'
    if (!formDataVenda) errs.data = 'Informe a data da venda'
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSaveVenda = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm() || !user) return

    setSaving(true)
    try {
      const dataIso = new Date(formDataVenda + 'T12:00:00Z').toISOString()

      if (editingVenda) {
        await VendaService.update(
          editingVenda.id,
          {
            titulo_imovel: formTitulo,
            cliente: formCliente,
            corretor: formCorretor,
            captador: formCaptador || undefined,
            valor_vgv: Number(formVgv),
            percentual_comissao: formPctComissao,
            data_venda: dataIso,
            status: formStatus,
          },
          user.id,
        )
        toast.success('Venda atualizada com sucesso!')
      } else {
        await VendaService.create({
          titulo_imovel: formTitulo,
          cliente: formCliente,
          corretor: formCorretor,
          captador: formCaptador || undefined,
          valor_vgv: Number(formVgv),
          percentual_comissao: formPctComissao,
          data_venda: dataIso,
          status: formStatus,
          userId: user.id,
        })
        toast.success('Venda cadastrada e comissões geradas automaticamente!')
      }
      setIsModalOpen(false)
      loadData()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || 'Erro ao salvar venda.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await VendaService.delete(deleteId)
      toast.success('Venda e comissões pendentes excluídas com sucesso!')
      setDeleteId(null)
      loadData()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao excluir venda.')
    } finally {
      setDeleting(false)
    }
  }

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const getStatusBadge = (st: VendaStatus) => {
    switch (st) {
      case 'realizada':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> Realizada
          </span>
        )
      case 'pendente':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3" /> Pendente
          </span>
        )
      case 'cancelada':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/20">
            <XCircle className="w-3 h-3" /> Cancelada
          </span>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Gestão de Vendas & VGV</h2>
          <p className="text-xs text-slate-400">
            Acompanhe negócios fechados e divisões de comissão em tempo real
          </p>
        </div>
        <Button
          onClick={handleOpenCreateModal}
          className="bg-[#E63946] hover:bg-[#D62839] text-white font-semibold text-xs h-10 px-4 rounded-xl shadow-lg shadow-[#E63946]/20 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>+ Nova Venda</span>
        </Button>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-[#121722] border border-[#232A3B] rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-md">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            type="text"
            placeholder="Buscar por imóvel, cliente ou corretor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-[#0B0E14] border-[#232A3B] pl-9 text-xs text-slate-100 placeholder:text-slate-500 h-9"
          />
        </div>

        <div className="flex items-center gap-2.5 overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center bg-[#0B0E14] border border-[#232A3B] rounded-lg p-1 text-xs">
            {['todos', 'realizada', 'pendente', 'cancelada'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-md capitalize font-medium transition-all ${
                  statusFilter === st
                    ? 'bg-[#E63946] text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st === 'todos' ? 'Todos' : st}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              if (sortField === 'data_venda') {
                setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
              } else {
                setSortField('data_venda')
                setSortDirection('desc')
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B0E14] border border-[#232A3B] text-xs text-slate-300 hover:bg-[#1A2234]"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {sortField === 'data_venda'
                ? `Data (${sortDirection === 'desc' ? 'Recentes' : 'Antigas'})`
                : 'Ordenar por Data'}
            </span>
          </button>
        </div>
      </div>

      {/* Vendas Table */}
      <div className="bg-[#121722] border border-[#232A3B] rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#232A3B] bg-[#0E121B] text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Imóvel & Cliente</th>
                <th className="py-3.5 px-4">Corretor / Captador</th>
                <th className="py-3.5 px-4 text-right">VGV</th>
                <th className="py-3.5 px-4 text-center">% Com.</th>
                <th className="py-3.5 px-4 text-right">Comissão Total</th>
                <th className="py-3.5 px-4">Data</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#232A3B]">
              {filteredVendas.map((v) => (
                <tr key={v.id} className="hover:bg-[#1A2234]/50 transition-colors">
                  <td className="py-3.5 px-4 max-w-[240px]">
                    <div className="font-semibold text-slate-100 truncate">{v.titulo_imovel}</div>
                    <div className="text-[11px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                      <User className="w-3 h-3 text-slate-500" />
                      {v.cliente || 'Cliente não informado'}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-slate-200">
                      {v.expand?.corretor?.nome || 'Corretor'}
                    </div>
                    {v.expand?.captador && (
                      <div className="text-[11px] text-amber-400/90 font-medium">
                        Captador: {v.expand.captador.nome}
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-white tabular-nums">
                    {formatCurrency(v.valor_vgv)}
                  </td>
                  <td className="py-3.5 px-4 text-center font-medium text-slate-300">
                    {v.percentual_comissao}%
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-emerald-400 tabular-nums">
                    {formatCurrency(v.valor_comissao)}
                  </td>
                  <td className="py-3.5 px-4 text-slate-400">
                    {new Date(v.data_venda).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="py-3.5 px-4 text-center">{getStatusBadge(v.status)}</td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEditModal(v)}
                        className="h-7 w-7 text-slate-400 hover:text-white hover:bg-[#1A2234]"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(v.id)}
                        className="h-7 w-7 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredVendas.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Building className="w-8 h-8 text-slate-600" />
                      <p className="font-medium">
                        Nenhuma venda encontrada para os filtros atuais.
                      </p>
                      <p className="text-[11px] text-slate-600">
                        Clique no botão "+ Nova Venda" para registrar uma transação.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Cadastro / Edição com Prévia de Divisão ao Vivo */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-[#121722] border-[#232A3B] text-slate-100 max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#E63946]" />
              {editingVenda ? 'Editar Venda' : 'Cadastrar Nova Venda'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Preencha os dados da negociação. As comissões serão calculadas automaticamente.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveVenda} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Título do Imóvel *
              </label>
              <Input
                type="text"
                placeholder="Ex: Apartamento Jardins 180m² - Ed. Bauhaus"
                value={formTitulo}
                onChange={(e) => setFormTitulo(e.target.value)}
                className="bg-[#0B0E14] border-[#232A3B] text-xs h-9 text-slate-100"
              />
              {formErrors.titulo && (
                <p className="text-[11px] text-red-400 mt-0.5">{formErrors.titulo}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nome do Cliente / Comprador
              </label>
              <Input
                type="text"
                placeholder="Ex: Roberto Silveira"
                value={formCliente}
                onChange={(e) => setFormCliente(e.target.value)}
                className="bg-[#0B0E14] border-[#232A3B] text-xs h-9 text-slate-100"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Corretor Responsável *
                </label>
                <select
                  value={formCorretor}
                  onChange={(e) => setFormCorretor(e.target.value)}
                  className="w-full bg-[#0B0E14] border border-[#232A3B] text-slate-100 text-xs rounded-lg h-9 px-2.5 outline-none focus:border-[#E63946]"
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
                {formErrors.corretor && (
                  <p className="text-[11px] text-red-400 mt-0.5">{formErrors.corretor}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Captador do Imóvel (Opcional)
                </label>
                <select
                  value={formCaptador}
                  onChange={(e) => setFormCaptador(e.target.value)}
                  className="w-full bg-[#0B0E14] border border-[#232A3B] text-slate-100 text-xs rounded-lg h-9 px-2.5 outline-none focus:border-[#E63946]"
                >
                  <option value="">Nenhum captador adicional</option>
                  {corretores
                    .filter((c) => c.ativo)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Valor do VGV (R$) *
                </label>
                <Input
                  type="number"
                  placeholder="Ex: 1200000"
                  value={formVgv}
                  onChange={(e) => setFormVgv(e.target.value ? Number(e.target.value) : '')}
                  className="bg-[#0B0E14] border-[#232A3B] text-xs h-9 text-slate-100"
                />
                {formErrors.vgv && (
                  <p className="text-[11px] text-red-400 mt-0.5">{formErrors.vgv}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  % Comissão Total *
                </label>
                <Input
                  type="number"
                  step="0.5"
                  value={formPctComissao}
                  onChange={(e) => setFormPctComissao(Number(e.target.value))}
                  className="bg-[#0B0E14] border-[#232A3B] text-xs h-9 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Data da Venda *
                </label>
                <Input
                  type="date"
                  value={formDataVenda}
                  onChange={(e) => setFormDataVenda(e.target.value)}
                  className="bg-[#0B0E14] border-[#232A3B] text-xs h-9 text-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Status da Venda
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'realizada', label: 'Realizada', color: 'emerald' },
                  { id: 'pendente', label: 'Pendente', color: 'amber' },
                  { id: 'cancelada', label: 'Cancelada', color: 'red' },
                ].map((st) => (
                  <button
                    type="button"
                    key={st.id}
                    onClick={() => setFormStatus(st.id as VendaStatus)}
                    className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                      formStatus === st.id
                        ? 'bg-[#E63946]/20 border-[#E63946] text-white'
                        : 'bg-[#0B0E14] border-[#232A3B] text-slate-400 hover:bg-[#1A2234]'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Preview Box of Commission Distribution */}
            <div className="p-3.5 rounded-xl bg-[#0B0E14] border border-[#232A3B] space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-200 uppercase tracking-wider text-[10px]">
                  Prévia da Divisão de Comissão
                </span>
                <span className="font-bold text-emerald-400 text-sm">
                  {formatCurrency(valorComissaoPreview)}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 rounded-lg bg-[#121722] border border-[#232A3B]">
                  <p className="text-[10px] text-slate-400 font-semibold">
                    Imobiliária ({pctImob}%)
                  </p>
                  <p className="font-bold text-white mt-0.5">{formatCurrency(valImob)}</p>
                </div>
                <div className="p-2 rounded-lg bg-[#121722] border border-[#232A3B]">
                  <p className="text-[10px] text-slate-400 font-semibold">Corretor ({pctCorr}%)</p>
                  <p className="font-bold text-white mt-0.5">{formatCurrency(valCorr)}</p>
                </div>
                <div className="p-2 rounded-lg bg-[#121722] border border-[#232A3B]">
                  <p className="text-[10px] text-slate-400 font-semibold">Captador ({pctCapt}%)</p>
                  <p className="font-bold text-white mt-0.5">{formatCurrency(valCapt)}</p>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="bg-transparent border-[#232A3B] text-slate-300 hover:bg-[#1A2234]"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-[#E63946] hover:bg-[#D62839] text-white font-bold"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Salvando...
                  </>
                ) : editingVenda ? (
                  'Salvar Alterações'
                ) : (
                  'Cadastrar Venda'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmação de Exclusão */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="bg-[#121722] border-[#232A3B] text-slate-100 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              Excluir Venda
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Tem certeza de que deseja excluir este registro? Apenas vendas com comissões pendentes
              podem ser excluídas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteId(null)}
              className="bg-transparent border-[#232A3B] text-slate-300"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleting}
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 font-semibold"
            >
              {deleting ? 'Excluindo...' : 'Confirmar Exclusão'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
