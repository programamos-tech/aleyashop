'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { RoleProtectedRoute } from '@/components/auth/role-protected-route'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { EgresoModal } from '@/components/egresos/egreso-modal'
import { ExpensesService } from '@/lib/expenses-service'
import { Expense } from '@/types'
import { useAuth } from '@/contexts/auth-context'
import { Plus, Wallet, Search, XCircle, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

export default function EgresosPage() {
  const { user } = useAuth()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [expenseToCancel, setExpenseToCancel] = useState<Expense | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [isCancelling, setIsCancelling] = useState(false)

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

  const handleCancelExpense = useCallback(async () => {
    if (!expenseToCancel || cancelReason.trim().length < 10) return
    setIsCancelling(true)
    const ok = await ExpensesService.cancelExpense(expenseToCancel.id, cancelReason.trim(), user?.id)
    setIsCancelling(false)
    setExpenseToCancel(null)
    setCancelReason('')
    if (ok) {
      toast.success('Egreso anulado correctamente')
      loadExpenses()
    } else {
      toast.error('No se pudo anular el egreso')
    }
  }, [expenseToCancel, cancelReason, user?.id, loadExpenses])

  const closeCancelModal = useCallback(() => {
    setExpenseToCancel(null)
    setCancelReason('')
  }, [])

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
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 md:gap-4">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2 flex-wrap">
                    <Wallet className="h-5 w-5 md:h-6 md:w-6 text-[#f29fc8] flex-shrink-0" />
                    <span className="flex-shrink-0">Gestión de Gastos y Egresos</span>
                  </CardTitle>
                  <p className="text-xs md:text-base text-gray-600 dark:text-gray-300 mt-1 hidden md:block">
                    Resumen y control de egresos del mes
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 md:hidden">
                    Resumen y control de egresos
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    type="button"
                    onClick={() => { loadExpenses(); toast.success('Lista actualizada') }}
                    variant="outline"
                    className="text-[#f29fc8] border-[#f29fc8] hover:bg-[#fce4f0] dark:text-[#f29fc8] dark:border-[#f29fc8] dark:hover:bg-[#f29fc8]/20 text-xs md:text-sm px-2 md:px-4 py-1.5 md:py-2"
                  >
                    <RefreshCw className="h-3.5 w-3.5 md:h-4 md:w-4 md:mr-2" />
                    <span className="hidden md:inline">Actualizar</span>
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="bg-[#f29fc8] hover:bg-[#e07ab0] text-white text-xs md:text-sm px-2 md:px-4 py-1.5 md:py-2 flex-1 sm:flex-none"
                  >
                    <Plus className="h-3.5 w-3.5 md:h-4 md:w-4 md:mr-1" />
                    <span className="hidden sm:inline">Registrar Nuevo Egreso</span>
                    <span className="sm:hidden">Nuevo Egreso</span>
                  </Button>
                </div>
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
                  placeholder="Buscar por concepto, notas o método..."
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
              </select>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-10 text-center text-gray-500 dark:text-gray-400 text-sm">
                Cargando egresos...
              </div>
            ) : filteredExpenses.length === 0 ? (
              <div className="py-10 text-center text-gray-500 dark:text-gray-400 text-sm">
                No hay egresos registrados.
              </div>
            ) : (
              <>
                {/* Vista tarjetas: móvil y tablet */}
                <div className="md:hidden space-y-3 p-3">
                  {filteredExpenses.map(expense => (
                    <div
                      key={expense.id}
                      className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2 ${expense.status === 'cancelled' ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                            {expense.category}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(expense.date).toLocaleDateString('es-CO')} · {formatPaymentMethod(expense.paymentMethod)}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-[#f29fc8] shrink-0">
                          {formatCurrency(expense.amount)}
                        </span>
                      </div>
                      {expense.notes ? (
                        <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
                          {expense.notes}
                        </p>
                      ) : null}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                        {expense.status === 'cancelled' ? (
                          <span className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-900/30 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:text-red-300">
                            Anulado
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/30 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:text-green-300">
                            Activo
                          </span>
                        )}
                        {expense.status === 'active' && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 text-xs"
                            onClick={() => setExpenseToCancel(expense)}
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" />
                            Anular
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Vista tabla: desktop */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-900/40 text-gray-600 dark:text-gray-300">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold">Fecha</th>
                        <th className="px-4 py-3 text-left font-semibold">Concepto</th>
                        <th className="px-4 py-3 text-left font-semibold">Método</th>
                        <th className="px-4 py-3 text-right font-semibold">Valor</th>
                        <th className="px-4 py-3 text-left font-semibold">Notas</th>
                        <th className="px-4 py-3 text-center font-semibold">Estado</th>
                        <th className="px-4 py-3 text-center font-semibold">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredExpenses.map(expense => (
                        <tr
                          key={expense.id}
                          className={`hover:bg-gray-50 dark:hover:bg-gray-900/40 ${expense.status === 'cancelled' ? 'opacity-60' : ''}`}
                        >
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
                          <td className="px-4 py-3 text-center">
                            {expense.status === 'cancelled' ? (
                              <span className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-900/30 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:text-red-300">
                                Anulado
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/30 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:text-green-300">
                                Activo
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {expense.status === 'active' && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                onClick={() => setExpenseToCancel(expense)}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Anular
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <EgresoModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSaved={loadExpenses}
        />

        {expenseToCancel && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Anular egreso</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                {new Date(expenseToCancel.date).toLocaleDateString('es-CO')} — {expenseToCancel.category} — {formatCurrency(expenseToCancel.amount)}
              </p>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Motivo de la anulación <span className="text-red-500">*</span> (mínimo 10 caracteres)
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ej: Registrado por error, duplicado..."
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#f29fc8] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 resize-none"
              />
              <p className={`text-xs mt-1 ${cancelReason.trim().length < 10 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'}`}>
                {cancelReason.trim().length}/10 caracteres
              </p>
              <div className="flex justify-end gap-2 mt-6">
                <Button type="button" variant="outline" onClick={closeCancelModal} disabled={isCancelling}>
                  Cancelar
                </Button>
                <Button
                  type="button"
                  className="bg-red-600 hover:bg-red-700 text-white"
                  disabled={cancelReason.trim().length < 10 || isCancelling}
                  onClick={handleCancelExpense}
                >
                  {isCancelling ? 'Anulando...' : 'Anular'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RoleProtectedRoute>
  )
}
