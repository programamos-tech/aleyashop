'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  X, 
  Plus, 
  Minus, 
  Search,
  Calculator,
  User,
  Package,
  CreditCard,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  ArrowLeft,
  ShoppingCart,
  Bike
} from 'lucide-react'
import { RoleProtectedRoute } from '@/components/auth/role-protected-route'
import { Sale, SaleItem, Product, Client, SalePayment } from '@/types'
import { useClients } from '@/contexts/clients-context'
import { useProducts } from '@/contexts/products-context'
import { useSales } from '@/contexts/sales-context'
import { useAuth } from '@/contexts/auth-context'

// Constante para identificar la tienda principal
const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
// Margen mínimo de ganancia para microtiendas (10%)
const MIN_PROFIT_MARGIN = 0.10

export default function NewSalePage() {
  const router = useRouter()
  const { clients, getAllClients } = useClients()
  const { products, refreshProducts, searchProducts } = useProducts()
  const { createSale } = useSales()
  const { user } = useAuth()
  
  // Detectar si es tienda principal o microtienda
  const isMainStore = !user?.storeId || user.storeId === MAIN_STORE_ID
  
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [selectedProducts, setSelectedProducts] = useState<SaleItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'warranty' | 'mixed' | ''>('')
  const [clientSearch, setClientSearch] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [debouncedProductSearch, setDebouncedProductSearch] = useState('')
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  // IVA ya incluido en los precios de productos - no se necesita checkbox
  const [invoiceNumber, setInvoiceNumber] = useState<string>('Pendiente')
  const [stockAlert, setStockAlert] = useState<{show: boolean, message: string, productId?: string}>({show: false, message: ''})
  const [highlightedProductIndex, setHighlightedProductIndex] = useState<number>(-1)
  const [searchedProducts, setSearchedProducts] = useState<Product[]>([])
  const [isSearchingProducts, setIsSearchingProducts] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const productRefs = useRef<(HTMLDivElement | null)[]>([])
  const lastSearchTermRef = useRef<string>('')
  const [lastCompletedSearchTerm, setLastCompletedSearchTerm] = useState<string>('')
  // Cache de productos agregados a la venta para mantener su información de stock
  const [productsInSaleCache, setProductsInSaleCache] = useState<Map<string, Product>>(new Map())
  
  const [mixedPayments, setMixedPayments] = useState<SalePayment[]>([])
  const [showMixedPayments, setShowMixedPayments] = useState(false)
  const [paymentError, setPaymentError] = useState('')
  const [receivedAmount, setReceivedAmount] = useState<string>('')
  const [isDelivery, setIsDelivery] = useState(false) // true = domicilio, false = venta en tienda
  const [deliveryFee, setDeliveryFee] = useState<number>(0) // Valor del domicilio

  useEffect(() => {
    getAllClients()
    refreshProducts()
  }, [getAllClients, refreshProducts])

  useEffect(() => {
    if (paymentMethod === 'mixed') {
      setShowMixedPayments(true)
      setMixedPayments([
        { id: '', saleId: '', paymentType: 'cash', amount: 0, reference: '', notes: '', createdAt: '', updatedAt: '' },
        { id: '', saleId: '', paymentType: 'transfer', amount: 0, reference: '', notes: '', createdAt: '', updatedAt: '' }
      ])
    } else {
      setShowMixedPayments(false)
      setMixedPayments([])
    }
  }, [paymentMethod])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedProductSearch(productSearch)
    }, 300)
    return () => clearTimeout(timer)
  }, [productSearch])

  // Buscar productos cuando el usuario escriba - CON PROTECCIÓN CONTRA LOOPS
  useEffect(() => {
    let cancelled = false
    const searchTerm = debouncedProductSearch.trim()
    
    // Si no hay término de búsqueda, limpiar y salir
    if (searchTerm.length < 2) {
      lastSearchTermRef.current = ''
      setSearchedProducts([])
      setLastCompletedSearchTerm('')
      setIsSearchingProducts(false)
      return
    }
    
    // Evitar búsquedas duplicadas del mismo término
    if (searchTerm === lastSearchTermRef.current) {
      return
    }
    
    // Marcar el término actual ANTES de buscar
    lastSearchTermRef.current = searchTerm
    
    const performSearch = async () => {
      // Doble verificación antes de buscar
      if (cancelled || lastSearchTermRef.current !== searchTerm) {
        return
      }
      
      setIsSearchingProducts(true)
      try {
        const results = await searchProducts(searchTerm)
        // Verificar que el término no haya cambiado antes de actualizar
        if (!cancelled && lastSearchTermRef.current === searchTerm) {
          setSearchedProducts(results)
          setLastCompletedSearchTerm(searchTerm)
          setIsSearchingProducts(false)
        }
      } catch (error) {
        // Error silencioso
        if (!cancelled && lastSearchTermRef.current === searchTerm) {
          setSearchedProducts([])
          setLastCompletedSearchTerm(searchTerm)
          setIsSearchingProducts(false)
        }
      } finally {
        // Solo actualizar si el término no ha cambiado
        if (!cancelled && lastSearchTermRef.current === searchTerm) {
          setIsSearchingProducts(false)
        }
      }
    }

    performSearch()
    
    return () => {
      cancelled = true
    }
    // SOLO depender de debouncedProductSearch, NO de searchProducts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedProductSearch])

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

  // Función helper para identificar si un cliente es una tienda
  const isStoreClient = (client: Client): boolean => {
    if (!client || !client.name) return false
    const nameLower = client.name.toLowerCase()
    // Filtrar clientes que sean tiendas internas
    const storeKeywords = ['aleya', 'store', 'tienda', 'microtienda', 'micro tienda', 'sucursal']
    return storeKeywords.some(keyword => nameLower.includes(keyword))
  }

  // Filtrar clientes (excluir clientes de tiendas)
  const filteredClients = useMemo(() => {
    // Primero filtrar clientes de tiendas
    const nonStoreClients = clients.filter(client => !isStoreClient(client))
    
    if (!clientSearch.trim()) {
      // Si no hay búsqueda, mostrar todos los clientes (limitado)
      return nonStoreClients.slice(0, 10)
    }
    const searchLower = clientSearch.toLowerCase().trim()
    return nonStoreClients.filter(client =>
      client && (
        (client.name && client.name.toLowerCase().includes(searchLower)) ||
        (client.email && client.email.toLowerCase().includes(searchLower)) ||
        (client.phone && client.phone.toLowerCase().includes(searchLower))
      )
    )
  }, [clients, clientSearch])

  // Filtrar productos - SIMPLIFICADO como en credit-modal
  const filteredProducts = useMemo(() => {
    const searchTerm = debouncedProductSearch.trim()
    
    // Si no hay búsqueda, mostrar productos con stock
    if (!searchTerm) {
      return products
        .filter(p => (p.stock.store || 0) > 0 || (p.stock.warehouse || 0) > 0)
        .slice(0, 20)
    }
    
    // Si hay búsqueda y hay resultados del servidor, usar esos (TODOS los productos)
    if (searchTerm.length >= 2 && searchedProducts.length > 0) {
      return searchedProducts.sort((a, b) => {
        const searchTermLower = searchTerm.toLowerCase()
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
    }
    
    // Si hay búsqueda pero no hay resultados y no está buscando Y el término actual coincide con el último buscado completado
    // Esta verificación evita mostrar "no hay resultados" mientras se busca un nuevo término
    if (searchTerm.length >= 2 && searchedProducts.length === 0 && !isSearchingProducts && lastCompletedSearchTerm === searchTerm) {
      return []
    }
    
    // Si está buscando, hay una nueva búsqueda pendiente, o no hay búsqueda, usar productos locales como fallback
    return products.filter(product => {
      if (!product || product.status !== 'active') return false
      const searchTermLower = searchTerm.toLowerCase()
      const name = (product.name || '').toLowerCase()
      const reference = (product.reference || '').toLowerCase()
      const brand = (product.brand || '').toLowerCase()
      return name.includes(searchTermLower) || reference.includes(searchTermLower) || brand.includes(searchTermLower)
    }).sort((a, b) => {
      const searchTermLower = searchTerm.toLowerCase()
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
  }, [products, debouncedProductSearch, searchedProducts, isSearchingProducts, lastCompletedSearchTerm])

  const visibleProducts = useMemo(() => filteredProducts.slice(0, 15), [filteredProducts])

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

  const getStockStatus = (productId: string) => {
    const product = products.find(p => p.id === productId)
    if (!product) return 'Sin Stock'
    const store = product.stock.store || 0
    const warehouse = product.stock.warehouse || 0
    const total = store + warehouse
    
    if (total === 0) return 'Sin Stock'
    if (store > 0) return 'Disponible Local'
    if (warehouse > 0 && store === 0) return 'Solo Bodega'
    if (total < 10) return 'Stock Bajo'
    return 'Disponible'
  }

  const getClientTypeColor = (type: string) => {
    // Todos los clientes usan el color rosa de la marca
    return 'bg-[#fce4f0] text-[#d06a98] border-[#f29fc8] dark:bg-[#f29fc8]/20 dark:text-[#f29fc8] dark:border-[#f29fc8]'
  }

  const handleAddProduct = (product: Product) => {
    const existingItem = selectedProducts.find(item => item.productId === product.id)
    if (existingItem) {
      handleUpdateQuantity(existingItem.id, existingItem.quantity + 1)
      return
    }

    const availableStock = (product.stock.store || 0) + (product.stock.warehouse || 0)
    if (availableStock === 0) {
      setStockAlert({
        show: true, 
        message: 'Este producto no tiene stock disponible', 
        productId: product.id 
      })
      return
    }

    // Guardar el producto en el cache para mantener su información de stock
    setProductsInSaleCache(prev => {
      const newCache = new Map(prev)
      newCache.set(product.id, product)
      return newCache
    })

    const newItem: SaleItem = {
      id: `temp-${Date.now()}`,
      productId: product.id,
      productName: product.name,
      productReferenceCode: product.reference || 'N/A',
      quantity: 1,
      unitPrice: product.price,
      total: product.price,
      addedAt: new Date().toISOString()
    }

    setSelectedProducts([...selectedProducts, newItem])
    setProductSearch('')
    setShowProductDropdown(false)
    setHighlightedProductIndex(-1)
  }

  const handleRemoveProduct = (itemId: string) => {
    const item = selectedProducts.find(i => i.id === itemId)
    // Si el producto que se está quitando tiene una alerta activa, ocultarla
    if (item && stockAlert.show && stockAlert.productId === item.productId) {
      setStockAlert({ show: false, message: '', productId: undefined })
    }
    setSelectedProducts(selectedProducts.filter(item => item.id !== itemId))
    
    // Limpiar el cache solo si no hay más items de ese producto en la venta
    if (item) {
      const hasOtherItems = selectedProducts.some(i => i.id !== itemId && i.productId === item.productId)
      if (!hasOtherItems) {
        setProductsInSaleCache(prev => {
          const newCache = new Map(prev)
          newCache.delete(item.productId)
          return newCache
        })
      }
    }
  }

  const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
    // No eliminar el producto si la cantidad es 0, solo actualizar
    if (newQuantity < 0) {
      return
    }

    const item = selectedProducts.find(i => i.id === itemId)
    if (!item) return

    // Usar findProductById que busca en contexto y cache
    const product = findProductById(item.productId)
    const availableStock = (product?.stock.store || 0) + (product?.stock.warehouse || 0)
    
    // Verificar stock solo si la cantidad es mayor a 0
    if (newQuantity > 0 && newQuantity > availableStock) {
      setStockAlert({
        show: true,
        message: `Stock disponible: ${availableStock} unidades`, 
        productId: item.productId 
      })
      return
    }

    setSelectedProducts(selectedProducts.map(i => {
      if (i.id === itemId) {
        const calculatedTotal = i.unitPrice * newQuantity
        return { ...i, quantity: newQuantity, total: calculatedTotal }
      }
      return i
    }))
  }

  const handleQuantityInputChange = (itemId: string, value: string) => {
    const numValue = parseInt(value) || 0
    handleUpdateQuantity(itemId, numValue)
  }

  const formatNumber = (value: number): string => {
    if (!value && value !== 0) return ''
    return value.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  }

  const parseNumber = (value: string): number => {
    // Remover puntos y espacios, luego parsear
    const cleaned = value.replace(/[^\d]/g, '')
    return cleaned === '' ? 0 : parseFloat(cleaned) || 0
  }

  const handleUpdatePrice = (itemId: string, newPrice: number) => {
    if (newPrice < 0) return
    
    setSelectedProducts(selectedProducts.map(item => {
      if (item.id === itemId) {
        const calculatedTotal = newPrice * item.quantity
        return { ...item, unitPrice: newPrice, total: calculatedTotal }
      }
      return item
    }))
  }

  const handlePriceBlur = (itemId: string) => {
    // Validar precio al perder el foco y mostrar alerta si es inválido
    const item = selectedProducts.find(i => i.id === itemId)
    if (!item) return
    // Usar findProductById que busca en contexto y cache
    const product = findProductById(item.productId)
    if (!product) return
    
    let minPrice: number
    let priceType: string
    
    if (isMainStore) {
      // Tienda principal: lógica original
      minPrice = (product.price && product.price > 0) ? product.price : (product.cost || 0)
      priceType = (product.price && product.price > 0) ? 'precio de venta' : 'precio de compra'
    } else {
      // Microtiendas: si tiene precio de venta, usar ese; si no, costo + 10% de margen
      if (product.price && product.price > 0) {
        minPrice = product.price
        priceType = 'precio de venta'
      } else {
        const cost = product.cost || 0
        minPrice = Math.ceil(cost * (1 + MIN_PROFIT_MARGIN))
        priceType = 'costo + 10% margen mínimo'
      }
    }
    
    // Si el precio es menor al mínimo, mostrar alerta
    if (item.unitPrice < minPrice) {
      setStockAlert({
        show: true,
        message: `${item.productName} no puede ser vendido por menos de ${formatCurrency(minPrice)} (${priceType})`,
        productId: item.productId
      })
    } else {
      // Si el precio es válido, ocultar la alerta para este producto
      if (stockAlert.show && stockAlert.productId === item.productId) {
        setStockAlert({ show: false, message: '', productId: undefined })
      }
    }
  }

  const findProductById = (productId: string) => {
    // Primero buscar en el array de productos del contexto
    const productInContext = products.find(p => p.id === productId)
    if (productInContext) return productInContext
    
    // Si no está en el contexto, buscar en el cache de productos agregados a la venta
    const productInCache = productsInSaleCache.get(productId)
    if (productInCache) return productInCache
    
    return undefined
  }

  const getAvailableStock = (productId: string) => {
    const product = findProductById(productId)
    if (!product) return 0
    return (product.stock.store || 0) + (product.stock.warehouse || 0)
  }

  // Productos válidos para mostrar (incluye precio 0)
  const validProducts = useMemo(() => {
    // Filtrar productos válidos: cantidad > 0 (precio puede ser 0 para mostrarlos)
    const filtered = selectedProducts.filter(item => {
      // Validaciones básicas
      if (!item || !item.productId) {
        return false
      }
      if (item.quantity <= 0) {
        return false
      }
      // Permitir precio 0 para mostrarlos, pero no para calcular total
      return true
    })
    
    // Recalcular el total para todos los productos (precio 0 = total 0)
    return filtered.map(item => {
      const calculatedTotal = (item.unitPrice || 0) * (item.quantity || 0)
      return { 
        ...item, 
        total: calculatedTotal 
      }
    })
  }, [selectedProducts])

  // Productos válidos para calcular total (excluye precio 0)
  const validProductsForTotal = useMemo(() => {
    return validProducts.filter(item => {
      return item.unitPrice > 0
    })
  }, [validProducts])

  const orderedValidProducts = useMemo(() => {
    return [...validProducts].sort((a, b) => 
      new Date(b.addedAt || '').getTime() - new Date(a.addedAt || '').getTime()
    )
  }, [validProducts])

  const orderedSelectedProducts = useMemo(() => {
    return [...selectedProducts].sort((a, b) => 
      new Date(b.addedAt || '').getTime() - new Date(a.addedAt || '').getTime()
    )
  }, [selectedProducts])

  // Subtotal = suma de precios (ya incluyen IVA)
  const subtotal = useMemo(() => {
    const calculated = validProductsForTotal.reduce((sum, item) => {
      const itemTotal = (item.unitPrice || 0) * (item.quantity || 0)
      return sum + itemTotal
    }, 0)
    return calculated
  }, [validProductsForTotal])

  // Desglose del IVA incluido en los productos
  const subtotalSinIva = useMemo(() => {
    return Math.round(subtotal / 1.19)
  }, [subtotal])

  const ivaIncluido = useMemo(() => {
    return subtotal - subtotalSinIva
  }, [subtotal, subtotalSinIva])

  // Total = productos (con IVA) + domicilio (sin IVA adicional)
  const total = useMemo(() => {
    return subtotal + (isDelivery ? deliveryFee : 0)
  }, [subtotal, isDelivery, deliveryFee])

  const getTotalMixedPayments = () => {
    return mixedPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0)
  }

  const updateMixedPayment = (index: number, field: keyof SalePayment, value: any) => {
    const updated = [...mixedPayments]
    updated[index] = { ...updated[index], [field]: value }
    setMixedPayments(updated)
    setPaymentError('')
  }

  const getPaymentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      cash: 'Efectivo',
      transfer: 'Transferencia',
      credit: 'Crédito',
      warranty: 'Garantía'
    }
    return labels[type] || type
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount)
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

  const handleProductSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
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
          handleAddProduct(product)
        }
      }
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setShowProductDropdown(false)
      setHighlightedProductIndex(-1)
    }
  }

  const handleSave = async () => {
    if (!selectedClient || selectedProducts.length === 0 || validProducts.length === 0 || !paymentMethod) return

    // Verificar que todos los productos tengan precio > 0
    const productsWithoutPrice: string[] = []
    validProducts.forEach(item => {
      if (!item.unitPrice || item.unitPrice <= 0) {
        productsWithoutPrice.push(item.productName)
      }
    })

    if (productsWithoutPrice.length > 0) {
      setStockAlert({
        show: true,
        message: `Los siguientes productos no tienen precio asignado: ${productsWithoutPrice.join(', ')}. Por favor, asigna un precio a todos los productos antes de crear la venta.`,
        productId: undefined
      })
      return
    }

    // Verificar que los precios sean mayores o iguales al precio mínimo
    // Tienda principal: si tiene precio de venta, usar ese; si no, usar costo
    // Microtiendas: si tiene precio de venta, usar ese; si no, costo + 10% margen mínimo
    const invalidProducts: string[] = []
    validProducts.forEach(item => {
      const product = findProductById(item.productId)
      if (!product) return
      
      let minPrice: number
      let priceType: string
      
      if (isMainStore) {
        // Tienda principal: lógica original
        minPrice = (product.price && product.price > 0) ? product.price : (product.cost || 0)
        priceType = (product.price && product.price > 0) ? 'precio de venta' : 'precio de compra'
      } else {
        // Microtiendas: si tiene precio de venta, usar ese; si no, costo + 10% de margen
        if (product.price && product.price > 0) {
          minPrice = product.price
          priceType = 'precio de venta'
        } else {
          const cost = product.cost || 0
          minPrice = Math.ceil(cost * (1 + MIN_PROFIT_MARGIN))
          priceType = 'costo + 10% margen mínimo'
        }
      }
      
      if (item.unitPrice < minPrice) {
        invalidProducts.push(`${item.productName} no puede ser vendido por menos de ${formatCurrency(minPrice)} (${priceType})`)
      }
    })

    if (invalidProducts.length > 0) {
      setStockAlert({
        show: true,
        message: invalidProducts.join(' • '),
        productId: undefined
      })
      return
    }

    if (paymentMethod === 'mixed') {
      const totalMixedPayments = getTotalMixedPayments()
      const roundedTotal = Math.round(total)
      const roundedPayments = Math.round(totalMixedPayments)
      
      if (roundedPayments !== roundedTotal) {
        const faltante = Math.abs(roundedTotal - roundedPayments)
        setPaymentError(`El total ingresado (${formatCurrency(roundedPayments)}) no coincide con el total de la venta (${formatCurrency(roundedTotal)}). Falta: ${formatCurrency(faltante)}`)
        return
      }
    }

    // Usar solo productos con precio > 0 para crear la venta
    const saleItems = validProductsForTotal.map(({ addedAt, ...item }) => item)

    const saleData: Omit<Sale, 'id' | 'createdAt'> = {
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      total: total,
      subtotal: subtotal,
      tax: ivaIncluido,
      discount: 0,
      discountType: 'amount',
      status: 'completed',
      paymentMethod,
      payments: paymentMethod === 'mixed' ? mixedPayments : undefined,
      items: saleItems,
      invoiceNumber: undefined,
      isDelivery: isDelivery, // true = domicilio, false = venta física
      deliveryFee: isDelivery ? deliveryFee : 0 // Valor del domicilio
    }

    try {
      setIsCreating(true)
      setInvoiceNumber('Generando...')
      await createSale(saleData)
      setTimeout(() => {
        router.push('/sales')
      }, 500)
    } catch (error) {
      console.error('Error creating sale:', error)
      setInvoiceNumber('Pendiente')
      setIsCreating(false)
      alert('Error al crear la venta. Por favor intenta de nuevo.')
    }
  }

  const handleRemoveClient = () => {
    setSelectedClient(null)
    setClientSearch('')
  }

  return (
    <RoleProtectedRoute module="sales" requiredAction="create">
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header Fijo - Compacto */}
        <div className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-[1920px] mx-auto px-4 md:px-6 py-2">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/sales')}
                className="h-8 w-8 p-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="h-8 w-8 rounded-lg bg-[#f29fc8] dark:bg-[#e07ab0] flex items-center justify-center flex-shrink-0">
                <Calculator className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                  Factura de Venta
                </h1>
              </div>
              {invoiceNumber !== 'Pendiente' && invoiceNumber !== 'Generando...' && (
                <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                  {invoiceNumber}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Contenido Principal */}
        <div className="max-w-[1920px] mx-auto px-4 md:px-6 py-6">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Columna Izquierda - Productos (2/3 del ancho) */}
            <div className="xl:col-span-2 space-y-6">
              {/* Búsqueda y Selección de Productos */}
              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-gray-900 dark:text-white flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-[#fce4f0] dark:bg-[#f29fc8]/30 flex items-center justify-center">
                      <Package className="h-4 w-4 text-[#f29fc8] dark:text-[#f29fc8]" />
                    </div>
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
                        placeholder="Buscar por nombre, referencia o marca..."
                        value={productSearch}
                        onChange={(e) => {
                          setProductSearch(e.target.value)
                          setShowProductDropdown(e.target.value.length > 0)
                        }}
                        onKeyDown={handleProductSearchKeyDown}
                        onFocus={() => setShowProductDropdown(true)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#fce4f0]0 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      
                      {showProductDropdown && productSearch && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl max-h-96 overflow-y-auto z-50">
                          {isSearchingProducts ? (
                            <div className="p-4 text-center">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#f29fc8] mx-auto mb-2"></div>
                              <div className="text-sm text-gray-500">Buscando productos...</div>
                            </div>
                          ) : visibleProducts.length === 0 ? (
                            <div className="p-4 text-center text-gray-500 text-sm">
                              No se encontraron productos
                            </div>
                          ) : (
                            <div className="p-2">
                              {visibleProducts.map((product, index) => {
                                const totalStock = (product.stock?.warehouse || 0) + (product.stock?.store || 0)
                                const hasStock = totalStock > 0
                                const isHighlighted = highlightedProductIndex === index

                                return (
                                  <div
                                    key={product.id}
                                    ref={(el) => {
                                      productRefs.current[index] = el
                                    }}
                                    onClick={() => hasStock ? handleAddProduct(product) : undefined}
                                    onMouseEnter={() => setHighlightedProductIndex(index)}
                                    className={`p-3 border-b border-gray-200 dark:border-gray-600 last:border-b-0 rounded-lg transition-colors duration-150 ease-in-out ${
                                      isHighlighted
                                        ? 'bg-[#fce4f0] dark:bg-[#f29fc8]/20 border-[#f29fc8] dark:border-[#f29fc8] cursor-pointer'
                                        : hasStock
                                          ? 'bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer'
                                          : 'bg-gray-50 dark:bg-gray-800/50 opacity-50 cursor-not-allowed'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className={`font-medium ${
                                        isHighlighted
                                          ? 'text-[#e07ab0] dark:text-[#f29fc8]/50'
                                          : hasStock
                                            ? 'text-gray-900 dark:text-white'
                                            : 'text-gray-400 dark:text-gray-500'
                                      }`}>
                                        {product.name}
                                      </span>
                                      {!hasStock && (
                                        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 rounded">
                                          Agotado
                                        </span>
                                      )}
                                    </div>
                                    <div className={`text-sm ${
                                      isHighlighted
                                        ? 'text-[#f29fc8] dark:text-[#f29fc8]'
                                        : hasStock
                                          ? 'text-gray-600 dark:text-gray-300'
                                          : 'text-gray-400 dark:text-gray-500'
                                    }`}>
                                      Ref: {product.reference || 'N/A'} | 
                                      Stock: {totalStock} | 
                                      Precio: ${(product.price || 0).toLocaleString('es-CO')}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Alerta de stock */}
                  {stockAlert.show && (
                    <div className="p-3 bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-600 rounded-lg shadow-sm">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                        <div className="text-sm font-medium text-red-800 dark:text-red-200">
                          {stockAlert.message}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Productos Seleccionados */}
                  {orderedSelectedProducts.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">Productos Seleccionados</h3>
                        <Badge className="bg-[#fce4f0] text-[#d06a98] border-[#f29fc8] dark:bg-[#f29fc8]/30 dark:text-[#f29fc8] dark:border-[#f29fc8] text-sm">
                          {orderedSelectedProducts.length} producto{orderedSelectedProducts.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <div className="space-y-3">
                        {orderedSelectedProducts.map(item => {
                          const product = findProductById(item.productId)
                          const warehouseStock = product?.stock?.warehouse || 0
                          const localStock = product?.stock?.store || 0
                          const reference = item.productReferenceCode || product?.reference || 'N/A'
                          
                          return (
                            <div key={item.id} className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-gray-900 dark:text-white text-base mb-1">{item.productName}</h4>
                                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                                    Ref: {reference} | Bodega: {warehouseStock} | Local: {localStock}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                      Precio:
                                    </label>
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      value={formatNumber(item.unitPrice)}
                                      onChange={(e) => {
                                        const numericValue = parseNumber(e.target.value)
                                        if (numericValue >= 0) {
                                          handleUpdatePrice(item.id, numericValue)
                                        }
                                      }}
                                      onBlur={() => handlePriceBlur(item.id)}
                                      className="w-32 h-8 text-sm text-gray-900 dark:text-white border rounded focus:ring-2 focus:ring-[#fce4f0]0 focus:border-[#fce4f0]0 bg-white dark:bg-gray-600 px-2"
                                      min={product?.cost || 0}
                                      step="100"
                                      placeholder="0"
                                    />
                                  </div>
                                </div>
                                <div className="text-right ml-3">
                                  <div className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(item.total)}</div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400">Total</div>
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-600">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">Cantidad:</span>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                                      className="h-8 w-8 p-0 border-gray-300 dark:border-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600"
                                    >
                                      <Minus className="h-4 w-4" />
                                    </Button>
                                    <input
                                      type="text"
                                      value={item.quantity}
                                      onChange={(e) => handleQuantityInputChange(item.id, e.target.value)}
                                      className="w-16 h-8 text-center text-base font-semibold text-gray-900 dark:text-white border border-gray-300 dark:border-gray-500 rounded focus:ring-2 focus:ring-[#fce4f0]0 focus:border-[#fce4f0]0 bg-white dark:bg-gray-600"
                                      min="1"
                                    />
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                      className="h-8 w-8 p-0 border-gray-300 dark:border-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600"
                                    >
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                                
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleRemoveProduct(item.id)}
                                  className="h-8 px-3 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Quitar
                                </Button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Columna Derecha - Cliente, Pago y Resumen (1/3 del ancho, Sticky) */}
            <div className="xl:col-span-1 space-y-6">
              {/* Cliente */}
              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-gray-900 dark:text-white flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-[#fce4f0] dark:bg-[#f29fc8]/30 flex items-center justify-center">
                      <User className="h-4 w-4 text-[#f29fc8] dark:text-[#f29fc8]" />
                    </div>
                    Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Buscar Cliente
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                      <input
                        type="text"
                        placeholder="Buscar por nombre, email o teléfono..."
                        value={clientSearch}
                        onChange={(e) => {
                          setClientSearch(e.target.value)
                          setShowClientDropdown(true)
                        }}
                        onFocus={() => {
                          setShowClientDropdown(true)
                        }}
                        onBlur={() => {
                          // Cerrar dropdown después de un pequeño delay para permitir clicks
                          setTimeout(() => {
                            setShowClientDropdown(false)
                          }, 200)
                        }}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#fce4f0]0 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                      />
                      
                      {showClientDropdown && !selectedClient && filteredClients.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl max-h-80 overflow-y-auto z-50">
                          <div className="p-2">
                            {filteredClients.map((client, index) => (
                              <button
                                key={client.id}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault()
                                  setSelectedClient(client)
                                  setClientSearch(client.name)
                                  setShowClientDropdown(false)
                                }}
                                className="w-full px-3 py-3 text-left rounded-lg transition-all duration-150 hover:bg-[#fce4f0] dark:hover:bg-[#f29fc8]/20 border border-transparent hover:border-[#f29fc8]/50 dark:hover:border-[#e07ab0] mb-1 last:mb-0 group"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-gray-900 dark:text-white text-sm mb-1 group-hover:text-[#e07ab0] dark:group-hover:text-[#f29fc8] transition-colors">
                                      {client.name}
                                    </div>
                                    {client.email && (
                                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                        {client.email}
                                      </div>
                                    )}
                                    {client.phone && (
                                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        {client.phone}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-shrink-0">
                                    <Badge className={`${getClientTypeColor(client.type)} text-xs whitespace-nowrap`}>
                                      Cliente
                                    </Badge>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {showClientDropdown && !selectedClient && filteredClients.length === 0 && clientSearch.trim().length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl z-50">
                          <div className="p-4 text-center">
                            <User className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              No se encontraron clientes
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedClient && (
                    <div className="p-3 bg-[#fce4f0] dark:bg-[#f29fc8]/20 rounded-lg border border-[#f29fc8]/50 dark:border-[#fce4f0]0/30 shadow-sm">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="h-7 w-7 rounded-full bg-[#f29fc8] dark:bg-[#e07ab0] flex items-center justify-center flex-shrink-0">
                            <User className="h-3.5 w-3.5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                              {selectedClient.name}
                            </div>
                            {selectedClient.email && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {selectedClient.email}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge className={`${getClientTypeColor(selectedClient.type)} text-xs whitespace-nowrap`}>
                            Cliente
                          </Badge>
                          <Button
                            onClick={handleRemoveClient}
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                </CardContent>
              </Card>

              {/* Método de Pago */}
              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-gray-900 dark:text-white flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-[#fce4f0] dark:bg-[#f29fc8]/30 flex items-center justify-center">
                      <CreditCard className="h-4 w-4 text-[#f29fc8] dark:text-[#f29fc8]" />
                    </div>
                    Método de Pago
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <select
                      value={paymentMethod}
                      onChange={(e) => {
                        setPaymentMethod(e.target.value as any)
                        if (e.target.value !== 'cash') {
                          setReceivedAmount('')
                        }
                      }}
                      className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#fce4f0]0 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Seleccionar método...</option>
                      <option value="cash">Efectivo</option>
                      <option value="transfer">Transferencia</option>
                      <option value="mixed">Mixto</option>
                    </select>

                    {/* Checkbox de Domicilio */}
                    <div 
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        isDelivery 
                          ? 'bg-[#fce4f0] border-[#f29fc8] dark:bg-[#f29fc8]/20' 
                          : 'bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600'
                      }`}
                      onClick={() => {
                        if (isDelivery) {
                          setDeliveryFee(0) // Resetear el valor al desactivar
                        }
                        setIsDelivery(!isDelivery)
                      }}
                    >
                      <div className={`w-5 h-5 rounded flex items-center justify-center ${
                        isDelivery 
                          ? 'bg-[#f29fc8] text-white' 
                          : 'bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500'
                      }`}>
                        {isDelivery && <CheckCircle className="h-4 w-4" />}
                      </div>
                      <Bike className={`h-5 w-5 ${isDelivery ? 'text-[#d06a98] dark:text-[#f29fc8]' : 'text-gray-400'}`} />
                      <span className={`text-sm font-medium ${isDelivery ? 'text-[#d06a98] dark:text-[#f29fc8]' : 'text-gray-600 dark:text-gray-400'}`}>
                        Domicilio
                      </span>
                    </div>

                    {/* Campo de valor del domicilio */}
                    {isDelivery && (
                      <div className="space-y-1">
                        <label className="text-xs text-gray-600 dark:text-gray-400">
                          Valor del domicilio:
                        </label>
                        <input
                          type="text"
                          value={deliveryFee ? deliveryFee.toLocaleString('es-CO') : ''}
                          onChange={(e) => {
                            const cleanValue = e.target.value.replace(/[^\d]/g, '')
                            setDeliveryFee(parseInt(cleanValue) || 0)
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full px-3 py-2 border border-[#f29fc8] rounded-lg focus:ring-2 focus:ring-[#f29fc8] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder="$ 0"
                        />
                      </div>
                    )}

                  {showMixedPayments && (
                    <div className="space-y-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      {mixedPayments.map((payment, index) => (
                        <div key={index}>
                          <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">
                            {getPaymentTypeLabel(payment.paymentType)}
                          </label>
                          <input
                            type="text"
                            value={payment.amount ? payment.amount.toLocaleString('es-CO') : ''}
                            onChange={(e) => {
                              const cleanValue = e.target.value.replace(/[^\d]/g, '')
                              updateMixedPayment(index, 'amount', parseInt(cleanValue) || 0)
                            }}
                            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
                          />
                        </div>
                      ))}
                      <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Total ingresado:</span>
                          <span className="font-semibold">{formatCurrency(getTotalMixedPayments())}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {paymentError && (
                    <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-600 dark:text-red-400">
                      {paymentError}
                    </div>
                  )}

                  {paymentMethod === 'cash' && validProducts.length > 0 && (
                    <div className="pt-3 border-t border-gray-200 dark:border-gray-600 space-y-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Dinero recibido:</label>
                      <input
                        type="text"
                        value={receivedAmount ? parseFloat(receivedAmount.replace(/[^\d]/g, '') || '0').toLocaleString('es-CO') : ''}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^\d]/g, '')
                          setReceivedAmount(value)
                        }}
                        onFocus={(e) => e.target.select()}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-base font-semibold bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      {receivedAmount && parseFloat(receivedAmount.replace(/[^\d]/g, '')) > 0 && (
                        <div className={`p-3 rounded-lg ${
                          parseFloat(receivedAmount.replace(/[^\d]/g, '')) >= total
                            ? 'bg-[#fce4f0] dark:bg-[#f29fc8]/20'
                            : 'bg-red-50 dark:bg-red-900/20'
                        }`}>
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-sm">Vuelto:</span>
                            <span className={`text-xl font-bold ${
                              parseFloat(receivedAmount.replace(/[^\d]/g, '')) >= total
                                ? 'text-[#f29fc8] dark:text-[#f29fc8]'
                                : 'text-red-600 dark:text-red-400'
                            }`}>
                              {formatCurrency(parseFloat(receivedAmount.replace(/[^\d]/g, '')) - total)}
                            </span>
                          </div>
                          {parseFloat(receivedAmount.replace(/[^\d]/g, '')) < total && (
                            <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 mt-2">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              <span>Faltan {formatCurrency(total - parseFloat(receivedAmount.replace(/[^\d]/g, '')))}</span>
                            </div>
                          )}
                          {parseFloat(receivedAmount.replace(/[^\d]/g, '')) >= total && (
                            <div className="flex items-center gap-2 text-xs text-[#f29fc8] dark:text-[#f29fc8] mt-2">
                              <CheckCircle className="h-3.5 w-3.5" />
                              <span>Pago completo</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Resumen */}
              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 xl:sticky xl:top-24">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-gray-900 dark:text-white flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-[#fce4f0] dark:bg-[#f29fc8]/30 flex items-center justify-center">
                      <DollarSign className="h-4 w-4 text-[#f29fc8] dark:text-[#f29fc8]" />
                    </div>
                    Resumen
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {orderedValidProducts.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Agrega productos</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {orderedValidProducts.map((item) => {
                          const hasPrice = item.unitPrice > 0
                          return (
                            <div key={item.id} className={`flex justify-between text-sm py-1.5 border-b border-gray-200 dark:border-gray-700 last:border-b-0 ${!hasPrice ? 'opacity-60' : ''}`}>
                              <div className="flex-1 min-w-0">
                                <div className={`font-medium truncate flex items-center gap-2 ${!hasPrice ? 'text-orange-600 dark:text-orange-400' : ''}`}>
                                  {item.productName}
                                  {!hasPrice && (
                                    <span className="flex items-center gap-1 text-xs">
                                      <AlertTriangle className="h-3 w-3" />
                                      Sin precio
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {item.quantity} x {formatCurrency(item.unitPrice || 0)}
                                </div>
                              </div>
                              <div className={`font-semibold ml-2 ${!hasPrice ? 'text-orange-600 dark:text-orange-400' : ''}`}>
                                {formatCurrency(item.total)}
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      <div className="space-y-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                        {/* Desglose de productos */}
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                          <span>Subtotal (sin IVA):</span>
                          <span>{formatCurrency(subtotalSinIva)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                          <span>IVA (19%):</span>
                          <span>{formatCurrency(ivaIncluido)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                          <span className="font-semibold">{formatCurrency(subtotal)}</span>
                        </div>
                        
                        {/* Domicilio (no lleva IVA) */}
                        {isDelivery && deliveryFee > 0 && (
                          <div className="flex justify-between text-sm text-[#d06a98] dark:text-[#f29fc8]">
                            <span className="flex items-center gap-1">
                              <Bike className="h-3.5 w-3.5" />
                              Domicilio:
                            </span>
                            <span>{formatCurrency(deliveryFee)}</span>
                          </div>
                        )}
                        
                        {/* Total */}
                        <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-200 dark:border-gray-700">
                          <span>Total:</span>
                          <span className="text-[#f29fc8] dark:text-[#f29fc8]">{formatCurrency(total)}</span>
                        </div>
                      </div>
                      
                      {/* Botón Crear Venta */}
                      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                        <Button
                          onClick={handleSave}
                          disabled={
                            isCreating ||
                            !selectedClient || 
                            selectedProducts.length === 0 || 
                            validProducts.length === 0 || 
                            !paymentMethod ||
                            validProducts.some(item => !item.unitPrice || item.unitPrice <= 0)
                          }
                          className="w-full bg-[#f29fc8] hover:bg-[#e07ab0] text-white shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                          size="lg"
                        >
                          {isCreating ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                              Creando Venta...
                            </>
                          ) : (
                            <>
                              <ShoppingCart className="h-5 w-5 mr-2" />
                              Crear Venta
                            </>
                          )}
                        </Button>
                        {validProducts.some(item => !item.unitPrice || item.unitPrice <= 0) && (
                          <div className="flex items-center justify-center gap-2 text-xs text-orange-600 dark:text-orange-400 mt-2">
                            <AlertTriangle className="h-4 w-4" />
                            <span>Asigna un precio a todos los productos para continuar</span>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </RoleProtectedRoute>
  )
}
