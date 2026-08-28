import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  requiredPath?: string
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requiredPath }) => {
  const { user, isLoading, hasMenuAccess } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B0E14] flex flex-col items-center justify-center text-slate-300">
        <Loader2 className="w-10 h-10 text-[#E63946] animate-spin mb-3" />
        <p className="text-sm font-medium">Carregando ImobGestor...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (requiredPath && !hasMenuAccess(requiredPath)) {
    return <Navigate to="/painel" replace />
  }

  return <Outlet />
}
