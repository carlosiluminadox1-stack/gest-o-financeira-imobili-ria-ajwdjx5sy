import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import pb from '@/lib/pocketbase/client'
import { Despesa } from '@/types'
import { playOverdueSound } from '@/lib/audioAlert'
import { toast } from 'sonner'

interface ContasAlertContextType {
  overdueExpenses: Despesa[]
  overdueCount: number
  soundEnabled: boolean
  setSoundEnabled: (enabled: boolean) => void
  toggleSound: () => void
  refreshOverdue: () => Promise<void>
}

const ContasAlertContext = createContext<ContasAlertContextType | undefined>(undefined)

export const ContasAlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [overdueExpenses, setOverdueExpenses] = useState<Despesa[]>([])
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(() => {
    const saved = localStorage.getItem('imobgestor_sound_enabled')
    return saved !== 'false' // default is enabled
  })

  const hasNotifiedRef = useRef(false)

  const setSoundEnabled = (enabled: boolean) => {
    setSoundEnabledState(enabled)
    localStorage.setItem('imobgestor_sound_enabled', String(enabled))
  }

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled)
  }

  const checkOverdue = useCallback(async () => {
    if (!pb.authStore.isValid) return

    try {
      const todayIso = new Date().toISOString().split('T')[0]
      // Buscar despesas ativas cuja data_vencimento é anterior a hoje
      const list = await pb.collection('despesas').getFullList<Despesa>({
        filter: `ativa = true && data_vencimento != "" && data_vencimento < "${todayIso}"`,
        sort: 'data_vencimento',
      })

      setOverdueExpenses(list)

      if (list.length > 0 && !hasNotifiedRef.current) {
        hasNotifiedRef.current = true
        if (soundEnabled) {
          playOverdueSound()
        }
        toast.error(
          `Atenção: ${list.length} conta(s) / despesa(s) vencida(s) pendente(s) de pagamento!`,
          {
            duration: 6000,
          },
        )
      }
    } catch (err) {
      console.error('Erro ao verificar contas vencidas:', err)
    }
  }, [soundEnabled])

  useEffect(() => {
    checkOverdue()
    // Checar a cada 5 minutos
    const interval = setInterval(checkOverdue, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [checkOverdue])

  return (
    <ContasAlertContext.Provider
      value={{
        overdueExpenses,
        overdueCount: overdueExpenses.length,
        soundEnabled,
        setSoundEnabled,
        toggleSound,
        refreshOverdue: checkOverdue,
      }}
    >
      {children}
    </ContasAlertContext.Provider>
  )
}

export const useContasAlert = () => {
  const context = useContext(ContasAlertContext)
  if (!context) {
    throw new Error('useContasAlert must be used within a ContasAlertProvider')
  }
  return context
}
