'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  Receipt,
  Download,
  Printer,
  RefreshCcw,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  FileText,
  Package,
  Calendar,
  User,
  AlertTriangle,
  X,
  Truck,
  Bike,
  Store,
  Copy,
  Check
} from 'lucide-react'
import { Sale, Credit, StoreStockTransfer } from '@/types'
import { usePermissions } from '@/hooks/usePermissions'
import { CreditsService } from '@/lib/credits-service'
import { StoreStockTransferService } from '@/lib/store-stock-transfer-service'
import { ClientsService } from '@/lib/clients-service'
import { Client } from '@/types'

interface SalesTableProps {
  sales: Sale[]
  loading: boolean
  currentPage: number
  totalSales: number
  hasMore: boolean
  onEdit: (sale: Sale) => void
  onDelete: (sale: Sale) => void
  onView: (sale: Sale) => void
  onCreate: () => void
  onPrint: (sale: Sale) => void
  onPageChange: (page: number) => void
  onSearch: (searchTerm: string) => Promise<Sale[]>
  onRefresh?: () => void
  todaySalesTotal?: number
  onCancel?: (saleId: string, reason: string) => Promise<{ success: boolean, totalRefund?: number }>
}

export function SalesTable({ 
  sales, 
  loading,
  currentPage,
  totalSales,
  hasMore,
  onEdit, 
  onDelete, 
  onView, 
  onCreate, 
  onPrint,
  onPageChange,
  onSearch,
  onRefresh,
  todaySalesTotal,
  onCancel
}: SalesTableProps) {
  const { canCreate, currentUser } = usePermissions()
  const canCreateSales = canCreate('sales')
  
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchResults, setSearchResults] = useState<Sale[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [expandedSales, setExpandedSales] = useState<Set<string>>(new Set())
  const [showCancelForm, setShowCancelForm] = useState<Record<string, boolean>>({})
  const [cancelReason, setCancelReason] = useState<Record<string, string>>({})
  const [isCancelling, setIsCancelling] = useState<Record<string, boolean>>({})
  const [cancelSuccessMessage, setCancelSuccessMessage] = useState<Record<string, string>>({})
  const [credits, setCredits] = useState<Record<string, Credit>>({})
  const [transfers, setTransfers] = useState<Record<string, StoreStockTransfer>>({})
  const [deliveryClients, setDeliveryClients] = useState<Record<string, Client>>({})
  const [copiedDelivery, setCopiedDelivery] = useState<string | null>(null)
  const [clientDeliveryCount, setClientDeliveryCount] = useState<Record<string, number>>({})

  // Cargar créditos para ventas de tipo crédito
  useEffect(() => {
    const loadCredits = async () => {
      const creditSales = sales.filter(sale => sale.paymentMethod === 'credit' && sale.invoiceNumber)
      const creditsToLoad: Record<string, Credit> = {}
      
      await Promise.all(
        creditSales.map(async (sale) => {
          if (!credits[sale.id] && sale.invoiceNumber) {
            try {
              const credit = await CreditsService.getCreditByInvoiceNumber(sale.invoiceNumber)
              if (credit) {
                creditsToLoad[sale.id] = credit
              }
            } catch (error) {
              // Error silencioso
            }
          }
        })
      )
      
      if (Object.keys(creditsToLoad).length > 0) {
        setCredits(prev => ({ ...prev, ...creditsToLoad }))
      }
    }
    
    if (sales.length > 0) {
      loadCredits()
    }
  }, [sales])

  // Cargar transferencias para ventas de la tienda principal que puedan ser de transferencia entre tiendas
  useEffect(() => {
    const loadTransfers = async () => {
      // Solo buscar transferencias para ventas de la tienda principal
      // La transferencia se identifica por tener un registro asociado, no por método de pago
      const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
      const mainStoreSales = sales.filter(sale => sale.storeId === MAIN_STORE_ID)
      const transfersToLoad: Record<string, StoreStockTransfer> = {}
      
      await Promise.all(
        mainStoreSales.map(async (sale) => {
          if (!transfers[sale.id]) {
            try {
              const transfer = await StoreStockTransferService.getTransferBySaleId(sale.id)
              if (transfer) {
                transfersToLoad[sale.id] = transfer
              }
            } catch (error) {
              // Error silencioso
            }
          }
        })
      )
      
      if (Object.keys(transfersToLoad).length > 0) {
        setTransfers(prev => ({ ...prev, ...transfersToLoad }))
      }
    }
    
    if (sales.length > 0) {
      loadTransfers()
    }
  }, [sales])

  // Cargar datos de clientes para ventas a domicilio y contar domicilios
  useEffect(() => {
    const loadDeliveryClients = async () => {
      const deliverySales = sales.filter(sale => sale.isDelivery && sale.clientId)
      const clientsToLoad: Record<string, Client> = {}
      
      // Contar domicilios por cliente
      const deliveryCountByClient: Record<string, number> = {}
      deliverySales.forEach(sale => {
        if (sale.clientId) {
          deliveryCountByClient[sale.clientId] = (deliveryCountByClient[sale.clientId] || 0) + 1
        }
      })
      setClientDeliveryCount(deliveryCountByClient)
      
      await Promise.all(
        deliverySales.map(async (sale) => {
          if (!deliveryClients[sale.id] && sale.clientId) {
            try {
              const client = await ClientsService.getClientById(sale.clientId)
              if (client) {
                clientsToLoad[sale.id] = client
              }
            } catch (error) {
              // Error silencioso
            }
          }
        })
      )
      
      if (Object.keys(clientsToLoad).length > 0) {
        setDeliveryClients(prev => ({ ...prev, ...clientsToLoad }))
      }
    }
    
    if (sales.length > 0) {
      loadDeliveryClients()
    }
  }, [sales])

  // Función para copiar información del domicilio
  const handleCopyDelivery = (sale: Sale) => {
    const client = deliveryClients[sale.id]
    if (!client) return
    
    const count = clientDeliveryCount[sale.clientId] || 0
    let historialMsg = ''
    if (count <= 1) {
      historialMsg = `\n\n⚠️ *ATENCIÓN:* 1er pedido - Confirma la recepción de la transferencia antes de enviar`
    } else if (count <= 5) {
      historialMsg = `\n\n📊 *Historial:* ${count} pedidos anteriores`
    } else {
      historialMsg = `\n\n✅ *Cliente seguro:* ${count} pedidos anteriores`
    }
    
    const deliveryInfo = `📍 *Información del Domicilio*\n\n👤 *Cliente:* ${client.name}\n📞 *Teléfono:* ${client.phone || 'N/A'}\n🏠 *Dirección:* ${client.address || 'N/A'}\n📌 *Referencia:* ${client.referencePoint || 'N/A'}${historialMsg}`
    navigator.clipboard.writeText(deliveryInfo)
    setCopiedDelivery(sale.id)
    setTimeout(() => setCopiedDelivery(null), 2000)
  }

  // Función helper para generar ID del crédito
  const getCreditId = (credit: Credit): string => {
    const clientInitials = credit.clientName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2)
      .padEnd(2, 'X')
    
    const creditSuffix = credit.id.substring(credit.id.length - 6).toLowerCase()
    return `${clientInitials}${creditSuffix}`
  }

  // Función helper para generar ID de la transferencia
  const getTransferId = (transfer: StoreStockTransfer): string => {
    if (transfer.transferNumber) {
      return transfer.transferNumber.replace('TRF-', '')
    }
    // Si no hay transferNumber, usar las últimas 8 letras del ID
    return transfer.id.substring(transfer.id.length - 8).toUpperCase()
  }

  // Verificar si una venta es de transferencia entre tiendas
  // Solo es true si hay una transferencia de stock asociada cargada
  const isTransferSale = (sale: Sale): boolean => {
    return !!transfers[sale.id]
  }

  // Efecto para manejar la búsqueda
  useEffect(() => {
    const handleSearch = async () => {
      if (searchTerm.trim()) {
        setIsSearching(true)
        try {
          const results = await onSearch(searchTerm)
          setSearchResults(results)
        } catch (error) {
      // Error silencioso en producción
          setSearchResults([])
        } finally {
          setIsSearching(false)
        }
      } else {
        setSearchResults([])
      }
    }

    // Debounce la búsqueda para evitar muchas llamadas
    const timeoutId = setTimeout(handleSearch, 300)
    return () => clearTimeout(timeoutId)
  }, [searchTerm, onSearch])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    const dateStr = date.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
    const timeStr = date.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
    return { date: dateStr, time: timeStr }
  }

  const generateInvoiceNumber = (sale: Sale) => {
    // Usar el invoiceNumber de la base de datos si existe
    if (sale.invoiceNumber) {
      return sale.invoiceNumber
    }
    // Fallback: usar los últimos 4 caracteres del ID como último recurso
    return `#FV${sale.id.slice(-4)}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-[#fce4f0] text-[#d06a98] hover:bg-[#f29fc8]/30 hover:text-[#c55a88] dark:bg-[#f29fc8]/20 dark:text-[#f29fc8] dark:hover:bg-[#f29fc8]/30 dark:hover:text-[#f29fc8]'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 hover:text-yellow-900 dark:bg-yellow-900/20 dark:text-yellow-400 dark:hover:bg-yellow-900/30 dark:hover:text-yellow-300'
      case 'cancelled':
        return 'bg-red-100 text-red-800 hover:bg-red-200 hover:text-red-900 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:text-red-300'
      case 'draft':
        return 'bg-purple-100 text-purple-800 hover:bg-purple-200 hover:text-purple-900 dark:bg-purple-900/20 dark:text-purple-400 dark:hover:bg-purple-900/30 dark:hover:text-purple-300'
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200 hover:text-gray-900 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 dark:hover:text-gray-200'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completada'
      case 'pending':
        return 'Pendiente'
      case 'cancelled':
        return 'Anulada'
      case 'draft':
        return 'Borrador'
      default:
        return status
    }
  }

  // Obtener el estado real de la venta (usar estado del crédito si es venta a crédito)
  const getEffectiveStatus = (sale: Sale): string => {
    // Si la venta está cancelada, siempre mostrar como cancelada (sin importar el estado del crédito)
    if (sale.status === 'cancelled') {
      return 'cancelled'
    }
    // Si es una venta a crédito y tiene estado de crédito, usar ese estado
    if (sale.paymentMethod === 'credit' && sale.creditStatus) {
      return sale.creditStatus
    }
    // Si es una venta a crédito completada pero no tiene crédito asociado, considerar como pendiente
    if (sale.paymentMethod === 'credit' && sale.status === 'completed' && !sale.creditStatus) {
      return 'pending'
    }
    return sale.status
  }

  // Obtener el label del estado real
  const getEffectiveStatusLabel = (sale: Sale): string => {
    const effectiveStatus = getEffectiveStatus(sale)
    if (sale.paymentMethod === 'credit' && (effectiveStatus === 'pending' || effectiveStatus === 'partial')) {
      return 'Pendiente'
    }
    if (sale.paymentMethod === 'credit' && effectiveStatus === 'completed') {
      return 'Completada'
    }
    if (sale.paymentMethod === 'credit' && effectiveStatus === 'overdue') {
      return 'Vencida'
    }
    return getStatusLabel(effectiveStatus)
  }

  // Obtener el color del estado real
  const getEffectiveStatusColor = (sale: Sale): string => {
    const effectiveStatus = getEffectiveStatus(sale)
    if (sale.paymentMethod === 'credit' && (effectiveStatus === 'pending' || effectiveStatus === 'partial')) {
      return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 hover:text-yellow-900 dark:bg-yellow-900/20 dark:text-yellow-400 dark:hover:bg-yellow-900/30 dark:hover:text-yellow-300'
    }
    if (sale.paymentMethod === 'credit' && effectiveStatus === 'overdue') {
      return 'bg-red-100 text-red-800 hover:bg-red-200 hover:text-red-900 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:text-red-300'
    }
    return getStatusColor(effectiveStatus)
  }

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case 'cash':
        return 'bg-[#fce4f0] text-[#d06a98] hover:bg-[#f29fc8]/30 hover:text-[#c55a88] dark:bg-[#f29fc8]/20 dark:text-[#f29fc8] dark:hover:bg-[#f29fc8]/30 dark:hover:text-[#f29fc8]'
      case 'credit':
        return 'bg-[#fce4f0] text-[#d06a98] hover:bg-[#f29fc8]/30 hover:text-[#c55a88] dark:bg-[#f29fc8]/20 dark:text-[#f29fc8] dark:hover:bg-[#f29fc8]/30 dark:hover:text-[#f29fc8]'
      case 'transfer':
        return 'bg-[#fce4f0] text-[#d06a98] hover:bg-[#f29fc8]/30 hover:text-[#c55a88] dark:bg-[#f29fc8]/20 dark:text-[#f29fc8] dark:hover:bg-[#f29fc8]/30 dark:hover:text-[#f29fc8]'
      case 'warranty':
        return 'bg-[#fce4f0] text-[#d06a98] hover:bg-[#f29fc8]/30 hover:text-[#c55a88] dark:bg-[#f29fc8]/20 dark:text-[#f29fc8] dark:hover:bg-[#f29fc8]/30 dark:hover:text-[#f29fc8]'
      case 'mixed':
        return 'bg-[#fce4f0] text-[#d06a98] hover:bg-[#f29fc8]/30 hover:text-[#c55a88] dark:bg-[#f29fc8]/20 dark:text-[#f29fc8] dark:hover:bg-[#f29fc8]/30 dark:hover:text-[#f29fc8]'
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200 hover:text-gray-900 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 dark:hover:text-gray-200'
    }
  }

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cash':
        return 'Efectivo/Contado'
      case 'credit':
        return 'Crédito'
      case 'transfer':
        return 'Transferencia'
      case 'warranty':
        return 'Garantía'
      case 'mixed':
        return 'Mixto'
      default:
        return method
    }
  }

  const statuses = ['all', 'completed', 'pending', 'cancelled']

  // Usar resultados de búsqueda si hay un término de búsqueda, sino usar todas las ventas
  // Pero si está buscando, no mostrar nada hasta que termine la búsqueda
  const salesToShow = searchTerm.trim() ? (isSearching ? [] : searchResults) : sales
  
  // Eliminar duplicados por ID antes de filtrar
  const uniqueSales = salesToShow.filter((sale, index, self) => 
    index === self.findIndex((s) => s.id === sale.id)
  )
  
  const filteredSales = uniqueSales.filter(sale => {
    if (filterStatus === 'all') return true
    if (filterStatus === 'pending') {
      // Pendientes: ventas a crédito con créditos pendientes o parciales
      if (sale.paymentMethod === 'credit') {
        const effectiveStatus = getEffectiveStatus(sale)
        return effectiveStatus === 'pending' || effectiveStatus === 'partial'
      }
      return false
    }
    if (filterStatus === 'cancelled') {
      // Anuladas: ventas canceladas
      return sale.status === 'cancelled'
    }
    // Para otros estados, usar el filtro normal
    return sale.status === filterStatus
  })

  const toggleSale = (saleId: string) => {
    setExpandedSales(prev => {
      const newSet = new Set(prev)
      if (newSet.has(saleId)) {
        newSet.delete(saleId)
      } else {
        newSet.add(saleId)
      }
      return newSet
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardHeader className="p-3 md:p-6">
          <div className="flex flex-col gap-3 md:gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 md:gap-4">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2 flex-wrap">
                  <Receipt className="h-5 w-5 md:h-6 md:w-6 text-[#f29fc8] flex-shrink-0" />
                  <span className="flex-shrink-0">Gestión de Ventas</span>
                  {todaySalesTotal !== undefined && (
                    <span className="text-xs md:text-base font-normal text-gray-600 dark:text-gray-400 ml-2">
                      <span className="hidden md:inline">• Ventas directas hoy: </span>
                      <span className="font-semibold">{new Intl.NumberFormat('es-CO', { 
                        style: 'currency', 
                        currency: 'COP',
                        minimumFractionDigits: 0 
                      }).format(todaySalesTotal)}</span>
                    </span>
                  )}
                </CardTitle>
                <p className="text-xs md:text-base text-gray-600 dark:text-gray-300 mt-1 hidden md:block">
                  Administra tus ventas y genera facturas
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 md:hidden">
                  Administra tus ventas
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {onRefresh && (
                  <Button 
                    onClick={onRefresh} 
                    variant="outline"
                    className="text-[#f29fc8] border-[#f29fc8] hover:bg-[#fce4f0] dark:text-[#f29fc8] dark:border-[#f29fc8] dark:hover:bg-[#f29fc8]/20 text-xs md:text-sm px-2 md:px-4 py-1.5 md:py-2"
                  >
                    <RefreshCcw className="h-3.5 w-3.5 md:h-4 md:w-4 md:mr-2" />
                    <span className="hidden md:inline">Actualizar</span>
                  </Button>
                )}
                {(canCreateSales || currentUser?.role === 'vendedor' || currentUser?.role === 'Vendedor' || currentUser?.role === 'vendedora' || currentUser?.role === 'Vendedora') && (
                  <Button 
                    onClick={onCreate} 
                    className="bg-[#f29fc8] hover:bg-[#e07ab0] text-white text-xs md:text-sm px-2 md:px-4 py-1.5 md:py-2 flex-1 sm:flex-none"
                  >
                    <Plus className="h-3.5 w-3.5 md:h-4 md:w-4 md:mr-1" />
                    <span className="hidden sm:inline">Nueva Venta</span>
                    <span className="sm:hidden">Nueva</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Search and Filters */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardContent className="p-3 md:p-4">
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 md:left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={isSearching ? "Buscando..." : "Buscar factura o cliente..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 md:pl-10 pr-10 md:pr-4 py-2 md:py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#f29fc8] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
              {isSearching && (
                <div className="absolute right-2 md:right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#f29fc8]"></div>
                </div>
              )}
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full sm:w-auto sm:min-w-[200px] px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#f29fc8] focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700"
            >
              {statuses.map(status => (
                <option key={status} value={status}>
                  {status === 'all' ? 'Todos los estados' : 
                   status === 'pending' ? 'Pendientes (Créditos abiertos)' :
                   status === 'cancelled' ? 'Anuladas' :
                   getStatusLabel(status)}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardContent className="p-0">
          {isSearching ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f29fc8] mx-auto mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400">Buscando ventas...</p>
            </div>
          ) : filteredSales.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {searchTerm.trim() ? 'No se encontraron ventas' : 'No hay ventas registradas'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm.trim() ? 'Intenta con otros criterios de búsqueda' : 'Comienza creando una nueva venta'}
              </p>
            </div>
          ) : (
            <>
              {/* Vista de Tarjetas para Mobile */}
              <div className="md:hidden space-y-3 p-3">
                {filteredSales.map((sale, index) => {
                  const { date, time } = formatDateTime(sale.createdAt)
                  const isExpanded = expandedSales.has(sale.id)
                  return (
                    <div
                      key={sale.id}
                      className={`bg-white dark:bg-gray-800 border rounded-lg p-3 space-y-2 ${
                        isExpanded ? 'border-[#f29fc8] dark:border-[#f29fc8]' : 'border-gray-200 dark:border-gray-700'
                      }`}
                      onClick={() => toggleSale(sale.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">#{index + 1}</span>
                            {sale.paymentMethod === 'credit' ? (
                              <CreditCard className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                            ) : isTransferSale(sale) ? (
                              <Truck className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
                            ) : (
                              <FileText className="h-3.5 w-3.5 text-[#f29fc8] dark:text-[#f29fc8] flex-shrink-0" />
                            )}
                            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">{generateInvoiceNumber(sale)}</span>
                            {sale.isDelivery ? (
                              <span className="flex items-center gap-1 text-[#f29fc8]">
                                <Bike className="h-3.5 w-3.5 flex-shrink-0" />
                                <span className="text-xs">Domicilio</span>
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                                <Store className="h-3.5 w-3.5 flex-shrink-0" />
                                <span className="text-xs">Tienda</span>
                              </span>
                            )}
                            {sale.paymentMethod === 'credit' && credits[sale.id] && (
                              <span className="text-xs font-mono text-orange-600 dark:text-orange-400">
                                Crédito #{getCreditId(credits[sale.id])}
                              </span>
                            )}
                            {isTransferSale(sale) && transfers[sale.id] && (
                              <span className="text-xs font-mono text-cyan-600 dark:text-cyan-400">
                                TRF {transfers[sale.id].transferNumber || `#${getTransferId(transfers[sale.id])}`}
                              </span>
                            )}
                          </div>
                          <h3 className="font-semibold text-sm text-gray-900 dark:text-white truncate" title={sale.clientName}>
                            {sale.clientName}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={getPaymentMethodLabel(sale.paymentMethod)}>
                            {getPaymentMethodLabel(sale.paymentMethod)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={`${getEffectiveStatusColor(sale)} text-xs shrink-0`}>
                          <div className="flex items-center space-x-1">
                              {(() => {
                                const effectiveStatus = getEffectiveStatus(sale)
                                if (effectiveStatus === 'completed') {
                                  return <span className="text-[#d06a98] dark:text-[#f29fc8]">●</span>
                                } else if (effectiveStatus === 'cancelled') {
                                  return <span className="text-red-600 dark:text-red-400">●</span>
                                } else {
                                  return <span className="text-yellow-600 dark:text-yellow-400">●</span>
                                }
                              })()}
                              <span className="hidden sm:inline">{getEffectiveStatusLabel(sale)}</span>
                            </div>
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleSale(sale.id)
                            }}
                            className="h-8 w-8 p-0"
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5 text-[#f29fc8] dark:text-[#f29fc8]" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-[#f29fc8] dark:text-[#f29fc8]" />
                            )}
                          </Button>
                          </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <div className="text-center">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Total</div>
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(sale.total)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Fecha</div>
                          <div className="text-xs font-semibold text-gray-900 dark:text-white">{date}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{time}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                        <Badge className={`${getPaymentMethodColor(sale.paymentMethod)} text-xs`} title={getPaymentMethodLabel(sale.paymentMethod)}>
                          {getPaymentMethodLabel(sale.paymentMethod)}
                        </Badge>
                        {sale.status !== 'cancelled' && (
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation()
                                onPrint(sale)
                              }}
                              className="h-8 w-8 p-0 text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-100 active:scale-95"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Detalle Expandible Mobile */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600 space-y-4">
                          {/* Información Adicional */}
                          <div className="space-y-3">
                            <div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                Fecha de Creación
                              </div>
                              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                {formatDateTime(sale.createdAt).date} {formatDateTime(sale.createdAt).time}
                              </div>
                            </div>
                            {sale.sellerName && (
                              <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-2">
                                  <User className="h-4 w-4" />
                                  Vendedor
                                </div>
                                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {sale.sellerName}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Productos Vendidos */}
                          <div className="mt-4">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                              <Package className="h-4 w-4 text-[#f29fc8]" />
                              Productos ({sale.items?.length || 0})
                            </h3>
                            
                            {(!sale.items || sale.items.length === 0) ? (
                              <div className="text-center py-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                <Package className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                                <p className="text-xs text-gray-500 dark:text-gray-400">No hay productos</p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {sale.items.map((item) => (
                                  <div
                                    key={item.id}
                                    className="border rounded-lg p-2 bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600"
                                  >
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <Package className="h-4 w-4 text-[#f29fc8] dark:text-[#f29fc8]" />
                                        <div className="text-sm font-bold text-gray-900 dark:text-white">
                                          {item.productName}
                                        </div>
                                      </div>
                                      {item.productReferenceCode && (
                                        <div className="text-xs text-gray-500 dark:text-gray-400 ml-6">
                                          Ref: {item.productReferenceCode}
                                        </div>
                                      )}
                                      <div className="grid grid-cols-3 gap-2 ml-6 text-xs">
                                        <div>
                                          <span className="text-gray-500 dark:text-gray-400">Cant:</span> {item.quantity}
                                        </div>
                                        <div>
                                          <span className="text-gray-500 dark:text-gray-400">Precio:</span> {formatCurrency(item.unitPrice)}
                                        </div>
                                        <div>
                                          <span className="text-gray-500 dark:text-gray-400">Total:</span> <span className="font-bold">{formatCurrency(item.total)}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Resumen Financiero */}
                          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                              <Receipt className="h-4 w-4 text-[#f29fc8]" />
                              Resumen Financiero
                            </h3>
                            <div className="space-y-2 text-sm">
                              {/* Desglose IVA */}
                              <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Sin IVA:</span>
                                <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(Math.round(sale.subtotal / 1.19))}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">IVA (19%):</span>
                                <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(sale.subtotal - Math.round(sale.subtotal / 1.19))}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Subtotal:</span>
                                <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(sale.subtotal)}</span>
                              </div>
                              {sale.discount > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-gray-500 dark:text-gray-400">Descuento:</span>
                                  <span className="font-semibold text-red-600 dark:text-red-400">-{formatCurrency(sale.discount)}</span>
                                </div>
                              )}
                              {sale.isDelivery && sale.deliveryFee && sale.deliveryFee > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                    <Bike className="h-3.5 w-3.5 text-[#f29fc8]" />
                                    Domicilio:
                                  </span>
                                  <span className="font-semibold text-[#d06a98] dark:text-[#f29fc8]">{formatCurrency(sale.deliveryFee)}</span>
                                </div>
                              )}
                              <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-600">
                                <span className="font-bold text-gray-900 dark:text-white">Total:</span>
                                <span className="font-bold text-[#f29fc8] dark:text-[#f29fc8]">{formatCurrency(sale.total)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Sección Domicilio - Mobile */}
                          {sale.isDelivery && deliveryClients[sale.id] && (
                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                              <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                  <Bike className="h-4 w-4 text-[#f29fc8]" />
                                  Domicilio
                                </h3>
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleCopyDelivery(sale)
                                  }}
                                  className={`${copiedDelivery === sale.id ? 'bg-green-500 hover:bg-green-600' : 'bg-[#f29fc8] hover:bg-[#e07ab0]'} text-white transition-all`}
                                  size="sm"
                                >
                                  {copiedDelivery === sale.id ? (
                                    <Check className="h-4 w-4" />
                                  ) : (
                                    <Copy className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                              <div className="bg-[#fce4f0]/30 dark:bg-[#f29fc8]/10 rounded-lg p-3 border border-[#f29fc8]/30">
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                      <User className="h-3 w-3" /> Cliente
                                    </div>
                                    <div className="font-semibold text-gray-900 dark:text-white truncate">
                                      {deliveryClients[sale.id].name}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                      <Receipt className="h-3 w-3" /> Teléfono
                                    </div>
                                    <div className="font-semibold text-gray-900 dark:text-white">
                                      {deliveryClients[sale.id].phone || '-'}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                      <Store className="h-3 w-3" /> Dirección
                                    </div>
                                    <div className="font-semibold text-gray-900 dark:text-white">
                                      {deliveryClients[sale.id].address || '-'}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                      <FileText className="h-3 w-3" /> Referencia
                                    </div>
                                    <div className="font-semibold text-gray-900 dark:text-white">
                                      {deliveryClients[sale.id].referencePoint || '-'}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                      <Bike className="h-3 w-3" /> Valor
                                    </div>
                                    <div className="font-bold text-[#d06a98] dark:text-[#f29fc8]">
                                      {sale.deliveryFee ? formatCurrency(sale.deliveryFee) : '$0'}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                      <Truck className="h-3 w-3" /> Historial
                                    </div>
                                    {(() => {
                                      const count = clientDeliveryCount[sale.clientId] || 0
                                      if (count <= 1) {
                                        return (
                                          <div className="font-bold text-[#c45a7a] dark:text-[#e07ab0] flex items-center gap-1">
                                            <AlertTriangle className="h-3 w-3" />
                                            1er pedido
                                          </div>
                                        )
                                      } else if (count <= 5) {
                                        return (
                                          <div className="font-bold text-[#e07ab0] dark:text-[#f29fc8]">
                                            {count} pedidos
                                          </div>
                                        )
                                      } else {
                                        return (
                                          <div className="font-bold text-[#f29fc8] dark:text-[#f29fc8] flex items-center gap-1">
                                            <Check className="h-3 w-3" />
                                            {count} pedidos
                                          </div>
                                        )
                                      }
                                    })()}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Información de anulación - Mobile */}
                          {sale.status === 'cancelled' && (
                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600 space-y-2">
                              {/* Motivo de cancelación */}
                              <div className="flex items-start space-x-2">
                                <AlertTriangle className="h-3.5 w-3.5 text-orange-500 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Motivo: </span>
                                  <span className="text-xs text-gray-900 dark:text-white">
                                    {sale.cancellationReason || 'No especificado'}
                                  </span>
                                </div>
                              </div>
                              
                              {/* Indicadores de devolución */}
                              <div className="flex items-center space-x-4 text-xs text-gray-600 dark:text-gray-400">
                                <div className="flex items-center space-x-1.5">
                                  <Package className="h-3 w-3 text-[#f29fc8] dark:text-[#f29fc8]" />
                                  <span>Stock devuelto</span>
                                </div>
                                <div className="flex items-center space-x-1.5">
                                  <Receipt className="h-3 w-3 text-[#f29fc8] dark:text-[#f29fc8]" />
                                  <span>Dinero devuelto</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Mensaje para facturas de transferencias - Mobile */}
                          {sale.status !== 'cancelled' && transfers[sale.id] && (
                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                              <div className="text-xs text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
                                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                                <span>Esta factura solo puede anularse desde Transferencias</span>
                              </div>
                            </div>
                          )}
                          {/* Botón de Anular Factura - Mobile (No mostrar para transferencias entre tiendas) */}
                          {sale.status !== 'cancelled' && sale.status !== 'draft' && onCancel && !transfers[sale.id] && (
                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                              {!showCancelForm[sale.id] ? (
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setShowCancelForm(prev => ({ ...prev, [sale.id]: true }))
                                    setCancelReason(prev => ({ ...prev, [sale.id]: '' }))
                                    setCancelSuccessMessage(prev => {
                                      const newState = { ...prev }
                                      delete newState[sale.id]
                                      return newState
                                    })
                                  }}
                                  disabled={isCancelling[sale.id]}
                                  size="sm"
                                  variant="outline"
                                  className="w-full text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-900/20"
                                >
                                  <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
                                  <span className="text-xs">Anular</span>
                                </Button>
                                ) : (
                                  <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                                    {cancelSuccessMessage[sale.id] && (
                                      <div className={`p-3 rounded-lg border-2 ${
                                        cancelSuccessMessage[sale.id].includes('exitosamente')
                                          ? 'border-[#f29fc8]/30 bg-[#fce4f0] dark:bg-[#f29fc8]/20 dark:border-[#f29fc8]/30'
                                          : 'border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800'
                                      }`}>
                                        <div className={`text-sm font-medium ${
                                          cancelSuccessMessage[sale.id].includes('exitosamente')
                                            ? 'text-[#d06a98] dark:text-[#f29fc8]'
                                            : 'text-red-800 dark:text-red-200'
                                        }`}>
                                          {cancelSuccessMessage[sale.id].split('\n').map((line, index) => (
                                            <div key={index} className={index === 0 ? 'font-semibold' : ''}>
                                              {line}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Motivo de anulación: <span className="text-red-500">*</span>
                                      </label>
                                      <textarea
                                        value={cancelReason[sale.id] || ''}
                                        onChange={(e) => {
                                          setCancelReason(prev => ({ ...prev, [sale.id]: e.target.value }))
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        onFocus={(e) => e.stopPropagation()}
                                        placeholder="Describa detalladamente el motivo de la anulación (mínimo 10 caracteres)..."
                                        disabled={isCancelling[sale.id]}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 bg-white dark:bg-gray-600 disabled:opacity-50"
                                        rows={3}
                                      />
                                    <div className="mt-1 text-right">
                                      <span className={`text-xs ${(cancelReason[sale.id] || '').length < 10 ? 'text-red-500' : 'text-gray-500'}`}>
                                        {(cancelReason[sale.id] || '').length}/10 caracteres mínimo
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setShowCancelForm(prev => {
                                          const newState = { ...prev }
                                          delete newState[sale.id]
                                          return newState
                                        })
                                        setCancelReason(prev => {
                                          const newState = { ...prev }
                                          delete newState[sale.id]
                                          return newState
                                        })
                                        setCancelSuccessMessage(prev => {
                                          const newState = { ...prev }
                                          delete newState[sale.id]
                                          return newState
                                        })
                                      }}
                                      variant="outline"
                                      disabled={isCancelling[sale.id]}
                                      className="flex-1"
                                    >
                                      Cancelar
                                    </Button>
                                    <Button
                                      onClick={async (e) => {
                                        e.stopPropagation()
                                        if (!cancelReason[sale.id] || cancelReason[sale.id].trim().length < 10 || !onCancel) return
                                        
                                        setIsCancelling(prev => ({ ...prev, [sale.id]: true }))
                                        setCancelSuccessMessage(prev => {
                                          const newState = { ...prev }
                                          delete newState[sale.id]
                                          return newState
                                        })
                                        
                                        try {
                                          const result = await onCancel(sale.id, cancelReason[sale.id].trim())
                                          if (result && result.totalRefund !== undefined && result.totalRefund > 0) {
                                            setCancelSuccessMessage(prev => ({
                                              ...prev,
                                              [sale.id]: `Venta anulada exitosamente.\n\nReembolso total: $${result.totalRefund!.toLocaleString('es-CO')}\nProductos devueltos al stock\nCrédito y abonos anulados`
                                            }))
                                          } else {
                                            setCancelSuccessMessage(prev => ({
                                              ...prev,
                                              [sale.id]: 'Venta anulada exitosamente.\n\nProductos devueltos al stock'
                                            }))
                                          }
                                          
                                          setTimeout(() => {
                                            setShowCancelForm(prev => {
                                              const newState = { ...prev }
                                              delete newState[sale.id]
                                              return newState
                                            })
                                            setCancelReason(prev => {
                                              const newState = { ...prev }
                                              delete newState[sale.id]
                                              return newState
                                            })
                                            setCancelSuccessMessage(prev => {
                                              const newState = { ...prev }
                                              delete newState[sale.id]
                                              return newState
                                            })
                                          }, 3000)
                                        } catch (error) {
                                          setCancelSuccessMessage(prev => ({
                                            ...prev,
                                            [sale.id]: 'Error al anular la venta. Por favor, inténtalo de nuevo.'
                                          }))
                                        } finally {
                                          setIsCancelling(prev => {
                                            const newState = { ...prev }
                                            delete newState[sale.id]
                                            return newState
                                          })
                                        }
                                      }}
                                      disabled={!cancelReason[sale.id] || cancelReason[sale.id].trim().length < 10 || isCancelling[sale.id]}
                                      size="sm"
                                      className="flex-1 bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 text-xs"
                                    >
                                      <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
                                      {isCancelling[sale.id] ? 'Anulando...' : 'Anular'}
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Vista de Cards para Desktop */}
              <div className="hidden md:block space-y-4 p-4 md:p-6">
                    {filteredSales.map((sale) => {
                      const { date, time } = formatDateTime(sale.createdAt)
                  const isExpanded = expandedSales.has(sale.id)
                      return (
                    <Card
                      key={sale.id}
                      className={`bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all cursor-pointer ${
                        isExpanded ? 'border-[#f29fc8] dark:border-[#f29fc8]' : ''
                      }`}
                      onClick={() => toggleSale(sale.id)}
                    >
                      <CardContent className="p-4 md:p-6">
                        {/* Header con icono, factura, cliente y botones */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {sale.paymentMethod === 'credit' ? (
                              <CreditCard className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                            ) : isTransferSale(sale) ? (
                              <Truck className="h-5 w-5 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
                            ) : (
                              <FileText className="h-5 w-5 text-[#f29fc8] dark:text-[#f29fc8] flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-4 mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3">
                                    <div className="flex-1">
                                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Factura</div>
                                      <div className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                        {generateInvoiceNumber(sale)}
                                        {sale.isDelivery ? (
                                          <span className="flex items-center gap-1 text-[#f29fc8]">
                                            <Bike className="h-4 w-4 flex-shrink-0" />
                                            <span className="text-sm font-medium">Domicilio</span>
                                          </span>
                                        ) : (
                                          <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                                            <Store className="h-4 w-4 flex-shrink-0" />
                                            <span className="text-sm font-medium">Tienda</span>
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    {sale.paymentMethod === 'credit' && credits[sale.id] && (
                                      <div className="border-l border-gray-300 dark:border-gray-600 pl-3">
                                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">ID Crédito</div>
                                        <div className="text-sm font-mono font-semibold text-blue-600 dark:text-blue-400">
                                          #{getCreditId(credits[sale.id])}
                                        </div>
                                      </div>
                                    )}
                                    {isTransferSale(sale) && transfers[sale.id] && (
                                      <div className="border-l border-gray-300 dark:border-gray-600 pl-3">
                                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">ID Transferencia</div>
                                        <div className="text-sm font-mono font-semibold text-cyan-600 dark:text-cyan-400">
                                          {transfers[sale.id].transferNumber || `#${getTransferId(transfers[sale.id])}`}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                                {sale.clientName}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                            {sale.status !== 'cancelled' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onPrint(sale)
                                }}
                                className="h-8 px-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:text-orange-400 dark:hover:text-orange-300 dark:hover:bg-orange-900/20 active:scale-95"
                                title="Imprimir"
                              >
                                <Printer className="h-4 w-4 mr-1.5" />
                                <span className="text-xs">Imprimir</span>
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleSale(sale.id)
                              }}
                              className="h-8 w-8 p-0 hover:bg-[#fce4f0] dark:hover:bg-[#f29fc8]/20"
                              title={isExpanded ? "Ocultar detalle" : "Ver detalle"}
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-5 w-5 text-[#f29fc8] dark:text-[#f29fc8] font-bold" />
                              ) : (
                                <ChevronDown className="h-5 w-5 text-[#f29fc8] dark:text-[#f29fc8] font-bold" />
                              )}
                            </Button>
                          </div>
                        </div>
                        
                        {/* Grid de información que ocupa todo el ancho */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total</div>
                            <div className="text-base font-semibold text-gray-900 dark:text-white">
                              {formatCurrency(sale.total)}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Método</div>
                            <Badge className={`${getPaymentMethodColor(sale.paymentMethod)} flex items-center gap-1 w-fit text-sm whitespace-nowrap`}>
                              {getPaymentMethodLabel(sale.paymentMethod)}
                            </Badge>
                          </div>
                          <div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Estado</div>
                            <Badge className={`${getEffectiveStatusColor(sale)} flex items-center gap-1 w-fit text-sm whitespace-nowrap`}>
                              {getEffectiveStatusLabel(sale)}
                            </Badge>
                          </div>
                          <div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Fecha</div>
                            <div className="text-base font-semibold text-gray-900 dark:text-white">
                              {date}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {time}
                            </div>
                          </div>
                        </div>

                        {/* Detalle Expandible */}
                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600 space-y-4">
                            {/* Información Adicional */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-2">
                                  <Calendar className="h-4 w-4" />
                                  Fecha de Creación
                                </div>
                                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {formatDateTime(sale.createdAt).date} {formatDateTime(sale.createdAt).time}
                                </div>
                              </div>
                              {sale.sellerName && (
                                <div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    Vendedor
                                  </div>
                                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                    {sale.sellerName}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Productos Vendidos */}
                            <div className="mt-4">
                              <div className="flex items-center justify-between mb-3">
                                <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                  <Package className="h-4 w-4 text-[#f29fc8]" />
                                  Productos Vendidos ({sale.items?.length || 0})
                                </h3>
                              </div>
                              
                              {(!sale.items || sale.items.length === 0) ? (
                                <div className="text-center py-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                  <Package className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                  <p className="text-sm text-gray-500 dark:text-gray-400">No hay productos registrados</p>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {sale.items.map((item) => (
                                    <div
                                      key={item.id}
                                      className="border rounded-lg p-3 bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600"
                                    >
                                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                                        <div className="flex items-center gap-2">
                                          <Package className="h-5 w-5 text-[#f29fc8] dark:text-[#f29fc8]" />
                                          <div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Producto</div>
                                            <div className="text-sm font-bold text-gray-900 dark:text-white">
                                              {item.productName}
                                            </div>
                                            {item.productReferenceCode && (
                                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                                Ref: {item.productReferenceCode}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        <div>
                                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Cantidad</div>
                                          <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                            {item.quantity}
                                          </div>
                                        </div>
                                        <div>
                                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Precio Unitario</div>
                                          <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                            {formatCurrency(item.unitPrice)}
                                          </div>
                                        </div>
                                        <div>
                                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total</div>
                                          <div className="text-base font-bold text-gray-900 dark:text-white">
                                            {formatCurrency(item.total)}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Resumen Financiero */}
                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                <Receipt className="h-4 w-4 text-[#f29fc8]" />
                                Resumen Financiero
                              </h3>
                              <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                                {/* Desglose IVA */}
                                <div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Sin IVA</div>
                                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                    {formatCurrency(Math.round(sale.subtotal / 1.19))}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">IVA (19%)</div>
                                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                    {formatCurrency(sale.subtotal - Math.round(sale.subtotal / 1.19))}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Subtotal</div>
                                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                    {formatCurrency(sale.subtotal)}
                                  </div>
                                </div>
                                {sale.discount > 0 && (
                                  <div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Descuento</div>
                                    <div className="text-sm font-semibold text-red-600 dark:text-red-400">
                                      -{formatCurrency(sale.discount)}
                                    </div>
                                  </div>
                                )}
                                {sale.isDelivery && sale.deliveryFee && sale.deliveryFee > 0 && (
                                  <div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                                      <Bike className="h-3.5 w-3.5 text-[#f29fc8]" />
                                      Domicilio
                                    </div>
                                    <div className="text-sm font-semibold text-[#d06a98] dark:text-[#f29fc8]">
                                      {formatCurrency(sale.deliveryFee)}
                                    </div>
                                  </div>
                                )}
                                <div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total</div>
                                  <div className="text-sm font-bold text-[#f29fc8] dark:text-[#f29fc8]">
                                    {formatCurrency(sale.total)}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Sección Domicilio - Desktop */}
                            {sale.isDelivery && deliveryClients[sale.id] && (
                              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                                <div className="flex items-center justify-between mb-3">
                                  <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Bike className="h-4 w-4 text-[#f29fc8]" />
                                    Domicilio
                                  </h3>
                                  <Button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleCopyDelivery(sale)
                                    }}
                                    className={`${copiedDelivery === sale.id ? 'bg-green-500 hover:bg-green-600' : 'bg-[#f29fc8] hover:bg-[#e07ab0]'} text-white transition-all`}
                                    size="sm"
                                  >
                                    {copiedDelivery === sale.id ? (
                                      <Check className="h-4 w-4" />
                                    ) : (
                                      <Copy className="h-4 w-4" />
                                    )}
                                  </Button>
                                </div>
                                <div className="bg-[#fce4f0]/30 dark:bg-[#f29fc8]/10 rounded-lg p-4 border border-[#f29fc8]/30">
                                  <div className="grid grid-cols-6 gap-4">
                                    <div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                                        <User className="h-3 w-3" />
                                        Cliente
                                      </div>
                                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                        {deliveryClients[sale.id].name}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                                        <Receipt className="h-3 w-3" />
                                        Teléfono
                                      </div>
                                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                        {deliveryClients[sale.id].phone || '-'}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                                        <Store className="h-3 w-3" />
                                        Dirección
                                      </div>
                                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                        {deliveryClients[sale.id].address || '-'}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                                        <FileText className="h-3 w-3" />
                                        Referencia
                                      </div>
                                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                        {deliveryClients[sale.id].referencePoint || '-'}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                                        <Bike className="h-3 w-3" />
                                        Valor
                                      </div>
                                      <div className="text-sm font-bold text-[#d06a98] dark:text-[#f29fc8]">
                                        {sale.deliveryFee ? formatCurrency(sale.deliveryFee) : '$0'}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                                        <Truck className="h-3 w-3" />
                                        Historial
                                      </div>
                                      {(() => {
                                        const count = clientDeliveryCount[sale.clientId] || 0
                                        if (count <= 1) {
                                          return (
                                            <div className="group relative inline-block">
                                              <div className="text-sm font-bold text-[#c45a7a] dark:text-[#e07ab0] flex items-center gap-1 cursor-help">
                                                <AlertTriangle className="h-3.5 w-3.5" />
                                                1er pedido
                                              </div>
                                              <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-[#d06a98] text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg">
                                                Confirma la recepción de la transferencia
                                              </div>
                                            </div>
                                          )
                                        } else if (count <= 5) {
                                          return (
                                            <div className="group relative inline-block">
                                              <div className="text-sm font-bold text-[#e07ab0] dark:text-[#f29fc8] cursor-help">
                                                {count} pedidos
                                              </div>
                                              <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-[#e07ab0] text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg">
                                                Cliente con pocos pedidos
                                              </div>
                                            </div>
                                          )
                                        } else {
                                          return (
                                            <div className="group relative inline-block">
                                              <div className="text-sm font-bold text-[#f29fc8] dark:text-[#f29fc8] flex items-center gap-1 cursor-help">
                                                <Check className="h-3.5 w-3.5" />
                                                {count} pedidos
                                              </div>
                                              <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-[#f29fc8] text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg">
                                                Cliente seguro
                                              </div>
                                            </div>
                                          )
                                        }
                                      })()}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Información de anulación - Desktop */}
                            {sale.status === 'cancelled' && (
                              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600 space-y-2">
                                {/* Motivo de cancelación */}
                                <div className="flex items-start space-x-2">
                                  <AlertTriangle className="h-4 w-4 text-orange-500 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                                  <div className="flex-1">
                                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Motivo: </span>
                                    <span className="text-sm text-gray-900 dark:text-white">
                                      {sale.cancellationReason || 'No especificado'}
                                    </span>
                                  </div>
                                </div>
                                
                                {/* Indicadores de devolución */}
                                <div className="flex items-center space-x-6 text-sm text-gray-600 dark:text-gray-400">
                                  <div className="flex items-center space-x-2">
                                    <Package className="h-4 w-4 text-[#f29fc8] dark:text-[#f29fc8]" />
                                    <span>Stock devuelto</span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Receipt className="h-4 w-4 text-[#d06a98] dark:text-[#f29fc8]" />
                                    <span>Dinero devuelto</span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Mensaje para facturas de transferencias - Desktop */}
                            {sale.status !== 'cancelled' && transfers[sale.id] && (
                              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                                <div className="text-xs text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
                                  <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                                  <span>Esta factura solo puede anularse desde Transferencias</span>
                                </div>
                              </div>
                            )}
                            {/* Botón de Anular Factura (No mostrar para transferencias entre tiendas) */}
                            {sale.status !== 'cancelled' && sale.status !== 'draft' && onCancel && !transfers[sale.id] && (
                              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                                {!showCancelForm[sale.id] ? (
                                  <Button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setShowCancelForm(prev => ({ ...prev, [sale.id]: true }))
                                      setCancelReason(prev => ({ ...prev, [sale.id]: '' }))
                                      setCancelSuccessMessage(prev => {
                                        const newState = { ...prev }
                                        delete newState[sale.id]
                                        return newState
                                      })
                                    }}
                                    disabled={isCancelling[sale.id]}
                                    size="sm"
                                    variant="outline"
                                    className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-900/20"
                                  >
                                    <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
                                    <span className="text-xs">Anular</span>
                                  </Button>
                                ) : (
                                  <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                                    {cancelSuccessMessage[sale.id] && (
                                      <div className={`p-3 rounded-lg border-2 ${
                                        cancelSuccessMessage[sale.id].includes('exitosamente')
                                          ? 'border-[#f29fc8]/30 bg-[#fce4f0] dark:bg-[#f29fc8]/20 dark:border-[#f29fc8]/30'
                                          : 'border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800'
                                      }`}>
                                        <div className="text-sm font-medium ${
                                          cancelSuccessMessage[sale.id].includes('exitosamente')
                                            ? 'text-[#d06a98] dark:text-[#f29fc8]'
                                            : 'text-red-800 dark:text-red-200'
                                        }">
                                          {cancelSuccessMessage[sale.id].split('\n').map((line, index) => (
                                            <div key={index} className={index === 0 ? 'font-semibold' : ''}>
                                              {line}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Motivo de anulación: <span className="text-red-500">*</span>
                                      </label>
                                      <textarea
                                        value={cancelReason[sale.id] || ''}
                                        onChange={(e) => {
                                          setCancelReason(prev => ({ ...prev, [sale.id]: e.target.value }))
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        onFocus={(e) => e.stopPropagation()}
                                        placeholder="Describa detalladamente el motivo de la anulación (mínimo 10 caracteres)..."
                                        disabled={isCancelling[sale.id]}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 bg-white dark:bg-gray-600 disabled:opacity-50"
                                        rows={3}
                                      />
                                      <div className="mt-1 text-right">
                                        <span className={`text-xs ${(cancelReason[sale.id] || '').length < 10 ? 'text-red-500' : 'text-gray-500'}`}>
                                          {(cancelReason[sale.id] || '').length}/10 caracteres mínimo
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setShowCancelForm(prev => {
                                            const newState = { ...prev }
                                            delete newState[sale.id]
                                            return newState
                                          })
                                          setCancelReason(prev => {
                                            const newState = { ...prev }
                                            delete newState[sale.id]
                                            return newState
                                          })
                                          setCancelSuccessMessage(prev => {
                                            const newState = { ...prev }
                                            delete newState[sale.id]
                                            return newState
                                          })
                                        }}
                                        variant="outline"
                                        disabled={isCancelling[sale.id]}
                                        className="flex-1"
                                      >
                                        Cancelar
                                      </Button>
                                      <Button
                                        onClick={async (e) => {
                                          e.stopPropagation()
                                          if (!cancelReason[sale.id] || cancelReason[sale.id].trim().length < 10 || !onCancel) return
                                          
                                          setIsCancelling(prev => ({ ...prev, [sale.id]: true }))
                                          setCancelSuccessMessage(prev => {
                                            const newState = { ...prev }
                                            delete newState[sale.id]
                                            return newState
                                          })
                                          
                                          try {
                                            const result = await onCancel(sale.id, cancelReason[sale.id].trim())
                                            if (result && result.totalRefund !== undefined && result.totalRefund > 0) {
                                              setCancelSuccessMessage(prev => ({
                                                ...prev,
                                                [sale.id]: `Venta anulada exitosamente.\n\nReembolso total: $${result.totalRefund!.toLocaleString('es-CO')}\nProductos devueltos al stock\nCrédito y abonos anulados`
                                              }))
                                            } else {
                                              setCancelSuccessMessage(prev => ({
                                                ...prev,
                                                [sale.id]: 'Venta anulada exitosamente.\n\nProductos devueltos al stock'
                                              }))
                                            }
                                            
                                            setTimeout(() => {
                                              setShowCancelForm(prev => {
                                                const newState = { ...prev }
                                                delete newState[sale.id]
                                                return newState
                                              })
                                              setCancelReason(prev => {
                                                const newState = { ...prev }
                                                delete newState[sale.id]
                                                return newState
                                              })
                                              setCancelSuccessMessage(prev => {
                                                const newState = { ...prev }
                                                delete newState[sale.id]
                                                return newState
                                              })
                                            }, 3000)
                                          } catch (error) {
                                            setCancelSuccessMessage(prev => ({
                                              ...prev,
                                              [sale.id]: 'Error al anular la venta. Por favor, inténtalo de nuevo.'
                                            }))
                                          } finally {
                                            setIsCancelling(prev => {
                                              const newState = { ...prev }
                                              delete newState[sale.id]
                                              return newState
                                            })
                                          }
                                        }}
                                        disabled={!cancelReason[sale.id] || cancelReason[sale.id].trim().length < 10 || isCancelling[sale.id]}
                                        size="sm"
                                        className="flex-1 bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 text-xs"
                                      >
                                        <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
                                        {isCancelling[sale.id] ? 'Anulando...' : 'Anular'}
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              {/* Paginación - solo mostrar si no hay búsqueda activa */}
              {!searchTerm.trim() && (
                <div className="flex items-center justify-center gap-1 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => onPageChange(currentPage - 1)}
                      disabled={currentPage === 1 || loading}
                    className="h-7 w-7 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    
                  <div className="flex items-center gap-0.5">
                      {Array.from({ length: Math.ceil(totalSales / 10) }, (_, i) => i + 1)
                        .filter(page => {
                          return page === 1 || 
                                 page === Math.ceil(totalSales / 10) || 
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
                                onClick={() => onPageChange(page)}
                                disabled={loading}
                              className={`h-7 min-w-[28px] px-2 text-xs rounded border transition-colors ${
                                  page === currentPage 
                                  ? "bg-[#fce4f0] dark:bg-[#f29fc8]/20 text-[#d06a98] dark:text-[#f29fc8] border-[#f29fc8]/50 dark:border-[#f29fc8] font-medium" 
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
                      onClick={() => onPageChange(currentPage + 1)}
                      disabled={currentPage >= Math.ceil(totalSales / 10) || loading}
                    className="h-7 w-7 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                    <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
