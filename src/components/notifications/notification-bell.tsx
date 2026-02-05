'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell, ChevronDown, Wallet, Check, Ban } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { ExpensesService } from '@/lib/expenses-service'
import { NotificationsService } from '@/lib/notifications-service'
import type { Expense } from '@/types'
import type { Notification } from '@/types'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

const isSuperAdmin = (role?: string) =>
  role === 'superadmin' || role === 'Super Admin' || role === 'Super Administrador'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value)
}

export function NotificationBell() {
  const { user } = useAuth()
  const [pendingRequests, setPendingRequests] = useState<Expense[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [isCancelling, setIsCancelling] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const superAdmin = user ? isSuperAdmin(user.role) : false

  const loadPending = useCallback(async () => {
    if (!superAdmin) return
    const list = await ExpensesService.getPendingCancellationRequests()
    setPendingRequests(list)
  }, [superAdmin])

  const loadNotifications = useCallback(async () => {
    if (!user?.id || superAdmin) return
    const list = await NotificationsService.getUnreadForUser(user.id)
    setNotifications(list)
  }, [user?.id, superAdmin])

  useEffect(() => {
    if (superAdmin) loadPending()
    else if (user?.id) loadNotifications()
  }, [superAdmin, user?.id, loadPending, loadNotifications])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setIsOpen(false)
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const effectiveReason = (selectedExpense ? cancelReason.trim() : '')

  const handleApprove = useCallback(async () => {
    if (!selectedExpense || !user?.id) return
    const reason = cancelReason.trim()
    if (reason.length < 10) {
      toast.error('El motivo debe tener al menos 10 caracteres')
      return
    }
    setIsCancelling(true)
    const ok = await ExpensesService.cancelExpense(selectedExpense.id, reason, user.id, user.name || undefined)
    if (ok && selectedExpense.cancellationRequestedBy) {
      await NotificationsService.create({
        userId: selectedExpense.cancellationRequestedBy,
        type: 'expense_cancellation_approved',
        title: 'Anulación de egreso aprobada',
        message: `Tu solicitud de anulación del egreso "${selectedExpense.category}" (${formatCurrency(selectedExpense.amount)}) fue aprobada.`,
        metadata: { expenseId: selectedExpense.id, category: selectedExpense.category, amount: selectedExpense.amount }
      })
    }
    setIsCancelling(false)
    setSelectedExpense(null)
    setCancelReason('')
    if (ok) {
      toast.success('Egreso anulado y notificado al solicitante')
      loadPending()
    } else {
      toast.error('No se pudo anular el egreso')
    }
  }, [selectedExpense, cancelReason, user?.id, loadPending])

  const handleReject = useCallback(async () => {
    if (!selectedExpense) return
    setIsRejecting(true)
    const ok = await ExpensesService.rejectCancellationRequest(selectedExpense.id)
    if (ok && selectedExpense.cancellationRequestedBy) {
      await NotificationsService.create({
        userId: selectedExpense.cancellationRequestedBy,
        type: 'expense_cancellation_rejected',
        title: 'Solicitud de anulación rechazada',
        message: `Tu solicitud de anulación del egreso "${selectedExpense.category}" (${formatCurrency(selectedExpense.amount)}) fue rechazada.`,
        metadata: { expenseId: selectedExpense.id }
      })
    }
    setIsRejecting(false)
    setSelectedExpense(null)
    if (ok) {
      toast.success('Solicitud rechazada y notificado al solicitante')
      loadPending()
    } else {
      toast.error('No se pudo rechazar')
    }
  }, [selectedExpense, loadPending])

  const handleMarkAsRead = useCallback(async (n: Notification) => {
    await NotificationsService.markAsRead(n.id)
    setNotifications(prev => prev.filter(x => x.id !== n.id))
  }, [])

  const badgeCount = superAdmin ? pendingRequests.length : notifications.length
  const showBadge = badgeCount > 0

  if (!user) return null

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label="Notificaciones"
      >
        <Bell className="h-5 w-5" />
        {showBadge && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#f29fc8] text-[10px] font-bold text-white px-1">
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-[min(360px,calc(100vw-2rem))] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl z-[9999] max-h-[70vh] overflow-hidden flex flex-col">
          <div className="p-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <span className="font-semibold text-sm text-gray-900 dark:text-white">
              {superAdmin ? 'Solicitudes pendientes' : 'Notificaciones'}
            </span>
            {!superAdmin && notifications.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  NotificationsService.markAllAsReadForUser(user.id!)
                  setNotifications([])
                }}
                className="text-xs text-[#f29fc8] hover:underline"
              >
                Marcar todas leídas
              </button>
            )}
          </div>
          <div className="overflow-y-auto flex-1">
            {superAdmin ? (
              pendingRequests.length === 0 ? (
                <p className="p-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                  No hay solicitudes de anulación pendientes
                </p>
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                  {pendingRequests.map(expense => (
                    <li key={expense.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedExpense(expense)
                          setCancelReason('')
                        }}
                        className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-start gap-2"
                      >
                        <Wallet className="h-4 w-4 text-[#f29fc8] mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                            {expense.category}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatCurrency(expense.amount)} · Solicitado por {expense.cancellationRequestedByName || '—'}
                          </p>
                        </div>
                        <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                      </button>
                    </li>
                  ))}
                </ul>
              )
            ) : notifications.length === 0 ? (
              <p className="p-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                No tienes notificaciones nuevas
              </p>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {notifications.map(n => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => handleMarkAsRead(n)}
                      className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-start gap-2"
                    >
                      {n.type === 'expense_cancellation_approved' ? (
                        <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      ) : (
                        <Ban className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm text-gray-900 dark:text-white">{n.title}</p>
                        {n.message && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">{n.message}</p>
                        )}
                        <p className="text-[10px] text-gray-400 mt-1">
                          {new Date(n.createdAt).toLocaleString('es-CO')}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Modal: detalle de solicitud para super admin */}
      {selectedExpense && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-[#f29fc8]/30 dark:border-[#f29fc8]/40 w-full max-w-xl p-0 overflow-hidden">
            <div className="bg-gradient-to-r from-[#fce4f0] to-[#fce4f0]/70 dark:from-[#f29fc8]/30 dark:to-[#f29fc8]/20 border-b border-[#f29fc8]/30 dark:border-[#f29fc8]/40 px-6 py-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Solicitud de anulación</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                {new Date(selectedExpense.date).toLocaleDateString('es-CO')} — {selectedExpense.category} — {formatCurrency(selectedExpense.amount)}
              </p>
            </div>
            <div className="p-6 md:p-8">
              <div className="mb-6 p-4 rounded-xl bg-[#fce4f0]/60 dark:bg-[#f29fc8]/15 border border-[#f29fc8]/40 dark:border-[#f29fc8]/30">
                <p className="text-xs font-semibold text-[#d06a98] dark:text-[#f29fc8] uppercase tracking-wide mb-2">Motivo de la solicitud</p>
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  <strong className="text-gray-700 dark:text-gray-300">Quién:</strong> {selectedExpense.cancellationRequestedByName || '—'}
                </p>
                <p className="text-sm text-gray-800 dark:text-gray-200 mt-2">
                  <strong className="text-gray-700 dark:text-gray-300">Por qué:</strong> {selectedExpense.cancellationRequestReason || '—'}
                </p>
              </div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Motivo de la anulación (mín. 10 caracteres)
              </label>
              <textarea
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder={selectedExpense.cancellationRequestReason || 'Ej: Aprobado según solicitud'}
                rows={3}
                className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#f29fc8] focus:border-[#f29fc8] bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-none"
              />
              <p className={`text-xs mt-1.5 ${effectiveReason.length < 10 ? 'text-[#d06a98] dark:text-[#f29fc8]' : 'text-gray-500 dark:text-gray-400'}`}>
                {cancelReason.trim().length}/10 caracteres
              </p>
              <div className="flex flex-wrap justify-end gap-3 mt-8">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setSelectedExpense(null); setCancelReason('') }}
                  disabled={isCancelling || isRejecting}
                  className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                >
                  Cerrar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="text-[#d06a98] dark:text-[#f29fc8] border-[#f29fc8] hover:bg-[#fce4f0] dark:hover:bg-[#f29fc8]/20"
                  onClick={handleReject}
                  disabled={isRejecting}
                >
                  {isRejecting ? 'Rechazando...' : 'Rechazar'}
                </Button>
                <Button
                  type="button"
                  className="bg-[#f29fc8] hover:bg-[#e07ab0] text-white border-0"
                  onClick={handleApprove}
                  disabled={effectiveReason.length < 10 || isCancelling}
                >
                  {isCancelling ? 'Anulando...' : 'Aprobar anulación'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
