'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DatePicker } from '@/components/ui/date-picker'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, FileText, X, Wallet, Calendar, DollarSign, CreditCard, StickyNote, Plus } from 'lucide-react'
import { ExpensesService } from '@/lib/expenses-service'
import { useAuth } from '@/contexts/auth-context'
import { toast } from 'sonner'

interface EgresoModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved?: () => void
}

const OTROS_VALUE = 'Otros'

const defaultCategoryOptions = [
  'Administración',
  'Arreglos Locativos',
  'Arriendo',
  'Bolsas Milagros',
  'Camara de Comercio',
  'Datafono y 4xmil',
  'Domicilios Propios',
  'Flete',
  'Honorarios Contabilidad',
  'Intereses y Préstamos',
  'Línea Corporativa',
  'Material/Insumos y Papelería',
  'Pago por Transacción Milagros',
  'Personal Turnos',
  'Prestaciones Sociales',
  'Publicidad',
  'Renovación Sigo Nomina',
  'Seguridad Social',
  'Seguro Local y Mercancia Protegida',
  'Servicio Público',
  'Soporte Web Contapyme',
  'Sueldos/Nómina',
  'Viáticos/Gastos Representación',
  OTROS_VALUE
]

export function EgresoModal({ isOpen, onClose, onSaved }: EgresoModalProps) {
  const { user } = useAuth()
  const [categories, setCategories] = useState(defaultCategoryOptions)
  const [categorySearch, setCategorySearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const [amount, setAmount] = useState('')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [paymentMethod, setPaymentMethod] = useState('')
  const [notes, setNotes] = useState('')
  const [otherConcept, setOtherConcept] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const isOtherSelected = selectedCategory === OTROS_VALUE

  useEffect(() => {
    if (!isOpen) {
      setCategorySearch('')
      setSelectedCategory('')
      setShowCategoryDropdown(false)
      setOtherConcept('')
      setAmount('')
      setSelectedDate(null)
      setPaymentMethod('')
      setNotes('')
    }
  }, [isOpen])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false)
      }
    }

    if (showCategoryDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showCategoryDropdown])

  const normalizeCategory = (value: string) => value.trim().toLowerCase()

  const filteredCategories = useMemo(() => {
    const query = categorySearch.trim().toLowerCase()
    if (!query) return categories
    return categories.filter(category => category.toLowerCase().includes(query))
  }, [categorySearch, categories])

  const canCreateCategory = useMemo(() => {
    const trimmed = categorySearch.trim()
    if (!trimmed) return false
    return !categories.some(category => normalizeCategory(category) === normalizeCategory(trimmed))
  }, [categorySearch, categories])

  const handleSelectCategory = (category: string) => {
    setSelectedCategory(category)
    setCategorySearch(category)
    setShowCategoryDropdown(false)
  }

  const handleCreateCategory = () => {
    const trimmed = categorySearch.trim()
    if (!trimmed) return
    const existing = categories.find(category => normalizeCategory(category) === normalizeCategory(trimmed))
    if (existing) {
      handleSelectCategory(existing)
      return
    }
    const updatedCategories = [...categories, trimmed].sort((a, b) =>
      a.localeCompare(b, 'es', { sensitivity: 'base' })
    )
    setCategories(updatedCategories)
    handleSelectCategory(trimmed)
  }

  const formatDateForDb = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const handleSaveExpense = async () => {
    const finalCategory = isOtherSelected
      ? otherConcept.trim()
      : (selectedCategory || categorySearch).trim()
    if (!finalCategory) {
      toast.error(isOtherSelected ? 'Escribe el concepto en "Otros"' : 'Selecciona un concepto')
      return
    }
    const amountValue = parseInt(amount.replace(/\./g, ''), 10)
    if (!amount || Number.isNaN(amountValue) || amountValue <= 0) {
      toast.error('Ingresa un valor válido')
      return
    }
    if (!selectedDate) {
      toast.error('Selecciona una fecha')
      return
    }
    if (!paymentMethod) {
      toast.error('Selecciona un método de pago')
      return
    }

    if (!isOtherSelected && !categories.some(category => normalizeCategory(category) === normalizeCategory(finalCategory))) {
      const updatedCategories = [...categories, finalCategory].sort((a, b) =>
        a.localeCompare(b, 'es', { sensitivity: 'base' })
      )
      setCategories(updatedCategories)
      setSelectedCategory(finalCategory)
    }

    setIsSaving(true)
    const newExpense = await ExpensesService.createExpense(
      {
        storeId: null,
        category: finalCategory,
        amount: amountValue,
        date: formatDateForDb(selectedDate),
        paymentMethod,
        notes: notes.trim() || ''
      },
      user?.id
    )
    setIsSaving(false)

    if (!newExpense) {
      toast.error('No se pudo guardar el egreso')
      return
    }

    toast.success('Egreso registrado exitosamente')
    onSaved?.()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 xl:left-56 bg-white/70 dark:bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-none xl:rounded-2xl shadow-2xl w-full h-full xl:h-[calc(98vh-4rem)] xl:w-[calc(100vw-18rem)] xl:max-h-[calc(98vh-4rem)] xl:max-w-[calc(100vw-18rem)] overflow-hidden flex flex-col border-0 xl:border border-gray-200 dark:border-gray-700 relative z-[10000]">
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-[#f29fc8]/50 dark:border-[#d06a98] bg-gradient-to-r from-[#fce4f0] to-[#fce4f0]/50 dark:from-[#f29fc8]/30 dark:to-[#f29fc8]/20 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-lg bg-[#f29fc8] dark:bg-[#e07ab0] flex items-center justify-center">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                Registrar Nuevo Egreso
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                Completa los datos del gasto
              </p>
            </div>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-white/50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50 dark:bg-gray-900">
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-base font-semibold text-gray-900 dark:text-white">
                <div className="h-8 w-8 rounded-lg bg-[#fce4f0] dark:bg-[#f29fc8]/30 flex items-center justify-center mr-3">
                  <FileText className="h-4 w-4 text-[#f29fc8] dark:text-[#f29fc8]" />
                </div>
                Detalles del Egreso
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2" ref={dropdownRef}>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Concepto</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar concepto..."
                      value={categorySearch}
                      onChange={(event) => {
                        setCategorySearch(event.target.value)
                        setShowCategoryDropdown(true)
                      }}
                      onFocus={() => setShowCategoryDropdown(true)}
                      className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#f29fc8] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    />
                    {showCategoryDropdown && (
                      <div className="absolute z-20 mt-2 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-56 overflow-y-auto">
                        {filteredCategories.length === 0 && !canCreateCategory && (
                          <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                            Sin resultados
                          </div>
                        )}
                        {filteredCategories.map(category => (
                          <button
                            key={category}
                            type="button"
                            onClick={() => handleSelectCategory(category)}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-[#fce4f0] dark:hover:bg-[#f29fc8]/20"
                          >
                            {category}
                          </button>
                        ))}
                        {canCreateCategory && (
                          <div className="border-t border-gray-200 dark:border-gray-700">
                            <button
                              type="button"
                              onClick={handleCreateCategory}
                              className="w-full text-left px-4 py-2 text-sm text-[#d06a98] dark:text-[#f29fc8] hover:bg-[#fce4f0] dark:hover:bg-[#f29fc8]/20 flex items-center gap-2"
                            >
                              <Plus className="h-4 w-4" />
                              Crear "{categorySearch.trim()}"
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {selectedCategory && !isOtherSelected && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Seleccionado: {selectedCategory}
                    </p>
                  )}
                  {isOtherSelected && (
                    <div className="mt-2">
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">
                        Especificar concepto (Otros)
                      </label>
                      <input
                        type="text"
                        placeholder="Escribe el concepto..."
                        value={otherConcept}
                        onChange={(e) => setOtherConcept(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#f29fc8] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Valor</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={amount}
                      onChange={(event) => {
                        const digits = event.target.value.replace(/\D/g, '')
                        const formatted = digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
                        setAmount(formatted)
                      }}
                      className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#f29fc8] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Fecha</label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <div className="flex-1">
                      <DatePicker selectedDate={selectedDate} onDateSelect={setSelectedDate} />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Método de Pago</label>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-gray-400" />
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger className="h-11 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                        <SelectValue placeholder="Seleccionar método" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Efectivo</SelectItem>
                        <SelectItem value="transfer">Transferencia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Notas</label>
                <div className="relative">
                  <StickyNote className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <textarea
                    rows={3}
                    placeholder="Ej: Pago luz sede Sincelejo"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#f29fc8] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-end gap-2 p-4 md:p-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button
            className="bg-[#f29fc8] hover:bg-[#e07ab0] text-white"
            onClick={handleSaveExpense}
            disabled={isSaving}
          >
            {isSaving ? 'Guardando...' : 'Guardar Egreso'}
          </Button>
        </div>
      </div>
    </div>
  )
}
