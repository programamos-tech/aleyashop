'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  X, 
  Shield, 
  Package, 
  Search, 
  AlertTriangle,
  CheckCircle,
  User,
  ClipboardList
} from 'lucide-react'
import { Warranty, Product, Client } from '@/types'
import { ProductsService } from '@/lib/products-service'
import { ClientsService } from '@/lib/clients-service'
import { useAuth } from '@/contexts/auth-context'

interface WarrantyModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (warrantyData: Omit<Warranty, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  warranty?: Warranty | null
}

const DEFAULT_CLIENT_NAME = 'Cliente sin factura'

const getProductStock = (product?: Product | null) => {
  if (!product || !product.stock) return 0
  const storeStock = Number((product.stock as any).store ?? (product.stock as any).local ?? 0)
  const warehouseStock = Number((product.stock as any).warehouse ?? 0)
  const totalStock = Number((product.stock as any).total ?? 0)
  const computed = storeStock + warehouseStock
  if (!Number.isNaN(totalStock) && totalStock > 0) {
    return totalStock
  }
  return computed
}

export function WarrantyModal({ isOpen, onClose, onSave, warranty }: WarrantyModalProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const [defectiveSearch, setDefectiveSearch] = useState('')
  const [replacementSearch, setReplacementSearch] = useState('')
  const [defectiveResults, setDefectiveResults] = useState<Product[]>([])
  const [replacementResults, setReplacementResults] = useState<Product[]>([])
  const [defectiveLoading, setDefectiveLoading] = useState(false)
  const [replacementLoading, setReplacementLoading] = useState(false)

  const [selectedDefectiveProduct, setSelectedDefectiveProduct] = useState<Product | null>(null)
  const [selectedReplacementProduct, setSelectedReplacementProduct] = useState<Product | null>(null)

  const [clients, setClients] = useState<Client[]>([])
  const [clientsLoading, setClientsLoading] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState('')
  
  const [formData, setFormData] = useState({
    notes: '',
    quantityReceived: 1,
    quantityDelivered: 1
  })

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

  const selectedClient = selectedClientId ? clients.find(client => client.id === selectedClientId) || null : null

  useEffect(() => {
    if (!isOpen) return

    const loadClients = async () => {
      setClientsLoading(true)
      try {
        const data = await ClientsService.getAllClients()
        setClients(data)
      } finally {
        setClientsLoading(false)
      }
    }

    loadClients()

    if (warranty) {
      setSelectedDefectiveProduct(warranty.productReceived || null)
      setSelectedReplacementProduct(warranty.productDelivered || null)
      setSelectedClientId(warranty.clientId || '')
      setFormData({
        notes: warranty.notes || '',
        quantityReceived: 1,
        quantityDelivered: 1
      })
    } else {
      resetForm()
    }
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = 'unset'
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, warranty])

  useEffect(() => {
    if (!isOpen) return
    const controller = new AbortController()
    const handler = setTimeout(async () => {
      if (defectiveSearch.trim().length < 2) {
        setDefectiveResults([])
        return
      }
      setDefectiveLoading(true)
      try {
        const results = await ProductsService.searchProducts(defectiveSearch.trim(), undefined, user?.storeId)
        setDefectiveResults(results.slice(0, 10))
      } catch (error) {
        setDefectiveResults([])
      } finally {
        setDefectiveLoading(false)
      }
    }, 400)

    return () => {
      controller.abort()
      clearTimeout(handler)
    }
  }, [defectiveSearch, isOpen])

  useEffect(() => {
    if (!isOpen) return
    const controller = new AbortController()
    const handler = setTimeout(async () => {
      if (replacementSearch.trim().length < 2) {
        setReplacementResults([])
        return
      }
      setReplacementLoading(true)
      try {
        const results = await ProductsService.searchProducts(replacementSearch.trim(), undefined, user?.storeId)
        setReplacementResults(results.slice(0, 10))
    } catch (error) {
        setReplacementResults([])
      } finally {
        setReplacementLoading(false)
      }
    }, 400)

    return () => {
      controller.abort()
      clearTimeout(handler)
    }
  }, [replacementSearch, isOpen])

  const resetForm = () => {
    setErrors({})
    setDefectiveSearch('')
    setReplacementSearch('')
    setDefectiveResults([])
    setReplacementResults([])
    setSelectedDefectiveProduct(null)
    setSelectedReplacementProduct(null)
    setSelectedClientId('')
    setFormData({
      notes: '',
      quantityReceived: 1,
      quantityDelivered: 1
    })
  }
 
  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSelectDefective = (product: Product) => {
    setSelectedDefectiveProduct(product)
    setDefectiveSearch('')
    setDefectiveResults([])
    // Reiniciar selección de reemplazo para evitar inconsistencias
    setSelectedReplacementProduct(null)
    setReplacementSearch('')
    setReplacementResults([])
    if (errors.product) {
      setErrors(prev => {
        const next = { ...prev }
        delete next.product
        return next
      })
    }
  }

  const handleSelectReplacement = async (product: Product) => {
    setReplacementSearch('')
      setReplacementResults([])

    try {
      const latest = await ProductsService.getProductById(product.id)
      const productWithLatestStock = latest || product
      setSelectedReplacementProduct(productWithLatestStock)

      if (errors.replacementProduct) {
        setErrors(prev => {
          const next = { ...prev }
          delete next.replacementProduct
          return next
        })
      }
    } catch (error) {
      setSelectedReplacementProduct(product)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!selectedDefectiveProduct) {
      newErrors.product = 'Selecciona el producto defectuoso'
    }

    if (!selectedReplacementProduct) {
      newErrors.replacementProduct = 'Selecciona el producto de reemplazo'
    } else if (getProductStock(selectedReplacementProduct) <= 0) {
      newErrors.replacementProduct = 'El producto de reemplazo no tiene stock disponible'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validateForm() || !selectedDefectiveProduct) return

    setLoading(true)
    try {
      let replacementProductSnapshot = selectedReplacementProduct

      if (selectedReplacementProduct) {
        const latest = await ProductsService.getProductById(selectedReplacementProduct.id)
        replacementProductSnapshot = latest || selectedReplacementProduct
        if (latest) {
          setSelectedReplacementProduct(latest)
        }

        if (getProductStock(replacementProductSnapshot) <= 0) {
          setErrors(prev => ({
            ...prev,
            replacementProduct: 'El producto seleccionado no tiene stock disponible para entregar.'
          }))
          setLoading(false)
          return
        }
      }

      const resolvedClientName = selectedClient?.name || warranty?.clientName || DEFAULT_CLIENT_NAME

      const warrantyData: Omit<Warranty, 'id' | 'createdAt' | 'updatedAt'> & { replacementQuantity?: number, productReceivedReference?: string, productReceivedPrice?: number, productDeliveredReference?: string, productDeliveredPrice?: number } = {
        originalSaleId: null,
        clientId: selectedClientId || null,
        clientName: resolvedClientName,
        productReceivedId: selectedDefectiveProduct.id,
        productReceivedName: selectedDefectiveProduct.name,
        productReceivedSerial: undefined,
        productDeliveredId: replacementProductSnapshot?.id,
        productDeliveredName: replacementProductSnapshot?.name,
        reason: 'Garantía por producto',
        notes: formData.notes,
        status: 'completed',
        replacementQuantity: formData.quantityDelivered,
        quantityReceived: formData.quantityReceived,
        // Pasar referencias y precios directamente desde los productos seleccionados
        productReceivedReference: selectedDefectiveProduct.reference || undefined,
        productReceivedPrice: selectedDefectiveProduct.price || undefined,
        productDeliveredReference: replacementProductSnapshot?.reference || undefined,
        productDeliveredPrice: replacementProductSnapshot?.price || undefined
      }

      await onSave(warrantyData)
      handleClose()
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        replacementProduct: 'No se pudo verificar el stock del producto de reemplazo. Intenta nuevamente.'
      }))
      setLoading(false)
      return
    }

    setLoading(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 xl:left-56 bg-white/70 dark:bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-none xl:rounded-2xl shadow-2xl w-full h-full xl:h-[calc(98vh-4rem)] xl:w-[calc(100vw-18rem)] xl:max-h-[calc(98vh-4rem)] xl:max-w-[calc(100vw-18rem)] overflow-hidden flex flex-col border-0 xl:border border-gray-200 dark:border-gray-700 relative z-[10000]">
        <div className="flex items-center justify-between p-3 md:p-4 border-b border-[#f29fc8]/50 dark:border-[#d06a98] bg-[#fce4f0] dark:bg-[#f29fc8]/20 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 md:h-6 md:w-6 text-[#f29fc8] dark:text-[#f29fc8]" />
            <div>
              <h2 className="text-lg md:text-xl font-semibold text-[#d06a98] dark:text-[#f29fc8]/50">
                {warranty ? 'Editar Garantía' : 'Nueva Garantía'}
              </h2>
              <p className="text-xs md:text-sm text-[#e07ab0] dark:text-[#f29fc8]">
                Registra una garantía entregando un producto en reemplazo.
              </p>
            </div>
          </div>
          <Button
            onClick={handleClose}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-[#fce4f0] dark:hover:bg-[#d06a98]/30"
          >
            <X className="h-5 w-5 text-[#f29fc8] dark:text-[#f29fc8] hover:text-[#d06a98] dark:hover:text-[#f29fc8]/50" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 md:p-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 overflow-y-auto flex-1">
            <div className="space-y-3">
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader className="p-3 pb-2">
                <CardTitle className="text-base text-gray-900 dark:text-white flex items-center gap-2">
                    <Package className="h-5 w-5 text-red-600" />
                    Producto defectuoso
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-3 pt-2">
                {!selectedDefectiveProduct ? (
                  <>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Buscar producto defectuoso..."
                        value={defectiveSearch}
                        onChange={(e) => setDefectiveSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Busca el producto que el cliente está devolviendo. Se registrará como defectuoso.
                    </p>
                    {defectiveLoading && (
                      <div className="text-sm text-gray-500 dark:text-gray-300 flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                        Buscando productos...
                      </div>
                    )}
                    {!defectiveLoading && defectiveResults.length > 0 && (
                      <div className="max-h-48 overflow-y-auto space-y-2">
                        {defectiveResults.map((product) => (
                          <button
                            key={product.id}
                            onClick={() => handleSelectDefective(product)}
                            className="w-full text-left p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          >
                              <div className="font-medium text-gray-900 dark:text-white">
                              {product.name}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-300">
                              Ref: {product.reference || 'N/A'}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {errors.product && (
                      <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4" />
                        {errors.product}
                      </p>
                    )}
                  </>
                ) : (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-red-700 dark:text-red-200">
                          {selectedDefectiveProduct.name}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          Ref: {selectedDefectiveProduct.reference || 'N/A'}
                        </div>
                      </div>
                      <Button
                        onClick={() => {
                          setSelectedDefectiveProduct(null)
                          setDefectiveResults([])
                        }}
                        variant="ghost"
                        size="sm"
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-red-600 dark:text-red-200 mt-2 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Producto defectuoso seleccionado
                    </p>
                    <div className="mt-3">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Cantidad recibida
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.quantityReceived}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 1
                          setFormData(prev => ({ ...prev, quantityReceived: Math.max(1, value) }))
                        }}
                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      {errors.quantityReceived && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {errors.quantityReceived}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader className="p-3 pb-2">
                <CardTitle className="text-base text-gray-900 dark:text-white flex items-center gap-2">
                    <Package className="h-5 w-5 text-[#f29fc8] dark:text-[#f29fc8]" />
                    Producto de reemplazo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-3 pt-2">
                {!selectedDefectiveProduct ? (
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-500 dark:text-gray-300">
                    Primero selecciona el producto defectuoso para elegir un reemplazo.
                  </div>
                ) : !selectedReplacementProduct ? (
                  <>
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Buscar producto de reemplazo..."
                        value={replacementSearch}
                        onChange={(e) => setReplacementSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#fce4f0]0 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Selecciona el producto que entregarás al cliente.
                    </p>
                    {replacementLoading && (
                      <div className="text-sm text-gray-500 dark:text-gray-300 flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#fce4f0]0"></div>
                        Buscando productos...
                        </div>
                        )}
                    {!replacementLoading && replacementResults.length > 0 && (
                          <div className="max-h-48 overflow-y-auto space-y-2">
                        {replacementResults.map((product) => {
                          const stock = getProductStock(product)
                          const hasStock = stock > 0
                          return (
                            <button
                                key={product.id}
                              onClick={() => void handleSelectReplacement(product)}
                              className={`w-full text-left p-3 border rounded-lg transition-colors ${
                                hasStock
                                  ? 'border-gray-200 dark:border-gray-600 hover:bg-[#fce4f0] dark:hover:bg-[#f29fc8]/20'
                                  : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 cursor-not-allowed opacity-70'
                              }`}
                              disabled={!hasStock}
                              >
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {product.name}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-300">
                                Ref: {product.reference || 'N/A'}
                                </div>
                              <div className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                                Stock disponible: {stock} unidades
                                </div>
                              {!hasStock && (
                                <div className="text-xs text-red-600 dark:text-red-300 mt-1 flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  Sin stock para entregar
                                </div>
                              )}
                            </button>
                          )
                        })}
                          </div>
                        )}
                    {errors.replacementProduct && (
                      <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                                <AlertTriangle className="h-4 w-4" />
                        {errors.replacementProduct}
                              </p>
                            )}
                  </>
                ) : (
                  <div className="p-3 bg-[#fce4f0] dark:bg-[#f29fc8]/20 border border-[#f29fc8]/50 dark:border-[#d06a98] rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-[#e07ab0] dark:text-[#f29fc8]/50">
                          {selectedReplacementProduct.name}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          Ref: {selectedReplacementProduct.reference || 'N/A'}
                        </div>
                        <div className="text-xs text-[#f29fc8] dark:text-[#f29fc8] mt-1 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Stock disponible: {getProductStock(selectedReplacementProduct)} unidades
                        </div>
                      </div>
                        <Button
                          onClick={() => setSelectedReplacementProduct(null)}
                          variant="ghost"
                          size="sm"
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="mt-3">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Cantidad a entregar
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={getProductStock(selectedReplacementProduct)}
                        value={formData.quantityDelivered}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 1
                          const maxStock = getProductStock(selectedReplacementProduct)
                          setFormData(prev => ({ ...prev, quantityDelivered: Math.max(1, Math.min(maxStock, value)) }))
                        }}
                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#fce4f0]0 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      {errors.quantityDelivered && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {errors.quantityDelivered}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Se descontarán {formData.quantityDelivered} unidad{formData.quantityDelivered !== 1 ? 'es' : ''} del stock.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            </div>

            <div className="space-y-3">
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader className="p-3 pb-2">
                <CardTitle className="text-base text-gray-900 dark:text-white flex items-center gap-2">
                    <User className="h-5 w-5 text-[#f29fc8] dark:text-[#f29fc8]" />
                    Información del Cliente
                </CardTitle>
              </CardHeader>
                <CardContent className="space-y-3 p-3 pt-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Seleccionar cliente (opcional)
                  </label>
                  {clientsLoading ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-300">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#fce4f0]0"></div>
                      Cargando clientes...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedClientId}
                        onChange={(e) => handleSelectClient(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#fce4f0]0 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="">Selecciona un cliente...</option>
                        {filteredClients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.name}{client.email ? ` - ${client.email}` : ''}
                          </option>
                        ))}
                      </select>
                      {selectedClientId && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSelectClient('')}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                </div>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Puedes seleccionar un cliente existente o escribir un nombre personalizado.
                  </p>
                </div>

                {selectedClient && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-300">
                    <div className="font-medium text-gray-900 dark:text-white">{selectedClient.name}</div>
                    {selectedClient.email && <div>{selectedClient.email}</div>}
                    {selectedClient.phone && <div>{selectedClient.phone}</div>}
                    {selectedClient.document && <div>Doc: {selectedClient.document}</div>}
                  </div>
                )}
                 </CardContent>
               </Card>

              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardHeader className="p-3 pb-2">
                  <CardTitle className="text-base text-gray-900 dark:text-white flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-[#f29fc8] dark:text-[#f29fc8]" />
                    Notas adicionales
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-2">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Notas (opcional)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Notas adicionales sobre la garantía..."
                    rows={3}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#fce4f0]0 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                  />
              </CardContent>
            </Card>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-3 md:p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 sticky bottom-0 flex-shrink-0">
          <Button
            onClick={handleClose}
            variant="outline"
            className="text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="bg-[#f29fc8] hover:bg-[#e07ab0] text-white disabled:bg-gray-400"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Guardando...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                {warranty ? 'Actualizar Garantía' : 'Crear Garantía'}
              </div>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

