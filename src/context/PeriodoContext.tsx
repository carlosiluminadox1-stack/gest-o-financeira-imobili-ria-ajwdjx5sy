import React, { createContext, useContext, useState, useMemo } from 'react'
import { PeriodoGlobal } from '@/types'

export const MESES_NOMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

export const MESES_ABREV = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
]

export interface PeriodoInfo {
  start: Date
  end: Date
  label: string
  ano: number
  mes?: number // 1 a 12 se for mês específico
  isCustomMonth: boolean
}

interface PeriodoContextType {
  periodo: PeriodoGlobal
  setPeriodo: (p: PeriodoGlobal) => void
  selectedAno: number
  setSelectedAno: (ano: number) => void
  selectedMes: number // 1 a 12
  setSelectedMes: (mes: number) => void
  selecionarMesEspecifico: (ano: number, mes: number) => void
  selecionarPeriodoRelativo: (tipo: 'mes' | 'trimestre' | 'semestre' | 'ano' | 'tudo') => void
  getPeriodoDates: (p?: PeriodoGlobal) => PeriodoInfo
  periodoLabel: string
  isCustomMonth: boolean
}

const PeriodoContext = createContext<PeriodoContextType | undefined>(undefined)

export const PeriodoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const now = new Date()
  const [periodo, setPeriodoState] = useState<PeriodoGlobal>('mes')
  const [selectedAno, setSelectedAno] = useState<number>(now.getFullYear())
  const [selectedMes, setSelectedMes] = useState<number>(now.getMonth() + 1) // 1 a 12

  const getPeriodoDates = (p: PeriodoGlobal = periodo): PeriodoInfo => {
    const today = new Date()
    const currentYear = today.getFullYear()
    const currentMonth = today.getMonth()

    // 1. Verificar se é formato "YYYY-MM" (Mês específico fixo)
    if (typeof p === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(p)) {
      const [anoStr, mesStr] = p.split('-')
      const anoNum = parseInt(anoStr, 10)
      const mesNum = parseInt(mesStr, 10) // 1-12
      const monthIdx = mesNum - 1
      const nomeMes = MESES_NOMES[monthIdx] || `Mês ${mesNum}`

      return {
        start: new Date(anoNum, monthIdx, 1, 0, 0, 0, 0),
        end: new Date(anoNum, monthIdx + 1, 0, 23, 59, 59, 999),
        label: `${nomeMes} ${anoNum}`,
        ano: anoNum,
        mes: mesNum,
        isCustomMonth: true,
      }
    }

    // 2. Opções relativas tradicionais
    switch (p) {
      case 'mes':
        return {
          start: new Date(currentYear, currentMonth, 1, 0, 0, 0, 0),
          end: new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999),
          label: 'Mês atual',
          ano: currentYear,
          mes: currentMonth + 1,
          isCustomMonth: false,
        }
      case 'trimestre': {
        const quarterStartMonth = Math.floor(currentMonth / 3) * 3
        return {
          start: new Date(currentYear, quarterStartMonth, 1, 0, 0, 0, 0),
          end: new Date(currentYear, quarterStartMonth + 3, 0, 23, 59, 59, 999),
          label: 'Trimestre atual',
          ano: currentYear,
          isCustomMonth: false,
        }
      }
      case 'semestre': {
        const semesterStartMonth = currentMonth < 6 ? 0 : 6
        return {
          start: new Date(currentYear, semesterStartMonth, 1, 0, 0, 0, 0),
          end: new Date(currentYear, semesterStartMonth + 6, 0, 23, 59, 59, 999),
          label: 'Semestre atual',
          ano: currentYear,
          isCustomMonth: false,
        }
      }
      case 'ano':
        return {
          start: new Date(currentYear, 0, 1, 0, 0, 0, 0),
          end: new Date(currentYear, 11, 31, 23, 59, 59, 999),
          label: 'Ano atual',
          ano: currentYear,
          isCustomMonth: false,
        }
      case 'tudo':
        return {
          start: new Date(2000, 0, 1, 0, 0, 0, 0),
          end: new Date(2099, 11, 31, 23, 59, 59, 999),
          label: 'Todo o período',
          ano: currentYear,
          isCustomMonth: false,
        }
      default:
        // Fallback para mês atual se string desconhecida
        return {
          start: new Date(currentYear, currentMonth, 1, 0, 0, 0, 0),
          end: new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999),
          label: 'Mês atual',
          ano: currentYear,
          mes: currentMonth + 1,
          isCustomMonth: false,
        }
    }
  }

  const setPeriodo = (p: PeriodoGlobal) => {
    setPeriodoState(p)
    if (typeof p === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(p)) {
      const [anoStr, mesStr] = p.split('-')
      setSelectedAno(parseInt(anoStr, 10))
      setSelectedMes(parseInt(mesStr, 10))
    }
  }

  const selecionarMesEspecifico = (ano: number, mes: number) => {
    const mesFormatted = String(mes).padStart(2, '0')
    const key = `${ano}-${mesFormatted}`
    setSelectedAno(ano)
    setSelectedMes(mes)
    setPeriodoState(key)
  }

  const selecionarPeriodoRelativo = (tipo: 'mes' | 'trimestre' | 'semestre' | 'ano' | 'tudo') => {
    setPeriodoState(tipo)
  }

  const currentInfo = useMemo(() => getPeriodoDates(periodo), [periodo])

  return (
    <PeriodoContext.Provider
      value={{
        periodo,
        setPeriodo,
        selectedAno,
        setSelectedAno,
        selectedMes,
        setSelectedMes,
        selecionarMesEspecifico,
        selecionarPeriodoRelativo,
        getPeriodoDates,
        periodoLabel: currentInfo.label,
        isCustomMonth: currentInfo.isCustomMonth,
      }}
    >
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
