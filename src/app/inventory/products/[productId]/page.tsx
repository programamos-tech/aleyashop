'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Package,
  Edit,
  Trash2,
  ArrowRightLeft,
  ArrowLeft,
  Warehouse,
  Store,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Pause,
  TrendingUp,
  DollarSign,
  BarChart3,
  Calendar
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Dot } from 'recharts'
import { RoleProtectedRoute } from '@/components/auth/role-protected-route'
import { Product, Category, Sale } from '@/types'
import { ProductsService } from '@/lib/products-service'
import { SalesService } from '@/lib/sales-service'
import { useCategories } from '@/contexts/categories-context'
import { useAuth } from '@/contexts/auth-context'
import { usePermissions } from '@/hooks/usePermissions'
import { StockAdjustmentModal } from '@/components/products/stock-adjustment-modal'
import { StockTransferModal } from '@/components/products/stock-transfer-modal'
import { ProductModal } from '@/components/products/product-modal'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { toast } from 'sonner'

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const productId = params.productId as string
  const { categories } = useCategories()
  const { user } = useAuth()
  const { hasPermission } = usePermissions()
  
  // Verificación adicional: si es vendedor, no puede editar/eliminar productos
  const userRole = user?.role?.toLowerCase() || ''
  const isVendedor = userRole === 'vendedor'
  
  // Detectar si es tienda principal o microtienda
  const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
  const isMainStore = !user?.storeId || user.storeId === MAIN_STORE_ID
  
  const canEdit = isVendedor ? false : hasPermission('products', 'edit')
  // Solo se puede eliminar desde la tienda principal
  const canDelete = isVendedor ? false : (isMainStore && hasPermission('products', 'delete'))
  const canAdjust = isVendedor ? false : hasPermission('products', 'edit') // Ajustar stock requiere editar
  // Solo se puede transferir desde la tienda principal
  const canTransfer = isVendedor ? false : (isMainStore && hasPermission('transfers', 'create'))
  
  console.log('[PRODUCT DETAIL] Component mounted, productId:', productId)
  console.log('[PRODUCT DETAIL] Params:', params)
  
  // Verificar si el usuario es Super Admin
  const isSuperAdmin = user?.role === 'superadmin' || user?.role === 'Super Admin' || user?.role === 'Super Administrador'
  
  const [product, setProduct] = useState<Product | null>(null)
  const [sales, setSales] = useState<Sale[]>([]) // Todas las ventas desde la creación
  const [isLoading, setIsLoading] = useState(true)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false)
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    console.log('[PRODUCT DETAIL] useEffect triggered, productId:', productId)
    if (productId) {
      console.log('[PRODUCT DETAIL] Calling loadProduct...')
      loadProduct()
    } else {
      console.warn('[PRODUCT DETAIL] No productId provided!')
      setIsLoading(false)
    }
  }, [productId])

  const loadProduct = async () => {
    try {
      setIsLoading(true)
      console.log('[PRODUCT DETAIL] Loading product:', productId)
      
      // Agregar timeout de seguridad
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout loading product')), 10000) // 10 segundos
      })
      
      const productData = await Promise.race([
        ProductsService.getProductById(productId),
        timeoutPromise
      ]) as Product | null
      
      console.log('[PRODUCT DETAIL] Product data received:', productData ? 'OK' : 'NULL')
      
      if (productData) {
        setProduct(productData)
        setIsLoading(false) // Dejar de mostrar el loading una vez que el producto está cargado
        console.log('[PRODUCT DETAIL] Product set, loading sales in background...')
        
        // Cargar todas las ventas del producto desde su creación de forma asíncrona (no bloquea)
        // Esto se hace después de mostrar el producto para que no bloquee la UI
        SalesService.getSalesByProductId(productId)
          .then((allSalesData) => {
            console.log('[PRODUCT DETAIL] Sales loaded:', productId, allSalesData.length)
          setSales(allSalesData)
          })
          .catch((salesError) => {
            console.error('[PRODUCT DETAIL] Error loading sales:', salesError)
          setSales([])
          })
      } else {
        console.error('[PRODUCT DETAIL] Product not found:', productId)
        setIsLoading(false)
        toast.error('Producto no encontrado')
        router.push('/inventory/products')
      }
    } catch (error) {
      console.error('[PRODUCT DETAIL] Exception loading product:', error)
      setIsLoading(false)
      toast.error('Error al cargar el producto. Por favor, intenta de nuevo.')
      // No redirigir automáticamente, dejar que el usuario intente de nuevo
    }
  }

  const handleEdit = () => {
    setIsEditModalOpen(true)
  }

  const handleSaveProduct = async (productData: Omit<Product, 'id'>) => {
    if (!product) return
    
    try {
      console.log('[PRODUCT DETAIL] Starting product update:', {
        productId: product.id,
        updates: productData,
        userId: user?.id
      })
      
      const success = await ProductsService.updateProduct(product.id, productData, user?.id)
      
      console.log('[PRODUCT DETAIL] Product update result:', success)
      
      if (success) {
        toast.success('Producto actualizado exitosamente')
        setIsEditModalOpen(false)
        // Esperar un momento antes de recargar para asegurar que la actualización se complete
        setTimeout(async () => {
          try {
            await loadProduct()
          } catch (loadError) {
            console.error('[PRODUCT DETAIL] Error reloading product after update:', loadError)
            toast.error('Producto actualizado pero hubo un error al recargar. Por favor, recarga la página.')
          }
        }, 500)
      } else {
        toast.error('Error actualizando producto. Por favor, verifica los datos e intenta nuevamente.')
      }
    } catch (error) {
      console.error('[PRODUCT DETAIL] Exception updating product:', error)
      toast.error('Error actualizando producto. Por favor, intenta nuevamente.')
    }
  }

  const handleDelete = () => {
    setDeleteError(null)
    setIsDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!product) return
    setIsDeleting(true)
    setDeleteError(null)
    try {
      const result = await ProductsService.deleteProduct(product.id, user?.id)
      if (result.success) {
        toast.success('Producto eliminado exitosamente')
        setIsDeleteModalOpen(false)
        router.push('/inventory/products')
      } else {
        setDeleteError(result.error || 'Error eliminando producto')
      }
    } catch (error) {
      console.error('[PRODUCT DETAIL] Exception deleting product:', error)
      setDeleteError('Error al eliminar el producto. Intenta de nuevo.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleStockAdjustment = () => {
    setIsAdjustmentModalOpen(true)
  }

  const handleAdjustStock = async (productId: string, location: 'warehouse' | 'store', newQuantity: number, reason: string) => {
    try {
      console.log('[PRODUCT DETAIL] Starting stock adjustment:', {
        productId,
        location,
        newQuantity,
        reason,
        userId: user?.id
      })
      
      const success = await ProductsService.adjustStock(productId, location, newQuantity, reason, user?.id)
      
      console.log('[PRODUCT DETAIL] Stock adjustment result:', success)
      
      if (success) {
        toast.success('Stock ajustado exitosamente')
        setIsAdjustmentModalOpen(false)
        // Esperar un momento antes de recargar para asegurar que la actualización se complete
        setTimeout(async () => {
          try {
            await loadProduct()
          } catch (loadError) {
            console.error('[PRODUCT DETAIL] Error reloading product after adjustment:', loadError)
            toast.error('Stock actualizado pero hubo un error al recargar. Por favor, recarga la página.')
          }
        }, 500)
      } else {
        toast.error('Error ajustando stock. Por favor, verifica los datos e intenta nuevamente.')
        // No cerrar el modal si hay error para que el usuario pueda intentar de nuevo
      }
    } catch (error) {
      console.error('[PRODUCT DETAIL] Exception adjusting stock:', error)
      toast.error('Error ajustando stock. Por favor, intenta nuevamente.')
      // No cerrar el modal si hay error
    }
  }

  const handleStockTransfer = () => {
    setIsTransferModalOpen(true)
  }

  const handleTransferStock = async (transferData: Omit<any, 'id' | 'createdAt' | 'userId' | 'userName'>) => {
    try {
      console.log('[PRODUCT DETAIL] Starting stock transfer:', {
        productId: transferData.productId,
        fromLocation: transferData.fromLocation,
        toLocation: transferData.toLocation,
        quantity: transferData.quantity,
        userId: user?.id
      })
      
      const success = await ProductsService.transferStock(
        transferData.productId,
        transferData.fromLocation,
        transferData.toLocation,
        transferData.quantity,
        user?.id
      )
      
      console.log('[PRODUCT DETAIL] Stock transfer result:', success)
      
      if (success) {
        toast.success('Stock transferido exitosamente')
        setIsTransferModalOpen(false)
        // Esperar un momento antes de recargar para asegurar que la actualización se complete
        setTimeout(async () => {
          try {
            await loadProduct()
          } catch (loadError) {
            console.error('[PRODUCT DETAIL] Error reloading product after transfer:', loadError)
            toast.error('Stock transferido pero hubo un error al recargar. Por favor, recarga la página.')
          }
        }, 500)
      } else {
        toast.error('Error transfiriendo stock. Por favor, verifica los datos e intenta nuevamente.')
      }
    } catch (error) {
      console.error('[PRODUCT DETAIL] Exception transferring stock:', error)
      toast.error('Error transfiriendo stock. Por favor, intenta nuevamente.')
    }
  }

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId)
    return category?.name || 'Sin categoría'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-[#fce4f0] text-[#d06a98] dark:bg-[#f29fc8]/20 dark:text-[#f29fc8]'
      case 'inactive':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
      case 'discontinued':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      case 'out_of_stock':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return CheckCircle
      case 'inactive':
        return Pause
      case 'discontinued':
        return XCircle
      case 'out_of_stock':
        return AlertTriangle
      default:
        return CheckCircle
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Activo'
      case 'inactive':
        return 'Inactivo'
      case 'discontinued':
        return 'Descontinuado'
      case 'out_of_stock':
        return 'Sin Stock'
      default:
        return status
    }
  }

  const getStockStatusLabel = (product: Product) => {
    const { warehouse, store, total } = product.stock
    
    if (total === 0) {
      return 'Sin Stock'
    }
    
    if (store > 0) {
      if (store >= 10) {
        return 'Disponible Local'
      } else if (store >= 5) {
        return 'Stock Local Bajo'
      } else {
        return 'Stock Local Muy Bajo'
      }
    }
    
    if (warehouse > 0) {
      if (warehouse >= 20) {
        return 'Solo Bodega'
      } else if (warehouse >= 10) {
        return 'Solo Bodega (Bajo)'
      } else {
        return 'Solo Bodega (Muy Bajo)'
      }
    }
    
    return 'Sin Stock'
  }

  const getStockStatusColor = (product: Product) => {
    const { warehouse, store, total } = product.stock
    
    if (total === 0) {
      return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
    }
    
    if (store > 0) {
      if (store >= 10) {
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      } else if (store >= 5) {
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      } else {
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
      }
    }
    
    if (warehouse > 0) {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
    }
    
    return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatNumber = (number: number) => {
    return new Intl.NumberFormat('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(number)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  // Calcular métricas de rotación y márgenes (SIN IVA para análisis real)
  const calculateMetrics = () => {
    console.log('Calculando métricas - Product:', product?.id, 'Sales:', sales.length)
    
    if (!product || sales.length === 0) {
      return {
        totalSold: 0,
        totalRevenue: 0,
        totalRevenueSinIva: 0,
        totalCost: 0,
        totalCostSinIva: 0,
        totalProfit: 0,
        profitMargin: 0,
        averageDailySales: 0,
        daysToStockOut: null,
        salesByDay: []
      }
    }

    // Calcular métricas totales desde que se creó el producto
    let totalSold = 0
    let totalRevenueConIva = 0 // Para referencia
    let totalCostConIva = 0 // Para referencia
    
    // Costo sin IVA del producto
    const costSinIva = product.costBeforeTax || Math.round(product.cost / 1.19)
    
    // Obtener fecha de creación del producto
    const productCreatedAt = new Date(product.createdAt)
    const today = new Date()
    
    // Agrupar todas las ventas por día (para métricas totales)
    const allSalesByDayMap: Record<string, number> = {}
    
    sales.forEach(sale => {
      if (!sale.items) return
      
      sale.items.forEach(item => {
        if (item.productId === product.id) {
          totalSold += item.quantity
          totalRevenueConIva += item.total
          totalCostConIva += (product.cost * item.quantity)
          
          // Agrupar por día
          const saleDate = new Date(sale.createdAt)
          const dayKey = saleDate.toISOString().split('T')[0]
          allSalesByDayMap[dayKey] = (allSalesByDayMap[dayKey] || 0) + item.quantity
        }
      })
    })

    // Calcular valores SIN IVA para análisis real de márgenes
    const totalRevenueSinIva = Math.round(totalRevenueConIva / 1.19)
    const totalCostSinIva = costSinIva * totalSold
    
    const totalProfit = totalRevenueSinIva - totalCostSinIva
    const profitMargin = totalRevenueSinIva > 0 ? (totalProfit / totalRevenueSinIva) * 100 : 0

    // Calcular promedio diario de ventas desde la creación
    const daysSinceCreation = Math.max(1, Math.ceil(
      (today.getTime() - productCreatedAt.getTime()) / (1000 * 60 * 60 * 24)
    ))
    const averageDailySales = totalSold / daysSinceCreation

    // Calcular días hasta agotar stock (basado en velocidad de venta promedio)
    let daysToStockOut: number | null = null
    if (averageDailySales > 0 && product.stock.total > 0) {
      daysToStockOut = Math.ceil(product.stock.total / averageDailySales)
    }

    // Para el gráfico: mostrar solo los últimos 30 días (o menos si el producto es más nuevo)
    const daysToShow = Math.min(30, daysSinceCreation)
    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() - daysToShow + 1)
    
    // Generar días para el gráfico (últimos 30 días o desde creación si es más nuevo)
    const salesByDayMap: Record<string, number> = {}
    const days: Date[] = []
    const chartStartDate = productCreatedAt > startDate ? productCreatedAt : startDate
    
    for (let d = new Date(chartStartDate); d <= today; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d))
      const dayKey = d.toISOString().split('T')[0]
      salesByDayMap[dayKey] = allSalesByDayMap[dayKey] || 0
    }

    // Convertir mapa a array ordenado para el gráfico
    // Limitar etiquetas del eje X para que no se vea confuso
    const salesByDay = Object.entries(salesByDayMap)
      .map(([date, quantity], index) => {
        const dateObj = new Date(date)
        const totalDays = days.length
        
        // Mostrar etiqueta solo en ciertos intervalos para evitar saturación
        // Mostrar primera, última, y algunas intermedias
        const showLabel = index === 0 || 
                         index === totalDays - 1 || 
                         (totalDays <= 7 && index % 1 === 0) || // Si son 7 días o menos, mostrar todos
                         (totalDays <= 14 && index % 2 === 0) || // Si son 14 días o menos, cada 2 días
                         (totalDays <= 30 && index % 3 === 0) // Si son 30 días, cada 3 días
        
        return {
          date,
          quantity,
          dayLabel: showLabel 
            ? dateObj.toLocaleDateString('es-CO', { 
                day: 'numeric', 
                month: 'short'
              })
            : ''
        }
      })
      .sort((a, b) => a.date.localeCompare(b.date))

    return {
      totalSold,
      totalRevenue: totalRevenueSinIva, // Sin IVA
      totalRevenueConIva,
      totalCost: totalCostSinIva, // Sin IVA
      totalCostConIva,
      totalProfit,
      profitMargin,
      averageDailySales,
      daysToStockOut,
      salesByDay
    }
  }

  const metrics = calculateMetrics()

  if (isLoading) {
    return (
      <RoleProtectedRoute module="products" requiredAction="view">
        <div className="p-4 md:p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f29fc8]"></div>
        </div>
      </RoleProtectedRoute>
    )
  }

  if (!product) {
    return null
  }

  const StatusIcon = getStatusIcon(product.status)

  return (
    <RoleProtectedRoute module="products" requiredAction="view">
      <div className="p-3 md:p-6 space-y-4 md:space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen pb-20 lg:pb-6">
        {/* Header */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-3 md:p-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                    <Package className="h-5 w-5 md:h-8 md:w-8 text-[#f29fc8] flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                        <h1 className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white truncate">
                          {product.name}
                        </h1>
                        {product.status === 'active' && (
                          <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-[#f29fc8] dark:text-[#f29fc8] flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <div className="text-xs md:text-sm font-mono font-semibold text-blue-600 dark:text-blue-400">
                          {product.reference}
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => router.push('/inventory/products')}
                          className="text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 text-xs md:text-sm px-2 md:px-3 py-1 md:py-1.5 h-auto flex-shrink-0"
                        >
                          <ArrowLeft className="h-3.5 w-3.5 md:h-4 md:w-4 md:mr-2" />
                          <span className="hidden md:inline">Volver</span>
                        </Button>
                      </div>
                      <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {getCategoryName(product.categoryId)}
                      </div>
                    </div>
                  </div>

                  {/* Resumen de Stock */}
                  <div className="grid grid-cols-1 gap-2 md:gap-4 mt-3 md:mt-4">
                    <div className="p-2 md:p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mb-1">Stock</div>
                      <div className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">
                        {formatNumber(product.stock.total)}
                      </div>
                    </div>
                  </div>

                  {/* Estados y Botones de Acción */}
                  <div className="flex flex-col gap-3 mt-3 md:mt-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`${getStockStatusColor(product)} flex items-center gap-1 w-fit text-xs md:text-sm whitespace-nowrap`}>
                        {getStockStatusLabel(product)}
                      </Badge>
                      {product.status !== 'active' && (
                        <Badge className={`${getStatusColor(product.status)} flex items-center gap-1 w-fit text-xs md:text-sm`}>
                          <StatusIcon className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                          {getStatusLabel(product.status)}
                        </Badge>
                      )}
                    </div>
                    
                    {/* Botones en grid para mobile */}
                    {(canEdit || canAdjust || canDelete) && (
                      <div className="grid grid-cols-2 md:flex md:items-center md:gap-2 gap-2 md:mt-0">
                        {canEdit && (
                          <Button
                            onClick={handleEdit}
                            className="bg-[#f29fc8] hover:bg-[#d06a98] text-white text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-1 h-auto w-full md:w-auto"
                          >
                            <Edit className="h-3.5 w-3.5 md:mr-1.5" />
                            <span className="hidden md:inline">Editar</span>
                            <span className="md:hidden">Editar</span>
                          </Button>
                        )}
                        {canAdjust && (
                          <Button
                            onClick={handleStockAdjustment}
                            variant="outline"
                            className="text-orange-600 border-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:border-orange-400 dark:hover:bg-orange-900/20 text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-1 h-auto w-full md:w-auto"
                          >
                            <Package className="h-3.5 w-3.5 md:mr-1.5" />
                            <span className="hidden md:inline">Ajustar</span>
                            <span className="md:hidden">Ajustar</span>
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            onClick={handleDelete}
                            variant="outline"
                            className="text-red-600 border-red-600 hover:bg-red-50 dark:text-red-400 dark:border-red-400 dark:hover:bg-red-900/20 text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-1 h-auto w-full md:w-auto"
                          >
                            <Trash2 className="h-3.5 w-3.5 md:mr-1.5" />
                            <span className="hidden md:inline">Eliminar</span>
                            <span className="md:hidden">Eliminar</span>
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Información Detallada */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader className="p-3 md:p-6 pb-3 md:pb-6">
            <CardTitle className="text-base md:text-lg text-gray-900 dark:text-white">
              Información del Producto
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0 md:pt-0 space-y-3 md:space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div>
                <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mb-1">Descripción</div>
                <div className="text-sm md:text-base text-gray-900 dark:text-white">
                  {product.description || 'Sin descripción'}
                </div>
              </div>
              {product.brand && (
                <div>
                  <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mb-1">Marca</div>
                  <div className="text-sm md:text-base text-gray-900 dark:text-white">
                    {product.brand}
                  </div>
                </div>
              )}
              {/* Precio de Venta con IVA */}
              <div className="col-span-1 md:col-span-2 p-3 bg-[#fce4f0]/30 dark:bg-[#f29fc8]/10 rounded-lg border border-[#f29fc8]/30">
                <div className="text-xs md:text-sm font-medium text-[#d06a98] dark:text-[#f29fc8] mb-2">Precio de Venta</div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <div className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400">Sin IVA</div>
                    <div className="text-sm md:text-base font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(product.priceBeforeTax || Math.round(product.price / 1.19))}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400">IVA (19%)</div>
                    <div className="text-sm md:text-base font-semibold text-gray-600 dark:text-gray-300">
                      {formatCurrency(product.price - (product.priceBeforeTax || Math.round(product.price / 1.19)))}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400">Con IVA</div>
                    <div className="text-sm md:text-base font-bold text-[#d06a98] dark:text-[#f29fc8]">
                      {formatCurrency(product.price)}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Costo con IVA */}
              <div className="col-span-1 md:col-span-2 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-600">
                <div className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Costo de Compra</div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <div className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400">Sin IVA</div>
                    <div className="text-sm md:text-base font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(product.costBeforeTax || Math.round(product.cost / 1.19))}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400">IVA (19%)</div>
                    <div className="text-sm md:text-base font-semibold text-gray-600 dark:text-gray-300">
                      {formatCurrency(product.cost - (product.costBeforeTax || Math.round(product.cost / 1.19)))}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400">Con IVA</div>
                    <div className="text-sm md:text-base font-bold text-gray-900 dark:text-white">
                      {formatCurrency(product.cost)}
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mb-1">Fecha de Creación</div>
                <div className="text-sm md:text-base text-gray-900 dark:text-white">
                  {formatDate(product.createdAt)}
                </div>
              </div>
              {product.updatedAt && (
                <div>
                  <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mb-1">Última Actualización</div>
                  <div className="text-sm md:text-base text-gray-900 dark:text-white">
                    {formatDate(product.updatedAt)}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Análisis de Rotación y Márgenes - Solo para Super Admin */}
        {isSuperAdmin && (
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader className="p-3 md:p-6 pb-3 md:pb-6">
              <CardTitle className="text-base md:text-lg text-gray-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="h-4 w-4 md:h-5 md:w-5 text-[#f29fc8]" />
                Análisis de Rotación y Márgenes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0 md:pt-0 space-y-4 md:space-y-6">
            {/* Métricas Principales */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
              <div className="p-2 md:p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-1 md:gap-2 mb-1 md:mb-2">
                  <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <div className="text-[10px] md:text-xs text-blue-600 dark:text-blue-400 font-medium truncate">Unidades Vendidas</div>
                </div>
                <div className="text-lg md:text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {formatNumber(metrics.totalSold)}
                </div>
                <div className="text-[10px] md:text-xs text-blue-700 dark:text-blue-300 mt-0.5 md:mt-1">
                  Total histórico
                </div>
              </div>
              
              <div className="p-2 md:p-4 bg-gradient-to-br from-[#fce4f0] to-[#fce4f0] dark:from-[#f29fc8]/20 dark:to-[#d06a98]/20 rounded-lg border border-[#f29fc8]/50 dark:border-[#d06a98]">
                <div className="flex items-center gap-1 md:gap-2 mb-1 md:mb-2">
                  <DollarSign className="h-3 w-3 md:h-4 md:w-4 text-[#f29fc8] dark:text-[#f29fc8] flex-shrink-0" />
                  <div className="text-[10px] md:text-xs text-[#f29fc8] dark:text-[#f29fc8] font-medium truncate">Ingresos (sin IVA)</div>
                </div>
                <div className="text-base md:text-xl font-bold text-[#f29fc8] dark:text-[#fce4f0] truncate">
                  {formatCurrency(metrics.totalRevenue)}
                </div>
                <div className="text-[10px] md:text-xs text-[#e07ab0] dark:text-[#f29fc8] mt-0.5 md:mt-1">
                  Base imponible
                </div>
              </div>
              
              <div className="p-2 md:p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-1 md:gap-2 mb-1 md:mb-2">
                  <DollarSign className="h-3 w-3 md:h-4 md:w-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                  <div className="text-[10px] md:text-xs text-purple-600 dark:text-purple-400 font-medium truncate">Ganancia (sin IVA)</div>
                </div>
                <div className="text-base md:text-xl font-bold text-purple-900 dark:text-purple-100 truncate">
                  {formatCurrency(metrics.totalProfit)}
                </div>
                <div className="text-[10px] md:text-xs text-purple-700 dark:text-purple-300 mt-0.5 md:mt-1">
                  {metrics.profitMargin.toFixed(1)}% margen real
                </div>
              </div>
              
              <div className="p-2 md:p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="flex items-center gap-1 md:gap-2 mb-1 md:mb-2">
                  <Calendar className="h-3 w-3 md:h-4 md:w-4 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                  <div className="text-[10px] md:text-xs text-orange-600 dark:text-orange-400 font-medium truncate">Promedio Diario</div>
                </div>
                <div className="text-lg md:text-2xl font-bold text-orange-900 dark:text-orange-100">
                  {new Intl.NumberFormat('es-CO', {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1
                  }).format(metrics.averageDailySales)}
                </div>
                <div className="text-[10px] md:text-xs text-orange-700 dark:text-orange-300 mt-0.5 md:mt-1">
                  unidades/día
                </div>
              </div>
            </div>

            {/* Gráfica de Rotación por Día */}
            {metrics.salesByDay.length > 0 && (
              <div>
                <div className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 md:mb-4">
                  Rotación Diaria (Últimos {Math.min(30, metrics.salesByDay.length)} días)
                </div>
                <div className="h-64 md:h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={metrics.salesByDay} margin={{ top: 5, right: 10, left: 0, bottom: 50 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
                      <XAxis 
                        dataKey="dayLabel" 
                        stroke="#6b7280"
                        className="text-xs"
                        tick={{ fill: '#6b7280', fontSize: 10 }}
                        angle={-45}
                        textAnchor="end"
                        height={70}
                        interval={0}
                      />
                      <YAxis 
                        stroke="#6b7280"
                        tick={{ fill: '#6b7280', fontSize: 11 }}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                        labelStyle={{ color: '#374151', fontWeight: 600 }}
                        formatter={(value: number) => [`${value} unidades`, 'Ventas']}
                        labelFormatter={(label) => {
                          const date = metrics.salesByDay.find(d => d.dayLabel === label)?.date
                          if (date) {
                            return new Date(date).toLocaleDateString('es-CO', { 
                              day: 'numeric', 
                              month: 'short'
                            })
                          }
                          return label
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="quantity" 
                        stroke="#06b6d4" 
                        strokeWidth={2}
                        dot={{ fill: '#06b6d4', r: 4, strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 6, fill: '#0891b2', strokeWidth: 2, stroke: '#fff' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {metrics.salesByDay.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No hay ventas registradas para este producto</p>
              </div>
            )}
          </CardContent>
        </Card>
        )}

      </div>

      {/* Modales */}
      <ProductModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveProduct}
        product={product}
        categories={categories}
      />

      <StockAdjustmentModal
        isOpen={isAdjustmentModalOpen}
        onClose={() => setIsAdjustmentModalOpen(false)}
        onAdjust={handleAdjustStock}
        product={product}
      />

      <StockTransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        onTransfer={handleTransferStock}
        product={product}
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!isDeleting) {
            setIsDeleteModalOpen(false)
            setDeleteError(null)
          }
        }}
        onConfirm={confirmDelete}
        title="Eliminar Producto"
        message={`¿Estás seguro de que quieres eliminar el producto "${product?.name}"? Esta acción no se puede deshacer.`}
        confirmText={isDeleting ? 'Eliminando...' : 'Eliminar'}
        cancelText="Cancelar"
        type="danger"
        confirmDisabled={isDeleting}
        errorMessage={deleteError ?? undefined}
      />
    </RoleProtectedRoute>
  )
}

