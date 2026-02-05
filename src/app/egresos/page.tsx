'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { RoleProtectedRoute } from '@/components/auth/role-protected-route'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EgresoModal } from '@/components/egresos/egreso-modal'
import { ExpensesService } from '@/lib/expenses-service'
import { NotificationsService } from '@/lib/notifications-service'
import { Expense } from '@/types'
import { useAuth } from '@/contexts/auth-context'
import { Plus, Wallet, Search, XCircle, RefreshCw, Send, Ban, ChevronDown, ChevronUp, Calendar, User, StickyNote, Receipt } from 'lucide-react'
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
  const [expenseToRequestCancel, setExpenseToRequestCancel] = useState<Expense | null>(null)
  const [requestReason, setRequestReason] = useState('')
  const [isRequesting, setIsRequesting] = useState(false)
  const [expenseToReject, setExpenseToReject] = useState<Expense | null>(null)
  const [isRejecting, setIsRejecting] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const loadExpenses = useCallback(async () => {
    setIsLoading(true)
    const data = await ExpensesService.getAllExpenses()
    setExpenses(data)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    loadExpenses()
  }, [loadExpenses])

  useEffect(() => {
    if (expenseToCancel) {
      setCancelReason('')
    }
  }, [expenseToCancel?.id])

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

  const isSuperAdmin =
    user?.role === 'superadmin' ||
    user?.role === 'Super Admin' ||
    user?.role === 'Super Administrador'
  const canCancelExpense = isSuperAdmin

  const handleCancelExpense = useCallback(async () => {
    if (!expenseToCancel || cancelReason.trim().length < 10) return
    if (!canCancelExpense) return
    const formatCurr = (v: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v)
    setIsCancelling(true)
    const ok = await ExpensesService.cancelExpense(expenseToCancel.id, cancelReason.trim(), user?.id, user?.name || undefined)
    if (ok && expenseToCancel.cancellationRequestedBy) {
      await NotificationsService.create({
        userId: expenseToCancel.cancellationRequestedBy,
        type: 'expense_cancellation_approved',
        title: 'Anulación de egreso aprobada',
        message: `Tu solicitud de anulación del egreso "${expenseToCancel.category}" (${formatCurr(expenseToCancel.amount)}) fue aprobada.`,
        metadata: { expenseId: expenseToCancel.id, category: expenseToCancel.category, amount: expenseToCancel.amount }
      })
    }
    setIsCancelling(false)
    setExpenseToCancel(null)
    setCancelReason('')
    if (ok) {
      toast.success('Egreso anulado correctamente')
      loadExpenses()
    } else {
      toast.error('No se pudo anular el egreso')
    }
  }, [expenseToCancel, cancelReason, user?.id, loadExpenses, canCancelExpense])

  const closeCancelModal = useCallback(() => {
    setExpenseToCancel(null)
    setCancelReason('')
  }, [])

  const hasPendingRequest = (expense: Expense) =>
    !!(expense.status === 'active' && expense.cancellationRequestedAt)

  const handleRequestCancellation = useCallback(async () => {
    if (!expenseToRequestCancel || requestReason.trim().length < 10 || !user?.id) return
    setIsRequesting(true)
    const ok = await ExpensesService.requestCancellation(
      expenseToRequestCancel.id,
      requestReason.trim(),
      user.id,
      user.name || user.email || 'Usuario'
    )
    setIsRequesting(false)
    setExpenseToRequestCancel(null)
    setRequestReason('')
    if (ok) {
      toast.success('Solicitud enviada. El super administrador la revisará.')
      loadExpenses()
    } else {
      toast.error('No se pudo enviar la solicitud')
    }
  }, [expenseToRequestCancel, requestReason, user?.id, user?.name, user?.email, loadExpenses])

  const closeRequestModal = useCallback(() => {
    setExpenseToRequestCancel(null)
    setRequestReason('')
  }, [])

  const handleRejectRequest = useCallback(async () => {
    if (!expenseToReject) return
    setIsRejecting(true)
    const ok = await ExpensesService.rejectCancellationRequest(expenseToReject.id)
    if (ok && expenseToReject.cancellationRequestedBy) {
      const formatCurr = (v: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v)
      await NotificationsService.create({
        userId: expenseToReject.cancellationRequestedBy,
        type: 'expense_cancellation_rejected',
        title: 'Solicitud de anulación rechazada',
        message: `Tu solicitud de anulación del egreso "${expenseToReject.category}" (${formatCurr(expenseToReject.amount)}) fue rechazada.`,
        metadata: { expenseId: expenseToReject.id }
      })
    }
    setIsRejecting(false)
    setExpenseToReject(null)
    if (expenseToCancel?.id === expenseToReject.id) {
      setExpenseToCancel(null)
      setCancelReason('')
    }
    if (ok) {
      toast.success('Solicitud de anulación rechazada')
      loadExpenses()
    } else {
      toast.error('No se pudo rechazar la solicitud')
    }
  }, [expenseToReject, expenseToCancel?.id, loadExpenses])

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

  const formatDateTime = (iso: string | null | undefined) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('es-CO', {
      dateStyle: 'short',
      timeStyle: 'short'
    })
  }

  const getPaymentMethodBadgeClass = (method: string) => {
    if (method === 'cash') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
    if (method === 'transfer') return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
    return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
  }

  const getStatusBadgeClass = (expense: Expense) => {
    if (expense.status === 'cancelled') return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
    if (hasPendingRequest(expense)) return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
    return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
  }

  const getStatusLabel = (expense: Expense) => {
    if (expense.status === 'cancelled') return 'Anulado'
    if (hasPendingRequest(expense)) return 'Pend. anulación'
    return 'Activo'
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
              <div className="space-y-4 p-4 md:p-6">
                {filteredExpenses.map(expense => {
                  const isExpanded = expandedId === expense.id
                  const expenseDate = new Date(expense.date).toLocaleDateString('es-CO')
                  const expenseTime = expense.createdAt ? new Date(expense.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '—'
                  return (
                    <Card
                      key={expense.id}
                      className={`bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all cursor-pointer ${
                        isExpanded ? 'border-[#f29fc8] dark:border-[#f29fc8]' : ''
                      } ${expense.status === 'cancelled' ? 'opacity-90' : ''}`}
                      onClick={() => setExpandedId(isExpanded ? null : expense.id)}
                    >
                      <CardContent className="p-4 md:p-6">
                        {/* Header: icono, concepto y botones (igual que ventas) */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Wallet className="h-5 w-5 text-[#f29fc8] dark:text-[#f29fc8] flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Concepto</div>
                              <div className="text-xl font-bold text-gray-900 dark:text-white truncate">
                                {expense.category}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                            {expense.status === 'active' && canCancelExpense && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={e => { e.stopPropagation(); setExpenseToCancel(expense) }}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                title="Anular"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            )}
                            {expense.status === 'active' && !canCancelExpense && !hasPendingRequest(expense) && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={e => { e.stopPropagation(); setExpenseToRequestCancel(expense) }}
                                className="h-8 px-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20"
                                title="Solicitar anulación"
                              >
                                <Send className="h-4 w-4 mr-1.5" />
                                <span className="text-xs hidden sm:inline">Solicitar anulación</span>
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={e => { e.stopPropagation(); setExpandedId(isExpanded ? null : expense.id) }}
                              className="h-8 w-8 p-0 hover:bg-[#fce4f0] dark:hover:bg-[#f29fc8]/20"
                              title={isExpanded ? 'Ocultar detalle' : 'Ver detalle'}
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-5 w-5 text-[#f29fc8] dark:text-[#f29fc8] font-bold" />
                              ) : (
                                <ChevronDown className="h-5 w-5 text-[#f29fc8] dark:text-[#f29fc8] font-bold" />
                              )}
                            </Button>
                          </div>
                        </div>

                        {/* Grid Total, Método, Estado, Fecha (igual que ventas) */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total</div>
                            <div className="text-base font-semibold text-gray-900 dark:text-white">
                              {formatCurrency(expense.amount)}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Método</div>
                            <Badge className={`${getPaymentMethodBadgeClass(expense.paymentMethod)} flex items-center gap-1 w-fit text-sm whitespace-nowrap`}>
                              {formatPaymentMethod(expense.paymentMethod)}
                            </Badge>
                          </div>
                          <div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Estado</div>
                            <Badge className={`${getStatusBadgeClass(expense)} flex items-center gap-1 w-fit text-sm whitespace-nowrap`}>
                              {getStatusLabel(expense)}
                            </Badge>
                          </div>
                          <div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Fecha</div>
                            <div className="text-base font-semibold text-gray-900 dark:text-white">{expenseDate}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{expenseTime}</div>
                          </div>
                        </div>

                        {/* Detalle expandible (mismo estilo que ventas) */}
                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600 space-y-4">
                            {/* Fecha de creación / info adicional */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-2">
                                  <Calendar className="h-4 w-4" />
                                  Fecha del egreso
                                </div>
                                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {expenseDate}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-2">
                                  <Receipt className="h-4 w-4" />
                                  Método de pago
                                </div>
                                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {formatPaymentMethod(expense.paymentMethod)}
                                </div>
                              </div>
                            </div>

                            {/* Notas del egreso (card como Productos Vendidos) */}
                            <div>
                              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                <StickyNote className="h-4 w-4 text-[#f29fc8]" />
                                Notas del egreso
                              </h3>
                              <div className="border rounded-lg p-3 bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600">
                                <p className="text-sm text-gray-800 dark:text-gray-200">{expense.notes || '—'}</p>
                              </div>
                            </div>

                            {/* Trazabilidad anulación (si anulado o pendiente) */}
                            {expense.status === 'cancelled' && (
                              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                  <Receipt className="h-4 w-4 text-[#f29fc8]" />
                                  Trazabilidad de la anulación
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="border rounded-lg p-3 bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600">
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-2">
                                      <User className="h-3.5 w-3.5" />
                                      Quién solicitó
                                    </div>
                                    <div className="text-sm font-semibold text-gray-900 dark:text-white">{expense.cancellationRequestedByName || '—'}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{formatDateTime(expense.cancellationRequestedAt)}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 mb-1">Motivo de la solicitud</div>
                                    <p className="text-sm text-gray-800 dark:text-gray-200">{expense.cancellationRequestReason || '—'}</p>
                                  </div>
                                  <div className="border rounded-lg p-3 bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600">
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-2">
                                      <User className="h-3.5 w-3.5" />
                                      Quién aprobó
                                    </div>
                                    <div className="text-sm font-semibold text-gray-900 dark:text-white">{expense.cancelledByName || '—'}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{formatDateTime(expense.cancelledAt)}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 mb-1">Motivo al aprobar</div>
                                    <p className="text-sm text-gray-800 dark:text-gray-200">{expense.cancellationReason || '—'}</p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {hasPendingRequest(expense) && (
                              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                                <h3 className="text-base font-semibold text-amber-700 dark:text-amber-400 mb-3 flex items-center gap-2">
                                  <Send className="h-4 w-4" />
                                  Solicitud de anulación pendiente
                                </h3>
                                <div className="border rounded-lg p-3 bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800">
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-2">
                                    <User className="h-3.5 w-3.5" />
                                    Solicitado por
                                  </div>
                                  <div className="text-sm font-semibold text-gray-900 dark:text-white">{expense.cancellationRequestedByName || '—'}</div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{formatDateTime(expense.cancellationRequestedAt)}</div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 mb-1">Motivo</div>
                                  <p className="text-sm text-gray-800 dark:text-gray-200">{expense.cancellationRequestReason || '—'}</p>
                                </div>
                              </div>
                            )}

                            {/* Resumen (valor total destacado, como ventas) */}
                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                <Wallet className="h-4 w-4 text-[#f29fc8]" />
                                Resumen
                              </h3>
                              <div className="flex items-center justify-between rounded-lg bg-[#fce4f0]/30 dark:bg-[#f29fc8]/10 p-3 border border-[#f29fc8]/30">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Total del egreso</span>
                                <span className="text-lg font-bold text-[#f29fc8] dark:text-[#f29fc8]">{formatCurrency(expense.amount)}</span>
                              </div>
                            </div>

                            {/* Botón Anular al final (solo super admin, egreso activo) */}
                            {expense.status === 'active' && canCancelExpense && (
                              <div className="pt-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={e => { e.stopPropagation(); setExpenseToCancel(expense) }}
                                  className="w-full sm:w-auto text-red-600 border-red-300 hover:bg-red-50 dark:border-red-700 dark:hover:bg-red-900/20"
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Anular egreso
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
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
              {hasPendingRequest(expenseToCancel) && (
                <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-200 mb-1">Solicitud de anulación</p>
                  <p className="text-sm text-gray-700 dark:text-gray-200">
                    <strong>Quién:</strong> {expenseToCancel.cancellationRequestedByName || '—'}
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-200 mt-1">
                    <strong>Motivo:</strong> {expenseToCancel.cancellationRequestReason || '—'}
                  </p>
                </div>
              )}
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
              <div className="flex flex-wrap justify-end gap-2 mt-6">
                {hasPendingRequest(expenseToCancel) && (
                  <Button
                    type="button"
                    variant="outline"
                    className="text-amber-600 border-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                    onClick={() => { setExpenseToReject(expenseToCancel); closeCancelModal() }}
                    disabled={isRejecting}
                  >
                    <Ban className="h-4 w-4 mr-1" />
                    Rechazar solicitud
                  </Button>
                )}
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

        {expenseToRequestCancel && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-[#f29fc8]/30 dark:border-[#f29fc8]/40 w-full max-w-md p-0 overflow-hidden">
              <div className="bg-gradient-to-r from-[#fce4f0] to-[#fce4f0]/70 dark:from-[#f29fc8]/30 dark:to-[#f29fc8]/20 border-b border-[#f29fc8]/30 dark:border-[#f29fc8]/40 px-6 py-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Solicitar anulación de egreso</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {new Date(expenseToRequestCancel.date).toLocaleDateString('es-CO')} — {expenseToRequestCancel.category} — {formatCurrency(expenseToRequestCancel.amount)}
                </p>
              </div>
              <div className="p-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Motivo de la solicitud <span className="text-[#d06a98] dark:text-[#f29fc8]">*</span> (mínimo 10 caracteres)
                </label>
                <textarea
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  placeholder="Ej: Registrado por error, duplicado..."
                  rows={3}
                  className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#f29fc8] focus:border-[#f29fc8] bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-none"
                />
                <p className={`text-xs mt-1.5 ${requestReason.trim().length < 10 ? 'text-[#d06a98] dark:text-[#f29fc8]' : 'text-gray-500 dark:text-gray-400'}`}>
                  {requestReason.trim().length}/10 caracteres
                </p>
                <div className="flex justify-end gap-3 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeRequestModal}
                    disabled={isRequesting}
                    className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    className="bg-[#f29fc8] hover:bg-[#e07ab0] text-white border-0"
                    disabled={requestReason.trim().length < 10 || isRequesting}
                    onClick={handleRequestCancellation}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {isRequesting ? 'Enviando...' : 'Enviar solicitud'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {expenseToReject && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Rechazar solicitud</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                ¿Rechazar la solicitud de anulación de este egreso? El egreso seguirá activo y se quitará el estado &quot;Pendiente de anulación&quot;.
              </p>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setExpenseToReject(null)} disabled={isRejecting}>
                  No
                </Button>
                <Button
                  type="button"
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                  disabled={isRejecting}
                  onClick={handleRejectRequest}
                >
                  {isRejecting ? 'Rechazando...' : 'Sí, rechazar'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RoleProtectedRoute>
  )
}
