import React, { createContext, useContext, useState } from 'react'
import { PeriodoGlobal } from '@/types'

interface PeriodoContextType {
  periodo: PeriodoGlobal
  setPeriodo: (p: PeriodoGlobal) => void
  getPeriodoDates: (p?: PeriodoGlobal) => { start: Date; end: Date; label: string }
}

const PeriodoContext = createContext<PeriodoContextType | undefined>(undefined)

export const PeriodoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [periodo, setPeriodo] = useState<PeriodoGlobal>('mes')

  const getPeriodoDates = (p: PeriodoGlobal = periodo) => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()

    switch (p) {
      case 'mes':
        return {
          start: new Date(year, month, 1, 0, 0, 0),
          end: new Date(year, month + 1, 0, 23, 59, 59),
          label: 'Mês atual',
        }
      case 'trimestre': {
        const quarterStartMonth = Math.floor(month / 3) * 3
        return {
          start: new Date(year, quarterStartMonth, 1, 0, 0, 0),
          end: new Date(year, quarterStartMonth + 3, 0, 23, 59, 59),
          label: 'Trimestre atual',
        }
      }
      case 'semestre': {
        const semesterStartMonth = month < 6 ? 0 : 6
        return {
          start: new Date(year, semesterStartMonth, 1, 0, 0, 0),
          end: new Date(year, semesterStartMonth + 6, 0, 23, 59, 59),
          label: 'Semestre atual',
        }
      }
      case 'ano':
        return {
          start: new Date(year, 0, 1, 0, 0, 0),
          end: new Date(year, 11, 31, 23, 59, 59),
          label: 'Ano atual',
        }
    }
  }

  return (
    <PeriodoContext.Provider value={{ periodo, setPeriodo, getPeriodoDates }}>
      {children}
    </PeriodoContext.Provider>
  )
}

export const usePeriodo = () => {
  const context = useContext(PeriodoContext)
  if (!context) {
    throw new Error('usePeriodo must be used within a PeriodoProvider')
  }
  return context
}
