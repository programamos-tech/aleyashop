'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { 
  X, 
  XCircle, 
  DollarSign,
  User,
  FileText,
  Calendar
} from 'lucide-react'
import { Sale } from '@/types'
import { supabaseAdmin } from '@/lib/supabase'

interface CancelledInvoiceInfo extends Sale {
  cancellationReason?: string
  cancelledBy?: string
  cancelledByName?: string
  cancelledAt?: string
}

interface CancelledInvoicesModalProps {
  isOpen: boolean
  onClose: () => void
  sales: Sale[]
  allSales?: Sale[]
}

export function CancelledInvoicesModal({ isOpen, onClose, sales }: CancelledInvoicesModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [cancelledInvoices, setCancelledInvoices] = useState<CancelledInvoiceInfo[]>([])

  // Cargar información de cancelación desde los logs
  useEffect(() => {
    if (isOpen) {
      loadCancellationInfo()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, sales])

  const loadCancellationInfo = async () => {
    setIsLoading(true)
    try {
      const cancelledSales = sales.filter(sale => sale.status === 'cancelled')
      
      // Obtener solo los logs de cancelación directamente (más eficiente)
      let cancellationLogs: any[] = []
      
      try {
        const { data: logs, error } = await supabaseAdmin
          .from('logs')
          .select(`
            id,
            user_id,
            action,
            module,
            details,
            created_at,
            users (
              id,
              name
            )
          `)
          .eq('action', 'sale_cancel')
          .eq('module', 'sales')
          .order('created_at', { ascending: false })
        
        if (error) {
          // Si falla con JOIN, intentar sin JOIN
          const { data: logsWithoutJoin, error: errorWithoutJoin } = await supabaseAdmin
            .from('logs')
            .select('id, user_id, action, module, details, created_at')
            .eq('action', 'sale_cancel')
            .eq('module', 'sales')
            .order('created_at', { ascending: false })
          
          if (!errorWithoutJoin && logsWithoutJoin) {
            // Obtener nombres de usuarios por separado
            const userIds = [...new Set(logsWithoutJoin.map((log: any) => log.user_id).filter(Boolean))]
            const userNames: { [key: string]: string } = {}
            
            if (userIds.length > 0) {
              const { data: users } = await supabaseAdmin
                .from('users')
                .select('id, name')
                .in('id', userIds)
              
              if (users) {
                users.forEach((user: any) => {
                  userNames[user.id] = user.name
                })
              }
            }
            
            cancellationLogs = logsWithoutJoin.map((log: any) => {
              // Parsear details si es un string JSON
              let parsedDetails = log.details || {}
              if (typeof log.details === 'string') {
                try {
                  parsedDetails = JSON.parse(log.details)
                } catch {
                  parsedDetails = {}
                }
              }
              
              return {
                id: log.id,
                user_id: log.user_id,
                action: log.action,
                module: log.module,
                details: parsedDetails,
                created_at: log.created_at,
                user_name: log.user_id ? (userNames[log.user_id] || 'Usuario Desconocido') : 'Usuario Desconocido'
              }
            })
          }
        } else if (logs) {
          cancellationLogs = logs.map((log: any) => {
            // Parsear details si es un string JSON
            let parsedDetails = log.details || {}
            if (typeof log.details === 'string') {
              try {
                parsedDetails = JSON.parse(log.details)
              } catch {
                parsedDetails = {}
              }
            }
            
            return {
              id: log.id,
              user_id: log.user_id,
              action: log.action,
              module: log.module,
              details: parsedDetails,
              created_at: log.created_at,
              user_name: (log.users && typeof log.users === 'object' && log.users.name) 
                ? String(log.users.name) 
                : 'Usuario Desconocido'
            }
          })
        }
      } catch (err) {
        // Error silencioso - continuar sin información de logs
        console.warn('[CancelledInvoicesModal] Error fetching cancellation logs:', err)
      }

      // Mapear las ventas canceladas con su información de cancelación
      const invoicesWithInfo: CancelledInvoiceInfo[] = cancelledSales.map(sale => {
        // Buscar el log de cancelación que coincida con esta venta
        // Intentar por saleId en details, o por invoice_number si está disponible
        const cancellationLog = cancellationLogs.find(log => {
          const details = log.details || {}
          // Buscar por saleId (el más común)
          if (details.saleId === sale.id) return true
          // Buscar por invoice_number si está disponible
          if (sale.invoiceNumber && details.invoiceNumber === sale.invoiceNumber) return true
          // Buscar por ID en la descripción si contiene el ID de la venta
          if (details.description && typeof details.description === 'string') {
            if (details.description.includes(sale.id)) return true
            // También buscar por número de factura en la descripción
            if (sale.invoiceNumber && details.description.includes(sale.invoiceNumber)) return true
          }
          return false
        })
        
        // Extraer el motivo de diferentes lugares posibles
        let reason = 'No especificado'
        if (cancellationLog?.details) {
          const details = cancellationLog.details
          // Intentar obtener el motivo de diferentes campos
          if (details.reason) {
            reason = String(details.reason)
          } else if (details.description) {
            // Si el motivo está en la descripción, extraerlo
            const desc = String(details.description)
            const motivoMatch = desc.match(/Motivo:\s*(.+?)(?:\s*-|$)/i)
            if (motivoMatch && motivoMatch[1]) {
              reason = motivoMatch[1].trim()
            } else if (desc.includes('Motivo:')) {
              reason = desc.split('Motivo:')[1]?.split('-')[0]?.trim() || desc
            }
          }
        }
        
        return {
          ...sale,
          cancellationReason: reason,
          cancelledBy: cancellationLog?.user_id || sale.sellerId,
          cancelledByName: cancellationLog?.user_name || sale.sellerName || 'Usuario desconocido',
          cancelledAt: cancellationLog?.created_at || sale.updatedAt || sale.createdAt
        }
      })

      // Ordenar por fecha de cancelación (más recientes primero)
      invoicesWithInfo.sort((a, b) => {
        const dateA = new Date(a.cancelledAt || a.createdAt).getTime()
        const dateB = new Date(b.cancelledAt || b.createdAt).getTime()
        return dateB - dateA
      })

      setCancelledInvoices(invoicesWithInfo)
    } catch {
      // Error silencioso en producción
      // Si falla, mostrar solo las ventas sin información de cancelación
      const cancelledSales = sales
        .filter(sale => sale.status === 'cancelled')
        .map(sale => ({
          ...sale,
          cancellationReason: 'No disponible',
          cancelledByName: sale.sellerName || 'Usuario desconocido',
          cancelledAt: sale.updatedAt || sale.createdAt
        }))
        .sort((a, b) => {
          const dateA = new Date(a.cancelledAt || a.createdAt).getTime()
          const dateB = new Date(b.cancelledAt || b.createdAt).getTime()
          return dateB - dateA
        })
      setCancelledInvoices(cancelledSales)
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const totalLostValue = cancelledInvoices.reduce((sum, invoice) => sum + invoice.total, 0)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 xl:left-64 bg-white/70 dark:bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 xl:px-6">
      <div className="bg-white dark:bg-gray-900 rounded-none xl:rounded-2xl shadow-2xl w-full h-full xl:h-auto xl:w-auto xl:max-w-[95vw] xl:max-h-[90vh] overflow-hidden flex flex-col border-0 xl:border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-3 md:p-6 border-b border-gray-200 dark:border-gray-700 bg-red-50/30 dark:bg-red-900/10 flex-shrink-0">
          <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
            <div className="p-1.5 md:p-2 bg-red-100 dark:bg-red-900/20 rounded-lg flex-shrink-0">
              <XCircle className="h-5 w-5 md:h-8 md:w-8 text-red-500 dark:text-red-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white truncate">
                Facturas Anuladas
              </h2>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300 hidden md:block">
                Información detallada de las facturas canceladas
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-300 md:hidden">
                Facturas canceladas
              </p>
            </div>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex-shrink-0 h-8 w-8 md:h-10 md:w-10 p-0"
          >
            <X className="h-4 w-4 md:h-5 md:w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Resumen lateral */}
          <div className="w-full md:w-72 lg:w-80 xl:w-96 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700 flex-shrink-0 bg-gray-50 dark:bg-gray-800/50 p-3 md:p-4">
            <div className="space-y-3 md:space-y-4">
              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-1.5 md:p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                      <XCircle className="h-4 w-4 md:h-5 md:w-5 text-red-500 dark:text-red-400" />
                    </div>
                    <span className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">
                      Total Anuladas
                    </span>
                  </div>
                  <p className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white mb-0.5 md:mb-1">
                    {cancelledInvoices.length}
                  </p>
                  <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                    facturas canceladas
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-1.5 md:p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                      <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <span className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">
                      Valor Perdido
                    </span>
                  </div>
                  <p className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white mb-0.5 md:mb-1">
                    {formatCurrency(totalLostValue)}
                  </p>
                  <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                    Total de facturas anuladas
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Lista de facturas anuladas */}
          <div className="flex-1 overflow-y-auto p-3 md:p-6">
            <div className="mb-4">
              <h3 className="text-base md:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="h-4 w-4 md:h-5 md:w-5 text-red-500 dark:text-red-400" />
                Facturas Anuladas
              </h3>
            </div>
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 dark:border-red-400 mx-auto mb-3"></div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Cargando información...</p>
                  </div>
              ) : cancelledInvoices.length > 0 ? (
                <div className="space-y-3 md:space-y-4">
                  {cancelledInvoices.map((invoice) => (
                    <div 
                      key={invoice.id} 
                      className="p-3 md:p-4 bg-red-50/20 dark:bg-red-900/5 border border-red-100 dark:border-red-900/20 rounded-lg hover:bg-red-50/30 dark:hover:bg-red-900/10 transition-colors"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                        {/* Información principal */}
                        <div className="flex-1 min-w-0 lg:max-w-2xl">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-bold text-sm md:text-base text-gray-900 dark:text-white">
                              {invoice.invoiceNumber || 'Sin número'}
                            </h3>
                            <span className="px-2 py-0.5 bg-red-500 dark:bg-red-600 text-white text-xs rounded">
                              Anulada
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3 text-xs md:text-sm">
                            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                              <User className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                              <span className="font-medium">Cliente:</span>
                              <span className="truncate">{invoice.clientName}</span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                              <Calendar className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                              <span className="font-medium">Anulada el:</span>
                              <span>{new Date(invoice.cancelledAt || invoice.updatedAt || invoice.createdAt).toLocaleString('es-CO')}</span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                              <User className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                              <span className="font-medium">Anulada por:</span>
                              <span className="truncate">{invoice.cancelledByName || 'Usuario desconocido'}</span>
                            </div>
                            
                            <div className="md:col-span-2 mt-2 pt-2 border-t border-red-100 dark:border-red-900/20">
                              <div className="flex items-start gap-2">
                                <FileText className="h-3 w-3 md:h-4 md:w-4 mt-0.5 flex-shrink-0 text-red-500 dark:text-red-400" />
                                <div className="flex-1 min-w-0">
                                  <span className="font-medium text-gray-700 dark:text-gray-300 block mb-1">Motivo:</span>
                                  <p className="text-gray-900 dark:text-white bg-white dark:bg-gray-700 p-2 rounded border border-gray-200 dark:border-gray-600">
                                    {invoice.cancellationReason || 'No especificado'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Valor */}
                        <div className="flex-shrink-0 lg:text-right">
                          <div className="inline-block">
                            <p className="text-lg md:text-xl font-bold text-red-600 dark:text-red-400 mb-1">
                              {formatCurrency(invoice.total)}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Valor perdido
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 md:py-12">
                  <XCircle className="h-12 w-12 md:h-16 md:w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 font-medium">
                    No hay facturas anuladas
                  </p>
                  <p className="text-xs md:text-sm text-gray-400 dark:text-gray-500 mt-1">
                    Todas las facturas están activas
                  </p>
                </div>
              )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-3 md:p-6 pb-16 md:pb-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 sticky bottom-0 z-10 flex-shrink-0">
          <Button
            onClick={onClose}
            className="bg-red-500 hover:bg-red-600 text-white text-xs md:text-sm px-3 md:px-4 py-1.5 md:py-2"
          >
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  )
}
