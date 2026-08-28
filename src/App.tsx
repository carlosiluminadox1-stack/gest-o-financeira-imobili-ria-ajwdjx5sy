import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/context/AuthContext'
import { PeriodoProvider } from '@/context/PeriodoContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { ContasAlertProvider } from '@/context/ContasAlertContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import Layout from '@/components/Layout'

// Páginas
import Login from '@/pages/Login'
import Dashboard from '@/pages/Index'
import Vendas from '@/pages/Vendas'
import Comissoes from '@/pages/Comissoes'
import MetasVGV from '@/pages/Metas'
import FluxoCaixa from '@/pages/FluxoCaixa'
import Ranking from '@/pages/Ranking'
import NotasFiscais from '@/pages/NotasFiscais'
import FechamentoPage from '@/pages/Fechamento'
import ConfiguracoesPage from '@/pages/Configuracoes'
import NotFound from '@/pages/NotFound'

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <PeriodoProvider>
            <ContasAlertProvider>
              <Routes>
                {/* Rota pública de login */}
                <Route path="/login" element={<Login />} />

                {/* Rotas protegidas dentro do Layout */}
                <Route element={<ProtectedRoute />}>
                  <Route element={<Layout />}>
                    <Route path="/" element={<Navigate to="/painel" replace />} />
                    <Route path="/painel" element={<Dashboard />} />
                    <Route path="/vendas" element={<Vendas />} />
                    <Route path="/fluxo" element={<FluxoCaixa />} />

                    {/* Rotas exclusivas de Sócio */}
                    <Route element={<ProtectedRoute requiredPath="/comissoes" />}>
                      <Route path="/comissoes" element={<Comissoes />} />
                    </Route>
                    <Route element={<ProtectedRoute requiredPath="/metas" />}>
                      <Route path="/metas" element={<MetasVGV />} />
                    </Route>
                    <Route element={<ProtectedRoute requiredPath="/ranking" />}>
                      <Route path="/ranking" element={<Ranking />} />
                    </Route>
                    <Route element={<ProtectedRoute requiredPath="/notas" />}>
                      <Route path="/notas" element={<NotasFiscais />} />
                    </Route>
                    <Route element={<ProtectedRoute requiredPath="/fechamento" />}>
                      <Route path="/fechamento" element={<FechamentoPage />} />
                    </Route>
                    <Route path="/configuracoes" element={<ConfiguracoesPage />} />
                  </Route>
                </Route>

                {/* 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>

              {/* Global Toast Notifications (Top Right) */}
              <Toaster
                position="top-right"
                toastOptions={{
                  className: 'toast-custom',
                }}
              />
            </ContasAlertProvider>
          </PeriodoProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
