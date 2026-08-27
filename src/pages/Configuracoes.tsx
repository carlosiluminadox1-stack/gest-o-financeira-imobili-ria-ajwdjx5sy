import React, { useState, useEffect } from 'react'
import {
  Settings as SettingsIcon,
  Users,
  Percent,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Save,
  Loader2,
  ShieldAlert,
  Building2,
  UserCheck,
} from 'lucide-react'
import { ConfigService, CorretorService } from '@/services/imobService'
import { Configuracoes, Corretor } from '@/types'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

export default function ConfiguracoesPage() {
  const { user } = useAuth()
  const [config, setConfig] = useState<Configuracoes | null>(null)
  const [corretores, setCorretores] = useState<Corretor[]>([])
  const [loading, setLoading] = useState(true)

  // Config Form
  const [pctImob, setPctImob] = useState(50)
  const [pctCorr, setPctCorr] = useState(40)
  const [pctCapt, setPctCapt] = useState(10)
  const [pctPadrao, setPctPadrao] = useState(6)
  const [savingConfig, setSavingConfig] = useState(false)

  // Modal Corretor
  const [isCorretorModalOpen, setIsCorretorModalOpen] = useState(false)
  const [editingCorretor, setEditingCorretor] = useState<Corretor | null>(null)
  const [cNome, setCNome] = useState('')
  const [cEmail, setCEmail] = useState('')
  const [cTelefone, setCTelefone] = useState('')
  const [cCreci, setCCreci] = useState('')
  const [cAtivo, setCAtivo] = useState(true)
  const [savingCorretor, setSavingCorretor] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [cList, uConfig] = await Promise.all([
        CorretorService.getAll(),
        user ? ConfigService.getForUser(user.id) : null,
      ])
      setCorretores(cList)
      if (uConfig) {
        setConfig(uConfig)
        setPctImob(uConfig.percentual_imobiliaria)
        setPctCorr(uConfig.percentual_corretor)
        setPctCapt(uConfig.percentual_captador)
        setPctPadrao(uConfig.percentual_comissao_padrao)
      }
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar configurações.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user])

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (pctImob + pctCorr + pctCapt !== 100) {
      toast.error(
        `A soma das divisões deve ser exatamente 100%! Atualmente está em ${
          pctImob + pctCorr + pctCapt
        }%.`,
      )
      return
    }

    setSavingConfig(true)
    try {
      const updated = await ConfigService.saveForUser(user.id, {
        percentual_imobiliaria: pctImob,
        percentual_corretor: pctCorr,
        percentual_captador: pctCapt,
        percentual_comissao_padrao: pctPadrao,
      })
      setConfig(updated)
      toast.success('Regras de divisão de comissão salvas com sucesso!')
    } catch (err) {
      toast.error('Erro ao salvar configurações.')
    } finally {
      setSavingConfig(false)
    }
  }

  // Corretor Actions
  const handleOpenCreateCorretor = () => {
    setEditingCorretor(null)
    setCNome('')
    setCEmail('')
    setCTelefone('')
    setCCreci('')
    setCAtivo(true)
    setIsCorretorModalOpen(true)
  }

  const handleOpenEditCorretor = (c: Corretor) => {
    setEditingCorretor(c)
    setCNome(c.nome)
    setCEmail(c.email)
    setCTelefone(c.telefone || '')
    setCCreci(c.creci || '')
    setCAtivo(c.ativo)
    setIsCorretorModalOpen(true)
  }

  const handleSaveCorretor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cNome.trim() || !cEmail.trim()) {
      toast.error('Nome e e-mail são obrigatórios.')
      return
    }

    setSavingCorretor(true)
    try {
      if (editingCorretor) {
        await CorretorService.update(editingCorretor.id, {
          nome: cNome,
          email: cEmail,
          telefone: cTelefone,
          creci: cCreci,
          ativo: cAtivo,
        })
        toast.success('Corretor atualizado!')
      } else {
        await CorretorService.create({
          nome: cNome,
          email: cEmail,
          telefone: cTelefone,
          creci: cCreci,
          ativo: cAtivo,
        })
        toast.success('Corretor cadastrado!')
      }
      setIsCorretorModalOpen(false)
      loadData()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao salvar corretor.')
    } finally {
      setSavingCorretor(false)
    }
  }

  const handleDeleteCorretor = async (id: string) => {
    if (!confirm('Deseja realmente remover este corretor?')) return
    try {
      await CorretorService.delete(id)
      toast.success('Corretor removido com sucesso!')
      loadData()
    } catch (err) {
      toast.error('Erro ao excluir corretor.')
    }
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">
          Configurações da Imobiliária
        </h2>
        <p className="text-xs text-slate-400">
          Defina as regras padrão de repasse de comissões e gerencie sua equipe de corretores
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bloco 1: Divisão Padrão de Comissões */}
        <div className="bg-[#121722] border border-[#232A3B] rounded-2xl p-5 shadow-lg">
          <div className="flex items-center gap-2.5 pb-4 border-b border-[#232A3B] mb-4">
            <div className="w-8 h-8 rounded-lg bg-[#E63946]/15 flex items-center justify-center text-[#E63946]">
              <Percent className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Divisão Automática de Comissão</h3>
              <p className="text-xs text-slate-400">Distribuição aplicada ao cadastrar vendas</p>
            </div>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-300">Parte da Imobiliária (%):</span>
                  <span className="text-red-400 font-bold">{pctImob}%</span>
                </div>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={pctImob}
                  onChange={(e) => setPctImob(Number(e.target.value))}
                  className="bg-[#0B0E14] border-[#232A3B] text-xs h-9 text-slate-100"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-300">Parte do Corretor Fechador (%):</span>
                  <span className="text-blue-400 font-bold">{pctCorr}%</span>
                </div>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={pctCorr}
                  onChange={(e) => setPctCorr(Number(e.target.value))}
                  className="bg-[#0B0E14] border-[#232A3B] text-xs h-9 text-slate-100"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-300">Parte do Captador (%):</span>
                  <span className="text-amber-400 font-bold">{pctCapt}%</span>
                </div>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={pctCapt}
                  onChange={(e) => setPctCapt(Number(e.target.value))}
                  className="bg-[#0B0E14] border-[#232A3B] text-xs h-9 text-slate-100"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-300">% Padrão de Comissão por Venda:</span>
                  <span className="text-white font-bold">{pctPadrao}%</span>
                </div>
                <Input
                  type="number"
                  step="0.5"
                  value={pctPadrao}
                  onChange={(e) => setPctPadrao(Number(e.target.value))}
                  className="bg-[#0B0E14] border-[#232A3B] text-xs h-9 text-slate-100"
                />
              </div>
            </div>

            {/* Total Validation Indicator */}
            <div
              className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold ${
                pctImob + pctCorr + pctCapt === 100
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}
            >
              <span>Total da Distribuição:</span>
              <span className="text-sm font-bold">{pctImob + pctCorr + pctCapt}%</span>
            </div>

            <Button
              type="submit"
              disabled={savingConfig}
              className="w-full bg-[#E63946] hover:bg-[#D62839] text-white font-bold text-xs h-9 rounded-lg"
            >
              {savingConfig ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Salvar Regras de Comissão'
              )}
            </Button>
          </form>
        </div>

        {/* Bloco 2: Gestão de Corretores */}
        <div className="bg-[#121722] border border-[#232A3B] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#232A3B] mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Equipe de Corretores</h3>
                  <p className="text-xs text-slate-400">{corretores.length} profissionais</p>
                </div>
              </div>

              <Button
                size="sm"
                onClick={handleOpenCreateCorretor}
                className="bg-[#0B0E14] border border-[#232A3B] hover:bg-[#1A2234] text-slate-200 text-xs h-8 px-2.5 gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-red-400" />
                <span>Adicionar</span>
              </Button>
            </div>

            <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
              {corretores.map((c) => (
                <div
                  key={c.id}
                  className="p-3 rounded-xl bg-[#0B0E14] border border-[#232A3B] flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-100">{c.nome}</span>
                      {c.ativo ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400">
                          Ativo
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-500/20 text-slate-400">
                          Inativo
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {c.email} {c.creci ? `• CRECI ${c.creci}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEditCorretor(c)}
                      className="h-7 w-7 text-slate-400 hover:text-white"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteCorretor(c.id)}
                      className="h-7 w-7 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}

              {corretores.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-500">
                  Nenhum corretor cadastrado ainda.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Adicionar / Editar Corretor */}
      <Dialog open={isCorretorModalOpen} onOpenChange={setIsCorretorModalOpen}>
        <DialogContent className="bg-[#121722] border-[#232A3B] text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-[#E63946]" />
              {editingCorretor ? 'Editar Corretor' : 'Cadastrar Novo Corretor'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Dados do profissional para vinculação em vendas e repasses.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCorretor} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nome Completo *
              </label>
              <Input
                type="text"
                placeholder="Ex: Mariana Albuquerque"
                value={cNome}
                onChange={(e) => setCNome(e.target.value)}
                className="bg-[#0B0E14] border-[#232A3B] text-xs h-9 text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">E-mail *</label>
              <Input
                type="email"
                placeholder="mariana@imobiliaria.com"
                value={cEmail}
                onChange={(e) => setCEmail(e.target.value)}
                className="bg-[#0B0E14] border-[#232A3B] text-xs h-9 text-slate-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Telefone</label>
                <Input
                  type="text"
                  placeholder="(11) 98765-4321"
                  value={cTelefone}
                  onChange={(e) => setCTelefone(e.target.value)}
                  className="bg-[#0B0E14] border-[#232A3B] text-xs h-9 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">CRECI</label>
                <Input
                  type="text"
                  placeholder="Ex: 12345-F"
                  value={cCreci}
                  onChange={(e) => setCCreci(e.target.value)}
                  className="bg-[#0B0E14] border-[#232A3B] text-xs h-9 text-slate-100"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#0B0E14] border border-[#232A3B] flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-200">Corretor Ativo</p>
                <p className="text-[11px] text-slate-400">Disponível nos selects de novas vendas</p>
              </div>
              <Switch checked={cAtivo} onCheckedChange={setCAtivo} />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCorretorModalOpen(false)}
                className="bg-transparent border-[#232A3B] text-slate-300"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={savingCorretor}
                className="bg-[#E63946] hover:bg-[#D62839] text-white font-bold"
              >
                {savingCorretor ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Corretor'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
