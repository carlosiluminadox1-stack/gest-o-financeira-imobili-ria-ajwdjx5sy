import React, { useState, useEffect, useMemo } from 'react'
import {
  Target,
  Plus,
  Calendar,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Edit2,
  Trash2,
  Loader2,
  Award,
  Sparkles,
} from 'lucide-react'
import { MetaService, VendaService } from '@/services/imobService'
import { MetaVGV, Venda, MetaPeriodo } from '@/types'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts'

export default function MetasVGV() {
  const { user } = useAuth()
  const [metas, setMetas] = useState<MetaVGV[]>([])
  const [vendas, setVendas] = useState<Venda[]>([])
  const [loading, setLoading] = useState(true)

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingMeta, setEditingMeta] = useState<MetaVGV | null>(null)
  const [saving, setSaving] = useState(false)

  // Form
  const [formTitulo, setFormTitulo] = useState('')
  const [formPeriodo, setFormPeriodo] = useState<MetaPeriodo>('mensal')
  const [formDataInicio, setFormDataInicio] = useState('')
  const [formDataFim, setFormDataFim] = useState('')
  const [formValor, setFormValor] = useState<number | ''>('')
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Exclusão
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const [mList, vList] = await Promise.all([MetaService.getAll(), VendaService.getAll()])
      setMetas(mList)
      setVendas(vList)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar metas.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Auto-fill datas ao alterar período
  const handlePeriodoChange = (periodo: MetaPeriodo) => {
    setFormPeriodo(periodo)
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()

    let startD = new Date()
    let endD = new Date()

    if (periodo === 'mensal') {
      startD = new Date(year, month, 1)
      endD = new Date(year, month + 1, 0)
    } else if (periodo === 'trimestral') {
      const qStart = Math.floor(month / 3) * 3
      startD = new Date(year, qStart, 1)
      endD = new Date(year, qStart + 3, 0)
    } else if (periodo === 'semestral') {
      const sStart = month < 6 ? 0 : 6
      startD = new Date(year, sStart, 1)
      endD = new Date(year, sStart + 6, 0)
    } else if (periodo === 'anual') {
      startD = new Date(year, 0, 1)
      endD = new Date(year, 11, 31)
    }

    setFormDataInicio(startD.toISOString().split('T')[0])
    setFormDataFim(endD.toISOString().split('T')[0])
  }

  const handleOpenCreate = () => {
    setEditingMeta(null)
    setFormTitulo('')
    setFormPeriodo('mensal')
    handlePeriodoChange('mensal')
    setFormValor('')
    setFormErrors({})
    setIsModalOpen(true)
  }

  const handleOpenEdit = (meta: MetaVGV) => {
    setEditingMeta(meta)
    setFormTitulo(meta.titulo)
    setFormPeriodo(meta.periodo)
    setFormDataInicio(new Date(meta.data_inicio).toISOString().split('T')[0])
    setFormDataFim(new Date(meta.data_fim).toISOString().split('T')[0])
    setFormValor(meta.valor_meta)
    setFormErrors({})
    setIsModalOpen(true)
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!formTitulo.trim()) errs.titulo = 'Título é obrigatório'
    if (!formValor || Number(formValor) <= 0) errs.valor = 'Informe um valor de meta válido'
    if (!formDataInicio) errs.inicio = 'Data início obrigatória'
    if (!formDataFim) errs.fim = 'Data fim obrigatória'
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate() || !user) return

    setSaving(true)
    try {
      const payload = {
        titulo: formTitulo,
        periodo: formPeriodo,
        data_inicio: new Date(formDataInicio + 'T00:00:00Z').toISOString(),
        data_fim: new Date(formDataFim + 'T23:59:59Z').toISOString(),
        valor_meta: Number(formValor),
        user: user.id,
      }

      if (editingMeta) {
        await MetaService.update(editingMeta.id, payload)
        toast.success('Meta atualizada!')
      } else {
        await MetaService.create(payload)
        toast.success('Meta criada com sucesso!')
      }
      setIsModalOpen(false)
      loadData()
    } catch (err: any) {
      console.error(err)
      toast.error('Erro ao salvar meta.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await MetaService.delete(deleteId)
      toast.success('Meta excluída!')
      setDeleteId(null)
      loadData()
    } catch (err) {
      toast.error('Erro ao excluir meta.')
    }
  }

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  // Calcular realização de cada meta
  const metasComProgresso = useMemo(() => {
    return metas.map((m) => {
      const startD = new Date(m.data_inicio)
      const endD = new Date(m.data_fim)

      const realizado = vendas
        .filter((v) => {
          if (v.status !== 'realizada') return false
          const vd = new Date(v.data_venda)
          return vd >= startD && vd <= endD
        })
        .reduce((sum, v) => sum + (v.valor_vgv || 0), 0)

      const percentual = m.valor_meta > 0 ? (realizado / m.valor_meta) * 100 : 0

      let statusInfo = { label: 'Atenção', color: 'red', badgeClass: 'bg-red-500/20 text-red-400' }
      if (percentual >= 100) {
        statusInfo = {
          label: 'Atingida',
          color: 'emerald',
          badgeClass: 'bg-emerald-500/20 text-emerald-400',
        }
      } else if (percentual >= 70) {
        statusInfo = {
          label: 'Em progresso',
          color: 'amber',
          badgeClass: 'bg-amber-500/20 text-amber-400',
        }
      }

      return {
        ...m,
        realizado,
        percentual,
        statusInfo,
      }
    })
  }, [metas, vendas])

  // Gráfico: Evolução do VGV Acumulado x Metas
  const chartEvolucaoData = useMemo(() => {
    const months = []
    const now = new Date()

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
      const monthLabel = d
        .toLocaleString('pt-BR', { month: 'short' })
        .toUpperCase()
        .replace('.', '')

      const totalVgv = vendas
        .filter((v) => {
          if (v.status !== 'realizada') return false
          const vd = new Date(v.data_venda)
          return vd >= d && vd <= mEnd
        })
        .reduce((sum, v) => sum + (v.valor_vgv || 0), 0)

      // Meta mensal equivalente
      const metaMensal = metas.find((m) => m.periodo === 'mensal')?.valor_meta || 2500000

      months.push({
        month: monthLabel,
        vgv: totalVgv,
        meta: metaMensal,
      })
    }
    return months
  }, [vendas, metas])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Metas de VGV</h2>
          <p className="text-xs text-slate-400">
            Acompanhe o desempenho de vendas contra os objetivos mensais, trimestrais e anuais
          </p>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="bg-[#E63946] hover:bg-[#D62839] text-white font-semibold text-xs h-10 px-4 rounded-xl shadow-lg shadow-[#E63946]/20 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>+ Nova Meta</span>
        </Button>
      </div>

      {/* Grid de Cartões de Metas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {metasComProgresso.map((meta) => {
          return (
            <div
              key={meta.id}
              className="bg-[#121722] border border-[#232A3B] rounded-2xl p-5 shadow-lg flex flex-col justify-between group hover:border-[#E63946]/50 transition-all relative overflow-hidden"
            >
              {/* Header do Card */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="inline-block uppercase tracking-wider text-[10px] font-bold text-red-400 mb-1">
                      Meta {meta.periodo}
                    </span>
                    <h3 className="font-bold text-white text-base group-hover:text-red-400 transition-colors">
                      {meta.titulo}
                    </h3>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${meta.statusInfo.badgeClass}`}
                  >
                    {meta.statusInfo.label}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-2 mb-4">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>
                    {new Date(meta.data_inicio).toLocaleDateString('pt-BR')} até{' '}
                    {new Date(meta.data_fim).toLocaleDateString('pt-BR')}
                  </span>
                </div>

                {/* Barra de Progresso */}
                <div className="space-y-1.5 my-3">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-300">Progresso de Realização</span>
                    <span
                      className={`font-bold ${
                        meta.percentual >= 100
                          ? 'text-emerald-400'
                          : meta.percentual >= 70
                            ? 'text-amber-400'
                            : 'text-red-400'
                      }`}
                    >
                      {meta.percentual.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-[#0B0E14] rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        meta.percentual >= 100
                          ? 'bg-emerald-500'
                          : meta.percentual >= 70
                            ? 'bg-amber-500'
                            : 'bg-[#E63946]'
                      }`}
                      style={{ width: `${Math.min(meta.percentual, 100)}%` }}
                    />
                  </div>{' '}
                </div>

                {/* Valores */}
                <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-[#0B0E14] border border-[#232A3B] text-xs mt-4">
                  <div>
                    <p className="text-[10px] text-slate-400 font-semibold">VGV Realizado</p>
                    <p className="font-bold text-emerald-400 mt-0.5">
                      {formatCurrency(meta.realizado)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 font-semibold">Objetivo / Meta</p>
                    <p className="font-bold text-white mt-0.5">{formatCurrency(meta.valor_meta)}</p>
                  </div>
                </div>
              </div>

              {/* Ações do Card */}
              <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-[#232A3B]">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenEdit(meta)}
                  className="h-8 text-xs text-slate-400 hover:text-white hover:bg-[#1A2234]"
                >
                  <Edit2 className="w-3.5 h-3.5 mr-1" /> Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteId(meta.id)}
                  className="h-8 text-xs text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Excluir
                </Button>
              </div>
            </div>
          )
        })}

        {metasComProgresso.length === 0 && (
          <div className="col-span-full py-12 text-center bg-[#121722] border border-[#232A3B] rounded-2xl">
            <Target className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-300">Nenhuma meta configurada ainda.</p>
            <p className="text-xs text-slate-500 mt-1">
              Crie metas mensais ou anuais para motivar a equipe e acompanhar atingimentos.
            </p>
          </div>
        )}
      </div>

      {/* Gráfico de Linha Comparativo: Evolução x Metas */}
      <div className="bg-[#121722] border border-[#232A3B] rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-white text-base">Evolução do VGV vs. Meta</h3>
            <p className="text-xs text-slate-400">
              Acompanhe a curva de crescimento das vendas realizadas contra o plano traçado
            </p>
          </div>
          <TrendingUp className="w-5 h-5 text-emerald-400" />
        </div>

        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartEvolucaoData}
              margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#232A3B" vertical={false} />
              <XAxis dataKey="month" stroke="#64748B" fontSize={11} tickLine={false} />
              <YAxis
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                tickFormatter={(v) =>
                  v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : `${v / 1000}k`
                }
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0E121B',
                  borderColor: '#232A3B',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#fff',
                }}
                formatter={(val: any) => [formatCurrency(Number(val)), '']}
              />
              <Legend
                wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                formatter={(val) => (val === 'vgv' ? 'VGV Realizado' : 'Meta Prevista')}
              />
              <Line
                type="monotone"
                dataKey="vgv"
                stroke="#E63946"
                strokeWidth={3}
                dot={{ r: 5, fill: '#E63946' }}
                activeDot={{ r: 7 }}
              />
              <Line
                type="monotone"
                dataKey="meta"
                stroke="#FBBF24"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 4, fill: '#FBBF24' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Modal Nova / Editar Meta */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-[#121722] border-[#232A3B] text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-[#E63946]" />
              {editingMeta ? 'Editar Meta de VGV' : 'Criar Nova Meta de VGV'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Defina o objetivo financeiro de vendas para o período selecionado.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Título da Meta *
              </label>
              <Input
                type="text"
                placeholder="Ex: Meta Mensal — Outubro / Expansão Jardins"
                value={formTitulo}
                onChange={(e) => setFormTitulo(e.target.value)}
                className="bg-[#0B0E14] border-[#232A3B] text-xs h-9 text-slate-100"
              />
              {formErrors.titulo && (
                <p className="text-[11px] text-red-400 mt-0.5">{formErrors.titulo}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Período</label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['mensal', 'trimestral', 'semestral', 'anual'] as MetaPeriodo[]).map((p) => (
                  <button
                    type="button"
                    key={p}
                    onClick={() => handlePeriodoChange(p)}
                    className={`py-1.5 text-xs capitalize font-medium rounded-lg border transition-all ${
                      formPeriodo === p
                        ? 'bg-[#E63946] border-[#E63946] text-white font-bold'
                        : 'bg-[#0B0E14] border-[#232A3B] text-slate-400 hover:bg-[#1A2234]'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Data de Início *
                </label>
                <Input
                  type="date"
                  value={formDataInicio}
                  onChange={(e) => setFormDataInicio(e.target.value)}
                  className="bg-[#0B0E14] border-[#232A3B] text-xs h-9 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Data de Fim *
                </label>
                <Input
                  type="date"
                  value={formDataFim}
                  onChange={(e) => setFormDataFim(e.target.value)}
                  className="bg-[#0B0E14] border-[#232A3B] text-xs h-9 text-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Valor da Meta (VGV em R$) *
              </label>
              <Input
                type="number"
                placeholder="Ex: 2500000"
                value={formValor}
                onChange={(e) => setFormValor(e.target.value ? Number(e.target.value) : '')}
                className="bg-[#0B0E14] border-[#232A3B] text-xs h-9 text-slate-100"
              />
              {formErrors.valor && (
                <p className="text-[11px] text-red-400 mt-0.5">{formErrors.valor}</p>
              )}
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
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Meta'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Exclusão */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="bg-[#121722] border-[#232A3B] text-slate-100 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-red-400" />
              Excluir Meta
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Tem certeza que deseja remover esta meta?
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
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
