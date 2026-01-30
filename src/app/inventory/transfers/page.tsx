'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Package, ArrowRightLeft, RefreshCw, X, Store as StoreIcon, ChevronDown, ChevronUp, Calendar, User, FileText, Download, ChevronLeft, ChevronRight } from 'lucide-react'
import { RoleProtectedRoute } from '@/components/auth/role-protected-route'
import { StoreStockTransfer, Store, Sale } from '@/types'
import { StoreStockTransferService } from '@/lib/store-stock-transfer-service'
import { StoresService } from '@/lib/stores-service'
import { useAuth } from '@/contexts/auth-context'
import { getCurrentUserStoreId, canAccessAllStores, isMainStoreUser } from '@/lib/store-helper'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { TransferModal } from '@/components/inventory/transfer-modal'
import { CancelTransferModal } from '@/components/ui/cancel-transfer-modal'
import { PDFService } from '@/lib/pdf-service'
import { DollarSign, CreditCard } from 'lucide-react'
import { StoreBadge } from '@/components/ui/store-badge'

export default function TransfersPage() {
  const { user } = useAuth()
  const [transfers, setTransfers] = useState<StoreStockTransfer[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)
  const [transferToCancel, setTransferToCancel] = useState<StoreStockTransfer | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'cancelled' | 'received'>('all')
  const [expandedTransfers, setExpandedTransfers] = useState<Set<string>>(new Set())
  const [transferSales, setTransferSales] = useState<Map<string, Sale>>(new Map())
  const [loadingSales, setLoadingSales] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [totalTransfers, setTotalTransfers] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  
  const currentStoreId = getCurrentUserStoreId()
  const canManageAllStores = canAccessAllStores(user)
  const isMainStore = isMainStoreUser(user)
  
  // Para la tienda principal, usar el MAIN_STORE_ID explícitamente
  const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }
  
  // Cargar la venta asociada cuando se expande una transferencia
  const loadTransferSale = async (transferId: string) => {
    console.log('[TRANSFERS PAGE] loadTransferSale called:', {
      transferId,
      isLoading: loadingSales.has(transferId),
      alreadyLoaded: transferSales.has(transferId)
    })
    
    if (loadingSales.has(transferId) || transferSales.has(transferId)) {
      console.log('[TRANSFERS PAGE] Sale already loading or loaded, skipping')
      return // Ya está cargando o ya está cargada
    }
    
    const transfer = transfers.find(t => t.id === transferId)
    console.log('[TRANSFERS PAGE] Transfer found:', {
      transferId,
      transfer: transfer ? {
        id: transfer.id,
        fromStoreId: transfer.fromStoreId,
        toStoreId: transfer.toStoreId,
        createdAt: transfer.createdAt
      } : null,
      MAIN_STORE_ID,
      isFromMainStore: transfer?.fromStoreId === MAIN_STORE_ID
    })
    
    if (!transfer) {
      console.log('[TRANSFERS PAGE] Transfer not found')
      return
    }
    
    if (transfer.fromStoreId !== MAIN_STORE_ID) {
      console.log('[TRANSFERS PAGE] Transfer is not from main store, skipping')
      return // Solo cargar para transferencias desde la tienda principal
    }
    
    console.log('[TRANSFERS PAGE] Starting to load sale for transfer:', transferId)
    setLoadingSales(prev => new Set(prev).add(transferId))
    
    try {
      const sale = await StoreStockTransferService.getTransferSale(transferId)
      console.log('[TRANSFERS PAGE] Sale loaded:', {
        transferId,
        sale: sale ? {
          id: sale.id,
          total: sale.total,
          paymentMethod: sale.paymentMethod,
          itemsCount: sale.items?.length || 0,
          paymentsCount: sale.payments?.length || 0
        } : null
      })
      
      if (sale) {
        setTransferSales(prev => {
          const newMap = new Map(prev)
          newMap.set(transferId, sale)
          console.log('[TRANSFERS PAGE] Sale added to state:', transferId)
          return newMap
        })
      } else {
        console.log('[TRANSFERS PAGE] No sale found for transfer:', transferId)
      }
    } catch (error) {
      console.error('[TRANSFERS PAGE] Error loading transfer sale:', error)
    } finally {
      setLoadingSales(prev => {
        const newSet = new Set(prev)
        newSet.delete(transferId)
        return newSet
      })
    }
  }
  
  // Cargar venta cuando se expande una transferencia
  useEffect(() => {
    expandedTransfers.forEach(transferId => {
      const transfer = transfers.find(t => t.id === transferId)
      if (transfer && transfer.fromStoreId === MAIN_STORE_ID && !loadingSales.has(transferId) && !transferSales.has(transferId)) {
        loadTransferSale(transferId)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedTransfers])
  
  const fromStoreIdForTransfer = isMainStore ? MAIN_STORE_ID : (currentStoreId || undefined)
  
  // Redirigir a recepciones si el usuario no es de la tienda principal
  useEffect(() => {
    if (user && !isMainStore) {
      window.location.href = '/inventory/receptions'
    }
  }, [user, isMainStore])

  const toggleTransfer = (transferId: string) => {
    setExpandedTransfers(prev => {
      const newSet = new Set(prev)
      const isExpanding = !newSet.has(transferId)
      if (newSet.has(transferId)) {
        newSet.delete(transferId)
      } else {
        newSet.add(transferId)
      }
      
      // Si se está expandiendo, cargar la venta inmediatamente
      if (isExpanding) {
        const transfer = transfers.find(t => t.id === transferId)
        console.log('[TRANSFERS PAGE] Expanding transfer:', {
          transferId,
          fromStoreId: transfer?.fromStoreId,
          MAIN_STORE_ID,
          isFromMainStore: transfer?.fromStoreId === MAIN_STORE_ID
        })
        if (transfer && transfer.fromStoreId === MAIN_STORE_ID) {
          loadTransferSale(transferId)
        }
      }
      
      return newSet
    })
  }

  // Cargar tiendas solo una vez al montar
  useEffect(() => {
    loadStores()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Solo ejecutar una vez al montar

  // Cargar transferencias cuando cambia el filtro, el storeId, el estado de tienda principal o la página
  useEffect(() => {
    loadTransfers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, currentStoreId, isMainStore, currentPage])

  const loadStores = async () => {
    try {
      const storesData = await StoresService.getAllStores(true)
      setStores(storesData)
    } catch (error) {
      console.error('Error loading stores:', error)
    }
  }

  const loadTransfers = async () => {
    // Para la tienda principal, usar MAIN_STORE_ID explícitamente
    const storeIdToUse = isMainStore ? MAIN_STORE_ID : (currentStoreId || null)
    
    if (!storeIdToUse) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      console.log('[TRANSFERS PAGE] Loading transfers:', {
        storeIdToUse,
        isMainStore,
        filter,
        currentStoreId,
        page: currentPage
      })
      const result = await StoreStockTransferService.getStoreTransfers(
        storeIdToUse,
        'all', // Siempre cargar todas, filtrar por estado localmente
        currentPage,
        50 // Obtener más para poder filtrar
      )
      
      // Filtrar por estado según el filtro seleccionado
      let filteredTransfers = result.transfers
      if (filter === 'pending') {
        filteredTransfers = result.transfers.filter(t => t.status === 'pending' || t.status === 'in_transit')
      } else if (filter === 'received') {
        filteredTransfers = result.transfers.filter(t => t.status === 'received' || t.status === 'partially_received')
      } else if (filter === 'cancelled') {
        filteredTransfers = result.transfers.filter(t => t.status === 'cancelled')
      }
      
      console.log('[TRANSFERS PAGE] Transfers loaded:', {
        count: filteredTransfers.length,
        total: result.total,
        hasMore: result.hasMore,
        filter,
        transfers: filteredTransfers.slice(0, 3).map(t => ({
          id: t.id,
          fromStore: t.fromStoreName,
          toStore: t.toStoreName,
          status: t.status,
          createdAt: t.createdAt
        }))
      })
      setTransfers(filteredTransfers)
      setTotalTransfers(result.total)
      setHasMore(result.hasMore)
    } catch (error) {
      toast.error('Error al cargar las transferencias')
      console.error('Error loading transfers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTransfer = () => {
    setIsCreateModalOpen(true)
  }


  const handleCancel = (transfer: StoreStockTransfer) => {
    setTransferToCancel(transfer)
    setIsCancelModalOpen(true)
  }

  const confirmCancel = async (reason: string) => {
    if (!transferToCancel || !user?.id) return

    setIsCancelling(true)
    try {
      const result = await StoreStockTransferService.cancelTransfer(
        transferToCancel.id,
        reason,
        user.id
      )
      
      if (result.success) {
        const refundMessage = result.totalRefund && result.totalRefund > 0
          ? ` Se reembolsó ${formatCurrency(result.totalRefund)}.`
          : ''
        toast.success(`Transferencia cancelada exitosamente.${refundMessage}`)
        setIsCancelModalOpen(false)
        setTransferToCancel(null)
        await loadTransfers()
      } else {
        toast.error('Error al cancelar la transferencia')
      }
    } catch (error) {
      toast.error('Error al cancelar la transferencia')
      console.error('Error cancelling transfer:', error)
    } finally {
      setIsCancelling(false)
    }
  }

  const handleDownloadPDF = async (transfer: StoreStockTransfer) => {
    try {
      toast.loading('Generando PDF...')
      await PDFService.generateTransferPDF(transfer, {
        logoUrl: '/logo.jpeg',
        companyName: transfer.fromStoreName || 'Aleya Shop SAS',
        companyAddress: 'Calle 28 N25B - 365 interior 01203 barrio Boston',
        companyPhone: '320 5848594'
      })
      toast.dismiss()
      toast.success('PDF generado exitosamente')
    } catch (error) {
      toast.dismiss()
      toast.error('Error al generar el PDF')
      console.error('Error generating PDF:', error)
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

  // Si no es tienda principal, mostrar mensaje de redirección
  if (user && !isMainStore) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Redirigiendo a recepciones...</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
      </div>
    )
  }

  return (
    <RoleProtectedRoute module="transfers" requiredAction="view">
      <div className="p-4 md:p-6 pb-20 lg:pb-6 space-y-4 md:space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Transferencias de Inventario</h1>
              <StoreBadge />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Gestiona las transferencias de productos entre tiendas
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadTransfers}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
            {canManageAllStores && (
              <Button onClick={handleCreateTransfer} className="bg-cyan-600 hover:bg-cyan-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Nueva Transferencia
              </Button>
            )}
          </div>
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
                Recibidas
              </Button>
              <Button
                variant={filter === 'cancelled' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('cancelled')}
              >
                Canceladas
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Transferencias */}
        {transfers.length === 0 ? (
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardContent className="p-12">
              <div className="text-center">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No hay transferencias
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  {canManageAllStores 
                    ? 'Crea una nueva transferencia para comenzar'
                    : 'No hay transferencias pendientes o recibidas'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
                        {transfers.map((transfer) => {
                          const isExpanded = expandedTransfers.has(transfer.id)
                          const isReceived = transfer.status === 'received' || transfer.status === 'partially_received'
                          const totalQuantity = transfer.items && transfer.items.length > 0
                            ? transfer.items.reduce((sum, item) => sum + item.quantity, 0)
                            : transfer.quantity || 0
                          const totalReceived = transfer.items && transfer.items.length > 0 && isReceived
                            ? transfer.items.reduce((sum, item) => sum + (item.quantityReceived || item.quantity), 0)
                            : isReceived && transfer.quantity
                            ? transfer.quantity
                            : null

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
                          <ArrowRightLeft className="h-5 w-5 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div 
                                className="flex-1 select-text cursor-text" 
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Número de Transferencia</div>
                                <div className="text-xl font-bold text-gray-900 dark:text-white font-mono">
                                  {transfer.transferNumber || `#${transfer.id.substring(0, 8)}`}
                                </div>
                                {transferSales.has(transfer.id) && (
                                  <div className="text-xs text-cyan-600 dark:text-cyan-400 mt-1">
                                    Factura: {transferSales.get(transfer.id)?.invoiceNumber || 'N/A'}
                                  </div>
                                )}
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
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Hacia</div>
                            <div className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1">
                              <StoreIcon className="h-3 w-3" />
                              {transfer.toStoreName || 'N/A'}
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
                                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total / Estado</div>
                                        <div className="flex items-center gap-2">
                                          <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                            {isReceived && totalReceived !== null
                                              ? `${totalReceived} / ${totalQuantity} unidades`
                                              : `${totalQuantity} unidades`}
                                          </div>
                                          {getStatusBadge(transfer.status)}
                                        </div>
                                      </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                            <span className="text-xs text-gray-500 dark:text-gray-400">Fecha de Creación:</span>
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                              {format(new Date(transfer.createdAt), 'dd MMM yyyy, HH:mm', { locale: es })}
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
                                Creado por
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
                              Productos ({transfer.items && transfer.items.length > 0 ? transfer.items.length : 1})
                            </h3>
                          </div>
                          
                          <div className="space-y-2">
                            {transfer.items && transfer.items.length > 0 ? (
                              transfer.items.map((item) => {
                                const quantityReceived = item.quantityReceived !== undefined ? item.quantityReceived : item.quantity
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
                                              Faltan {item.quantity - quantityReceived} unidades
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
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Cantidad</div>
                                    <div className="text-base font-bold text-gray-900 dark:text-white">
                                      {transfer.quantity || 0} unidades
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Valor de la Transferencia */}
                        {(() => {
                          const isFromMainStore = transfer.fromStoreId === MAIN_STORE_ID
                          const isLoading = loadingSales.has(transfer.id)
                          const hasSale = transferSales.has(transfer.id)
                          
                          console.log('[TRANSFERS PAGE] Rendering value section:', {
                            transferId: transfer.id,
                            isFromMainStore,
                            isLoading,
                            hasSale,
                            fromStoreId: transfer.fromStoreId,
                            MAIN_STORE_ID
                          })
                          
                          if (!isFromMainStore) {
                            return null
                          }
                          
                          return (
                            <div className="mt-4">
                              {isLoading ? (
                                <div className="text-center py-4">
                                  <p className="text-sm text-gray-500 dark:text-gray-400">Cargando información de venta...</p>
                                </div>
                              ) : hasSale ? (
                              (() => {
                                const sale = transferSales.get(transfer.id)!
                                return (
                                  <div className="border-2 border-cyan-500 rounded-lg p-4 bg-cyan-50/50 dark:bg-cyan-900/20">
                                    <div className="flex items-center gap-2 mb-3">
                                      <DollarSign className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                                      <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                                        Valor de la Transferencia
                                      </h3>
                                    </div>
                                    <div className="space-y-3">
                                      <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total de la venta:</span>
                                        <span className="text-lg font-bold text-cyan-600 dark:text-cyan-400">
                                          {formatCurrency(sale.total)}
                                        </span>
                                      </div>
                                      
                                      {sale.payments && sale.payments.length > 0 ? (
                                        <div className="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-2">
                                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Desglose de pagos:</p>
                                          {sale.payments.map((payment) => (
                                            <div key={payment.id} className="flex justify-between items-center">
                                              <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                                <CreditCard className="h-3 w-3" />
                                                {payment.paymentType === 'cash' ? 'Efectivo' : 
                                                 payment.paymentType === 'transfer' ? 'Transferencia' : 
                                                 payment.paymentType}
                                              </span>
                                              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                                {formatCurrency(payment.amount)}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                                          <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                              <CreditCard className="h-3 w-3" />
                                              {sale.paymentMethod === 'cash' ? 'Efectivo' : 
                                               sale.paymentMethod === 'transfer' ? 'Transferencia' : 
                                               sale.paymentMethod}
                                            </span>
                                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                              {formatCurrency(sale.total)}
                                            </span>
                                          </div>
                                        </div>
                                      )}
                                      
                                      {sale.invoiceNumber && (
                                        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                                          <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Factura: {sale.invoiceNumber}
                                          </p>
                                        </div>
                                      )}
                                      
                                      {/* Mostrar precios unitarios en productos */}
                                      {sale.items && sale.items.length > 0 && (
                                        <div className="pt-2 border-t border-gray-200 dark:border-gray-700 mt-3">
                                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Precios por producto:</p>
                                          <div className="space-y-1">
                                            {transfer.items && transfer.items.length > 0 ? (
                                              transfer.items.map((item) => {
                                                const saleItem = sale.items.find(si => si.productId === item.productId)
                                                const unitPrice = saleItem?.unitPrice || 0
                                                const itemTotal = unitPrice * item.quantity
                                                
                                                return saleItem ? (
                                                  <div key={item.id} className="flex justify-between items-center text-xs">
                                                    <span className="text-gray-600 dark:text-gray-400 truncate flex-1 mr-2">
                                                      {item.productName}
                                                    </span>
                                                    <div className="text-right">
                                                      <span className="text-gray-500 dark:text-gray-400">
                                                        {formatCurrency(unitPrice)} x {item.quantity} = 
                                                      </span>
                                                      <span className="ml-1 font-semibold text-gray-900 dark:text-white">
                                                        {formatCurrency(itemTotal)}
                                                      </span>
                                                    </div>
                                                  </div>
                                                ) : null
                                              })
                                            ) : null}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )
                              })()
                            ) : (
                              <div className="border-2 border-yellow-500 rounded-lg p-4 bg-yellow-50/50 dark:bg-yellow-900/20">
                                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                  No se encontró información de venta para esta transferencia. Verifica la consola para más detalles.
                                </p>
                              </div>
                            )}
                          </div>
                          )
                        })()}

                        {/* Acciones */}
                        <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDownloadPDF(transfer)
                            }}
                            className="flex-1 border-cyan-300 dark:border-cyan-700 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 hover:border-cyan-400 dark:hover:border-cyan-600 transition-all"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Descargar PDF
                          </Button>
                          {(transfer.status === 'pending' || transfer.status === 'in_transit') && 
                           transfer.status !== 'received' && 
                           transfer.status !== 'partially_received' &&
                           (transfer.fromStoreId === currentStoreId || canManageAllStores) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleCancel(transfer)
                              }}
                              className="flex-1 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-400 dark:hover:border-red-600 transition-all"
                            >
                              <X className="h-4 w-4 mr-2" />
                              Cancelar
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Paginación */}
        {totalTransfers > 10 && (
          <div className="flex items-center justify-center gap-1 px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-b-lg">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1 || loading}
              className="h-7 w-7 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            
            <div className="flex items-center gap-0.5">
              {Array.from({ length: Math.ceil(totalTransfers / 10) }, (_, i) => i + 1)
                .filter(page => {
                  return page === 1 || 
                         page === Math.ceil(totalTransfers / 10) || 
                         Math.abs(page - currentPage) <= 2
                })
                .map((page, index, array) => {
                  const showEllipsis = index > 0 && page - array[index - 1] > 1
                  
                  return (
                    <div key={page} className="flex items-center">
                      {showEllipsis && (
                        <span className="px-1 text-gray-400 text-xs">...</span>
                      )}
                      <button
                        onClick={() => setCurrentPage(page)}
                        disabled={loading}
                        className={`h-7 min-w-[28px] px-2 text-xs rounded border transition-colors ${
                          page === currentPage 
                          ? "bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800 font-medium" 
                          : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-100 dark:border-gray-600"
                        }`}
                      >
                        {page}
                      </button>
                    </div>
                  )
                })}
            </div>
            
            <button
              onClick={() => setCurrentPage(prev => prev + 1)}
              disabled={currentPage >= Math.ceil(totalTransfers / 10) || loading}
              className="h-7 w-7 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Modales */}
        <TransferModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSave={async () => {
            setIsCreateModalOpen(false)
            await loadTransfers()
          }}
          stores={stores}
          fromStoreId={fromStoreIdForTransfer}
        />
        {/* Debug: Log cuando se abre el modal */}
        {isCreateModalOpen && console.log('[TRANSFERS PAGE] Opening modal with fromStoreId:', fromStoreIdForTransfer, 'isMainStore:', isMainStore, 'currentStoreId:', currentStoreId)}


        <CancelTransferModal
          isOpen={isCancelModalOpen}
          onClose={() => {
            setIsCancelModalOpen(false)
            setTransferToCancel(null)
          }}
          onConfirm={confirmCancel}
          transferNumber={transferToCancel?.transferNumber || transferToCancel?.id.substring(0, 8)}
          isLoading={isCancelling}
        />
      </div>
    </RoleProtectedRoute>
  )
}
