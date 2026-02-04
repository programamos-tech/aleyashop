'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { RoleProtectedRoute } from '@/components/auth/role-protected-route'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { EgresoModal } from '@/components/egresos/egreso-modal'
import { ExpensesService } from '@/lib/expenses-service'
import { Expense } from '@/types'
import { Plus, Wallet, Search } from 'lucide-react'

export default function EgresosPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('all')

  const loadExpenses = useCallback(async () => {
    setIsLoading(true)
    const data = await ExpensesService.getAllExpenses()
    setExpenses(data)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    loadExpenses()
  }, [loadExpenses])

  const filteredExpenses = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return expenses.filter(expense => {
      const matchesQuery = !query || [
        expense.category,
        expense.notes || '',
        expense.paymentMethod
      ].some(value => value.toLowerCase().includes(query))

      const matchesPayment = paymentFilter === 'all' || expense.paymentMethod === paymentFilter
      return matchesQuery && matchesPayment
    })
  }, [expenses, searchTerm, paymentFilter])

  const totalMonthAmount = useMemo(() => {
    if (expenses.length === 0) return 0
    const now = new Date()
    return expenses
      .filter(expense => {
        const date = new Date(expense.date)
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
      })
      .reduce((sum, expense) => sum + expense.amount, 0)
  }, [expenses])

  const topCategory = useMemo(() => {
    if (expenses.length === 0) return 'Sin datos'
    const totals = new Map<string, number>()
    expenses.forEach(expense => {
      totals.set(expense.category, (totals.get(expense.category) || 0) + expense.amount)
    })
    let top = 'Sin datos'
    let topValue = 0
    totals.forEach((value, key) => {
      if (value > topValue) {
        topValue = value
        top = key
      }
    })
    return top
  }, [expenses])

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value)

  const formatPaymentMethod = (value: string) => {
    if (value === 'cash') return 'Efectivo'
    if (value === 'transfer') return 'Transferencia'
    if (value === 'petty-cash') return 'Caja Menor'
    return value
  }

  return (
    <RoleProtectedRoute module="egresos" requiredAction="view">
      <div className="p-4 md:p-6 space-y-4 md:space-y-6 bg-white dark:bg-gray-900 min-h-screen">
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader className="p-3 md:p-6">
            <div className="flex flex-col gap-3 md:gap-4">
              <div className="flex flex-col gap-2">
                <CardTitle className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white flex items-center justify-center gap-2 flex-wrap text-center">
                  <Wallet className="h-5 w-5 md:h-6 md:w-6 text-[#f29fc8] flex-shrink-0" />
                  <span>Gestión de Gastos y Egresos</span>
                </CardTitle>
                <CardDescription className="text-xs md:text-base text-gray-600 dark:text-gray-300 text-center">
                  Resumen y control de egresos del mes
                </CardDescription>
              </div>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 w-full">
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Total Mes</p>
                    <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(totalMonthAmount)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Gasto Mayor</p>
                    <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">{topCategory}</p>
                  </div>
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Presupuesto Restante</p>
                    <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">Por definir</p>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs md:text-sm px-2 md:px-4 py-1.5 md:py-2 flex-1 sm:flex-none"
                >
                  <Plus className="h-3.5 w-3.5 md:h-4 md:w-4 md:mr-1" />
                  <span className="hidden sm:inline">Registrar Nuevo Egreso</span>
                  <span className="sm:hidden">Nuevo Egreso</span>
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-3 md:p-4">
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por categoría, notas o método..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="w-full pl-9 md:pl-10 pr-10 md:pr-4 py-2 md:py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#f29fc8] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
              <select
                value={paymentFilter}
                onChange={(event) => setPaymentFilter(event.target.value)}
                className="w-full sm:w-auto sm:min-w-[200px] px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#f29fc8] focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700"
              >
                <option value="all">Todos los métodos</option>
                <option value="cash">Efectivo</option>
                <option value="transfer">Transferencia</option>
                <option value="petty-cash">Caja Menor</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/40 text-gray-600 dark:text-gray-300">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Fecha</th>
                    <th className="px-4 py-3 text-left font-semibold">Categoría</th>
                    <th className="px-4 py-3 text-left font-semibold">Método</th>
                    <th className="px-4 py-3 text-right font-semibold">Valor</th>
                    <th className="px-4 py-3 text-left font-semibold">Notas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {isLoading && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">
                        Cargando egresos...
                      </td>
                    </tr>
                  )}
                  {!isLoading && filteredExpenses.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">
                        No hay egresos registrados.
                      </td>
                    </tr>
                  )}
                  {!isLoading && filteredExpenses.map(expense => (
                    <tr key={expense.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                        {new Date(expense.date).toLocaleDateString('es-CO')}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{expense.category}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                        {formatPaymentMethod(expense.paymentMethod)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(expense.amount)}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                        {expense.notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <EgresoModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSaved={loadExpenses}
        />
      </div>
    </RoleProtectedRoute>
  )
}
