'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Package, 
  Plus, 
  Search, 
  Edit, 
  Trash2,
  ArrowRightLeft,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Pause,
  Tag,
  X,
  RefreshCw,
  Eye,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { Product, Category } from '@/types'
import type { StockFilter } from '@/lib/products-service'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { usePermissions } from '@/hooks/usePermissions'
import { useAuth } from '@/contexts/auth-context'

interface ProductTableProps {
  products: Product[]
  categories: Category[]
  loading: boolean
  currentPage: number
  totalProducts: number
  hasMore: boolean
  isSearching: boolean
  stockFilter: StockFilter
  onFilterChange: (filter: StockFilter) => void
  onEdit: (product: Product) => void
  onDelete: (product: Product) => void
  onCreate: () => void
  onManageCategories: () => void
  onStockAdjustment?: (product: Product) => void
  onStockTransfer?: (product: Product) => void
  onRefresh?: () => void
  onPageChange: (page: number) => void
  onSearch: (searchTerm: string) => Promise<Product[]>
  totalStock?: number
  onView?: (product: Product) => void
}

// Número de productos por página
const ITEMS_PER_PAGE = 15

export function ProductTable({
  products,
  categories,
  loading,
  currentPage,
  totalProducts,
  hasMore,
  isSearching,
  stockFilter,
  onFilterChange,
  onEdit,
  onDelete,
  onCreate,
  onManageCategories,
  onStockAdjustment,
  totalStock,
  onStockTransfer,
  onRefresh,
  onPageChange,
  onSearch,
  onView
}: ProductTableProps) {
  const router = useRouter()
  const { hasPermission } = usePermissions()
  const { user } = useAuth()
  
  // Verificación adicional: si es vendedor, no puede editar/eliminar productos
  // Verificar múltiples variaciones del nombre del rol
  const isVendedor = user?.role?.toLowerCase() === 'vendedor' || 
                     user?.role === 'vendedor' || 
                     user?.role === 'Vendedor'
  
  // Verificar si estamos en la tienda principal
  const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
  const isMainStore = !user?.storeId || user?.storeId === MAIN_STORE_ID
  
  // Si es vendedor, forzar que no tenga permisos de edición/eliminación
  const canEdit = isVendedor ? false : hasPermission('products', 'edit')
  // Solo se puede eliminar desde la tienda principal
  const canDelete = isVendedor ? false : (isMainStore && hasPermission('products', 'delete'))
  // Solo se pueden crear productos desde la tienda principal
  const canCreate = isVendedor ? false : (isMainStore && hasPermission('products', 'create'))
  const canAdjust = isVendedor ? false : hasPermission('products', 'edit') // Ajustar stock requiere editar
  // Solo se puede transferir desde la tienda principal
  const canTransfer = isVendedor ? false : (isMainStore && hasPermission('transfers', 'create'))
  
  // Debug: verificar valores
  useEffect(() => {
    if (user) {
      console.log('[PRODUCT TABLE] User role:', user.role)
      console.log('[PRODUCT TABLE] Is vendedor:', isVendedor)
      console.log('[PRODUCT TABLE] Is main store:', isMainStore)
      console.log('[PRODUCT TABLE] Permissions:', { canEdit, canDelete, canCreate, canAdjust, canTransfer })
    }
  }, [user, isVendedor, isMainStore, canEdit, canDelete, canCreate, canAdjust, canTransfer])
  const [searchTerm, setSearchTerm] = useState('')

  // Función simple para manejar búsqueda
  const handleSearch = (term: string) => {
    onSearch(term)
  }

  // Debounce para búsqueda automática - solo cuando hay texto
  useEffect(() => {
    if (!searchTerm.trim()) {
      return
    }

    const timeoutId = setTimeout(() => {
      handleSearch(searchTerm)
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId)
    return category?.name || 'Sin categoría'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 hover:bg-green-100 hover:text-green-800 dark:hover:bg-green-900/20 dark:hover:text-green-400'
      case 'inactive':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-gray-700 dark:hover:text-gray-300'
      case 'discontinued':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 hover:bg-red-100 hover:text-red-800 dark:hover:bg-red-900/20 dark:hover:text-red-400'
      case 'out_of_stock':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400 hover:bg-orange-100 hover:text-orange-800 dark:hover:bg-orange-900/20 dark:hover:text-orange-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-gray-700 dark:hover:text-gray-300'
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

  // Nueva lógica para estados de stock más precisos
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
      return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 hover:bg-red-100 hover:text-red-800 dark:hover:bg-red-900/20 dark:hover:text-red-400'
    }
    
    if (store > 0) {
      if (store >= 10) {
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 hover:bg-green-100 hover:text-green-800 dark:hover:bg-green-900/20 dark:hover:text-green-400'
      } else if (store >= 5) {
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 hover:bg-yellow-100 hover:text-yellow-800 dark:hover:bg-yellow-900/20 dark:hover:text-yellow-400'
      } else {
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400 hover:bg-orange-100 hover:text-orange-800 dark:hover:bg-orange-900/20 dark:hover:text-orange-400'
      }
    }
    
    if (warehouse > 0) {
      return 'bg-[#fce4f0] text-[#d06a98] dark:bg-[#f29fc8]/20 dark:text-[#f29fc8] hover:bg-[#fce4f0] hover:text-[#d06a98] dark:hover:bg-[#f29fc8]/20 dark:hover:text-[#f29fc8]'
    }
    
    return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 hover:bg-red-100 hover:text-red-800 dark:hover:bg-red-900/20 dark:hover:text-red-400'
  }

  // Los productos ya vienen filtrados desde el contexto (filtro aplicado en backend)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  // Opciones de estado de stock - las de bodega solo para tienda principal
  const stockStatusOptions = [
    { value: 'all', label: 'Todos los estados' },
    { value: 'Sin Stock', label: 'Sin Stock' },
    { value: 'Disponible Local', label: 'Disponible Local' },
    { value: 'Stock Local Bajo', label: 'Stock Local Bajo' },
    { value: 'Stock Local Muy Bajo', label: 'Stock Local Muy Bajo' },
    // Solo mostrar opciones de bodega en tienda principal
    ...(isMainStore ? [
      { value: 'Solo Bodega', label: 'Solo Bodega' },
      { value: 'Solo Bodega (Bajo)', label: 'Solo Bodega (Bajo)' },
      { value: 'Solo Bodega (Muy Bajo)', label: 'Solo Bodega (Muy Bajo)' }
    ] : [])
  ]

  return (
    <TooltipProvider>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader className="p-3 md:p-6">
            <div className="flex flex-col gap-3 md:gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 md:gap-4">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2 flex-wrap">
                    <Package className="h-5 w-5 md:h-6 md:w-6 text-[#f29fc8] flex-shrink-0" />
                    <span className="flex-shrink-0">Gestión de Productos</span>
                  {isSearching && (
                      <Badge className="bg-[#fce4f0] text-[#d06a98] dark:bg-[#f29fc8] dark:text-[#f29fc8]/50 text-xs flex-shrink-0">
                      Búsqueda activa
                    </Badge>
                  )}
                </CardTitle>
                  {totalStock !== undefined && (
                    <div className="text-xs md:text-base font-normal text-gray-600 dark:text-gray-400 mt-1">
                      <span className="hidden md:inline">Stock Total: </span>
                      <span className="font-semibold">{new Intl.NumberFormat('es-CO').format(totalStock)}</span>
                      <span className="hidden md:inline"> unidades</span>
                      <span className="md:hidden"> u.</span>
                    </div>
                  )}
                  <p className="text-xs md:text-base text-gray-600 dark:text-gray-300 mt-1 hidden md:block">
                  {isSearching 
                    ? `Mostrando resultados de búsqueda (${products.length} productos)`
                    : 'Administra tu inventario de productos'
                  }
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                  {canCreate && (
                    <Button onClick={onCreate} className="bg-[#f29fc8] hover:bg-[#d06a98] text-white text-xs md:text-sm px-2 md:px-4 py-1.5 md:py-2 flex-1 sm:flex-none">
                      <Plus className="h-3.5 w-3.5 md:h-4 md:w-4 md:mr-1" />
                      <span className="hidden sm:inline">Nuevo Producto</span>
                      <span className="sm:hidden">Nuevo</span>
                    </Button>
                  )}
                  {!isMainStore && hasPermission('products', 'create') && (
                    <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded">
                      Solo puedes crear productos desde la tienda principal
                    </span>
                  )}
                  {canEdit && (
                    <Button 
                      onClick={onManageCategories} 
                        className="bg-[#f29fc8] hover:bg-[#d06a98] text-white text-xs md:text-sm px-2 md:px-4 py-1.5 md:py-2"
                    >
                        <Tag className="h-3.5 w-3.5 md:h-4 md:w-4 md:mr-2" />
                        <span className="hidden md:inline">Categorías</span>
                    </Button>
                  )}
                {onRefresh && (
                  <Button 
                    onClick={onRefresh}
                    disabled={loading}
                    variant="outline"
                      className="text-[#f29fc8] border-[#f29fc8] hover:bg-[#fce4f0] dark:text-[#f29fc8] dark:border-[#f29fc8] dark:hover:bg-[#f29fc8]/20 disabled:opacity-50 text-xs md:text-sm px-2 md:px-4 py-1.5 md:py-2"
                  >
                      <RefreshCw className={`h-3.5 w-3.5 md:h-4 md:w-4 ${loading ? 'animate-spin' : ''}`} />
                      <span className="hidden md:inline ml-2">Actualizar</span>
                  </Button>
                )}
                </div>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 md:hidden">
                {isSearching 
                  ? `${products.length} resultados`
                  : 'Administra tu inventario'
                }
              </p>
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
                  placeholder="Buscar producto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleSearch(searchTerm)
                    }
                  }}
                  className="w-full pl-9 md:pl-10 pr-16 md:pr-20 py-2 md:py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#fce4f0]0 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
                {searchTerm && (
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      setSearchTerm('')
                      handleSearch('')
                    }}
                    className="absolute right-10 md:right-12 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                    title="Limpiar búsqueda"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    handleSearch(searchTerm)
                  }}
                  className="absolute right-2 md:right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-[#f29fc8] dark:hover:text-[#f29fc8] transition-colors"
                  title="Buscar"
                >
                  <Search className="h-4 w-4" />
                </button>
              </div>
              <select
                value={stockFilter}
                onChange={(e) => onFilterChange(e.target.value as StockFilter)}
                className="w-full sm:w-auto sm:min-w-[200px] px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#fce4f0]0 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700"
              >
                {stockStatusOptions.map(status => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 relative overflow-hidden">
          {/* Overlay de carga para búsquedas/refresh sin perder el contenido */}
          {loading && (
            <div className="absolute inset-0 bg-white/60 dark:bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f29fc8]"></div>
            </div>
          )}
          <CardContent className="p-0 m-0">
            {products.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No se encontraron productos
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Comienza creando un nuevo producto
                </p>
                {canCreate && (
                  <Button 
                    onClick={onCreate}
                    className="bg-[#f29fc8] hover:bg-[#d06a98] text-white"
                  >
                    Nuevo Producto
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* Vista de Tarjetas para Mobile */}
                <div className="md:hidden space-y-3 p-3">
                  {products.map((product, index) => {
                    const StatusIcon = getStatusIcon(product.status)
                    return (
                      <div
                        key={product.id}
                        onClick={() => router.push(`/products/${product.id}`)}
                        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2 cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">#{index + 1}</span>
                              <span className="text-xs font-mono font-semibold text-gray-600 dark:text-gray-300">{product.reference}</span>
                            </div>
                            <h3 className="font-semibold text-sm text-gray-900 dark:text-white truncate" title={product.name}>
                              {product.name}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={getCategoryName(product.categoryId)}>
                              {getCategoryName(product.categoryId)}
                            </p>
                          </div>
                          <Badge className={`${getStatusColor(product.status)} text-xs shrink-0`}>
                            <div className="flex items-center space-x-1">
                              <StatusIcon className="h-3 w-3 flex-shrink-0" />
                              <span className="hidden sm:inline">{getStatusLabel(product.status)}</span>
                            </div>
                          </Badge>
                        </div>
                        
                        {isMainStore ? (
                          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                            <div className="text-center">
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Bodega</div>
                              <div className="text-sm font-semibold text-gray-900 dark:text-white">{product.stock.warehouse}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Local</div>
                              <div className="text-sm font-semibold text-gray-900 dark:text-white">{product.stock.store}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Total</div>
                              <div className="text-sm font-semibold text-gray-900 dark:text-white">{product.stock.total}</div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-center pt-2 border-t border-gray-200 dark:border-gray-700">
                            <div className="text-center">
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Stock</div>
                              <div className="text-sm font-semibold text-gray-900 dark:text-white">{product.stock.store}</div>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                          <Badge className={`${getStockStatusColor(product)} text-xs`} title={getStockStatusLabel(product)}>
                            {getStockStatusLabel(product)}
                          </Badge>
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            {canEdit && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onEdit(product)}
                                className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 active:scale-95"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {canAdjust && onStockAdjustment && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onStockAdjustment(product)}
                                className="h-8 w-8 p-0 text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-100 active:scale-95"
                              >
                                <Package className="h-4 w-4" />
                              </Button>
                            )}
                            {canTransfer && onStockTransfer && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onStockTransfer(product)}
                                className="h-8 w-8 p-0 text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-100 active:scale-95"
                              >
                                <ArrowRightLeft className="h-4 w-4" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onDelete(product)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-100 active:scale-95"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Vista de Cards para Desktop */}
                <div className="hidden md:block space-y-4 p-4 md:p-6">
                  {products.map((product, index) => {
                    const StatusIcon = getStatusIcon(product.status)
                    const globalIndex = ((currentPage - 1) * ITEMS_PER_PAGE) + index + 1
                    return (
                      <Card
                        key={product.id}
                        className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all cursor-pointer"
                        onClick={() => {
                          router.push(`/products/${product.id}`)
                        }}
                      >
                        <CardContent className="p-4 md:p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-2">
                                <Package className="h-5 w-5 text-[#f29fc8] dark:text-[#f29fc8] flex-shrink-0" />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <div className="text-sm font-mono font-semibold text-blue-600 dark:text-blue-400">
                                      {product.reference}
                                    </div>
                                    {product.status === 'active' && (
                                      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                                    )}
                                  </div>
                                  <div className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                                    {product.name}
                                  </div>
                                </div>
                              </div>
                              
                              {isMainStore ? (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                                  <div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Bodega</div>
                                    <div className="text-base font-semibold text-gray-900 dark:text-white">
                                      {product.stock.warehouse}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Local</div>
                                    <div className="text-base font-semibold text-gray-900 dark:text-white">
                                      {product.stock.store}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total</div>
                                    <div className="text-base font-semibold text-gray-900 dark:text-white">
                                      {product.stock.total}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Estado Stock</div>
                                    <Badge className={`${getStockStatusColor(product)} flex items-center gap-1 w-fit text-sm whitespace-nowrap`}>
                                      {getStockStatusLabel(product)}
                                    </Badge>
                                  </div>
                                </div>
                              ) : (
                                <div className="grid grid-cols-2 gap-4 mt-4">
                                  <div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Stock</div>
                                    <div className="text-base font-semibold text-gray-900 dark:text-white">
                                      {product.stock.store}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Estado Stock</div>
                                    <Badge className={`${getStockStatusColor(product)} flex items-center gap-1 w-fit text-sm whitespace-nowrap`}>
                                      {getStockStatusLabel(product)}
                                    </Badge>
                                  </div>
                                </div>
                              )}
                              
                              {product.status !== 'active' && (
                                <div className="mt-4 flex items-center gap-2">
                                  <Badge className={`${getStatusColor(product.status)} flex items-center gap-1 w-fit text-xs`}>
                                    <StatusIcon className="h-3 w-3 flex-shrink-0" />
                                    {getStatusLabel(product.status)}
                                  </Badge>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2 ml-4">
                              {canEdit && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        onEdit(product)
                                      }}
                                      className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 active:scale-95"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent className="z-50 bg-[#f29fc8] text-white border-[#d06a98] shadow-lg">
                                    <div className="text-center">
                                      <p className="font-medium text-white">Editar Producto</p>
                                      <p className="text-xs text-[#fce4f0]">Modificar datos del producto</p>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              )}

                              {canAdjust && onStockAdjustment && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        onStockAdjustment(product)
                                      }}
                                      className="h-8 w-8 p-0 text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-100 active:scale-95"
                                    >
                                      <Package className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent className="z-50 bg-[#f29fc8] text-white border-[#d06a98] shadow-lg">
                                    <div className="text-center">
                                      <p className="font-medium text-white">Ajustar Stock</p>
                                      <p className="text-xs text-[#fce4f0]">Modificar cantidad de inventario</p>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              )}

                              {canTransfer && onStockTransfer && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        onStockTransfer(product)
                                      }}
                                      className="h-8 w-8 p-0 text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-100 active:scale-95"
                                    >
                                      <ArrowRightLeft className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent className="z-50 bg-[#f29fc8] text-white border-[#d06a98] shadow-lg">
                                    <div className="text-center">
                                      <p className="font-medium text-white">Transferir Stock</p>
                                      <p className="text-xs text-[#fce4f0]">Mover entre Bodega y Local</p>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              )}

                              {canDelete && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        onDelete(product)
                                      }}
                                      className="h-8 w-8 p-0 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-100 active:scale-95"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent className="z-50 bg-[#f29fc8] text-white border-[#d06a98] shadow-lg">
                                    <div className="text-center">
                                      <p className="font-medium text-white">Eliminar Producto</p>
                                      <p className="text-xs text-[#fce4f0]">Borrar producto permanentemente</p>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </>
            )}

            {/* Paginación - Solo mostrar cuando no está en modo búsqueda */}
            {!isSearching && totalProducts > ITEMS_PER_PAGE && (
              <div className="flex items-center justify-center gap-1 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 px-4 md:px-6">
                <button
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={currentPage === 1 || loading}
                  className="h-7 w-7 flex items-center justify-center rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: Math.ceil(totalProducts / ITEMS_PER_PAGE) }, (_, i) => i + 1).map((page) => {
                    // Mostrar siempre las primeras 2 páginas, la última, y las páginas alrededor de la actual
                    if (
                      page === 1 ||
                      page === 2 ||
                      page === Math.ceil(totalProducts / ITEMS_PER_PAGE) ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => onPageChange(page)}
                          disabled={loading}
                          className={`h-7 w-7 flex items-center justify-center rounded-md text-sm transition-colors ${
                            currentPage === page
                              ? 'bg-[#fce4f0] text-[#f29fc8] dark:bg-[#f29fc8]/20 dark:text-[#f29fc8] font-medium'
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800'
                          }`}
                        >
                          {page}
                        </button>
                      )
                    } else if (
                      page === currentPage - 2 ||
                      page === currentPage + 2
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
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={!hasMore || loading}
                  className="h-7 w-7 flex items-center justify-center rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  )
}