import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import {
  Building2,
  Lock,
  Mail,
  User as UserIcon,
  ArrowRight,
  Loader2,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

export default function Login() {
  const [isRegister, setIsRegister] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('carlosiluminadox1@gmail.com')
  const [password, setPassword] = useState('Skip@Pass')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({})

  const { login, register } = useAuth()
  const navigate = useNavigate()

  const validate = () => {
    const errs: { name?: string; email?: string; password?: string } = {}
    if (isRegister && !name.trim()) {
      errs.name = 'Informe seu nome completo'
    }
    if (!email.trim()) {
      errs.email = 'Informe seu e-mail'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = 'Informe um e-mail válido'
    }
    if (!password) {
      errs.password = 'Informe sua senha'
    } else if (password.length < 8) {
      errs.password = 'A senha deve ter no mínimo 8 caracteres'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      if (isRegister) {
        await register(name, email, password)
        toast.success('Conta criada com sucesso! Bem-vindo ao ImobGestor.')
      } else {
        await login(email, password)
        toast.success('Login realizado com sucesso!')
      }
      navigate('/painel')
    } catch (err: any) {
      console.error(err)
      const message =
        err?.response?.message ||
        err?.message ||
        (isRegister
          ? 'Erro ao criar conta. Verifique se o e-mail já está cadastrado.'
          : 'E-mail ou senha incorretos.')
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const handleFillDemo = () => {
    setIsRegister(false)
    setEmail('carlosiluminadox1@gmail.com')
    setPassword('Skip@Pass')
    toast.info('Credenciais de demonstração preenchidas!')
  }

  return (
    <div className="min-h-screen bg-[#0B0E14] flex flex-col items-center justify-center p-4 selection:bg-[#E63946] selection:text-white relative overflow-hidden">
      {/* Background glow decorations */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#E63946]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#F97316]/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-[#121722] border border-[#232A3B] rounded-2xl p-8 shadow-2xl relative z-10 animate-fade-in-up">
        {/* Logo and Brand */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#E63946] to-[#F97316] flex items-center justify-center shadow-xl shadow-[#E63946]/30 mb-3">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Imob<span className="text-[#E63946]">Gestor</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Gestão Financeira & Comissões Imobiliárias
          </p>
        </div>

        {/* Title */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-slate-100">
            {isRegister ? 'Criar nova conta de Sócio' : 'Acesse seu painel'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {isRegister
              ? 'Preencha os dados abaixo para começar a gerenciar sua imobiliária'
              : 'Entre com suas credenciais para continuar'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Nome completo
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="Ex: Carlos Silva"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    if (errors.name) setErrors({ ...errors, name: undefined })
                  }}
                  className="bg-[#0B0E14] border-[#232A3B] pl-9 text-slate-100 focus:border-[#E63946] focus:ring-[#E63946] text-sm h-11"
                />
              </div>
              {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">E-mail</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="email"
                placeholder="seu.email@imobiliaria.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (errors.email) setErrors({ ...errors, email: undefined })
                }}
                className="bg-[#0B0E14] border-[#232A3B] pl-9 text-slate-100 focus:border-[#E63946] focus:ring-[#E63946] text-sm h-11"
              />
            </div>
            {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Senha</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (errors.password) setErrors({ ...errors, password: undefined })
                }}
                className="bg-[#0B0E14] border-[#232A3B] pl-9 text-slate-100 focus:border-[#E63946] focus:ring-[#E63946] text-sm h-11"
              />
            </div>
            {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password}</p>}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#E63946] hover:bg-[#D62839] text-white font-bold h-11 text-sm rounded-lg shadow-lg shadow-[#E63946]/25 mt-2 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processando...</span>
              </>
            ) : (
              <>
                <span>{isRegister ? 'Criar conta de Sócio' : 'Entrar no Sistema'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </form>

        {/* Toggle Mode */}
        <div className="mt-6 pt-5 border-t border-[#232A3B] text-center">
          <p className="text-xs text-slate-400">
            {isRegister ? 'Já tem uma conta cadastrada?' : 'Ainda não possui conta?'}
            <button
              onClick={() => {
                setIsRegister(!isRegister)
                setErrors({})
              }}
              className="ml-1.5 text-red-400 font-semibold hover:underline"
            >
              {isRegister ? 'Entrar' : 'Criar uma conta'}
            </button>
          </p>
        </div>

        {/* Seed helper badge */}
        {!isRegister && (
          <div className="mt-4 p-2.5 rounded-lg bg-[#0B0E14] border border-[#232A3B] flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Acesso Demo Pré-configurado</span>
            </div>
            <button
              type="button"
              onClick={handleFillDemo}
              className="text-[11px] font-semibold text-emerald-400 hover:underline"
            >
              Preencher
            </button>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-500 mt-8">
        © {new Date().getFullYear()} ImobGestor — Todos os direitos reservados.
      </p>
    </div>
  )
}
