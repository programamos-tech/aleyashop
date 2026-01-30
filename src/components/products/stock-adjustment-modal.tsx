'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { X, Package, AlertTriangle, Warehouse, Store, TrendingUp, TrendingDown, FileText } from 'lucide-react'
import { Product } from '@/types'
import { useAuth } from '@/contexts/auth-context'

// Constante para identificar la tienda principal
const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'

interface StockAdjustmentModalProps {
  isOpen: boolean
  onClose: () => void
  onAdjust: (productId: string, location: 'warehouse' | 'store', newQuantity: number, reason: string) => Promise<void>
  product?: Product | null
}

export function StockAdjustmentModal({ isOpen, onClose, onAdjust, product }: StockAdjustmentModalProps) {
  const { user } = useAuth()
  
  // Detectar si es tienda principal o microtienda
  const isMainStore = !user?.storeId || user.storeId === MAIN_STORE_ID
  const [formData, setFormData] = useState({
    location: 'store' as 'warehouse' | 'store',
    newQuantity: 0,
    reason: ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Función para formatear números con separadores de miles
  const formatNumber = (value: number | string): string => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(numValue)) return '0'

    // Para números enteros, no mostrar decimales
    if (Number.isInteger(numValue)) {
      return numValue.toLocaleString('es-CO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      })
    }
    // Para números con decimales, mostrar hasta 2 decimales
    return numValue.toLocaleString('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })
  }

  // Función para parsear números con formato
  const parseFormattedNumber = (value: string): number => {
    // Remover separadores de miles y convertir a número
    const cleanValue = value.replace(/\./g, '').replace(/,/g, '')
    return parseFloat(cleanValue) || 0
  }

  useEffect(() => {
    if (product) {
      setFormData({
        location: 'store',
        newQuantity: 0,
        reason: ''
      })
    }
  }, [product])

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!product) return

    // Validaciones
    const newErrors: Record<string, string> = {}
    
    if (formData.newQuantity < 0) {
      newErrors.newQuantity = 'La cantidad no puede ser negativa'
    }
    
    // Campo razón ahora es opcional - solo validar longitud si se proporciona
    if (formData.reason.trim() && formData.reason.trim().length < 10) {
      newErrors.reason = 'Si proporcionas una razón, debe tener al menos 10 caracteres'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    // Llamar a onAdjust pero no cerrar el modal automáticamente
    // El modal se cerrará desde el componente padre si la operación es exitosa
    try {
      await onAdjust(product.id, formData.location, formData.newQuantity, formData.reason)
    } catch (error) {
      console.error('Error in stock adjustment:', error)
      // No cerrar el modal si hay error, dejar que el usuario vea el mensaje de error
    }
  }

  const getCurrentStock = () => {
    if (!product) return 0
    return formData.location === 'warehouse' ? product.stock.warehouse : product.stock.store
  }

  const getStockDifference = () => {
    const current = getCurrentStock()
    const newQty = formData.newQuantity
    return newQty - current
  }

  const getLocationLabel = (location: 'warehouse' | 'store') => {
    return location === 'warehouse' ? 'Bodega' : 'Local'
  }

  if (!isOpen || !product) return null

  return (
    <div className="fixed inset-0 xl:left-56 bg-white/70 dark:bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 xl:p-6">
      <div className="bg-white dark:bg-gray-900 rounded-none xl:rounded-2xl shadow-2xl w-full h-full xl:h-[calc(98vh-4rem)] xl:w-[calc(100vw-18rem)] xl:max-h-[calc(98vh-4rem)] xl:max-w-[calc(100vw-18rem)] overflow-hidden flex flex-col border-0 xl:border border-gray-200 dark:border-gray-700 relative z-[10000]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200 dark:border-gray-700 bg-[#fce4f0] dark:bg-[#f29fc8]/20 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 md:h-8 md:w-8 text-[#f29fc8]" />
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                Ajustar Stock
              </h2>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300">
                Modificar inventario del producto
              </p>
            </div>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content - Todo el contenido hace scroll, incluyendo los botones */}
        <div className="flex-1 overflow-y-auto" style={{ paddingBottom: 'calc(max(64px, env(safe-area-inset-bottom)) + 1rem)' }}>
        <form onSubmit={handleSubmit} className="p-4 md:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {/* Información del Producto */}
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg text-gray-900 dark:text-white flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[#f29fc8]" />
                  Información del Producto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Producto:</span>
                    <div className="text-gray-900 dark:text-white font-medium">{product.name}</div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Referencia:</span>
                    <div className="text-gray-900 dark:text-white font-mono text-sm">{product.reference}</div>
                  </div>
                </div>
                <div className={`grid ${isMainStore ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
                  {isMainStore && (
                    <div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">Stock Actual - Bodega:</span>
                      <div className="text-gray-900 dark:text-white font-medium">{formatNumber(product.stock.warehouse)} unidades</div>
                    </div>
                  )}
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Stock Actual - Local:</span>
                    <div className="text-gray-900 dark:text-white font-medium">{formatNumber(product.stock.store)} unidades</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Configuración del Ajuste */}
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg text-gray-900 dark:text-white flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-[#f29fc8]" />
                  Configuración del Ajuste
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Location Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Ubicación a Ajustar *
                  </label>
                  <div className={`grid ${isMainStore ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
                    <button
                      type="button"
                      onClick={() => handleInputChange('location', 'store')}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            formData.location === 'store'
                              ? 'border-[#fce4f0]0 bg-[#fce4f0] dark:bg-[#f29fc8]/20'
                              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                          }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Store className={`h-5 w-5 ${formData.location === 'store' ? 'text-[#f29fc8]' : 'text-gray-400'}`} />
                        <div className="text-left">
                          <div className={`font-medium ${formData.location === 'store' ? 'text-[#f29fc8]' : 'text-gray-700 dark:text-gray-300'}`}>
                            Local
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Stock actual: {formatNumber(product.stock.store)}
                          </div>
                        </div>
                      </div>
                    </button>
                    
                    {/* Bodega solo visible en tienda principal */}
                    {isMainStore && (
                      <button
                        type="button"
                        onClick={() => handleInputChange('location', 'warehouse')}
                            className={`p-4 rounded-lg border-2 transition-all ${
                              formData.location === 'warehouse'
                                ? 'border-[#fce4f0]0 bg-[#fce4f0] dark:bg-[#f29fc8]/20'
                                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                            }`}
                      >
                        <div className="flex items-center space-x-3">
                          <Warehouse className={`h-5 w-5 ${formData.location === 'warehouse' ? 'text-[#f29fc8]' : 'text-gray-400'}`} />
                          <div className="text-left">
                            <div className={`font-medium ${formData.location === 'warehouse' ? 'text-[#f29fc8]' : 'text-gray-700 dark:text-gray-300'}`}>
                              Bodega
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              Stock actual: {formatNumber(product.stock.warehouse)}
                            </div>
                          </div>
                        </div>
                      </button>
                    )}
                  </div>
                </div>

                {/* New Quantity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nueva Cantidad *
                  </label>
                  <input
                    type="text"
                    value={formatNumber(formData.newQuantity)}
                    onChange={(e) => {
                      const numericValue = parseFormattedNumber(e.target.value)
                      handleInputChange('newQuantity', numericValue)
                    }}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-[#fce4f0]0 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-800 ${
                      errors.newQuantity ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="Ingrese la nueva cantidad"
                  />
                  {errors.newQuantity && (
                    <p className="mt-1 text-sm text-red-400">{errors.newQuantity}</p>
                  )}
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Razón del Ajuste
                  </label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => handleInputChange('reason', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-[#fce4f0]0 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-800 ${
                      errors.reason ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="Ej: Inventario físico, producto dañado, corrección de error... (opcional)"
                    rows={3}
                  />
                  <div className="mt-1 flex justify-between items-center">
                    {errors.reason && (
                      <p className="text-sm text-red-400">{errors.reason}</p>
                    )}
                    <span className={`text-xs ml-auto ${formData.reason.length > 0 && formData.reason.length < 10 ? 'text-red-500' : 'text-gray-500'}`}>
                      {formData.reason.length > 0 ? `${formData.reason.length}/10 caracteres mínimo` : 'Campo opcional'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stock Difference Preview */}
          {formData.newQuantity !== getCurrentStock() && (
            <div className="mt-6">
              <Card className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Diferencia:</span>
                    <div className="flex items-center space-x-2">
                      {getStockDifference() > 0 ? (
                        <TrendingUp className="h-4 w-4 text-[#f29fc8]" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                      <span className={`text-lg font-bold ${
                        getStockDifference() > 0 ? 'text-[#f29fc8]' : 'text-red-600'
                      }`}>
                        {getStockDifference() > 0 ? '+' : ''}{formatNumber(getStockDifference())} unidades
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {getStockDifference() > 0 ? 'Incremento' : 'Reducción'} en {getLocationLabel(formData.location)}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Botones dentro del form para que hagan scroll con el contenido */}
          <div className="flex items-center justify-end space-x-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-[#f29fc8] hover:bg-[#d06a98] text-white"
            >
              Ajustar Stock
            </Button>
          </div>
        </form>
        </div>
      </div>
    </div>
  )
}
