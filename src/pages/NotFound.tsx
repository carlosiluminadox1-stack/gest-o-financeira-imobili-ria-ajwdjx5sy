import React from 'react'
import { Link } from 'react-router-dom'
import { Building2, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0B0E14] flex flex-col items-center justify-center p-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#E63946] to-[#F97316] flex items-center justify-center shadow-xl shadow-[#E63946]/30 mb-4">
        <Building2 className="w-8 h-8 text-white" />
      </div>
      <h1 className="text-4xl font-black text-white tracking-tight">404</h1>
      <p className="text-lg font-bold text-slate-200 mt-2">Página não encontrada</p>
      <p className="text-xs text-slate-400 max-w-sm mt-1">
        O endereço que você acessou não existe ou foi movido no sistema ImobGestor.
      </p>

      <Link to="/painel" className="mt-6">
        <Button className="bg-[#E63946] hover:bg-[#D62839] text-white text-xs font-bold gap-2">
          <Home className="w-4 h-4" />
          <span>Voltar ao Painel Principal</span>
        </Button>
      </Link>
    </div>
  )
}
