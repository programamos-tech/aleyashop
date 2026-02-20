'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  X,
  Calendar,
  DollarSign,
  TrendingDown,
  Package,
  Plus,
  Wallet,
} from 'lucide-react'
import { Sale, Expense } from '@/types'
import { SalesService } from '@/lib/sales-service'
import { ExpensesService } from '@/lib/expenses-service'
import { CreditsService } from '@/lib/credits-service'
import { getCurrentUserStoreId } from '@/lib/store-helper'
import { useAuth } from '@/contexts/auth-context'
import { toast } from 'sonner'

const CIERRE_CATEGORY = 'Cierre de caja mensual'

interface MonthlyClosingModalProps {
  isOpen: boolean
  onClose: () => void
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function MonthlyClosingModal({ isOpen, onClose }: MonthlyClosingModalProps) {
  const { user } = useAuth()
  const today = new Date()
  const [closeUntilDate, setCloseUntilDate] = useState<Date>(today)
  const [sales, setSales] = useState<Sale[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [paymentRecords, setPaymentRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Form for adding final expense
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseNotes, setExpenseNotes] = useState('')
  const [savingExpense, setSavingExpense] = useState(false)

  const loadData = useCallback(async () => {
    if (!isOpen) return
    setLoading(true)
    try {
      const startOfMonth = new Date(closeUntilDate.getFullYear(), closeUntilDate.getMonth(), 1, 0, 0, 0, 0)
      const endOfDay = new Date(closeUntilDate.getFullYear(), closeUntilDate.getMonth(), closeUntilDate.getDate(), 23, 59, 59, 999)

      const [salesRes, expensesRes, paymentsRes] = await Promise.all([
        SalesService.getDashboardSales(startOfMonth, endOfDay),
        ExpensesService.getExpensesByDateRange(startOfMonth, endOfDay),
        CreditsService.getPaymentRecordsByDateRange(startOfMonth, endOfDay),
      ])

      setSales(salesRes || [])
      setExpenses(expensesRes || [])
      setPaymentRecords(paymentsRes || [])
    } catch (e) {
      toast.error('Error al cargar datos del cierre')
      setSales([])
      setExpenses([])
      setPaymentRecords([])
    } finally {
      setLoading(false)
    }
  }, [isOpen, closeUntilDate])

  useEffect(() => {
    loadData()
  }, [loadData])

  const storeId = getCurrentUserStoreId()
  const activeSales = sales.filter((s) => s.status !== 'cancelled' && s.status !== 'draft')
  const activeExpenses = expenses.filter((e) => e.status !== 'cancelled')
  const storeExpenses = storeId ? activeExpenses.filter((e) => !e.storeId || e.storeId === storeId) : activeExpenses
  const validPayments = paymentRecords.filter((p) => p.status !== 'cancelled')

  let cashRevenue = 0
  let transferRevenue = 0
  activeSales.forEach((sale) => {
    if (sale.payments && sale.payments.length > 0) {
      sale.payments.forEach((p) => {
        if (p.paymentType === 'cash') cashRevenue += p.amount || 0
        else if (p.paymentType === 'transfer') transferRevenue += p.amount || 0
      })
    } else {
      if (sale.paymentMethod === 'cash') cashRevenue += sale.total
      else if (sale.paymentMethod === 'transfer') transferRevenue += sale.total
    }
  })
  validPayments.filter((p) => p.paymentMethod === 'cash').forEach((p) => (cashRevenue += p.amount || 0))
  validPayments.filter((p) => p.paymentMethod === 'transfer').forEach((p) => (transferRevenue += p.amount || 0))

  storeExpenses.forEach((exp) => {
    if (exp.paymentMethod === 'cash') cashRevenue -= exp.amount || 0
    else if (exp.paymentMethod === 'transfer') transferRevenue -= exp.amount || 0
  })

  const totalDeliveryFees = activeSales.reduce((sum, s) => sum + (s.isDelivery && s.deliveryFee ? s.deliveryFee : 0), 0)
  const totalIngresos = cashRevenue + transferRevenue - totalDeliveryFees
  const totalEgresos = storeExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
  const utilidadNeta = totalIngresos - totalEgresos
  const totalVentasBruto = activeSales.reduce((sum, s) => sum + (s.total - (s.isDelivery && s.deliveryFee ? s.deliveryFee : 0)), 0)
  const unidadesVendidas = activeSales.reduce((sum, s) => sum + (s.items?.reduce((s2, i) => s2 + i.quantity, 0) || 0), 0)

  const handleAddFinalExpense = async () => {
    const amount = Number(expenseAmount.replace(/\D/g, ''))
    if (!amount || amount <= 0) {
      toast.error('Ingresa un monto válido')
      return
    }
    setSavingExpense(true)
    try {
      const lastDayOfMonth = new Date(closeUntilDate.getFullYear(), closeUntilDate.getMonth() + 1, 0)
      const dateStr = lastDayOfMonth.toISOString().split('T')[0]
      const created = await ExpensesService.createExpense(
        {
          storeId: storeId || undefined,
          category: CIERRE_CATEGORY,
          amount,
          date: dateStr,
          paymentMethod: 'transfer',
          notes: expenseNotes.trim() || `Egreso final del mes (cierre de caja)`,
        },
        user?.id
      )
      if (created) {
        toast.success('Egreso de cierre agregado')
        setExpenseAmount('')
        setExpenseNotes('')
        setShowAddExpense(false)
        loadData()
      } else {
        toast.error('No se pudo guardar el egreso')
      }
    } catch {
      toast.error('Error al guardar')
    } finally {
      setSavingExpense(false)
    }
  }

  const startOfMonth = new Date(closeUntilDate.getFullYear(), closeUntilDate.getMonth(), 1)
  const periodLabel = `${startOfMonth.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })} – ${closeUntilDate.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}`

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-gray-200 dark:border-gray-700">
          <CardTitle className="flex items-center gap-2 text-xl text-gray-900 dark:text-white">
            <Wallet className="h-6 w-6 text-[#f29fc8]" />
            Cierre de caja mensual
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Fecha hasta */}
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Ver cierre hasta:</label>
            <input
              type="date"
              value={closeUntilDate.toISOString().split('T')[0]}
              max={today.toISOString().split('T')[0]}
              onChange={(e) => setCloseUntilDate(new Date(e.target.value + 'T23:59:59'))}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm"
            />
            <span className="text-xs text-gray-500 dark:text-gray-400">{periodLabel}</span>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#f29fc8] border-t-transparent" />
            </div>
          ) : (
            <>
              {/* Resumen */}
              <Card className="bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Total ingresos del periodo</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(totalIngresos)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Total ventas (sin domicilios)</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(totalVentasBruto)}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-gray-200 dark:border-gray-700 pt-3">
                    <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                      <TrendingDown className="h-4 w-4" /> Total egresos
                    </span>
                    <span className="font-semibold text-red-600 dark:text-red-400">- {formatCurrency(totalEgresos)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t-2 border-[#f29fc8]/30">
                    <span className="font-medium text-gray-900 dark:text-white">Utilidad neta del periodo</span>
                    <span className={`text-lg font-bold ${utilidadNeta >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {formatCurrency(utilidadNeta)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                      <Package className="h-4 w-4" /> Unidades vendidas
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">{unidadesVendidas}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Lista de egresos */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Egresos del mes</h3>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-[#f29fc8] border-[#f29fc8] hover:bg-[#fce4f0] dark:hover:bg-[#f29fc8]/20"
                    onClick={() => setShowAddExpense((v) => !v)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Egreso final del mes
                  </Button>
                </div>
                {showAddExpense && (
                  <Card className="mb-4 border-[#f29fc8]/40 bg-[#fce4f0]/10 dark:bg-[#f29fc8]/5">
                    <CardContent className="pt-4 space-y-3">
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Este egreso se resta del total del cierre y no afecta la caja del día.
                      </p>
                      <input
                        type="text"
                        placeholder="Monto"
                        value={expenseAmount}
                        onChange={(e) => setExpenseAmount(e.target.value.replace(/[^\d]/g, ''))}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Concepto (opcional)"
                        value={expenseNotes}
                        onChange={(e) => setExpenseNotes(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleAddFinalExpense} disabled={savingExpense} className="bg-[#f29fc8] hover:bg-[#e07ab0]">
                          {savingExpense ? 'Guardando…' : 'Agregar'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setShowAddExpense(false)}>
                          Cancelar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
                <ul className="space-y-2 max-h-48 overflow-y-auto">
                  {storeExpenses.length === 0 ? (
                    <li className="text-sm text-gray-500 dark:text-gray-400 py-2">No hay egresos en este periodo.</li>
                  ) : (
                    storeExpenses.map((exp) => (
                      <li
                        key={exp.id}
                        className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700/50 text-sm"
                      >
                        <span className="text-gray-700 dark:text-gray-300">
                          {exp.category} {exp.notes ? `· ${exp.notes}` : ''}
                        </span>
                        <span className="font-medium text-red-600 dark:text-red-400">- {formatCurrency(exp.amount)}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </>
          )}
        </CardContent>
      </div>
    </div>
  )
}
