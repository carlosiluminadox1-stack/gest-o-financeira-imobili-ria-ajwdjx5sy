import React, { useState } from 'react'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  Check,
} from 'lucide-react'
import { usePeriodo, MESES_NOMES, MESES_ABREV } from '@/context/PeriodoContext'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'

interface PeriodoSelectorProps {
  variant?: 'desktop' | 'mobile'
}

export const PeriodoSelector: React.FC<PeriodoSelectorProps> = ({ variant = 'desktop' }) => {
  const {
    periodo,
    setPeriodo,
    periodoLabel,
    selecionarMesEspecifico,
    selecionarPeriodoRelativo,
    getPeriodoDates,
  } = usePeriodo()

  const [isOpen, setIsOpen] = useState(false)

  // Ano em visualização dentro do popover do Date/Month Picker
  const currentDates = getPeriodoDates(periodo)
  const currentRealYear = new Date().getFullYear()
  const currentRealMonth = new Date().getMonth() + 1

  const [viewYear, setViewYear] = useState<number>(currentDates.ano || currentRealYear)

  const handlePrevYear = () => setViewYear((y) => y - 1)
  const handleNextYear = () => setViewYear((y) => y + 1)

  const handleSelectMonth = (mesIndex: number) => {
    const mesNum = mesIndex + 1
    selecionarMesEspecifico(viewYear, mesNum)
    setIsOpen(false)
  }

  const handleSelectRelative = (tipo: 'mes' | 'trimestre' | 'semestre' | 'ano') => {
    selecionarPeriodoRelativo(tipo)
    setIsOpen(false)
  }

  // Verificar se um mês está selecionado
  const isMonthSelected = (mesIndex: number) => {
    const mesNum = mesIndex + 1
    const mesFormatted = String(mesNum).padStart(2, '0')
    return periodo === `${viewYear}-${mesFormatted}`
  }

  const isCurrentMonthInCalendar = (mesIndex: number) => {
    return viewYear === currentRealYear && mesIndex + 1 === currentRealMonth
  }

  // Atalhos de anos rápidos
  const availableYears = [
    currentRealYear - 2,
    currentRealYear - 1,
    currentRealYear,
    currentRealYear + 1,
  ]

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="bg-[#121722] border-[#232A3B] text-slate-200 hover:bg-[#1A2234] hover:text-white text-xs h-9 px-3 gap-2 group transition-all shadow-sm"
        >
          <CalendarIcon className="w-3.5 h-3.5 text-slate-400 group-hover:text-red-400 transition-colors" />
          <span className="text-slate-400 hidden sm:inline">Período:</span>
          <span className="font-semibold text-red-400 max-w-[150px] truncate">{periodoLabel}</span>
          <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-slate-300 transition-transform rotate-90" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[320px] p-0 bg-[#0E121B] border-[#232A3B] text-slate-100 shadow-2xl rounded-2xl overflow-hidden z-50 animate-in fade-in-50 zoom-in-95"
      >
        {/* Top Header do Popover */}
        <div className="p-3.5 border-b border-[#232A3B] bg-[#121722]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-red-500/15 text-red-400 flex items-center justify-center">
                <CalendarIcon className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white leading-tight">Filtrar Período</p>
                <p className="text-[10px] text-slate-400">Escolha um mês específico ou relativo</p>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20 truncate max-w-[120px]">
              {periodoLabel}
            </span>
          </div>
        </div>

        {/* 1. Opções Relativas Rápidas */}
        <div className="p-3 border-b border-[#232A3B]">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-slate-500" />
            Períodos Dinâmicos
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { id: 'mes', label: 'Mês atual' },
              { id: 'trimestre', label: 'Trimestre atual' },
              { id: 'semestre', label: 'Semestre atual' },
              { id: 'ano', label: 'Ano atual' },
            ].map((item) => {
              const isSelected = periodo === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectRelative(item.id as any)}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-left ${
                    isSelected
                      ? 'bg-[#E63946] text-white font-bold shadow-md shadow-[#E63946]/20'
                      : 'bg-[#121722] text-slate-300 hover:bg-[#1A2234] hover:text-white border border-[#232A3B]/60'
                  }`}
                >
                  <span>{item.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* 2. Seleção de Mês / Ano Específico */}
        <div className="p-3.5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-400" />
              Mês Específico
            </p>

            {/* Controle de Navegação de Ano */}
            <div className="flex items-center gap-1 bg-[#121722] border border-[#232A3B] rounded-lg p-0.5">
              <button
                type="button"
                onClick={handlePrevYear}
                className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-[#1A2234] transition-colors"
                title="Ano anterior"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-bold text-white px-1.5 tabular-nums">{viewYear}</span>
              <button
                type="button"
                onClick={handleNextYear}
                className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-[#1A2234] transition-colors"
                title="Próximo ano"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Atalhos de Anos */}
          <div className="flex items-center gap-1 mb-2.5 overflow-x-auto pb-0.5">
            {availableYears.map((yr) => (
              <button
                key={yr}
                type="button"
                onClick={() => setViewYear(yr)}
                className={`text-[10px] font-semibold px-2 py-0.5 rounded transition-all ${
                  viewYear === yr
                    ? 'bg-slate-200 text-slate-900'
                    : 'bg-[#121722] text-slate-400 hover:text-slate-200 hover:bg-[#1A2234]'
                }`}
              >
                {yr}
              </button>
            ))}
          </div>

          {/* Grade 4x3 dos 12 Meses */}
          <div className="grid grid-cols-3 gap-1.5">
            {MESES_ABREV.map((mesAbrev, idx) => {
              const selected = isMonthSelected(idx)
              const isCurrent = isCurrentMonthInCalendar(idx)
              const mesNome = MESES_NOMES[idx]

              return (
                <button
                  key={mesAbrev}
                  type="button"
                  onClick={() => handleSelectMonth(idx)}
                  title={`${mesNome} de ${viewYear}`}
                  className={`relative py-2 px-1 rounded-xl text-xs font-medium transition-all text-center flex flex-col items-center justify-center ${
                    selected
                      ? 'bg-gradient-to-br from-[#E63946] to-[#d62839] text-white font-bold shadow-lg shadow-[#E63946]/30 ring-1 ring-white/20'
                      : 'bg-[#121722] text-slate-300 hover:bg-[#1A2234] hover:text-white border border-[#232A3B]/60'
                  }`}
                >
                  <span className="text-xs leading-none">{mesAbrev}</span>
                  {isCurrent && !selected && (
                    <span className="absolute bottom-1 w-1 h-1 rounded-full bg-red-400" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Footer Informativo */}
        <div className="px-3.5 py-2.5 bg-[#080B10] border-t border-[#232A3B] flex items-center justify-between text-[11px] text-slate-400">
          <span>{currentDates.label}</span>
          <span className="text-slate-500 text-[10px]">
            {currentDates.start.toLocaleDateString('pt-BR')} a{' '}
            {currentDates.end.toLocaleDateString('pt-BR')}
          </span>
        </div>
      </PopoverContent>
    </Popover>
  )
}
