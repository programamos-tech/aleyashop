'use client'

import { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react'

interface DatePickerProps {
  selectedDate: Date | null
  onDateSelect: (date: Date | null) => void
  placeholder?: string
  className?: string
  minDate?: Date
}

export function DatePicker({ selectedDate, onDateSelect, placeholder = "Seleccionar fecha", className = "", minDate }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [showAbove, setShowAbove] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Generar días del mes
  const generateDays = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []
    
    // Días del mes anterior (para completar la semana)
    const prevMonth = new Date(year, month - 1, 0)
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        day: prevMonth.getDate() - i,
        isCurrentMonth: false,
        date: new Date(year, month - 1, prevMonth.getDate() - i)
      })
    }

    // Días del mes actual
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        day,
        isCurrentMonth: true,
        date: new Date(year, month, day)
      })
    }

    // Días del mes siguiente (para completar la semana)
    const remainingDays = 42 - days.length // 6 semanas * 7 días
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        day,
        isCurrentMonth: false,
        date: new Date(year, month + 1, day)
      })
    }

    return days
  }

  const handleDateClick = (date: Date) => {
    if (isDateDisabled(date)) return
    onDateSelect(date)
    setIsOpen(false)
  }

  const handleClearDate = () => {
    onDateSelect(null)
    setIsOpen(false)
  }

  const handleOpenCalendar = () => {
    if (dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const spaceBelow = viewportHeight - rect.bottom
      const spaceAbove = rect.top
      
      // Siempre mostrar hacia arriba si está en la mitad inferior de la pantalla
      setShowAbove(rect.top > viewportHeight / 2)
    }
    setIsOpen(!isOpen)
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isDateDisabled = (date: Date) => {
    if (!minDate) return false
    return date < minDate
  }

  const isSelected = (date: Date) => {
    return selectedDate && date.toDateString() === selectedDate.toDateString()
  }

  const formatSelectedDate = () => {
    if (!selectedDate) return placeholder
    return selectedDate.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Input trigger */}
      <div 
        onClick={handleOpenCalendar}
        className="w-full flex items-center justify-between px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:border-[#f29fc8] focus-within:ring-2 focus-within:ring-[#f29fc8] focus-within:border-[#f29fc8] cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span className={selectedDate ? 'text-gray-900 dark:text-white' : 'text-gray-500'}>
            {formatSelectedDate()}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {selectedDate && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleClearDate()
              }}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <X className="h-3 w-3 text-gray-400" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleOpenCalendar()
            }}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
          </button>
        </div>
      </div>

      {/* Calendar dropdown */}
      {isOpen && (
        <div className={`absolute ${showAbove ? 'bottom-full mb-1' : 'top-full mt-1'} right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-[100] p-4 min-w-[280px] max-w-[280px]`}>
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <ChevronLeft className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </button>
            
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h3>
            
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Day names */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map(day => (
              <div key={day} className="text-xs text-gray-500 dark:text-gray-400 text-center py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1 max-w-full">
            {generateDays().map((dayData, index) => {
              const { day, isCurrentMonth, date } = dayData
              const isCurrentDay = isToday(date)
              const isSelectedDay = isSelected(date)
              const isDisabled = isDateDisabled(date)
              
              return (
                <button
                  key={index}
                  onClick={() => handleDateClick(date)}
                  disabled={isDisabled}
                  className={`
                    w-8 h-8 text-xs rounded transition-colors
                    ${isDisabled 
                      ? 'text-gray-300 dark:text-gray-700 cursor-not-allowed bg-gray-100 dark:bg-gray-800' 
                      : isCurrentMonth 
                        ? 'text-gray-900 dark:text-white hover:bg-[#fce4f0] dark:hover:bg-[#f29fc8]/30' 
                        : 'text-gray-400 dark:text-gray-600'
                    }
                    ${isCurrentDay && !isDisabled
                      ? 'bg-[#fce4f0] dark:bg-[#f29fc8]/30 font-semibold' 
                      : ''
                    }
                    ${isSelectedDay && !isDisabled
                      ? 'bg-[#f29fc8] text-white hover:bg-[#e07ab0]' 
                      : ''
                    }
                  `}
                >
                  {day}
                </button>
              )
            })}
          </div>

          {/* Quick actions */}
          <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const today = new Date()
                  if (!isDateDisabled(today)) {
                    handleDateClick(today)
                  }
                }}
                disabled={isDateDisabled(new Date())}
                className={`flex-1 px-3 py-1 text-xs rounded transition-colors ${
                  isDateDisabled(new Date())
                    ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed bg-gray-100 dark:bg-gray-800'
                    : 'bg-[#fce4f0] dark:bg-[#f29fc8]/30 text-[#d06a98] dark:text-[#f29fc8] hover:bg-[#fce4f0] dark:hover:bg-[#f29fc8]/50'
                }`}
              >
                Hoy
              </button>
              <button
                onClick={handleClearDate}
                className="flex-1 px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
