import React, { useState, useEffect } from 'react'
import {
  Settings as SettingsIcon,
  Users,
  Percent,
  Plus,
  Trash2,
  Edit2,
  Save,
  Loader2,
  Shield,
  ShieldAlert,
  Building2,
  UserCheck,
  UserPlus,
  KeyRound,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Palette,
  Bell,
  Check,
  Tag,
  AlertTriangle,
} from 'lucide-react'
import {
  ConfigService,
  CorretorService,
  UserService,
  CategoriaService,
} from '@/services/imobService'
import { Configuracoes, Corretor, SystemUser, CategoriaFinanceira, CategoriaTipo } from '@/types'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { useContasAlert } from '@/context/ContasAlertContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  const { user, isSocio } = useAuth()
  const { theme, setTheme, toggleTheme } = useTheme()
  const { soundEnabled, setSoundEnabled, toggleSound } = useContasAlert()

  const [activeTab, setActiveTab] = useState('usuarios')
  const [config, setConfig] = useState<Configuracoes | null>(null)
  const [corretores, setCorretores] = useState<Corretor[]>([])
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([])
  const [categorias, setCategorias] = useState<CategoriaFinanceira[]>([])
  const [loading, setLoading] = useState(true)

  // Config Form
  const [pctImob, setPctImob] = useState(50)
  const [pctCorr, setPctCorr] = useState(40)
  const [pctCapt, setPctCapt] = useState(10)
  const [pctPadrao, setPctPadrao] = useState(6)
  const [savingConfig, setSavingConfig] = useState(false)

  // Modal Corretor (Apenas Nomes para Vendas)
  const [isCorretorModalOpen, setIsCorretorModalOpen] = useState(false)
  const [editingCorretor, setEditingCorretor] = useState<Corretor | null>(null)
  const [cNome, setCNome] = useState('')
  const [cEmail, setCEmail] = useState('')
  const [cTelefone, setCTelefone] = useState('')
  const [cCreci, setCCreci] = useState('')
  const [cAtivo, setCAtivo] = useState(true)
  const [savingCorretor, setSavingCorretor] = useState(false)

  // Modal Categoria Financeira
  const [isCategoriaModalOpen, setIsCategoriaModalOpen] = useState(false)
  const [editingCategoria, setEditingCategoria] = useState<CategoriaFinanceira | null>(null)
  const [catNome, setCatNome] = useState('')
  const [catTipo, setCatTipo] = useState<CategoriaTipo>('saida')
  const [catCor, setCatCor] = useState('#E63946')
  const [catAtivo, setCatAtivo] = useState(true)
  const [savingCategoria, setSavingCategoria] = useState(false)

  // Modal Confirmação Exclusão Categoria
  const [isDeleteCatModalOpen, setIsDeleteCatModalOpen] = useState(false)
  const [deletingCategoria, setDeletingCategoria] = useState<CategoriaFinanceira | null>(null)
  const [catUsoCount, setCatUsoCount] = useState<{
    transacoes: number
    despesas: number
    total: number
  } | null>(null)
  const [checkingUso, setCheckingUso] = useState(false)
  const [deletingCatLoading, setDeletingCatLoading] = useState(false)

  // Modal Usuário do Sistema (Login Sócio / Secretaria)
  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null)
  const [uName, setUName] = useState('')
  const [uEmail, setUEmail] = useState('')
  const [uPassword, setUPassword] = useState('')
  const [uPerfil, setUPerfil] = useState<'socio' | 'secretaria'>('secretaria')
  const [savingUser, setSavingUser] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [cList, uConfig, uUsers, catList] = await Promise.all([
        CorretorService.getAll(),
        user ? ConfigService.getForUser(user.id) : null,
        isSocio ? UserService.getAll().catch(() => []) : Promise.resolve([]),
        CategoriaService.getAll().catch(() => []),
      ])
      setCorretores(cList)
      setSystemUsers(uUsers)
      setCategorias(catList)
      if (uConfig) {
        setConfig(uConfig)
        setPctImob(uConfig.percentual_imobiliaria)
        setPctCorr(uConfig.percentual_corretor)
        setPctCapt(uConfig.percentual_captador)
        setPctPadrao(uConfig.percentual_comissao_padrao)
      }
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar dados de configurações.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user, isSocio])

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

  // --- Usuários do Sistema Actions ---
  const handleOpenCreateUser = () => {
    setEditingUser(null)
    setUName('')
    setUEmail('')
    setUPassword('')
    setUPerfil('secretaria')
    setIsUserModalOpen(true)
  }

  const handleOpenEditUser = (u: SystemUser) => {
    setEditingUser(u)
    setUName(u.name || '')
    setUEmail(u.email || '')
    setUPassword('')
    setUPerfil((u.perfil as any) === 'socio' ? 'socio' : 'secretaria')
    setIsUserModalOpen(true)
  }

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uEmail.trim() || !uName.trim()) {
      toast.error('Nome e e-mail são obrigatórios.')
      return
    }

    if (!editingUser && (!uPassword || uPassword.length < 8)) {
      toast.error('A senha deve ter no mínimo 8 caracteres.')
      return
    }

    setSavingUser(true)
    try {
      if (editingUser) {
        await UserService.update(editingUser.id, {
          name: uName,
          email: uEmail,
          perfil: uPerfil,
          password: uPassword.trim() ? uPassword : undefined,
        })
        toast.success('Usuário atualizado com sucesso!')
      } else {
        await UserService.create({
          name: uName,
          email: uEmail,
          password: uPassword,
          perfil: uPerfil,
        })
        toast.success(`Usuário criado com perfil ${uPerfil === 'socio' ? 'Sócio' : 'Secretária'}!`)
      }
      setIsUserModalOpen(false)
      loadData()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao salvar usuário.')
    } finally {
      setSavingUser(false)
    }
  }

  const handleDeleteUser = async (u: SystemUser) => {
    if (u.id === user?.id) {
      toast.error('Você não pode excluir seu próprio usuário logado!')
      return
    }
    if (!confirm(`Deseja realmente remover o usuário "${u.name || u.email}"?`)) return
    try {
      await UserService.delete(u.id)
      toast.success('Usuário excluído com sucesso!')
      loadData()
    } catch (err) {
      toast.error('Erro ao excluir usuário.')
    }
  }

  // --- Corretor (Cadastros para Vendas) Actions ---
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

  // --- Categorias Financeiras Actions ---
  const handleOpenCreateCategoria = () => {
    setEditingCategoria(null)
    setCatNome('')
    setCatTipo('saida')
    setCatCor('#E63946')
    setCatAtivo(true)
    setIsCategoriaModalOpen(true)
  }

  const handleOpenEditCategoria = (c: CategoriaFinanceira) => {
    setEditingCategoria(c)
    setCatNome(c.nome)
    setCatTipo(c.tipo)
    setCatCor(c.cor || '#E63946')
    setCatAtivo(c.ativo)
    setIsCategoriaModalOpen(true)
  }

  const handleSaveCategoria = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!catNome.trim()) {
      toast.error('O nome da categoria é obrigatório.')
      return
    }

    setSavingCategoria(true)
    try {
      if (editingCategoria) {
        await CategoriaService.update(editingCategoria.id, {
          nome: catNome.trim(),
          tipo: catTipo,
          cor: catCor,
          ativo: catAtivo,
        })
        toast.success('Categoria atualizada com sucesso!')
      } else {
        await CategoriaService.create({
          nome: catNome.trim(),
          tipo: catTipo,
          cor: catCor,
          ativo: catAtivo,
        })
        toast.success('Categoria cadastrada com sucesso!')
      }
      setIsCategoriaModalOpen(false)
      loadData()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao salvar categoria.')
    } finally {
      setSavingCategoria(false)
    }
  }

  const handleOpenDeleteCategoria = async (cat: CategoriaFinanceira) => {
    setDeletingCategoria(cat)
    setCatUsoCount(null)
    setCheckingUso(true)
    setIsDeleteCatModalOpen(true)
    try {
      const uso = await CategoriaService.countUso(cat.nome)
      setCatUsoCount(uso)
    } catch (err) {
      console.error(err)
    } finally {
      setCheckingUso(false)
    }
  }

  const handleConfirmDeleteCategoria = async () => {
    if (!deletingCategoria) return
    setDeletingCatLoading(true)
    try {
      await CategoriaService.delete(deletingCategoria.id)
      toast.success('Categoria excluída com sucesso!')
      setIsDeleteCatModalOpen(false)
      setDeletingCategoria(null)
      loadData()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao excluir categoria.')
    } finally {
      setDeletingCatLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-[#E63946]" />
            Configurações do Sistema
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Gerenciamento de usuários e permissões, corretores, comissões, alertas e preferências
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-[#121722] border border-[#232A3B] p-1 h-auto flex flex-wrap gap-1 rounded-xl">
          <TabsTrigger
            value="usuarios"
            className="data-[state=active]:bg-[#E63946] data-[state=active]:text-white text-xs font-semibold px-4 py-2 rounded-lg gap-2 text-slate-300"
          >
            <Shield className="w-4 h-4" />
            <span>Usuários & Permissões</span>
          </TabsTrigger>
          <TabsTrigger
            value="categorias"
            className="data-[state=active]:bg-[#E63946] data-[state=active]:text-white text-xs font-semibold px-4 py-2 rounded-lg gap-2 text-slate-300"
          >
            <Tag className="w-4 h-4" />
            <span>Categorias Financeiras</span>
          </TabsTrigger>
          <TabsTrigger
            value="corretores"
            className="data-[state=active]:bg-[#E63946] data-[state=active]:text-white text-xs font-semibold px-4 py-2 rounded-lg gap-2 text-slate-300"
          >
            <Users className="w-4 h-4" />
            <span>Cadastros de Corretores</span>
          </TabsTrigger>
          {isSocio && (
            <TabsTrigger
              value="comissoes"
              className="data-[state=active]:bg-[#E63946] data-[state=active]:text-white text-xs font-semibold px-4 py-2 rounded-lg gap-2 text-slate-300"
            >
              <Percent className="w-4 h-4" />
              <span>Regras de Comissão</span>
            </TabsTrigger>
          )}
          <TabsTrigger
            value="preferencias"
            className="data-[state=active]:bg-[#E63946] data-[state=active]:text-white text-xs font-semibold px-4 py-2 rounded-lg gap-2 text-slate-300"
          >
            <Palette className="w-4 h-4" />
            <span>Aparência & Alertas</span>
          </TabsTrigger>
        </TabsList>

        {/* ============================================================== */}
        {/* ABA 1: USUÁRIOS E PERMISSÕES (SÓCIO VS SECRETARIA) */}
        {/* ============================================================== */}
        <TabsContent value="usuarios" className="space-y-4 pt-2">
          <div className="bg-[#121722] border border-[#232A3B] rounded-2xl p-5 shadow-lg space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#232A3B]">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#E63946]" />
                  Usuários com Acesso ao Sistema
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Crie acessos para <strong>Sócio</strong> (acesso completo) e{' '}
                  <strong>Secretária</strong> (apenas lançar vendas e despesas).
                </p>
              </div>

              {isSocio && (
                <Button
                  onClick={handleOpenCreateUser}
                  className="bg-[#E63946] hover:bg-[#D62839] text-white text-xs font-bold gap-1.5 h-9"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Novo Usuário</span>
                </Button>
              )}
            </div>

            {/* Informação sobre os perfis */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[#0B0E14] border border-[#232A3B] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/30">
                    Perfil: Sócio / Administrador
                  </span>
                  <Shield className="w-4 h-4 text-red-400" />
                </div>
                <p className="text-xs text-slate-300">
                  Tem <strong>poder total</strong> sobre o sistema. Visualiza e opera todos os
                  menus: Painel, Vendas, Comissões, Metas VGV, Fluxo de Caixa, Ranking de
                  Corretores, Notas Fiscais, Fechamento e Configurações.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#0B0E14] border border-[#232A3B] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    Perfil: Secretária
                  </span>
                  <UserCheck className="w-4 h-4 text-amber-400" />
                </div>
                <p className="text-xs text-slate-300">
                  Acesso focado na <strong>operação diária</strong>: lançar novas vendas, acompanhar
                  lançamentos e registrar despesas/receitas no Fluxo de Caixa. Menus estratégicos
                  ficam ocultos.
                </p>
              </div>
            </div>

            {/* Lista de Usuários */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Usuários Cadastrados ({systemUsers.length})
              </h4>

              <div className="divide-y divide-[#232A3B] border border-[#232A3B] rounded-xl overflow-hidden bg-[#0B0E14]">
                {systemUsers.map((u) => {
                  const isUserSocio = u.perfil === 'socio' || u.perfil === 'administrador'
                  return (
                    <div
                      key={u.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#1A1F2E]/40 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          <span className="font-bold text-white text-sm">
                            {u.name || 'Sem nome'}
                          </span>
                          {u.id === user?.id && (
                            <span className="text-[10px] bg-slate-700 text-slate-200 px-1.5 py-0.2 rounded font-semibold">
                              Você
                            </span>
                          )}
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              isUserSocio
                                ? 'bg-red-500/15 text-red-400 border border-red-500/25'
                                : 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                            }`}
                          >
                            {isUserSocio ? 'Sócio / Admin' : 'Secretária'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 flex items-center gap-2">
                          <span>{u.email}</span>
                          <span>•</span>
                          <span>
                            Menus:{' '}
                            {isUserSocio
                              ? 'Todos os menus liberados'
                              : 'Painel, Vendas e Fluxo de Caixa'}
                          </span>
                        </p>
                      </div>

                      {isSocio && (
                        <div className="flex items-center gap-1 self-end sm:self-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditUser(u)}
                            className="h-8 text-xs text-slate-300 hover:text-white hover:bg-[#1A2234] gap-1"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </Button>
                          {u.id !== user?.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteUser(u)}
                              className="h-8 text-xs text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}

                {systemUsers.length === 0 && (
                  <div className="p-8 text-center text-xs text-slate-400">
                    Carregando usuários do sistema...
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ============================================================== */}
        {/* ABA CATEGORIAS FINANCEIRAS (CRUD COMPLETO) */}
        {/* ============================================================== */}
        <TabsContent value="categorias" className="space-y-4 pt-2">
          <div className="bg-[#121722] border border-[#232A3B] rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#232A3B]">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Tag className="w-5 h-5 text-[#E63946]" />
                  Categorias Financeiras
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Gerencie as categorias de receitas e despesas disponíveis no Fluxo de Caixa e no
                  importador de extrato.
                </p>
              </div>

              <Button
                onClick={handleOpenCreateCategoria}
                className="bg-[#E63946] hover:bg-[#D62839] text-white text-xs font-bold gap-1.5 h-9"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Categoria</span>
              </Button>
            </div>

            {/* Tabela de Categorias */}
            <div className="divide-y divide-[#232A3B] border border-[#232A3B] rounded-xl overflow-hidden bg-[#0B0E14]">
              <div className="hidden sm:grid sm:grid-cols-12 gap-3 px-4 py-2.5 bg-[#121722] text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <span className="col-span-5">Nome da Categoria</span>
                <span className="col-span-3">Tipo de Lançamento</span>
                <span className="col-span-2">Status</span>
                <span className="col-span-2 text-right">Ações</span>
              </div>

              {categorias.map((cat) => {
                const tipoBadge =
                  cat.tipo === 'entrada'
                    ? {
                        label: 'Entrada (Receita)',
                        bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
                      }
                    : cat.tipo === 'saida'
                      ? {
                          label: 'Saída (Despesa)',
                          bg: 'bg-red-500/15 text-red-400 border-red-500/30',
                        }
                      : {
                          label: 'Ambos (Entrada/Saída)',
                          bg: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
                        }

                return (
                  <div
                    key={cat.id}
                    className="p-3.5 sm:px-4 sm:py-3 flex flex-col sm:grid sm:grid-cols-12 gap-2 sm:gap-3 sm:items-center hover:bg-[#1A1F2E]/40 transition-colors"
                  >
                    <div className="col-span-5 flex items-center gap-2.5">
                      <span
                        className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: cat.cor || '#E63946' }}
                      />
                      <span className="font-bold text-white text-sm truncate">{cat.nome}</span>
                    </div>

                    <div className="col-span-3 flex items-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${tipoBadge.bg}`}
                      >
                        {tipoBadge.label}
                      </span>
                    </div>

                    <div className="col-span-2 flex items-center">
                      {cat.ativo ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                          Ativa
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-500/20 text-slate-400 border border-slate-500/30">
                          Inativa
                        </span>
                      )}
                    </div>

                    <div className="col-span-2 flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEditCategoria(cat)}
                        className="h-8 text-xs text-slate-300 hover:text-white hover:bg-[#1A2234] gap-1"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Editar</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDeleteCategoria(cat)}
                        className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )
              })}

              {categorias.length === 0 && (
                <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                  <Tag className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="font-semibold text-slate-300">Nenhuma categoria cadastrada</p>
                  <p className="text-slate-500 text-[11px]">
                    Cadastre categorias personalizadas para classificar suas transações e despesas.
                    O sistema usará essas categorias nos formulários e no importador de extrato.
                  </p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ============================================================== */}
        {/* ABA 2: CADASTROS DE CORRETORES (APENAS NOMES, SEM LOGIN) */}
        {/* ============================================================== */}
        <TabsContent value="corretores" className="space-y-4 pt-2">
          <div className="bg-[#121722] border border-[#232A3B] rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#232A3B]">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-400" />
                  Cadastros de Corretores & Captadores
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Os corretores <strong>não possuem login</strong> no sistema. Estes nomes servem
                  exclusivamente para atribuição de vendas e cálculo de comissões/rankings.
                </p>
              </div>

              <Button
                onClick={handleOpenCreateCorretor}
                className="bg-[#0B0E14] border border-[#232A3B] hover:bg-[#1A2234] text-slate-200 text-xs h-9 px-3 gap-1.5"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Adicionar Corretor</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {corretores.map((c) => (
                <div
                  key={c.id}
                  className="p-3.5 rounded-xl bg-[#0B0E14] border border-[#232A3B] flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-100 text-sm truncate">{c.nome}</span>
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
                    <p className="text-[11px] text-slate-400 truncate">{c.email}</p>
                    {(c.telefone || c.creci) && (
                      <p className="text-[11px] text-slate-500">
                        {c.telefone && <span>Tel: {c.telefone} </span>}
                        {c.creci && <span>• CRECI: {c.creci}</span>}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-1 pt-2 border-t border-[#232A3B]/50">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEditCorretor(c)}
                      className="h-7 text-xs text-slate-400 hover:text-white"
                    >
                      <Edit2 className="w-3.5 h-3.5 mr-1" />
                      Editar
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
                <div className="col-span-full py-12 text-center text-xs text-slate-500">
                  Nenhum corretor cadastrado ainda. Clique em "Adicionar Corretor" para começar.
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ============================================================== */}
        {/* ABA 3: REGRAS DE COMISSÃO */}
        {/* ============================================================== */}
        {isSocio && (
          <TabsContent value="comissoes" className="space-y-4 pt-2">
            <div className="bg-[#121722] border border-[#232A3B] rounded-2xl p-5 shadow-lg max-w-2xl space-y-4">
              <div className="flex items-center gap-2.5 pb-4 border-b border-[#232A3B]">
                <div className="w-8 h-8 rounded-lg bg-[#E63946]/15 flex items-center justify-center text-[#E63946]">
                  <Percent className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Divisão Padrão de Comissões</h3>
                  <p className="text-xs text-slate-400">
                    Distribuição automática aplicada ao cadastrar vendas
                  </p>
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
          </TabsContent>
        )}

        {/* ============================================================== */}
        {/* ABA 4: APARÊNCIA & ALERTAS SONOROS */}
        {/* ============================================================== */}
        <TabsContent value="preferencias" className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Tema */}
            <div className="bg-[#121722] border border-[#232A3B] rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-[#232A3B]">
                <Palette className="w-5 h-5 text-[#E63946]" />
                <div>
                  <h3 className="font-bold text-white text-base">Aparência do Sistema</h3>
                  <p className="text-xs text-slate-400">
                    Escolha entre o tema Escuro moderno ou Claro
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`p-4 rounded-xl border flex flex-col items-center gap-2 text-center transition-all ${
                    theme === 'dark'
                      ? 'border-[#E63946] bg-[#E63946]/10 text-white shadow-lg'
                      : 'border-[#232A3B] bg-[#0B0E14] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Moon className="w-6 h-6 text-amber-400" />
                  <span className="text-xs font-bold">Tema Escuro</span>
                  <span className="text-[10px] text-slate-400">Destaque vermelho ImobGestor</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`p-4 rounded-xl border flex flex-col items-center gap-2 text-center transition-all ${
                    theme === 'light'
                      ? 'border-[#E63946] bg-[#E63946]/10 text-white shadow-lg'
                      : 'border-[#232A3B] bg-[#0B0E14] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sun className="w-6 h-6 text-amber-400" />
                  <span className="text-xs font-bold">Tema Claro</span>
                  <span className="text-[10px] text-slate-400">Fundo claro com boa leitura</span>
                </button>
              </div>
            </div>

            {/* Alertas Sonoros de Contas Vencidas */}
            <div className="bg-[#121722] border border-[#232A3B] rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-[#232A3B]">
                <Bell className="w-5 h-5 text-[#E63946]" />
                <div>
                  <h3 className="font-bold text-white text-base">Alerta de Contas Vencidas</h3>
                  <p className="text-xs text-slate-400">
                    Aviso sonoro para despesas que passaram do vencimento
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#0B0E14] border border-[#232A3B] flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {soundEnabled ? (
                      <Volume2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <VolumeX className="w-4 h-4 text-slate-500" />
                    )}
                    <span className="text-xs font-bold text-white">Som de Alerta</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {soundEnabled
                      ? 'Toca um aviso sonoro ao identificar contas vencidas pendentes.'
                      : 'Alerta sonoro silenciado. Notificações visuais continuam ativas.'}
                  </p>
                </div>

                <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal Criar / Editar Usuário do Sistema */}
      <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
        <DialogContent className="bg-[#121722] border-[#232A3B] text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#E63946]" />
              {editingUser ? 'Editar Usuário & Perfil' : 'Criar Novo Usuário'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Defina as credenciais de login e as permissões de acesso ao sistema.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveUser} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nome do Usuário *
              </label>
              <Input
                type="text"
                placeholder="Ex: Ana Paula ou Carlos Gestor"
                value={uName}
                onChange={(e) => setUName(e.target.value)}
                className="bg-[#0B0E14] border-[#232A3B] text-xs h-9 text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                E-mail de Login *
              </label>
              <Input
                type="email"
                placeholder="usuario@imobiliaria.com"
                value={uEmail}
                onChange={(e) => setUEmail(e.target.value)}
                className="bg-[#0B0E14] border-[#232A3B] text-xs h-9 text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {editingUser
                  ? 'Nova Senha (deixe em branco para manter)'
                  : 'Senha de Acesso (mínimo 8 caracteres) *'}
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={uPassword}
                onChange={(e) => setUPassword(e.target.value)}
                className="bg-[#0B0E14] border-[#232A3B] text-xs h-9 text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Tipo de Perfil / Permissões *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setUPerfil('socio')}
                  className={`p-3 rounded-xl border flex flex-col items-start text-left gap-1 transition-all ${
                    uPerfil === 'socio'
                      ? 'border-[#E63946] bg-[#E63946]/15 text-white'
                      : 'border-[#232A3B] bg-[#0B0E14] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="text-xs font-bold text-red-400">Sócio (Poder Total)</span>
                  <span className="text-[10px] text-slate-400">
                    Acesso a todos os menus e configurações
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setUPerfil('secretaria')}
                  className={`p-3 rounded-xl border flex flex-col items-start text-left gap-1 transition-all ${
                    uPerfil === 'secretaria'
                      ? 'border-amber-500 bg-amber-500/15 text-white'
                      : 'border-[#232A3B] bg-[#0B0E14] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="text-xs font-bold text-amber-400">Secretária</span>
                  <span className="text-[10px] text-slate-400">
                    Lançar vendas e despesas/receitas
                  </span>
                </button>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsUserModalOpen(false)}
                className="bg-transparent border-[#232A3B] text-slate-300"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={savingUser}
                className="bg-[#E63946] hover:bg-[#D62839] text-white font-bold"
              >
                {savingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Usuário'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Criar / Editar Categoria Financeira */}
      <Dialog open={isCategoriaModalOpen} onOpenChange={setIsCategoriaModalOpen}>
        <DialogContent className="bg-[#121722] border-[#232A3B] text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <Tag className="w-5 h-5 text-[#E63946]" />
              {editingCategoria ? 'Editar Categoria' : 'Nova Categoria'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              {editingCategoria
                ? 'Atualize os dados e o tipo de aplicação da categoria.'
                : 'Defina o nome e em quais tipos de lançamentos ela será usada.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCategoria} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nome da Categoria *
              </label>
              <Input
                type="text"
                placeholder="Ex: Aluguel, Combustível, Assessoria Jurídica"
                value={catNome}
                onChange={(e) => setCatNome(e.target.value)}
                required
                className="bg-[#0B0E14] border-[#232A3B] text-xs h-9 text-slate-100 placeholder:text-slate-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Tipo de Lançamento *
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setCatTipo('saida')}
                  className={`p-2.5 rounded-xl border flex flex-col items-center text-center gap-1 transition-all ${
                    catTipo === 'saida'
                      ? 'border-red-500 bg-red-500/15 text-white'
                      : 'border-[#232A3B] bg-[#0B0E14] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="text-xs font-bold text-red-400">Saída</span>
                  <span className="text-[10px] text-slate-400">Despesas</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCatTipo('entrada')}
                  className={`p-2.5 rounded-xl border flex flex-col items-center text-center gap-1 transition-all ${
                    catTipo === 'entrada'
                      ? 'border-emerald-500 bg-emerald-500/15 text-white'
                      : 'border-[#232A3B] bg-[#0B0E14] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="text-xs font-bold text-emerald-400">Entrada</span>
                  <span className="text-[10px] text-slate-400">Receitas</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCatTipo('ambos')}
                  className={`p-2.5 rounded-xl border flex flex-col items-center text-center gap-1 transition-all ${
                    catTipo === 'ambos'
                      ? 'border-blue-500 bg-blue-500/15 text-white'
                      : 'border-[#232A3B] bg-[#0B0E14] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="text-xs font-bold text-blue-400">Ambos</span>
                  <span className="text-[10px] text-slate-400">Entrada/Saída</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Cor de Destaque
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={catCor}
                  onChange={(e) => setCatCor(e.target.value)}
                  className="w-9 h-9 rounded-lg border border-[#232A3B] bg-[#0B0E14] cursor-pointer p-0.5"
                />
                <div className="flex flex-wrap gap-1.5">
                  {[
                    '#E63946',
                    '#2A9D8F',
                    '#E76F51',
                    '#457B9D',
                    '#F4A261',
                    '#9B5DE5',
                    '#00BBF9',
                  ].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCatCor(c)}
                      className={`w-6 h-6 rounded-full border transition-all ${
                        catCor.toLowerCase() === c.toLowerCase()
                          ? 'border-white scale-110 shadow-md'
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#0B0E14] border border-[#232A3B] flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-200">Categoria Ativa</p>
                <p className="text-[11px] text-slate-400">
                  Visível nos selects de novas transações e despesas
                </p>
              </div>
              <Switch checked={catAtivo} onCheckedChange={setCatAtivo} />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCategoriaModalOpen(false)}
                className="bg-transparent border-[#232A3B] text-slate-300"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={savingCategoria}
                className="bg-[#E63946] hover:bg-[#D62839] text-white font-bold"
              >
                {savingCategoria ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Salvar Categoria'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmação de Exclusão de Categoria com aviso de lançamentos vinculados */}
      <Dialog open={isDeleteCatModalOpen} onOpenChange={setIsDeleteCatModalOpen}>
        <DialogContent className="bg-[#121722] border-[#232A3B] text-slate-100 max-w-md p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Excluir Categoria
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-300 mt-2">
              Tem certeza que deseja excluir permanentemente a categoria{' '}
              <strong className="text-white">"{deletingCategoria?.nome}"</strong>?
            </DialogDescription>
          </DialogHeader>

          {checkingUso ? (
            <div className="py-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#E63946]" />
              <span>Verificando lançamentos vinculados...</span>
            </div>
          ) : catUsoCount && catUsoCount.total > 0 ? (
            <div className="my-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Aviso de vínculos existentes ({catUsoCount.total} lançamento(s))</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Esta categoria está associada a{' '}
                <strong>{catUsoCount.transacoes} transação(ões)</strong> e{' '}
                <strong>{catUsoCount.despesas} despesa(s)</strong>.
              </p>
              <p className="text-slate-400 text-[11px]">
                A exclusão <strong>não apagará</strong> seus lançamentos existentes; o histórico
                permanecerá registrado com o nome anterior.
              </p>
            </div>
          ) : (
            <p className="my-2 text-xs text-slate-400">
              Nenhum lançamento vinculado atualmente a esta categoria.
            </p>
          )}

          <DialogFooter className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={deletingCatLoading}
              onClick={() => setIsDeleteCatModalOpen(false)}
              className="bg-transparent border-[#232A3B] text-slate-300 hover:bg-[#1A2234]"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={deletingCatLoading}
              onClick={handleConfirmDeleteCategoria}
              className="bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              {deletingCatLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Excluir Categoria'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Adicionar / Editar Corretor */}
      <Dialog open={isCorretorModalOpen} onOpenChange={setIsCorretorModalOpen}>
        <DialogContent className="bg-[#121722] border-[#232A3B] text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-[#E63946]" />
              {editingCorretor ? 'Editar Corretor' : 'Cadastrar Novo Corretor'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Dados do profissional para vinculação em vendas e repasses (sem login).
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
