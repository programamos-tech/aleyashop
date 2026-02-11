'use client'

import { useState, useEffect, useMemo, useRef, KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DatePicker } from '@/components/ui/date-picker'
import { 
  X, 
  CreditCard, 
  User, 
  Package, 
  Calendar, 
  DollarSign, 
  Plus, 
  Minus,
  Search,
  ShoppingCart,
  ChevronDown,
  AlertTriangle
} from 'lucide-react'
import { Credit, Client, SaleItem, Product } from '@/types'
import { useProducts } from '@/contexts/products-context'
import { useClients } from '@/contexts/clients-context'
import { useAuth } from '@/contexts/auth-context'
import { SalesService } from '@/lib/sales-service'
import { CreditsService } from '@/lib/credits-service'

interface CreditModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateCredit: (credit: Credit) => void
}

export function CreditModal({ isOpen, onClose, onCreateCredit }: CreditModalProps) {
  const { clients, getAllClients } = useClients()
  const { products, searchProducts, updateStockFromSale } = useProducts()
  const { user } = useAuth()
  
  // Función helper para identificar si un cliente es una tienda
  const isStoreClient = (client: Client): boolean => {
    if (!client || !client.name) return false
    const nameLower = client.name.toLowerCase()
    // Filtrar clientes que sean tiendas internas
    const storeKeywords = ['aleya', 'tienda', 'sucursal']
    return storeKeywords.some(keyword => nameLower.includes(keyword))
  }

  // Filtrar clientes para excluir tiendas
  const filteredClients = clients.filter(client => !isStoreClient(client))
  
  const [formData, setFormData] = useState({
    clientId: '',
    dueDate: '',
    notes: ''
  })

  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [selectedProducts, setSelectedProducts] = useState<SaleItem[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [debouncedProductSearch, setDebouncedProductSearch] = useState('')
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const [stockAlert, setStockAlert] = useState<{show: boolean, message: string, productId?: string}>({show: false, message: ''})
  const [searchedProducts, setSearchedProducts] = useState<Product[]>([])
  const [isSearchingProducts, setIsSearchingProducts] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [includeTax, setIncludeTax] = useState(false)
  const [highlightedProductIndex, setHighlightedProductIndex] = useState<number>(-1)
  const productRefs = useRef<(HTMLDivElement | null)[]>([])

  // Scroll automático al elemento resaltado
  useEffect(() => {
    if (highlightedProductIndex >= 0 && productRefs.current[highlightedProductIndex]) {
      productRefs.current[highlightedProductIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest'
      })
    }
  }, [highlightedProductIndex])

  useEffect(() => {
    if (isOpen) {
      getAllClients()
    }
  }, [isOpen, getAllClients])

  useEffect(() => {
    if (formData.clientId) {
      const client = filteredClients.find(c => c.id === formData.clientId) || clients.find(c => c.id === formData.clientId)
      setSelectedClient(client || null)
    }
  }, [formData.clientId, clients, filteredClients])

  // Sincronizar selectedDate con formData.dueDate
  useEffect(() => {
    if (selectedDate) {
      const year = selectedDate.getFullYear()
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0')
      const day = String(selectedDate.getDate()).padStart(2, '0')
      setFormData(prev => ({ ...prev, dueDate: `${year}-${month}-${day}` }))
    }
  }, [selectedDate])

  // Debounce para la búsqueda de productos
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedProductSearch(productSearch)
    }, 800)
    return () => clearTimeout(timer)
  }, [productSearch])

  // Buscar productos cuando el usuario escriba
  useEffect(() => {
    let cancelled = false
    
    const performSearch = async () => {
      if (debouncedProductSearch.trim().length >= 2) {
        setIsSearchingProducts(true)
        try {
          const results = await searchProducts(debouncedProductSearch)
          if (!cancelled) {
            setSearchedProducts(results)
          }
        } catch (error) {
      // Error silencioso en producción
          if (!cancelled) {
            setSearchedProducts([])
            setIsSearchingProducts(false)
          }
        } finally {
          if (!cancelled) {
            setIsSearchingProducts(false)
          }
        }
      } else {
        setSearchedProducts([])
        setIsSearchingProducts(false)
      }
    }

    performSearch()
    
    return () => {
      cancelled = true
    }
  }, [debouncedProductSearch])

  // Filtrar productos - usar productos buscados o locales
  const filteredProducts = debouncedProductSearch.trim().length >= 2 && searchedProducts.length > 0
    ? searchedProducts
    : debouncedProductSearch.trim().length >= 2 && searchedProducts.length === 0 && !isSearchingProducts
    ? []
    : products.filter(product => {
        if (!product || product.status !== 'active') return false
        const searchTerm = debouncedProductSearch.toLowerCase().trim()
        const name = (product.name || '').toLowerCase()
        const reference = (product.reference || '').toLowerCase()
        return name.includes(searchTerm) || reference.includes(searchTerm)
      }).sort((a, b) => {
        const searchTermLower = debouncedProductSearch.toLowerCase()
        const aRef = (a.reference || '').toLowerCase()
        const bRef = (b.reference || '').toLowerCase()
        const aName = (a.name || '').toLowerCase()
        const bName = (b.name || '').toLowerCase()
        
        // Referencia exacta primero
        if (aRef === searchTermLower && bRef !== searchTermLower) return -1
        if (aRef !== searchTermLower && bRef === searchTermLower) return 1
        
        // Referencia que empieza con el término
        if (aRef.startsWith(searchTermLower) && !bRef.startsWith(searchTermLower)) return -1
        if (!aRef.startsWith(searchTermLower) && bRef.startsWith(searchTermLower)) return 1
        
        // Nombre que empieza con el término
        if (aName.startsWith(searchTermLower) && !bName.startsWith(searchTermLower)) return -1
        if (!aName.startsWith(searchTermLower) && bName.startsWith(searchTermLower)) return 1
        
        return 0
      })

  const visibleProducts = useMemo(() => filteredProducts.slice(0, 10), [filteredProducts])

  // Limpiar referencias cuando cambian los productos visibles
  useEffect(() => {
    productRefs.current = []
  }, [visibleProducts])

  useEffect(() => {
    if (showProductDropdown && visibleProducts.length > 0) {
      const firstAvailableIndex = visibleProducts.findIndex(product => {
        const totalStock = (product.stock?.warehouse || 0) + (product.stock?.store || 0)
        return totalStock > 0
      })
      setHighlightedProductIndex(firstAvailableIndex !== -1 ? firstAvailableIndex : 0)
    } else {
      setHighlightedProductIndex(-1)
    }
  }, [showProductDropdown, visibleProducts])

  const addProduct = (product: Product) => {
    const totalStock = (product.stock?.warehouse || 0) + (product.stock?.store || 0)
    
    // No agregar productos sin stock
    if (totalStock <= 0) {
      showStockAlert(`No puedes agregar "${product.name}" porque no tiene stock disponible. Stock: ${totalStock}`, product.id)
      return
    }
    
    const existingItem = selectedProducts.find(item => item.productId === product.id)
    
    if (existingItem) {
      const newQuantity = existingItem.quantity + 1
      if (newQuantity > totalStock) {
        showStockAlert(`No puedes agregar más de "${product.name}". Stock disponible: ${totalStock}`, product.id)
        return
      }
      // Mover el producto actualizado al principio (más reciente)
      setSelectedProducts(prev => {
        const updated = prev.map(item => 
          item.productId === product.id 
            ? { ...item, quantity: newQuantity, totalPrice: (item.unitPrice || 0) * newQuantity }
            : item
        )
        const updatedItem = updated.find(item => item.productId === product.id)
        const otherItems = updated.filter(item => item.productId !== product.id)
        return updatedItem ? [updatedItem, ...otherItems] : updated
      })
    } else {
      // Agregar nuevos productos al principio (más recientes primero)
      setSelectedProducts(prev => [{
        productId: product.id,
        productName: product.name,
        productReferenceCode: product.reference || undefined,
        quantity: 1,
        unitPrice: product.price || 0,
        totalPrice: product.price || 0
      }, ...prev])
    }
    
    setProductSearch('')
    setShowProductDropdown(false)
    setHighlightedProductIndex(-1)
    // Limpiar referencias
    productRefs.current = []
  }

  const removeProduct = (productId: string) => {
    // Si el producto que se está quitando tiene una alerta activa, ocultarla
    if (stockAlert.show && stockAlert.productId === productId) {
      setStockAlert({ show: false, message: '', productId: undefined })
    }
    setSelectedProducts(prev => prev.filter(item => item.productId !== productId))
  }

  const updateQuantity = (productId: string, newQuantity: number, fromButton: boolean = false) => {
    // No eliminar el producto aunque la cantidad sea 0, solo actualizar
    // Permitir escribir 0, pero no valores negativos
    if (newQuantity < 0) {
      return
    }
    
    const product = products.find(p => p.id === productId)
    if (product) {
      const totalStock = (product.stock?.warehouse || 0) + (product.stock?.store || 0)
      // Verificar stock solo si la cantidad es mayor a 0
      if (newQuantity > 0 && newQuantity > totalStock) {
        showStockAlert(`No hay suficiente stock para "${product.name}". Stock disponible: ${totalStock}`, productId)
        return
      }
    }
    
    // Mover el producto actualizado al principio (más reciente)
    setSelectedProducts(prev => {
      const updated = prev.map(item => 
        item.productId === productId 
          ? { 
              ...item, 
              quantity: newQuantity,
              totalPrice: (item.unitPrice || 0) * newQuantity
            }
          : item
      )
      const updatedItem = updated.find(item => item.productId === productId)
      const otherItems = updated.filter(item => item.productId !== productId)
      return updatedItem ? [updatedItem, ...otherItems] : updated
    })
  }

  const handleQuantityBlur = (productId: string) => {
    // Ya no restauramos a 1, permitimos que quede en 0
    // El producto se mantiene en la lista aunque tenga cantidad 0
  }

  const moveHighlightedProduct = (direction: 1 | -1) => {
    if (visibleProducts.length === 0) return

    let nextIndex = highlightedProductIndex
    for (let i = 0; i < visibleProducts.length; i++) {
      if (nextIndex === -1) {
        nextIndex = direction === 1 ? 0 : visibleProducts.length - 1
      } else {
        nextIndex = (nextIndex + direction + visibleProducts.length) % visibleProducts.length
      }

      const product = visibleProducts[nextIndex]
      const totalStock = (product.stock?.warehouse || 0) + (product.stock?.store || 0)
      if (totalStock > 0) {
        setHighlightedProductIndex(nextIndex)
        return
      }
    }

    setHighlightedProductIndex(nextIndex === -1 ? 0 : nextIndex)
  }

  const handleProductSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!showProductDropdown || visibleProducts.length === 0) {
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      moveHighlightedProduct(1)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      moveHighlightedProduct(-1)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const product = highlightedProductIndex >= 0 ? visibleProducts[highlightedProductIndex] : null
      if (product) {
        const totalStock = (product.stock?.warehouse || 0) + (product.stock?.store || 0)
        if (totalStock > 0) {
          addProduct(product)
        }
      }
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setShowProductDropdown(false)
      setHighlightedProductIndex(-1)
    }
  }

  const updatePrice = (productId: string, newPrice: number) => {
    if (newPrice < 0) return

    // Permitir escribir libremente, la validación se hará al perder el foco
    // Mover el producto actualizado al principio (más reciente)
    setSelectedProducts(prev => {
      const updated = prev.map(item => {
        if (item.productId === productId) {
          return { ...item, unitPrice: newPrice, totalPrice: newPrice * (item.quantity || 0) }
        }
        return item
      })
      const updatedItem = updated.find(item => item.productId === productId)
      const otherItems = updated.filter(item => item.productId !== productId)
      return updatedItem ? [updatedItem, ...otherItems] : updated
    })
  }

  const handlePriceBlur = (productId: string) => {
    // Validar precio al perder el foco y mostrar alerta si es inválido
    const item = selectedProducts.find(i => i.productId === productId)
    if (item) {
      const product = products.find(p => p.id === productId)
      if (!product) return
      
      // Determinar precio mínimo: si tiene precio de venta, usar ese; si no, usar costo
      const minPrice = (product.price && product.price > 0) ? product.price : (product.cost || 0)
      const priceType = (product.price && product.price > 0) ? 'precio de venta' : 'precio de compra'
      
      // Si el precio es menor al mínimo, mostrar alerta
      if (item.unitPrice < minPrice) {
        showStockAlert(`${item.productName} no puede ser vendido por menos de $${minPrice.toLocaleString('es-CO')} (${priceType})`, productId)
      } else {
        // Si el precio es válido, ocultar la alerta para este producto
        if (stockAlert.show && stockAlert.productId === productId) {
          setStockAlert({ show: false, message: '', productId: undefined })
        }
      }
    }
  }

  const calculateTotal = () => {
    const subtotal = selectedProducts.reduce((total, item) => total + item.totalPrice, 0)
    const tax = includeTax ? subtotal * 0.19 : 0
    return subtotal + tax
  }

  const calculateSubtotal = () => {
    return selectedProducts.reduce((total, item) => total + item.totalPrice, 0)
  }

  const calculateTax = () => {
    return includeTax ? calculateSubtotal() * 0.19 : 0
  }

  const handleSubmit = async (e: React.FormEvent, isDraft: boolean = false) => {
    e.preventDefault()
    
    if (!formData.clientId) {
      showStockAlert('❌ Por favor selecciona un cliente')
      return
    }
    
    // Solo validar fecha de vencimiento si NO es borrador
    if (!isDraft && !formData.dueDate) {
      showStockAlert('❌ Por favor selecciona una fecha de vencimiento')
      return
    }
    
    if (selectedProducts.length === 0) {
      showStockAlert('❌ Por favor agrega al menos un producto')
      return
    }
    
    // Validar que todos los precios de venta sean >= precio mínimo
    // Si tiene precio de venta, debe ser >= precio de venta
    // Si no tiene precio de venta, debe ser >= precio de compra
    const invalidProducts: string[] = []
    selectedProducts.forEach(item => {
      const product = products.find(p => p.id === item.productId)
      if (!product) return
      
      // Determinar precio mínimo: si tiene precio de venta, usar ese; si no, usar costo
      const minPrice = (product.price && product.price > 0) ? product.price : (product.cost || 0)
      const priceType = (product.price && product.price > 0) ? 'precio de venta' : 'precio de compra'
      
      if (item.unitPrice < minPrice) {
        invalidProducts.push(`${item.productName} no puede ser vendido por menos de $${minPrice.toLocaleString('es-CO')} (${priceType})`)
      }
    })

    if (invalidProducts.length > 0) {
      showStockAlert(invalidProducts.join(' • '))
      return
    }
    
    setLoading(true)
    
    try {
      // Obtener información del cliente
      const client = filteredClients.find(c => c.id === formData.clientId) || clients.find(c => c.id === formData.clientId)
      if (!client) {
        alert('❌ Cliente no encontrado')
        return
      }
      
      // Preparar los items para la venta
      const saleItems = selectedProducts.map(item => ({
        productId: item.productId,
        productName: item.productName,
        productReferenceCode: item.productReferenceCode || undefined,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.totalPrice,
        discount: 0,
        discountType: 'amount',
        tax: 0
      }))
      
      // Crear la venta
      const saleData = {
        clientId: formData.clientId,
        clientName: client.name,
        items: saleItems,
        total: calculateTotal(),
        subtotal: calculateSubtotal(),
        tax: calculateTax(),
        discount: 0,
        status: isDraft ? 'draft' : 'completed',
        paymentMethod: 'credit',
        notes: formData.notes,
        dueDate: formData.dueDate
      }
      
      // Crear la venta
      const newSale = await SalesService.createSale(saleData, user?.id || '')
      const stockUpdates = (newSale.items ?? [])
        .filter((item): item is typeof item & { stockInfo: { newStoreStock: number; newWarehouseStock: number } } => Boolean(item.stockInfo))
        .map(item => ({ productId: item.productId, store: item.stockInfo.newStoreStock, warehouse: item.stockInfo.newWarehouseStock }))
      if (stockUpdates.length > 0) updateStockFromSale(stockUpdates)

      // Si NO es borrador, obtener el crédito creado automáticamente por el SalesService
      if (!isDraft) {
        const newCredit = await CreditsService.getCreditByInvoiceNumber(newSale.invoiceNumber)
        
        if (!newCredit) {
          throw new Error('No se pudo encontrar el crédito creado')
        }
        
        onCreateCredit(newCredit)
        handleClose()
      } else {
        // Si es borrador, cerrar el modal y redirigir a ventas para ver el borrador
        handleClose()
        // Redirigir a la página de ventas después de un breve delay
        setTimeout(() => {
          window.location.href = '/sales'
        }, 500)
      }
      
    } catch (error) {
      // Error silencioso en producción
      alert('❌ Error al crear el crédito. Por favor intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      clientId: '',
      dueDate: '',
      notes: ''
    })
    setSelectedClient(null)
    setSelectedProducts([])
    setProductSearch('')
    setShowProductDropdown(false)
    setSelectedDate(null)
    setIncludeTax(false)
    setStockAlert({show: false, message: ''})
  }

  const showStockAlert = (message: string, productId?: string) => {
    setStockAlert({show: true, message, productId})
    // Auto-hide after 4 seconds
    setTimeout(() => {
      setStockAlert({show: false, message: ''})
    }, 4000)
  }

  const handleClose = () => {
    onClose()
    resetForm()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 xl:left-56 bg-white/70 dark:bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg xl:rounded-xl shadow-2xl w-full h-full xl:h-[calc(98vh-4rem)] xl:w-[calc(100vw-18rem)] xl:max-h-[calc(98vh-4rem)] xl:max-w-[calc(100vw-18rem)] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-700 relative z-[10000]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200 dark:border-gray-700 bg-orange-50 dark:bg-orange-900/20 flex-shrink-0">
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 md:h-8 md:w-8 text-orange-600" />
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                Crear Venta a Crédito
              </h2>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300">
                Crea una nueva venta a crédito y registra el crédito correspondiente.
              </p>
            </div>
          </div>
          <Button
            onClick={handleClose}
            variant="ghost"
            size="sm"
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6">
            {/* Columna izquierda - Secciones grandes */}
            <div className="xl:col-span-2 space-y-4 md:space-y-6">
              {/* Productos */}
              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg text-gray-900 dark:text-white flex items-center gap-2">
                  <Package className="h-5 w-5 text-orange-600" />
                  Productos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Buscar Producto
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar por nombre o referencia..."
                      value={productSearch}
                      onChange={(e) => {
                        setProductSearch(e.target.value)
                        setShowProductDropdown(e.target.value.length > 0)
                      }}
                      onKeyDown={handleProductSearchKeyDown}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    
                    {showProductDropdown && productSearch && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
                      {isSearchingProducts ? (
                        <div className="p-4 text-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600 mx-auto mb-2"></div>
                          <div className="text-sm text-gray-500">Buscando productos...</div>
                        </div>
                      ) : visibleProducts.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          No se encontraron productos
                        </div>
                      ) : (
                        visibleProducts.map((product, index) => {
                          const totalStock = (product.stock?.warehouse || 0) + (product.stock?.store || 0)
                          const hasStock = totalStock > 0
                          const isHighlighted = highlightedProductIndex === index

                          const containerClasses = [
                            'p-3',
                            'border-b border-gray-200 dark:border-gray-600 last:border-b-0',
                            'rounded-lg',
                            'transition-colors duration-150 ease-in-out',
                            hasStock ? 'cursor-pointer' : 'cursor-not-allowed opacity-50',
                            isHighlighted
                              ? 'bg-orange-500/15 dark:bg-orange-500/25 border-orange-300 dark:border-orange-500'
                              : hasStock
                                ? 'bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
                                : 'bg-gray-50 dark:bg-gray-800/50'
                          ].join(' ')

                          const nameClasses = [
                            'font-medium',
                            isHighlighted
                              ? 'text-orange-700 dark:text-orange-200'
                              : hasStock
                                ? 'text-gray-900 dark:text-white'
                                : 'text-gray-400 dark:text-gray-500'
                          ].join(' ')

                          const detailsClasses = [
                            'text-sm',
                            isHighlighted
                              ? 'text-orange-600 dark:text-orange-300'
                              : 'text-gray-600 dark:text-gray-300'
                          ].join(' ')
                          
                          return (
                        <div
                          key={product.id}
                          ref={(el) => {
                            productRefs.current[index] = el
                          }}
                          onClick={() => hasStock ? addProduct(product) : undefined}
                          onMouseEnter={() => setHighlightedProductIndex(index)}
                          className={containerClasses}
                        >
                          <div className="flex items-center gap-2">
                            <span className={nameClasses}>
                              {product.name}
                            </span>
                            {!hasStock && (
                              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 rounded">
                                Agotado
                              </span>
                            )}
                          </div>
                          <div className={detailsClasses}>
                            Ref: {product.reference || 'N/A'} | 
                            Stock: {(product.stock?.warehouse || 0) + (product.stock?.store || 0)} | 
                            Precio: ${(product.price || 0).toLocaleString('es-CO')}
                          </div>
                        </div>
                      )})
                      )}
                    </div>
                    )}
                  </div>
                </div>
                
                {selectedProducts.length > 0 && (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {selectedProducts.map((item) => {
                      const product = products.find(p => p.id === item.productId)
                      const warehouseStock = product?.stock?.warehouse || 0
                      const localStock = product?.stock?.store || 0
                      const reference = item.productReferenceCode || product?.reference || 'N/A'
                      
                      return (
                      <div key={item.productId} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {item.productName}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              Ref: {reference} | Bodega: {warehouseStock} | Local: {localStock}
                            </div>
                          </div>
                        </div>
                        
                        {/* Controles de precio y cantidad */}
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">
                              Precio de venta
                            </label>
                            <input
                              type="text"
                              value={item.unitPrice ? item.unitPrice.toLocaleString('es-CO') : ''}
                              onChange={(e) => {
                                const cleanValue = e.target.value.replace(/\./g, '')
                                const numericValue = parseFloat(cleanValue) || 0
                                updatePrice(item.productId, numericValue)
                              }}
                              onBlur={() => handlePriceBlur(item.productId)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
                              placeholder="0"
                            />
                          </div>
                          
                          <div>
                            <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">
                              Cantidad
                            </label>
                            <div className="flex items-center gap-1">
                              <Button
                                onClick={() => updateQuantity(item.productId, item.quantity - 1, true)}
                                size="sm"
                                variant="outline"
                                className="h-7 w-7 p-0"
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => {
                                  const value = e.target.value === '' ? 0 : parseInt(e.target.value) || 0
                                  updateQuantity(item.productId, value, false)
                                }}
                                onBlur={() => handleQuantityBlur(item.productId)}
                                className="w-12 h-7 text-center text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
                                min="0"
                              />
                              <Button
                                onClick={() => updateQuantity(item.productId, item.quantity + 1, true)}
                                size="sm"
                                variant="outline"
                                className="h-7 w-7 p-0"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="flex-shrink-0 mt-6">
                            <Button
                              onClick={() => removeProduct(item.productId)}
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        
                        {/* Total del producto */}
                        {item.totalPrice > 0 && (
                          <div className="flex justify-between items-center pt-1 border-t border-gray-200 dark:border-gray-600">
                            <span className="text-xs text-gray-600 dark:text-gray-400">Total:</span>
                            <span className="font-semibold text-orange-600">${item.totalPrice.toLocaleString('es-CO')}</span>
                          </div>
                        )}
                      </div>
                      )
                    })}
                  </div>
                )}

                {/* Alerta sutil de stock */}
                {stockAlert.show && (
                  <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-600 rounded-lg shadow-sm">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                      <div className="text-sm font-medium text-red-800 dark:text-red-200">
                        {stockAlert.message}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

              {/* Resumen de la Venta */}
              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg text-gray-900 dark:text-white flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-orange-600" />
                  Resumen de la Venta
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedProducts.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                    Selecciona productos para ver el resumen de la venta
                  </p>
                ) : (
                  <div className="space-y-3">
                    {selectedProducts.map((item) => (
                      <div key={item.productId} className="flex justify-between items-center">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {item.productName}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-300">
                            {item.quantity} x ${item.unitPrice.toLocaleString('es-CO')}
                          </div>
                        </div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          ${item.totalPrice.toLocaleString('es-CO')}
                        </div>
                      </div>
                    ))}
                    
                    {/* Subtotal */}
                    <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-300">
                          Subtotal:
                        </span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          ${calculateSubtotal().toLocaleString('es-CO')}
                        </span>
                      </div>
                    </div>

                    {/* IVA Checkbox */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={includeTax}
                          onChange={(e) => setIncludeTax(e.target.checked)}
                          className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-600"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          Incluir IVA (19%)
                        </span>
                      </div>
                      {includeTax && (
                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                          ${calculateTax().toLocaleString('es-CO')}
                        </span>
                      )}
                    </div>

                    {/* Total */}
                    <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          Total:
                        </span>
                        <span className="text-lg font-bold text-orange-600">
                          ${calculateTotal().toLocaleString('es-CO')}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            </div>

            {/* Columna derecha - Secciones pequeñas */}
            <div className="xl:col-span-1 space-y-4 md:space-y-6">
              {/* Cliente */}
              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg text-gray-900 dark:text-white flex items-center gap-2">
                  <User className="h-5 w-5 text-orange-600" />
                  Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Seleccionar Cliente *
                  </label>
                  <select
                    value={formData.clientId}
                    onChange={(e) => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Selecciona un cliente...</option>
                    {filteredClients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}{client.email ? ` - ${client.email}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                
                {selectedClient && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {selectedClient.name}
                      </div>
                      <div>{selectedClient.email}</div>
                      <div>{selectedClient.phone}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

              {/* Configuración del Crédito */}
              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="text-lg text-gray-900 dark:text-white flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-orange-600" />
                    Configuración del Crédito
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Fecha de Vencimiento *
                    </label>
                    <DatePicker
                      selectedDate={selectedDate}
                      onDateSelect={setSelectedDate}
                      placeholder="Seleccionar fecha de vencimiento"
                      className="w-full"
                      minDate={new Date()}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Observaciones (Opcional)
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Agregar observaciones sobre la venta a crédito..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div 
          className="flex items-center justify-end gap-3 p-4 md:p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex-shrink-0 sticky bottom-0"
          style={{
            paddingBottom: `calc(max(56px, env(safe-area-inset-bottom)) + 1rem)`
          }}
        >
          <Button
            onClick={handleClose}
            variant="outline"
            className="text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600"
          >
            Cancelar
          </Button>
          {/* Botón de borrador comentado
          <Button
            onClick={(e) => handleSubmit(e, true)}
            disabled={loading || selectedProducts.length === 0 || !formData.clientId}
            className="bg-gray-600 hover:bg-gray-700 text-white disabled:bg-gray-400"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Guardando...
              </div>
            ) : (
              'Guardar como Borrador'
            )}
          </Button>
          */}
          <Button
            onClick={(e) => handleSubmit(e, false)}
            disabled={loading || selectedProducts.length === 0 || !formData.clientId || !formData.dueDate}
            className="bg-orange-600 hover:bg-orange-700 text-white disabled:bg-gray-400"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Creando...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Crear Venta a Crédito
              </div>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}