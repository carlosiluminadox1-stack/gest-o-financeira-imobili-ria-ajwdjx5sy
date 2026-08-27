import React, { useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  BadgePercent,
  TrendingUp,
  Target,
  ArrowLeftRight,
  Trophy,
  FileText,
  Lock,
  Settings,
  LogOut,
  Building2,
  Menu,
  X,
  UserCheck,
  ChevronDown,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { usePeriodo } from '@/context/PeriodoContext'
import { PeriodoGlobal } from '@/types'
import { PeriodoSelector } from '@/components/PeriodoSelector'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

const NAV_ITEMS = [
  { path: '/painel', label: 'Painel', icon: LayoutDashboard },
  { path: '/vendas', label: 'Vendas', icon: TrendingUp },
  { path: '/comissoes', label: 'Comissões', icon: BadgePercent },
  { path: '/metas', label: 'Metas VGV', icon: Target },
  { path: '/fluxo', label: 'Fluxo de Caixa', icon: ArrowLeftRight },
  { path: '/ranking', label: 'Ranking', icon: Trophy },
  { path: '/notas', label: 'Notas Fiscais', icon: FileText },
  { path: '/fechamento', label: 'Fechamento', icon: Lock },
]

const PAGE_TITLES: Record<string, string> = {
  '/painel': 'Painel Geral',
  '/vendas': 'Gestão de Vendas',
  '/comissoes': 'Controle de Comissões',
  '/metas': 'Metas de VGV',
  '/fluxo': 'Fluxo de Caixa & Despesas',
  '/ranking': 'Ranking de Corretores',
  '/notas': 'Notas Fiscais & Impostos (6%)',
  '/fechamento': 'Fechamento Mensal',
  '/configuracoes': 'Configurações do Sistema',
}

export default function Layout() {
  const { user, logout } = useAuth()
  const { periodo, setPeriodo } = usePeriodo()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)

  const currentPageTitle = PAGE_TITLES[location.pathname] || 'ImobGestor'

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const getInitials = (name?: string) => {
    if (!name) return 'IG'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  const periodoLabels: Record<PeriodoGlobal, string> = {
    mes: 'Mês atual',
    trimestre: 'Trimestre atual',
    semestre: 'Semestre atual',
    ano: 'Ano atual',
  }

  return (
    <div className="min-h-screen bg-[#0B0E14] text-slate-100 flex">
      {/* Desktop Sidebar (fixed 260px) */}
      <aside className="hidden md:flex flex-col w-[260px] fixed top-0 bottom-0 left-0 bg-[#0E121B] border-r border-[#232A3B] z-30 select-none">
        {/* Brand Header */}
        <div className="p-5 border-b border-[#232A3B] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E63946] to-[#F97316] flex items-center justify-center shadow-lg shadow-[#E63946]/20">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-white tracking-tight leading-none flex items-center gap-1.5">
              Imob<span className="text-[#E63946]">Gestor</span>
            </h1>
            <p className="text-[11px] text-slate-400 mt-1 font-medium tracking-wide">
              Gestão Financeira
            </p>
          </div>
        </div>

        {/* Menu Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                  isActive
                    ? 'bg-[#E63946]/15 text-red-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#1A1F2E]'
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-[#E63946] rounded-r-full" />
                )}
                <Icon
                  className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-[#E63946]' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        {/* Footer Navigation */}
        <div className="p-3 border-t border-[#232A3B] space-y-1">
          <NavLink
            to="/configuracoes"
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              location.pathname === '/configuracoes'
                ? 'bg-[#E63946]/15 text-red-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#1A1F2E]'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Configurações</span>
          </NavLink>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all text-left"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col md:ml-[260px] min-h-screen bg-[#0B0E14]">
        {/* Desktop Header (64px) */}
        <header className="hidden md:flex h-16 sticky top-0 z-20 bg-[#0B0E14]/90 backdrop-blur-md border-b border-[#232A3B] px-6 items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">{currentPageTitle}</h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Seletor Global de Período */}
            <PeriodoSelector variant="desktop" />

            {/* User Profile Avatar Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2.5 p-1 rounded-full hover:ring-2 hover:ring-[#E63946]/50 transition-all outline-none">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#E63946] to-[#F97316] flex items-center justify-center text-white text-xs font-bold shadow-md">
                    {getInitials(user?.name)}
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 bg-[#121722] border-[#232A3B] text-slate-200"
              >
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-semibold text-white leading-none">
                      {user?.name || 'Sócio Gestor'}
                    </p>
                    <p className="text-xs text-slate-400 leading-none">{user?.email}</p>
                    <span className="inline-flex mt-1.5 w-fit items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-500/15 text-red-400 border border-red-500/20">
                      Sócio / Administrador
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-[#232A3B]" />
                <DropdownMenuItem
                  onClick={() => navigate('/configuracoes')}
                  className="cursor-pointer hover:bg-[#1A2234] focus:bg-[#1A2234] text-xs gap-2"
                >
                  <Settings className="w-3.5 h-3.5 text-slate-400" />
                  Configurações
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[#232A3B]" />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer hover:bg-red-500/10 focus:bg-red-500/10 text-red-400 text-xs gap-2"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sair do sistema
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Mobile Header (≤640px) */}
        <header className="md:hidden h-14 sticky top-0 z-30 bg-[#0B0E14]/95 backdrop-blur-md border-b border-[#232A3B] px-4 flex items-center justify-between">
          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="p-2 -ml-2 text-slate-300 hover:text-white"
            aria-label="Abrir Menu"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#E63946] to-[#F97316] flex items-center justify-center shadow-md">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-base text-white tracking-tight">
              Imob<span className="text-[#E63946]">Gestor</span>
            </span>
          </div>

          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#E63946] to-[#F97316] flex items-center justify-center text-white text-xs font-bold">
            {getInitials(user?.name)}
          </div>
        </header>

        {/* Mobile Drawer Overlay */}
        {mobileDrawerOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            {/* Backdrop with blur */}
            <div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
              onClick={() => setMobileDrawerOpen(false)}
            />

            {/* Drawer Content */}
            <div className="relative w-[280px] bg-[#0E121B] border-r border-[#232A3B] flex flex-col h-full z-10 shadow-2xl animate-in slide-in-from-left duration-200">
              <div className="p-4 border-b border-[#232A3B] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#E63946] to-[#F97316] flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-bold text-base text-white">ImobGestor</span>
                </div>
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile Período */}
              <div className="p-3 border-b border-[#232A3B] space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                    Período Global
                  </p>
                </div>
                <div className="w-full flex">
                  <PeriodoSelector variant="mobile" />
                </div>
              </div>

              {/* Menu items */}
              <nav className="flex-1 py-3 px-3 space-y-1 overflow-y-auto">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon
                  const isActive = location.pathname === item.path
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileDrawerOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                        isActive
                          ? 'bg-[#E63946]/15 text-red-400 font-semibold border-l-2 border-[#E63946]'
                          : 'text-slate-400 hover:text-white hover:bg-[#1A1F2E]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </NavLink>
                  )
                })}
              </nav>

              <div className="p-3 border-t border-[#232A3B] space-y-1">
                <NavLink
                  to="/configuracoes"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-[#1A1F2E]"
                >
                  <Settings className="w-4 h-4" />
                  <span>Configurações</span>
                </NavLink>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sair</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content Area */}
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-8 max-w-7xl w-full mx-auto animate-fade-in">
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation Bar (≤640px) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#0E121B] border-t border-[#232A3B] z-30 flex items-center justify-around px-2">
          <NavLink
            to="/painel"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
                isActive ? 'text-[#E63946]' : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>Painel</span>
          </NavLink>

          <NavLink
            to="/vendas"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
                isActive ? 'text-[#E63946]' : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            <TrendingUp className="w-5 h-5" />
            <span>Vendas</span>
          </NavLink>

          <NavLink
            to="/comissoes"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
                isActive ? 'text-[#E63946]' : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            <BadgePercent className="w-5 h-5" />
            <span>Comissões</span>
          </NavLink>

          <NavLink
            to="/fluxo"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
                isActive ? 'text-[#E63946]' : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            <ArrowLeftRight className="w-5 h-5" />
            <span>Fluxo</span>
          </NavLink>

          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="flex flex-col items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-slate-200"
          >
            <Menu className="w-5 h-5" />
            <span>Mais</span>
          </button>
        </nav>
      </div>
    </div>
  )
}
