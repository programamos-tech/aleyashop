'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Package, CheckCircle, RefreshCw, Store as StoreIcon, ChevronDown, ChevronUp, Calendar, User, FileText, ChevronLeft, ChevronRight } from 'lucide-react'
import { RoleProtectedRoute } from '@/components/auth/role-protected-route'
import { StoreStockTransfer } from '@/types'
import { StoreStockTransferService } from '@/lib/store-stock-transfer-service'
import { useAuth } from '@/contexts/auth-context'
import { getCurrentUserStoreId, isMainStoreUser } from '@/lib/store-helper'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ReceiveTransferModal } from '@/components/inventory/receive-transfer-modal'
import { useProducts } from '@/contexts/products-context'
import { StoreBadge } from '@/components/ui/store-badge'

export default function ReceptionsPage() {
  const { user } = useAuth()
  const { refreshProducts } = useProducts() // Agregar refreshProducts para actualizar productos después de recibir
  const [pendingTransfers, setPendingTransfers] = useState<StoreStockTransfer[]>([])
  const [receivedTransfers, setReceivedTransfers] = useState<StoreStockTransfer[]>([])
  const [loading, setLoading] = useState(true)
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false)
  const [transferToReceive, setTransferToReceive] = useState<StoreStockTransfer | null>(null)
  const [expandedTransfers, setExpandedTransfers] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<'pending' | 'received' | 'all'>('all')
  const [pendingPage, setPendingPage] = useState(1)
  const [receivedPage, setReceivedPage] = useState(1)
  const [pendingTotal, setPendingTotal] = useState(0)
  const [receivedTotal, setReceivedTotal] = useState(0)
  const [pendingHasMore, setPendingHasMore] = useState(false)
  const [receivedHasMore, setReceivedHasMore] = useState(false)
  
  const currentStoreId = getCurrentUserStoreId()
  const isMainStore = isMainStoreUser(user)
  const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
  const storeIdToUse = isMainStore ? MAIN_STORE_ID : (currentStoreId || null)

  useEffect(() => {
    if (storeIdToUse) {
      loadTransfers()
    }
  }, [storeIdToUse, filter, pendingPage, receivedPage])

  const loadTransfers = async () => {
    if (!storeIdToUse) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const [pendingResult, receivedResult] = await Promise.all([
        StoreStockTransferService.getPendingTransfers(storeIdToUse, pendingPage, 10),
        StoreStockTransferService.getReceivedTransfers(storeIdToUse, receivedPage, 10)
      ])
      setPendingTransfers(pendingResult.transfers)
      setReceivedTransfers(receivedResult.transfers)
      setPendingTotal(pendingResult.total)
      setReceivedTotal(receivedResult.total)
      setPendingHasMore(pendingResult.hasMore)
      setReceivedHasMore(receivedResult.hasMore)
    } catch (error) {
      toast.error('Error al cargar las transferencias')
      console.error('Error loading transfers:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleTransfer = (transferId: string) => {
    setExpandedTransfers(prev => {
      const newSet = new Set(prev)
      if (newSet.has(transferId)) {
        newSet.delete(transferId)
      } else {
        newSet.add(transferId)
      }
      return newSet
    })
  }

  const handleReceive = (transfer: StoreStockTransfer) => {
    setTransferToReceive(transfer)
    setIsReceiveModalOpen(true)
  }

  const confirmReceive = async (receivedItems: Array<{ itemId: string; quantityReceived: number; note?: string }>) => {
    if (!transferToReceive || !user) return

    try {
      const success = await StoreStockTransferService.receiveTransfer(
        transferToReceive.id,
        user.id,
        user.name,
        receivedItems
      )
      if (success) {
        toast.success('Transferencia recibida exitosamente. El stock ha sido actualizado.')
        setIsReceiveModalOpen(false)
        setTransferToReceive(null)
        await loadTransfers()
        // Refrescar productos para mostrar el nuevo stock
        await refreshProducts()
      } else {
        toast.error('Error al recibir la transferencia')
      }
    } catch (error) {
      toast.error('Error al recibir la transferencia')
      console.error('Error receiving transfer:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Pendiente</Badge>
      case 'in_transit':
        return <Badge className="bg-blue-500 hover:bg-blue-600">En Tránsito</Badge>
      case 'received':
        return <Badge className="bg-green-500 hover:bg-green-600">Recibida</Badge>
      case 'partially_received':
        return <Badge className="bg-orange-500 hover:bg-orange-600">Parcialmente Recibida</Badge>
      case 'cancelled':
        return <Badge className="bg-red-500 hover:bg-red-600">Cancelada</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
      </div>
    )
  }

  return (
    <RoleProtectedRoute module="receptions" requiredAction="view">
      <div className="p-4 md:p-6 pb-20 lg:pb-6 space-y-4 md:space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Recepción de Transferencias</h1>
              <StoreBadge />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Recibe y confirma las transferencias de productos enviadas a tu tienda
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={loadTransfers}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>

        {/* Filtros */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                Todas
              </Button>
              <Button
                variant={filter === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('pending')}
              >
                Pendientes
              </Button>
              <Button
                variant={filter === 'received' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('received')}
              >
                Completadas
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Transferencias Pendientes */}
        {filter !== 'received' && (
              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardContent className="p-4 md:p-6">
              {pendingTransfers.length === 0 ? (
                <div className="p-12">
                  <div className="text-center">
                    <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      No hay transferencias pendientes
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">
                      Todas las transferencias han sido recibidas
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {pendingTransfers.map((transfer) => {
                const isExpanded = expandedTransfers.has(transfer.id)
                const totalQuantity = transfer.items && transfer.items.length > 0
                  ? transfer.items.reduce((sum, item) => sum + (item.quantityReceived || item.quantity), 0)
                  : transfer.quantity || 0
                const isReceived = transfer.status === 'received' || transfer.status === 'partially_received'

                return (
                  <Card
                    key={transfer.id}
                    className={`bg-white dark:bg-gray-800 border-l-4 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all cursor-pointer ${
                      isExpanded 
                        ? 'border-l-cyan-500 dark:border-l-cyan-400 border-cyan-300 dark:border-cyan-600' 
                        : 'border-l-cyan-500 dark:border-l-cyan-400'
                    }`}
                    onClick={() => toggleTransfer(transfer.id)}
                  >
                    <CardContent className="p-4 md:p-6">
                      {/* Header de la Transferencia */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-4 mb-2">
                            <CheckCircle className={`h-5 w-5 flex-shrink-0 ${
                              transfer.status === 'partially_received' 
                                ? 'text-orange-600 dark:text-orange-400' 
                                : isReceived 
                                ? 'text-green-600 dark:text-green-400' 
                                : 'text-cyan-600 dark:text-cyan-400'
                            }`} />
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <div className="flex-1">
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Número de Transferencia</div>
                                  <div className="text-xl font-bold text-gray-900 dark:text-white font-mono">
                                    {transfer.transferNumber || `#${transfer.id.substring(0, 8)}`}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                            <div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Desde</div>
                              <div className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1">
                                <StoreIcon className="h-3 w-3" />
                                {transfer.fromStoreName || 'N/A'}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Productos</div>
                              <div className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1">
                                <Package className="h-3 w-3" />
                                {transfer.items && transfer.items.length > 0 
                                  ? `${transfer.items.length} producto(s)`
                                  : '1 producto'}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total</div>
                              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                {totalQuantity} unidades
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Estado</div>
                              {getStatusBadge(transfer.status)}
                            </div>
                          </div>

                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {isReceived ? 'Recibida el:' : 'Enviada el:'}
                              </span>
                              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                {format(new Date(isReceived && transfer.receivedAt ? transfer.receivedAt : transfer.createdAt), 'dd MMM yyyy, HH:mm', { locale: es })}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleTransfer(transfer.id)
                            }}
                            className="h-8 w-8 p-0 hover:bg-cyan-50 dark:hover:bg-cyan-900/20"
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5 text-cyan-600 dark:text-cyan-400 font-bold" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-cyan-600 dark:text-cyan-400 font-bold" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Detalle Expandible */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600 space-y-4">
                          {/* Información Adicional */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {transfer.description && (
                              <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                                  <FileText className="h-3 w-3" />
                                  Descripción
                                </div>
                                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {transfer.description}
                                </div>
                              </div>
                            )}
                            {transfer.createdByName && (
                              <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  Enviado por
                                </div>
                                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {transfer.createdByName}
                                </div>
                              </div>
                            )}
                            {isReceived && transfer.receivedAt && (
                              <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Fecha de Recepción
                                </div>
                                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {format(new Date(transfer.receivedAt), 'dd MMM yyyy, HH:mm', { locale: es })}
                                </div>
                              </div>
                            )}
                            {isReceived && transfer.receivedByName && (
                              <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  Recibido por
                                </div>
                                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {transfer.receivedByName}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Lista de Productos */}
                          <div className="mt-4">
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <Package className="h-4 w-4 text-cyan-600" />
                                Productos {isReceived ? 'Recibidos' : 'a Recibir'} ({transfer.items && transfer.items.length > 0 ? transfer.items.length : 1})
                              </h3>
                            </div>
                            
                            <div className="space-y-2">
                              {transfer.items && transfer.items.length > 0 ? (
                                transfer.items.map((item) => {
                                  const quantityReceived = item.quantityReceived || item.quantity
                                  const isPartial = isReceived && quantityReceived < item.quantity

                                  return (
                                    <div
                                      key={item.id}
                                      className={`border rounded-lg p-3 bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 ${isPartial ? 'border-yellow-300 dark:border-yellow-700' : ''}`}
                                    >
                                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                                        <div className="flex items-center gap-2">
                                          <Package className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                                          <div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Producto</div>
                                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                              {item.productName}
                                            </div>
                                            {item.productReference && (
                                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                                Ref: {item.productReference}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        <div>
                                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Esperada</div>
                                          <div className="text-base font-bold text-gray-900 dark:text-white">
                                            {item.quantity} unidades
                                          </div>
                                        </div>
                                        {isReceived && (
                                          <div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Recibida</div>
                                            <div className={`text-base font-bold ${isPartial ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}`}>
                                              {quantityReceived} unidades
                                            </div>
                                            {isPartial && (
                                              <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                                                Faltaron {item.quantity - quantityReceived} unidades
                                              </div>
                                            )}
                                          </div>
                                        )}
                                        <div className="flex flex-col gap-2">
                                          {item.fromLocation && (
                                            <div>
                                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Origen</div>
                                              <Badge className="bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300 text-xs">
                                                {item.fromLocation === 'warehouse' ? 'Bodega' : 'Local'}
                                              </Badge>
                                            </div>
                                          )}
                                          {isReceived && item.notes && (
                                            <div>
                                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Nota</div>
                                              <p className="text-xs text-gray-700 dark:text-gray-300 italic">
                                                {item.notes}
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })
                              ) : (
                                <div className="border rounded-lg p-3 bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600">
                                  <div className="flex justify-between items-center">
                                    <div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Producto</div>
                                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                        {transfer.productName || 'Producto'}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                        {isReceived ? 'Recibida' : 'Esperada'}
                                      </div>
                                      <div className="text-base font-bold text-gray-900 dark:text-white">
                                        {transfer.quantity || 0} unidades
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Acción - Solo mostrar si está pendiente */}
                          {!isReceived && (
                            <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleReceive(transfer)
                                }}
                                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Confirmar Recepción
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

                  {/* Paginación - Pendientes */}
                  {pendingTotal > 10 && (
                    <div className="flex items-center justify-center gap-1 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                      <button
                        onClick={() => setPendingPage(prev => Math.max(1, prev - 1))}
                        disabled={pendingPage === 1 || loading}
                        className="h-7 w-7 flex items-center justify-center rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>
                      
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: Math.ceil(pendingTotal / 10) }, (_, i) => i + 1).map((page) => {
                          // Mostrar siempre las primeras 2 páginas, la última, y las páginas alrededor de la actual
                          if (
                            page === 1 ||
                            page === 2 ||
                            page === Math.ceil(pendingTotal / 10) ||
                            (page >= pendingPage - 1 && page <= pendingPage + 1)
                          ) {
                            return (
                              <button
                                key={page}
                                onClick={() => setPendingPage(page)}
                                disabled={loading}
                                className={`h-7 w-7 flex items-center justify-center rounded-md text-sm transition-colors ${
                                  pendingPage === page
                                    ? 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/20 dark:text-cyan-400 font-medium'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800'
                                }`}
                              >
                                {page}
                              </button>
                            )
                          } else if (
                            page === pendingPage - 2 ||
                            page === pendingPage + 2
                          ) {
                            return (
                              <span key={page} className="px-1 text-gray-400 dark:text-gray-500 text-sm">
                                ...
                              </span>
                            )
                          }
                          return null
                        })}
                      </div>
                      
                      <button
                        onClick={() => setPendingPage(prev => prev + 1)}
                        disabled={!pendingHasMore || loading}
                        className="h-7 w-7 flex items-center justify-center rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Lista de Transferencias Recibidas */}
        {filter !== 'pending' && (
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardContent className="p-4 md:p-6">
              {receivedTransfers.length === 0 ? (
                <div className="p-12">
                  <div className="text-center">
                    <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      {filter === 'received' ? 'No hay transferencias completadas' : 'No hay transferencias recibidas'}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">
                      {filter === 'received' ? 'Aún no has recibido ninguna transferencia' : 'No hay transferencias recibidas para mostrar'}
                    </p>
                  </div>
                </div>
              ) : (
                <>
            <div className="space-y-4">
                    {receivedTransfers.map((transfer) => {
                const isExpanded = expandedTransfers.has(transfer.id)
                const totalQuantity = transfer.items && transfer.items.length > 0
                  ? transfer.items.reduce((sum, item) => sum + (item.quantityReceived || item.quantity), 0)
                  : transfer.quantity || 0
                const isReceived = transfer.status === 'received' || transfer.status === 'partially_received'

                return (
                  <Card
                    key={transfer.id}
                    className={`bg-white dark:bg-gray-800 border-l-4 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all cursor-pointer ${
                      isExpanded 
                        ? 'border-l-cyan-500 dark:border-l-cyan-400 border-cyan-300 dark:border-cyan-600' 
                        : 'border-l-cyan-500 dark:border-l-cyan-400'
                    }`}
                    onClick={() => toggleTransfer(transfer.id)}
                  >
                    <CardContent className="p-4 md:p-6">
                      {/* Header de la Transferencia */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-4 mb-2">
                            <CheckCircle className={`h-5 w-5 flex-shrink-0 ${
                              transfer.status === 'partially_received' 
                                ? 'text-orange-600 dark:text-orange-400' 
                                : isReceived 
                                ? 'text-green-600 dark:text-green-400' 
                                : 'text-cyan-600 dark:text-cyan-400'
                            }`} />
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <div className="flex-1">
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Número de Transferencia</div>
                                  <div className="text-xl font-bold text-gray-900 dark:text-white font-mono">
                                    {transfer.transferNumber || `#${transfer.id.substring(0, 8)}`}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                            <div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Desde</div>
                              <div className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1">
                                <StoreIcon className="h-3 w-3" />
                                {transfer.fromStoreName || 'N/A'}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Productos</div>
                              <div className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1">
                                <Package className="h-3 w-3" />
                                {transfer.items && transfer.items.length > 0 
                                  ? `${transfer.items.length} producto(s)`
                                  : '1 producto'}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total</div>
                              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                {totalQuantity} unidades
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Estado</div>
                              {getStatusBadge(transfer.status)}
                            </div>
                          </div>

                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {isReceived ? 'Recibida el:' : 'Enviada el:'}
                              </span>
                              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                {format(new Date(isReceived && transfer.receivedAt ? transfer.receivedAt : transfer.createdAt), 'dd MMM yyyy, HH:mm', { locale: es })}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleTransfer(transfer.id)
                            }}
                            className="h-8 w-8 p-0 hover:bg-cyan-50 dark:hover:bg-cyan-900/20"
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5 text-cyan-600 dark:text-cyan-400 font-bold" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-cyan-600 dark:text-cyan-400 font-bold" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Detalle Expandible */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600 space-y-4">
                          {/* Información Adicional */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {transfer.description && (
                              <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                                  <FileText className="h-3 w-3" />
                                  Descripción
                                </div>
                                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {transfer.description}
                                </div>
                              </div>
                            )}
                            {transfer.createdByName && (
                              <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  Enviado por
                                </div>
                                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {transfer.createdByName}
                                </div>
                              </div>
                            )}
                            {isReceived && transfer.receivedAt && (
                              <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Fecha de Recepción
                                </div>
                                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {format(new Date(transfer.receivedAt), 'dd MMM yyyy, HH:mm', { locale: es })}
                                </div>
                              </div>
                            )}
                            {isReceived && transfer.receivedByName && (
                              <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  Recibido por
                                </div>
                                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {transfer.receivedByName}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Lista de Productos */}
                          <div className="mt-4">
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <Package className="h-4 w-4 text-cyan-600" />
                                Productos {isReceived ? 'Recibidos' : 'a Recibir'} ({transfer.items && transfer.items.length > 0 ? transfer.items.length : 1})
                              </h3>
                            </div>
                            
                            <div className="space-y-2">
                              {transfer.items && transfer.items.length > 0 ? (
                                transfer.items.map((item) => {
                                  const quantityReceived = item.quantityReceived || item.quantity
                                  const isPartial = isReceived && quantityReceived < item.quantity

                                  return (
                                    <div
                                      key={item.id}
                                      className={`border rounded-lg p-3 bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 ${isPartial ? 'border-yellow-300 dark:border-yellow-700' : ''}`}
                                    >
                                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                                        <div className="flex items-center gap-2">
                                          <Package className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                                          <div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Producto</div>
                                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                              {item.productName}
                                            </div>
                                            {item.productReference && (
                                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                                Ref: {item.productReference}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        <div>
                                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Esperada</div>
                                          <div className="text-base font-bold text-gray-900 dark:text-white">
                                            {item.quantity} unidades
                                          </div>
                                        </div>
                                        {isReceived && (
                                          <div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Recibida</div>
                                            <div className={`text-base font-bold ${isPartial ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}`}>
                                              {quantityReceived} unidades
                                            </div>
                                            {isPartial && (
                                              <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                                                Faltaron {item.quantity - quantityReceived} unidades
                                              </div>
                                            )}
                                          </div>
                                        )}
                                        <div className="flex flex-col gap-2">
                                          {item.fromLocation && (
                                            <div>
                                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Origen</div>
                                              <Badge className="bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300 text-xs">
                                                {item.fromLocation === 'warehouse' ? 'Bodega' : 'Local'}
                                              </Badge>
                                            </div>
                                          )}
                                          {isReceived && item.notes && (
                                            <div>
                                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Nota</div>
                                              <p className="text-xs text-gray-700 dark:text-gray-300 italic">
                                                {item.notes}
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })
                              ) : (
                                <div className="border rounded-lg p-3 bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600">
                                  <div className="flex justify-between items-center">
                                    <div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Producto</div>
                                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                        {transfer.productName || 'Producto'}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                        {isReceived ? 'Recibida' : 'Esperada'}
                                      </div>
                                      <div className="text-base font-bold text-gray-900 dark:text-white">
                                        {transfer.quantity || 0} unidades
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Acción - Solo mostrar si está pendiente */}
                          {!isReceived && (
                            <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleReceive(transfer)
                                }}
                                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Confirmar Recepción
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

                  {/* Paginación - Recibidas */}
                  {receivedTotal > 10 && (
                    <div className="flex items-center justify-center gap-1 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                      <button
                        onClick={() => setReceivedPage(prev => Math.max(1, prev - 1))}
                        disabled={receivedPage === 1 || loading}
                        className="h-7 w-7 flex items-center justify-center rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>
                      
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: Math.ceil(receivedTotal / 10) }, (_, i) => i + 1).map((page) => {
                          // Mostrar siempre las primeras 2 páginas, la última, y las páginas alrededor de la actual
                          if (
                            page === 1 ||
                            page === 2 ||
                            page === Math.ceil(receivedTotal / 10) ||
                            (page >= receivedPage - 1 && page <= receivedPage + 1)
                          ) {
                            return (
                              <button
                                key={page}
                                onClick={() => setReceivedPage(page)}
                                disabled={loading}
                                className={`h-7 w-7 flex items-center justify-center rounded-md text-sm transition-colors ${
                                  receivedPage === page
                                    ? 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/20 dark:text-cyan-400 font-medium'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800'
                                }`}
                              >
                                {page}
                              </button>
                            )
                          } else if (
                            page === receivedPage - 2 ||
                            page === receivedPage + 2
                          ) {
                            return (
                              <span key={page} className="px-1 text-gray-400 dark:text-gray-500 text-sm">
                                ...
                              </span>
                            )
                          }
                          return null
                        })}
                      </div>
                      
                      <button
                        onClick={() => setReceivedPage(prev => prev + 1)}
                        disabled={!receivedHasMore || loading}
                        className="h-7 w-7 flex items-center justify-center rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Modal de Recepción */}
        <ReceiveTransferModal
          isOpen={isReceiveModalOpen}
          onClose={() => {
            setIsReceiveModalOpen(false)
            setTransferToReceive(null)
          }}
          onConfirm={confirmReceive}
          transfer={transferToReceive}
        />
      </div>
    </RoleProtectedRoute>
  )
}
