'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { X, ArrowRightLeft, Package, Store, AlertTriangle, FileText } from 'lucide-react'
import { Product, StockTransfer } from '@/types'

interface StockTransferModalProps {
  isOpen: boolean
  onClose: () => void
  onTransfer: (transfer: Omit<StockTransfer, 'id' | 'createdAt' | 'userId' | 'userName'>) => void
  product: Product | null
}

export function StockTransferModal({ isOpen, onClose, onTransfer, product }: StockTransferModalProps) {
  const [formData, setFormData] = useState({
    fromLocation: 'warehouse' as 'warehouse' | 'store',
    toLocation: 'store' as 'warehouse' | 'store',
    quantity: 0,
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

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (formData.quantity <= 0) {
      newErrors.quantity = 'La cantidad debe ser mayor a 0'
    }

    if (formData.fromLocation === formData.toLocation) {
      newErrors.toLocation = 'La ubicación destino debe ser diferente a la origen'
    }

    if (product) {
      const availableStock = formData.fromLocation === 'warehouse' 
        ? product.stock.warehouse 
        : product.stock.store

      if (formData.quantity > availableStock) {
        newErrors.quantity = `No hay suficiente stock. Disponible: ${availableStock}`
      }
    }

    // Campo motivo ahora es opcional - solo validar longitud si se proporciona
    if (formData.reason.trim() && formData.reason.trim().length < 10) {
      newErrors.reason = 'Si proporcionas un motivo, debe tener al menos 10 caracteres'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: string, value: string | number) => {
    // Para el campo quantity, si es string vacío, lo convertimos a 0
    const processedValue = field === 'quantity' && value === '' ? 0 : value
    setFormData(prev => ({ ...prev, [field]: processedValue }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleTransfer = () => {
    if (validateForm() && product) {
      onTransfer({
        productId: product.id,
        productName: product.name,
        fromLocation: formData.fromLocation,
        toLocation: formData.toLocation,
        quantity: formData.quantity,
        reason: formData.reason.trim()
      })
      handleClose()
    }
  }

  const handleClose = () => {
    setFormData({
      fromLocation: 'warehouse',
      toLocation: 'store',
      quantity: 0,
      reason: ''
    })
    setErrors({})
    onClose()
  }

  const getLocationLabel = (location: 'warehouse' | 'store') => {
    return location === 'warehouse' ? 'Bodega' : 'Local'
  }

  const getLocationIcon = (location: 'warehouse' | 'store') => {
    return location === 'warehouse' ? Package : Store
  }

  const getAvailableStock = () => {
    if (!product) return 0
    return formData.fromLocation === 'warehouse' 
      ? product.stock.warehouse 
      : product.stock.store
  }

  if (!isOpen || !product) return null

  return (
    <div className="fixed inset-0 xl:left-56 bg-white/70 dark:bg-black/60 backdrop-blur-sm z-[9999] flex flex-col xl:items-center xl:justify-center xl:pl-6 xl:pr-4 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-none xl:rounded-2xl shadow-2xl w-full h-full xl:h-[calc(98vh-4rem)] xl:w-[calc(100vw-18rem)] xl:max-h-[calc(98vh-4rem)] xl:max-w-[calc(100vw-18rem)] overflow-hidden flex flex-col border-0 xl:border border-gray-200 dark:border-gray-700 relative z-[10000]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200 dark:border-gray-700 bg-[#fce4f0] dark:bg-[#f29fc8]/20 flex-shrink-0">
          <div className="flex items-center gap-3">
            <ArrowRightLeft className="h-5 w-5 md:h-8 md:w-8 text-[#f29fc8]" />
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                Transferir Stock
              </h2>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300">
                {product.name} - {product.reference}
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
        <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-900" style={{ paddingBottom: 'calc(max(64px, env(safe-area-inset-bottom)) + 1rem)' }}>
        <form onSubmit={(e) => { e.preventDefault(); handleTransfer() }} className="p-4 md:p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Detalles de la Transferencia */}
            <div>
              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="text-lg text-gray-900 dark:text-white flex items-center">
                    <ArrowRightLeft className="h-5 w-5 mr-2 text-[#f29fc8]" />
                    Detalles de la Transferencia
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Desde y Hacia */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Desde */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Desde *
                      </label>
                      <div className="space-y-3">
                        {(['warehouse', 'store'] as const).map((location) => {
                          const Icon = getLocationIcon(location)
                          const isSelected = formData.fromLocation === location
                          return (
                            <button
                              key={location}
                              type="button"
                              onClick={() => handleInputChange('fromLocation', location)}
                              className={`w-full p-4 rounded-lg border-2 transition-all ${
                                isSelected
                                  ? 'border-[#fce4f0]0 bg-[#fce4f0] dark:bg-[#f29fc8]/20'
                                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                              }`}
                            >
                              <div className="flex items-center space-x-3">
                                <Icon className={`h-5 w-5 ${isSelected ? 'text-[#f29fc8]' : 'text-gray-400'}`} />
                                <div className="text-left flex-1 min-w-0">
                                  <div className={`text-base font-medium ${isSelected ? 'text-[#f29fc8]' : 'text-gray-700 dark:text-gray-300'}`}>
                                    {getLocationLabel(location)}
                                  </div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400">
                                    Stock: {formatNumber(location === 'warehouse' ? product.stock.warehouse : product.stock.store)}
                                  </div>
                                </div>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Hacia */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Hacia *
                      </label>
                      <div className="space-y-3">
                        {(['warehouse', 'store'] as const).map((location) => {
                          const Icon = getLocationIcon(location)
                          const isSelected = formData.toLocation === location
                          const isDisabled = location === formData.fromLocation
                          return (
                            <button
                              key={location}
                              type="button"
                              onClick={() => !isDisabled && handleInputChange('toLocation', location)}
                              disabled={isDisabled}
                              className={`w-full p-4 rounded-lg border-2 transition-all ${
                                isDisabled
                                  ? 'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50'
                                  : isSelected
                                  ? 'border-[#fce4f0]0 bg-[#fce4f0] dark:bg-[#f29fc8]/20'
                                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                              }`}
                            >
                              <div className="flex items-center space-x-3">
                                <Icon className={`h-5 w-5 ${
                                  isDisabled 
                                    ? 'text-gray-400' 
                                    : isSelected 
                                    ? 'text-[#f29fc8]' 
                                    : 'text-gray-400'
                                }`} />
                                <div className="text-left flex-1 min-w-0">
                                  <div className={`text-base font-medium ${
                                    isDisabled
                                      ? 'text-gray-400 dark:text-gray-500'
                                      : isSelected 
                                      ? 'text-[#f29fc8]' 
                                      : 'text-gray-700 dark:text-gray-300'
                                  }`}>
                                    {getLocationLabel(location)}
                                  </div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400">
                                    Stock: {formatNumber(location === 'warehouse' ? product.stock.warehouse : product.stock.store)}
                                  </div>
                                </div>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                      {errors.toLocation && (
                        <p className="mt-2 text-sm text-red-400">{errors.toLocation}</p>
                      )}
                    </div>
                  </div>

                  {/* Cantidad y Motivo */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Cantidad */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Cantidad a Transferir *
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={getAvailableStock()}
                        value={formData.quantity || ''}
                        onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 0)}
                        className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-[#fce4f0]0 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-800 ${
                          errors.quantity ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                        }`}
                        placeholder="Ingrese cantidad"
                      />
                      <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        Máx: {formatNumber(getAvailableStock())}
                      </div>
                      {errors.quantity && (
                        <p className="mt-1 text-sm text-red-400">{errors.quantity}</p>
                      )}
                    </div>

                    {/* Motivo */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Motivo de la Transferencia
                      </label>
                      <textarea
                        value={formData.reason}
                        onChange={(e) => handleInputChange('reason', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-[#fce4f0]0 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-800 resize-none ${
                          errors.reason ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                        }`}
                        placeholder="Ej: Reposición de tienda, devolución a bodega, etc. (opcional)"
                        rows={3}
                      />
                      <div className="mt-1 flex justify-between items-center">
                        {errors.reason && (
                          <p className="text-sm text-red-400">{errors.reason}</p>
                        )}
                        <span className={`text-xs ml-auto ${
                          formData.reason.length > 0 && formData.reason.length < 10 
                            ? 'text-red-500' 
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {formData.reason.length > 0 ? `${formData.reason.length}/10` : 'Opcional'}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

            {/* Resumen de la Transferencia */}
            <Card className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 mt-6">
              <CardHeader>
                <CardTitle className="text-lg text-gray-900 dark:text-white flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2 text-[#f29fc8]" />
                  Resumen de la Transferencia
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-white dark:bg-gray-700/50 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">Producto:</div>
                    <div className="text-base text-gray-900 dark:text-white font-medium truncate">{product.name}</div>
                  </div>
                  <div className="p-4 bg-white dark:bg-gray-700/50 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">Transferir:</div>
                    <div className="text-base text-gray-900 dark:text-white font-medium">
                      {formData.quantity > 0 ? `${formatNumber(formData.quantity)} unidades` : '0 unidades'}
                    </div>
                  </div>
                  <div className="p-4 bg-white dark:bg-gray-700/50 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">Stock después:</div>
                    <div className="text-sm text-gray-900 dark:text-white font-medium mb-1">
                      Bodega: {formatNumber(formData.fromLocation === 'warehouse' 
                        ? product.stock.warehouse - formData.quantity 
                        : product.stock.warehouse + (formData.toLocation === 'warehouse' ? formData.quantity : 0)
                      )}
                    </div>
                    <div className="text-sm text-gray-900 dark:text-white font-medium">
                      Local: {formatNumber(formData.fromLocation === 'store' 
                        ? product.stock.store - formData.quantity 
                        : product.stock.store + (formData.toLocation === 'store' ? formData.quantity : 0)
                      )}
                    </div>
                  </div>
                  <div className="p-4 bg-white dark:bg-gray-700/50 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">De → A:</div>
                    <div className="text-base text-gray-900 dark:text-white font-medium">
                      {getLocationLabel(formData.fromLocation)} → {getLocationLabel(formData.toLocation)}
                    </div>
                  </div>
                </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Botones dentro del form para que hagan scroll con el contenido */}
          <div className="flex items-center justify-end space-x-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              onClick={handleClose}
              variant="outline"
              className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-[#f29fc8] hover:bg-[#d06a98] text-white"
            >
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              Transferir Stock
            </Button>
          </div>
        </form>
        </div>
      </div>
    </div>
  )
}
