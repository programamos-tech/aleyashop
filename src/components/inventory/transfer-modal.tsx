'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { X, Plus, Trash2, Package, Store as StoreIcon, Warehouse, ArrowRightLeft, AlertTriangle, Search, CheckCircle, CreditCard } from 'lucide-react'
import { Store, Product, TransferItem } from '@/types'
import { ProductsService } from '@/lib/products-service'
import { StoreStockTransferService } from '@/lib/store-stock-transfer-service'
import { useAuth } from '@/contexts/auth-context'
import { toast } from 'sonner'

interface TransferModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  stores: Store[]
  fromStoreId?: string
}

interface TransferItemForm {
  productId: string
  productName: string
  productReference: string
  fromLocation: 'warehouse' | 'store'
  quantity: number
  unitPrice: number // Precio de venta por unidad
  productCost: number // Costo del producto (solo lectura, como referencia)
}

export function TransferModal({ isOpen, onClose, onSave, stores, fromStoreId }: TransferModalProps) {
  const { user } = useAuth()
  const [toStoreId, setToStoreId] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [items, setItems] = useState<TransferItemForm[]>([])
  const [availableProducts, setAvailableProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [globalProductSearch, setGlobalProductSearch] = useState<string>('')
  const [stockAlerts, setStockAlerts] = useState<Record<number, string>>({})
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'mixed'>('transfer')
  const [cashAmount, setCashAmount] = useState<string>('')
  const [transferAmount, setTransferAmount] = useState<string>('')
  const [paymentError, setPaymentError] = useState<string>('')
  const [showStoreError, setShowStoreError] = useState(false)

  useEffect(() => {
    if (isOpen && fromStoreId) {
      loadAvailableProducts()
      // Resetear formulario al abrir
      setItems([])
      setToStoreId('')
      setDescription('')
      setGlobalProductSearch('')
      setStockAlerts({})
      setPaymentMethod('transfer')
      setCashAmount('')
      setShowStoreError(false)
      setTransferAmount('')
      setPaymentError('')
    }
  }, [isOpen, fromStoreId])

  const loadAvailableProducts = async () => {
    if (!fromStoreId) {
      console.error('[TRANSFER MODAL] No fromStoreId provided')
      return
    }

    setLoadingProducts(true)
    try {
      console.log('[TRANSFER MODAL] Loading products with fromStoreId:', fromStoreId)
      // Obtener TODOS los productos de la tienda origen (sin límite)
      // Usamos getAllProductsLegacy que carga todos los productos en lotes
      // IMPORTANTE: Pasamos fromStoreId para obtener el stock correcto de la tienda origen
      const allProducts = await ProductsService.getAllProductsLegacy(fromStoreId)
      
      console.log('[TRANSFER MODAL] Loaded products:', allProducts.length)
      if (allProducts.length > 0) {
        const firstProduct = allProducts[0]
        console.log('[TRANSFER MODAL] First product stock:', {
          id: firstProduct.id,
          name: firstProduct.name,
          stock: firstProduct.stock
        })
      }
      
      // Cargar TODOS los productos, no solo los que tienen stock
      // El usuario puede buscar cualquier producto, incluso si no tiene stock
      setAvailableProducts(allProducts)
    } catch (error) {
      console.error('[TRANSFER MODAL] Error loading products:', error)
      toast.error('Error al cargar productos disponibles')
    } finally {
      setLoadingProducts(false)
    }
  }

  const handleAddItem = () => {
    // Verificar si ya hay un item vacío
    const hasEmptyItem = items.some(item => !item.productId || item.quantity === 0)
    if (hasEmptyItem) {
      toast.info('Completa el producto actual antes de agregar otro')
      return
    }
    setItems([...items, { 
      productId: '', 
      productName: '', 
      productReference: '',
      fromLocation: 'warehouse',
      quantity: 0,
      unitPrice: 0,
      productCost: 0
    }])
  }

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleSelectProductFromSearch = (product: Product) => {
    // Verificar si el producto ya está en la lista
    if (items.some(item => item.productId === product.id)) {
      toast.info('Este producto ya está en la lista')
      return
    }

    // Agregar el producto a la lista
    setItems([...items, {
      productId: product.id,
      productName: product.name || '',
      productReference: product.reference || '',
      fromLocation: 'warehouse',
      quantity: 0,
      unitPrice: product.price || 0, // Precio por defecto del producto
      productCost: product.cost || 0 // Costo como referencia
    }])

    // Limpiar el buscador global
    setGlobalProductSearch('')
  }

  const handleItemChange = (index: number, field: keyof TransferItemForm, value: string | number) => {
    const newItems = [...items]
    if (field === 'productId') {
      const product = availableProducts.find(p => p.id === value)
      newItems[index] = {
        ...newItems[index],
        productId: value as string,
        productName: product?.name || '',
        productReference: product?.reference || '',
        fromLocation: newItems[index].fromLocation,
        quantity: newItems[index].quantity,
        unitPrice: product?.price || 0, // Precio por defecto del producto
        productCost: product?.cost || 0 // Costo como referencia
      }
      // Limpiar alerta cuando cambia el producto
      setStockAlerts(prev => {
        const newAlerts = { ...prev }
        delete newAlerts[index]
        return newAlerts
      })
    } else if (field === 'fromLocation') {
      newItems[index] = { ...newItems[index], [field]: value }
      // Limpiar alerta cuando cambia la ubicación
      setStockAlerts(prev => {
        const newAlerts = { ...prev }
        delete newAlerts[index]
        return newAlerts
      })
    } else {
      newItems[index] = { ...newItems[index], [field]: value }
    }
    setItems(newItems)
  }

  const handleSave = async () => {
    if (!fromStoreId || !toStoreId) {
      setShowStoreError(true)
      return
    }

    // Filtrar solo los items completos para validar
    const completeItems = items.filter(item => item.productId && item.quantity > 0)
    
    if (completeItems.length === 0) {
      toast.error('Debes agregar al menos un producto con cantidad válida')
      return
    }

    // Validar que todos los items completos tengan stock suficiente y precio
    for (const item of completeItems) {

      const product = availableProducts.find(p => p.id === item.productId)
      if (!product) {
        toast.error(`Producto no encontrado: ${item.productName}`)
        return
      }

      const availableStock = item.fromLocation === 'warehouse' 
        ? (product.stock?.warehouse || 0)
        : (product.stock?.store || 0)

      if (item.quantity > availableStock) {
        toast.error(`No hay suficiente stock en ${item.fromLocation === 'warehouse' ? 'Bodega' : 'Local'} para ${item.productName}. Disponible: ${availableStock}`)
        return
      }

      // Validar que tenga precio
      if (!item.unitPrice || item.unitPrice <= 0) {
        toast.error(`Debes ingresar un precio de venta para ${item.productName}`)
        return
      }
    }

    // Validar método de pago
    const total = calculateTotal()
    if (paymentMethod === 'mixed') {
      const cashValue = parseFloat(cashAmount.replace(/[^\d.]/g, '')) || 0
      const transferValue = parseFloat(transferAmount.replace(/[^\d.]/g, '')) || 0
      const totalMixed = cashValue + transferValue
      
      if (cashValue <= 0 || transferValue <= 0) {
        toast.error('Debes ingresar montos válidos para ambos métodos de pago')
        setPaymentError('Debes ingresar montos válidos para ambos métodos de pago')
        setIsSaving(false)
        return
      }
      
      if (Math.abs(totalMixed - total) > 1) { // Permitir diferencia de 1 peso por redondeo
        const difference = total - totalMixed
        if (difference > 0) {
          toast.error(`Faltan ${formatCurrency(difference)} para completar el total`)
          setPaymentError(`Faltan ${formatCurrency(difference)} para completar el total`)
        } else {
          toast.error(`Sobran ${formatCurrency(Math.abs(difference))} del total`)
          setPaymentError(`Sobran ${formatCurrency(Math.abs(difference))} del total`)
        }
        setIsSaving(false)
        return
      }
      setPaymentError('')
    }

    setIsSaving(true)
    try {
      // Filtrar solo los items completos (con producto y cantidad > 0)
      const completeItems = items.filter(item => item.productId && item.quantity > 0)
      
      if (completeItems.length === 0) {
        toast.error('Debes agregar al menos un producto con cantidad válida')
        setIsSaving(false)
        return
      }

      const transferItems = completeItems.map(item => ({
        productId: item.productId,
        productName: item.productName,
        productReference: item.productReference,
        quantity: item.quantity,
        fromLocation: item.fromLocation,
        unitPrice: item.unitPrice // Incluir precio en la transferencia
      }))

      // Preparar información de pago
      const total = calculateTotal()
      const paymentInfo = {
        method: paymentMethod as 'cash' | 'transfer' | 'mixed',
        cashAmount: paymentMethod === 'mixed' ? (parseFloat(cashAmount.replace(/[^\d.]/g, '')) || 0) : (paymentMethod === 'cash' ? total : 0),
        transferAmount: paymentMethod === 'mixed' ? (parseFloat(transferAmount.replace(/[^\d.]/g, '')) || 0) : (paymentMethod === 'transfer' ? total : 0)
      }

      console.log('[TRANSFER MODAL] Creating transfer with payment info:', {
        paymentInfo,
        total,
        paymentMethod
      })

      const transfer = await StoreStockTransferService.createTransfer(
        fromStoreId!,
        toStoreId,
        transferItems,
        description || undefined,
        undefined,
        user?.id,
        user?.name,
        paymentInfo
      )

      if (transfer) {
        console.log('[TRANSFER MODAL] Transfer created successfully:', {
          transferId: transfer.id,
          fromStore: transfer.from_store?.name,
          toStore: transfer.to_store?.name,
          status: transfer.status
        })
        toast.success('Transferencia creada exitosamente')
        setItems([])
        setToStoreId('')
        setDescription('')
        setStockAlerts({})
        setPaymentMethod('transfer')
        setCashAmount('')
        setTransferAmount('')
        setPaymentError('')
        await loadAvailableProducts() // Recargar productos para actualizar stock
        onClose() // Cerrar el modal primero
        // Luego recargar las transferencias
        setTimeout(() => {
          onSave() // Esto debería recargar las transferencias
        }, 100)
      } else {
        toast.error('Error al crear la transferencia. Verifica que haya stock disponible.')
      }
    } catch (error) {
      toast.error('Error al crear la transferencia')
      console.error('Error creating transfer:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const getAvailableQuantity = (productId: string, location: 'warehouse' | 'store'): number => {
    const product = availableProducts.find(p => p.id === productId)
    if (!product) return 0
    return location === 'warehouse' 
      ? (product.stock?.warehouse || 0)
      : (product.stock?.store || 0)
  }

  const getUsedQuantity = (productId: string, location: 'warehouse' | 'store'): number => {
    return items
      .filter(item => item.productId === productId && item.fromLocation === location)
      .reduce((sum, item) => sum + item.quantity, 0)
  }

  const formatNumber = (value: number): string => {
    return value.toLocaleString('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  // Calcular total de la transferencia
  const calculateTotal = (): number => {
    return items.reduce((sum, item) => {
      return sum + (item.unitPrice * item.quantity)
    }, 0)
  }

  if (!isOpen) return null

  const destinationStores = stores.filter(s => s.id !== fromStoreId && s.isActive)

  return (
    <div className="fixed inset-0 xl:left-56 bg-white/70 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 pb-20 xl:pb-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg xl:rounded-xl shadow-2xl w-full max-h-[calc(100vh-6rem)] xl:h-[calc(98vh-4rem)] xl:w-[calc(100vw-18rem)] xl:max-h-[calc(98vh-4rem)] xl:max-w-[calc(100vw-18rem)] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-cyan-200 dark:border-cyan-800 bg-cyan-50 dark:bg-cyan-900/20 flex-shrink-0">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-cyan-600" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Nueva Transferencia
            </h2>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {/* Tienda Destino y Descripción en una fila */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tienda Destino <span className="text-red-500">*</span>
                </label>
                <Select value={toStoreId} onValueChange={(value) => { setToStoreId(value); setShowStoreError(false); }}>
                  <SelectTrigger className="w-full h-10 text-sm">
                    <SelectValue placeholder="Seleccionar tienda destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {destinationStores.map(store => (
                      <SelectItem key={store.id} value={store.id} className="text-sm">
                        {store.name} {store.city && `- ${store.city}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Descripción (Opcional)
                </label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ej: Envío mensual"
                  className="w-full h-10 text-sm"
                />
              </div>
            </div>

            {/* Productos */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
              <div className="flex items-center gap-2 mb-4">
                <Package className="h-4 w-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Productos a Transferir
                </h3>
              </div>
              <div className="space-y-4">
                {/* Buscador global - siempre visible */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Buscar Producto para Agregar
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Buscar por referencia o nombre..."
                      value={globalProductSearch}
                      onChange={(e) => setGlobalProductSearch(e.target.value)}
                      className="pl-10 h-10 text-sm"
                      disabled={loadingProducts}
                    />
                    {loadingProducts && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-600"></div>
                      </div>
                    )}
                  </div>
                  
                  {/* Resultados de búsqueda */}
                  {globalProductSearch && !loadingProducts && (
                    <div className="mt-2 max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                          {availableProducts
                            .filter(p => {
                              // Filtrar productos ya seleccionados
                              if (items.some(item => item.productId === p.id)) {
                                return false
                              }
                              // Filtrar por término de búsqueda
                              const searchTerm = (globalProductSearch?.trim() || '').toLowerCase()
                              if (searchTerm) {
                                // Buscar en referencia (sin espacios, sin caracteres especiales)
                                const cleanReference = (p.reference || '').toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')
                                const cleanSearchTerm = searchTerm.replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')
                                const matchesReference = cleanReference.includes(cleanSearchTerm) || (p.reference || '').toLowerCase().includes(searchTerm)
                                
                                // Buscar en nombre
                                const matchesName = (p.name || '').toLowerCase().includes(searchTerm)
                                
                                return matchesReference || matchesName
                              }
                              return false
                            })
                            .map(product => {
                              const warehouseStock = product.stock?.warehouse || 0
                              const storeStock = product.stock?.store || 0
                              const totalStock = warehouseStock + storeStock
                              const hasStock = totalStock > 0
                              
                              return (
                                <div
                                  key={product.id}
                                  className={`w-full px-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors flex items-center justify-between gap-3 ${
                                    !hasStock ? 'opacity-60' : ''
                                  }`}
                                >
                                  <div className="flex flex-col flex-1 min-w-0">
                                    <span className={`font-medium ${hasStock ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                                      {product.name}
                                    </span>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-xs text-gray-500 dark:text-gray-400">Ref: {product.reference}</span>
                                      <span className="text-xs text-gray-400 dark:text-gray-500">•</span>
                                      <span className={`text-xs ${hasStock ? 'text-gray-600 dark:text-gray-300' : 'text-red-500 dark:text-red-400'}`}>
                                        Bodega: {formatNumber(warehouseStock)} | Local: {formatNumber(storeStock)}
                                      </span>
                                    </div>
                                  </div>
                                  <Button
                                    type="button"
                                    onClick={() => handleSelectProductFromSearch(product)}
                                    size="sm"
                                    className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs px-3 py-1.5 h-auto flex-shrink-0"
                                    disabled={!hasStock}
                                  >
                                    <Plus className="h-3.5 w-3.5 mr-1" />
                                    Agregar
                                  </Button>
                                </div>
                              )
                            })}
                          {availableProducts.filter(p => {
                            if (items.some(item => item.productId === p.id)) return false
                            const searchTerm = (globalProductSearch?.trim() || '').toLowerCase()
                            if (searchTerm) {
                              const cleanReference = (p.reference || '').toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')
                              const cleanSearchTerm = searchTerm.replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')
                              const matchesReference = cleanReference.includes(cleanSearchTerm) || (p.reference || '').toLowerCase().includes(searchTerm)
                              const matchesName = (p.name || '').toLowerCase().includes(searchTerm)
                              return matchesReference || matchesName
                            }
                            return false
                          }).length === 0 && (
                            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                              No se encontraron productos con "{globalProductSearch}"
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Lista de productos agregados */}
                    {items.length > 0 && (
                      <div className="space-y-3">
                    {[...items].reverse().map((item, originalIndex) => {
                      // Calcular el índice original para mantener las referencias correctas
                      const index = items.length - 1 - originalIndex
                      const product = availableProducts.find(p => p.id === item.productId)
                      const warehouseStock = product ? (product.stock?.warehouse || 0) : 0
                      const storeStock = product ? (product.stock?.store || 0) : 0
                      const usedWarehouse = item.productId ? getUsedQuantity(item.productId, 'warehouse') : 0
                      const usedStore = item.productId ? getUsedQuantity(item.productId, 'store') : 0
                      const remainingWarehouse = warehouseStock - (usedWarehouse - (item.fromLocation === 'warehouse' ? item.quantity : 0))
                      const remainingStore = storeStock - (usedStore - (item.fromLocation === 'store' ? item.quantity : 0))
                      const availableQty = item.fromLocation === 'warehouse' ? remainingWarehouse : remainingStore
                      const isComplete = item.quantity > 0 && item.productId && item.fromLocation

                      return (
                        <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-700/50">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 flex items-start gap-2">
                              {isComplete && (
                                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                              )}
                              <div className="flex-1">
                                <div className="font-medium text-sm text-gray-900 dark:text-white">
                                  {item.productName || 'Seleccionar producto'}
                                </div>
                                {item.productReference && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Ref: {item.productReference}
                                  </p>
                                )}
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveItem(index)}
                              className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          {/* Controles cuando hay producto seleccionado */}
                          {item.productId && (
                            <div className="space-y-3">
                              {/* Stock y Selección de Ubicación */}
                              <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Transferir desde
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                  {(['warehouse', 'store'] as const).map((location) => {
                                    const isSelected = item.fromLocation === location
                                    const stock = location === 'warehouse' ? warehouseStock : storeStock
                                    const used = location === 'warehouse' ? usedWarehouse : usedStore
                                    const remaining = stock - (used - (isSelected ? item.quantity : 0))
                                    const isDisabled = remaining <= 0 && !isSelected
                                    const Icon = location === 'warehouse' ? Warehouse : StoreIcon

                                    return (
                                      <button
                                        key={location}
                                        type="button"
                                        onClick={() => !isDisabled && handleItemChange(index, 'fromLocation', location)}
                                        disabled={isDisabled}
                                        className={`p-3 rounded-lg border-2 transition-all text-left ${
                                          isDisabled
                                            ? 'border-gray-200 dark:border-gray-700 text-gray-400 cursor-not-allowed opacity-50'
                                            : isSelected
                                            ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20'
                                            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2 mb-1">
                                          <Icon className={`h-4 w-4 ${isSelected ? 'text-cyan-600' : 'text-gray-400'}`} />
                                          <span className={`text-sm font-medium ${isSelected ? 'text-cyan-700 dark:text-cyan-300' : 'text-gray-700 dark:text-gray-300'}`}>
                                            {location === 'warehouse' ? 'Bodega' : 'Local'}
                                          </span>
                                        </div>
                                        <div className={`text-xs ${isSelected ? 'text-cyan-600 dark:text-cyan-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                          Stock: {formatNumber(stock)} • Disponible: {formatNumber(remaining)}
                                        </div>
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>
                              
                              {/* Cantidad, Costo y Precio */}
                              <div className="grid grid-cols-3 gap-3">
                                {/* Cantidad */}
                                <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Cantidad
                                </label>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={item.quantity || ''}
                                  onChange={(e) => {
                                    // Solo permitir números
                                    const value = e.target.value.replace(/[^\d]/g, '')
                                    const qty = value === '' ? 0 : parseInt(value, 10)
                                    
                                    // Validar stock disponible
                                    if (qty > availableQty) {
                                      setStockAlerts(prev => ({
                                        ...prev,
                                        [index]: `Stock insuficiente. Disponible: ${formatNumber(availableQty)}`
                                      }))
                                    } else {
                                      setStockAlerts(prev => {
                                        const newAlerts = { ...prev }
                                        delete newAlerts[index]
                                        return newAlerts
                                      })
                                    }
                                    
                                    handleItemChange(index, 'quantity', qty)
                                  }}
                                  onBlur={(e) => {
                                    // Asegurar que no tenga ceros a la izquierda
                                    const value = e.target.value.replace(/^0+/, '') || '0'
                                    const qty = parseInt(value, 10) || 0
                                    if (qty !== item.quantity) {
                                      handleItemChange(index, 'quantity', qty)
                                    }
                                  }}
                                  disabled={!item.productId || availableQty <= 0}
                                  className="w-full h-10 px-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  placeholder="0"
                                />
                                {stockAlerts[index] ? (
                                  <div className="mt-1 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-700 dark:text-red-300 flex items-center gap-1.5">
                                    <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                                    <span>{stockAlerts[index]}</span>
                                  </div>
                                ) : (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Max: {formatNumber(availableQty)}
                                  </p>
                                )}
                              </div>
                              
                              {/* Precio de venta (solo lectura, como referencia) */}
                              <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Precio Venta (Ref.)
                                </label>
                                <Input
                                  type="text"
                                  value={formatCurrency(item.unitPrice || 0)}
                                  disabled
                                  readOnly
                                  className="w-full h-10 text-sm bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 cursor-not-allowed"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  Precio de venta
                                </p>
                              </div>
                              
                              {/* Precio de venta */}
                              <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Precio Venta <span className="text-red-500">*</span>
                                </label>
                                <Input
                                  type="text"
                                  inputMode="decimal"
                                  value={item.unitPrice !== undefined && item.unitPrice !== null 
                                    ? (item.unitPrice % 1 === 0 ? item.unitPrice.toString() : item.unitPrice.toFixed(2))
                                    : ''}
                                  onChange={(e) => {
                                    // Permitir números y punto decimal
                                    let value = e.target.value.replace(/[^\d.]/g, '')
                                    // Permitir solo un punto decimal
                                    const parts = value.split('.')
                                    if (parts.length > 2) {
                                      value = parts[0] + '.' + parts.slice(1).join('')
                                    }
                                    // Limitar a 2 decimales después del punto
                                    if (parts.length === 2 && parts[1].length > 2) {
                                      value = parts[0] + '.' + parts[1].substring(0, 2)
                                    }
                                    // Convertir a número, permitir vacío para edición
                                    const price = value === '' || value === '.' ? 0 : parseFloat(value) || 0
                                    handleItemChange(index, 'unitPrice', price)
                                  }}
                                  onBlur={(e) => {
                                    // Asegurar que tenga formato decimal si es necesario
                                    const value = e.target.value.trim()
                                    if (value === '' || value === '.') {
                                      handleItemChange(index, 'unitPrice', 0)
                                    } else {
                                      const price = parseFloat(value) || 0
                                      // Mantener hasta 2 decimales
                                      const roundedPrice = Math.round(price * 100) / 100
                                      if (roundedPrice !== item.unitPrice) {
                                        handleItemChange(index, 'unitPrice', roundedPrice)
                                      }
                                    }
                                  }}
                                  className="w-full h-10 text-sm"
                                  placeholder="0.00"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  Subtotal: {formatCurrency((item.unitPrice || 0) * item.quantity)}
                                </p>
                              </div>
                            </div>
                          </div>
                          )}
                        </div>
                      )
                    })}
                      </div>
                    )}
                  </div>
              </div>
            </div>

            {/* Método de Pago */}
            {items.length > 0 && calculateTotal() > 0 && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard className="h-4 w-4 text-cyan-400" />
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Método de Pago
                  </h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Método de Pago <span className="text-red-500">*</span>
                    </label>
                    <Select value={paymentMethod} onValueChange={(value: 'cash' | 'transfer' | 'mixed') => {
                      setPaymentMethod(value)
                      setPaymentError('')
                      if (value !== 'mixed') {
                        setCashAmount('')
                        setTransferAmount('')
                      }
                    }}>
                      <SelectTrigger className="w-full h-10 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Efectivo</SelectItem>
                        <SelectItem value="transfer">Transferencia</SelectItem>
                        <SelectItem value="mixed">Mixto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Campos para pago mixto */}
                  {paymentMethod === 'mixed' && (
                    <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Efectivo
                        </label>
                        <Input
                          type="text"
                          value={cashAmount ? parseFloat(cashAmount.replace(/[^\d]/g, '') || '0').toLocaleString('es-CO') : ''}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^\d]/g, '')
                            setCashAmount(value)
                            setPaymentError('')
                          }}
                          onFocus={(e) => e.target.select()}
                          placeholder="0"
                          className="w-full h-10 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Transferencia
                        </label>
                        <Input
                          type="text"
                          value={transferAmount ? parseFloat(transferAmount.replace(/[^\d]/g, '') || '0').toLocaleString('es-CO') : ''}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^\d]/g, '')
                            setTransferAmount(value)
                            setPaymentError('')
                          }}
                          onFocus={(e) => e.target.select()}
                          placeholder="0"
                          className="w-full h-10 text-sm"
                        />
                      </div>
                      <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Total ingresado:</span>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {formatCurrency((parseFloat(cashAmount.replace(/[^\d.]/g, '')) || 0) + (parseFloat(transferAmount.replace(/[^\d.]/g, '')) || 0))}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm mt-1">
                          <span className="text-gray-600 dark:text-gray-400">Total requerido:</span>
                          <span className="font-semibold text-cyan-700 dark:text-cyan-400">
                            {formatCurrency(calculateTotal())}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {paymentError && (
                    <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-600 dark:text-red-400">
                      {paymentError}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Resumen compacto */}
            {items.length > 0 && (
              <div className="bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 rounded-lg p-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                  <div>
                    <div className="text-xs text-gray-600 dark:text-gray-300">Productos</div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">{items.length}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 dark:text-gray-300">Total Unidades</div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formatNumber(items.reduce((sum, item) => sum + item.quantity, 0))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 dark:text-gray-300">Destino</div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {stores.find(s => s.id === toStoreId)?.name || '-'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 dark:text-gray-300">Total Ingreso</div>
                    <div className="text-lg font-bold text-cyan-700 dark:text-cyan-400">
                      {formatCurrency(calculateTotal())}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

        {/* Footer */}
        <div className="flex flex-col gap-3 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex-shrink-0">
          {/* Alerta si no hay tienda seleccionada (solo mostrar después de intentar guardar) */}
          {showStoreError && !toStoreId && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
              <span className="text-sm text-yellow-700 dark:text-yellow-300">
                Debes seleccionar una tienda destino para crear la transferencia
              </span>
            </div>
          )}
          
          <div className="flex items-center justify-end gap-3">
            <Button
              onClick={onClose}
              variant="outline"
              disabled={isSaving}
              className="text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              className="bg-cyan-600 hover:bg-cyan-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={isSaving}
            >
              {isSaving ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creando...
                </div>
              ) : (
                'Crear Transferencia'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
