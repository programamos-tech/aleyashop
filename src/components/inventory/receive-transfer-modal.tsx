'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { X, CheckCircle, Package, AlertCircle } from 'lucide-react'
import { StoreStockTransfer, TransferItem } from '@/types'
import { toast } from 'sonner'

interface ReceiveTransferModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (receivedItems: Array<{ itemId: string; quantityReceived: number; note?: string }>) => Promise<void>
  transfer: StoreStockTransfer | null
}

interface ReceivedItemForm {
  itemId: string
  productName: string
  productReference?: string
  expectedQuantity: number
  quantityReceived: number
  note: string
}

export function ReceiveTransferModal({ isOpen, onClose, onConfirm, transfer }: ReceiveTransferModalProps) {
  const [receivedItems, setReceivedItems] = useState<ReceivedItemForm[]>([])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (isOpen && transfer) {
      // Inicializar formulario con los items de la transferencia
      if (transfer.items && transfer.items.length > 0) {
        setReceivedItems(
          transfer.items.map(item => ({
            itemId: item.id,
            productName: item.productName,
            productReference: item.productReference,
            expectedQuantity: item.quantity,
            quantityReceived: item.quantity, // Por defecto recibir todo
            note: ''
          }))
        )
      } else {
        // Compatibilidad con transferencias legacy
        setReceivedItems([
          {
            itemId: transfer.id,
            productName: transfer.productName || 'Producto',
            expectedQuantity: transfer.quantity || 0,
            quantityReceived: transfer.quantity || 0,
            note: ''
          }
        ])
      }
    } else if (!isOpen) {
      // Limpiar al cerrar
      setReceivedItems([])
    }
  }, [isOpen, transfer])

  const handleItemChange = (index: number, field: keyof ReceivedItemForm, value: string | number) => {
    const newItems = [...receivedItems]
    newItems[index] = { ...newItems[index], [field]: value }
    setReceivedItems(newItems)
  }

  const handleConfirm = async () => {
    if (!transfer) return

    // Validar que las cantidades recibidas no excedan las esperadas
    for (const item of receivedItems) {
      if (item.quantityReceived < 0) {
        toast.error(`La cantidad recibida de ${item.productName} no puede ser negativa`)
        return
      }
      if (item.quantityReceived > item.expectedQuantity) {
        toast.error(`La cantidad recibida de ${item.productName} no puede ser mayor a la esperada (${item.expectedQuantity})`)
        return
      }
    }

    // Verificar que al menos un item tenga cantidad recibida mayor a 0
    const hasAnyReceived = receivedItems.some(item => item.quantityReceived > 0)
    if (!hasAnyReceived) {
      toast.error('Debes recibir al menos una unidad de algún producto')
      return
    }

    setIsSaving(true)
    try {
      const receivedItemsData = receivedItems.map(item => ({
        itemId: item.itemId,
        quantityReceived: item.quantityReceived, // Puede ser 0 para recepciones parciales
        note: item.note.trim() || undefined
      }))

      await onConfirm(receivedItemsData)
    } catch (error) {
      console.error('Error confirming reception:', error)
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen || !transfer) return null

  const totalExpected = receivedItems.reduce((sum, item) => sum + item.expectedQuantity, 0)
  const totalReceived = receivedItems.reduce((sum, item) => sum + item.quantityReceived, 0)

  return (
    <div className="fixed inset-0 xl:left-56 bg-white/70 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 pb-20 xl:pb-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg xl:rounded-xl shadow-2xl w-full max-h-[calc(100vh-6rem)] xl:h-[calc(98vh-4rem)] xl:w-[calc(100vw-18rem)] xl:max-h-[calc(98vh-4rem)] xl:max-w-[calc(100vw-18rem)] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-cyan-200 dark:border-cyan-800 bg-cyan-50 dark:bg-cyan-900/20 flex-shrink-0">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-cyan-600" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Confirmar Recepción - {transfer.transferNumber || transfer.id.substring(0, 8)}
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
            {/* Resumen */}
            <Card className="bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-gray-500 dark:text-gray-400">Total Esperado</Label>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{totalExpected} unidades</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500 dark:text-gray-400">Total a Recibir</Label>
                    <p className={`text-lg font-bold ${totalReceived === totalExpected ? 'text-green-600 dark:text-green-400' : totalReceived < totalExpected ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                      {totalReceived} unidades
                    </p>
                  </div>
                </div>
                {totalReceived < totalExpected && (
                  <div className="mt-3 pt-3 border-t border-cyan-200 dark:border-cyan-800 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-yellow-700 dark:text-yellow-300">
                      Estás recibiendo menos unidades de las esperadas. Esto se registrará como recepción parcial.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Lista de Productos */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Package className="h-4 w-4 text-cyan-600" />
                Productos a Recibir
              </h3>

              {receivedItems.map((item, index) => {
                const isPartial = item.quantityReceived < item.expectedQuantity
                const isOver = item.quantityReceived > item.expectedQuantity

                return (
                  <Card key={item.itemId} className={`border ${isPartial ? 'border-yellow-300 dark:border-yellow-700' : isOver ? 'border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-gray-700'}`}>
                    <CardContent className="p-4 space-y-3">
                      {/* Información del Producto */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{item.productName}</h4>
                        {item.productReference && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">Ref: {item.productReference}</p>
                        )}
                      </div>

                      {/* Cantidades */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-gray-500 dark:text-gray-400 mb-1">Cantidad Esperada</Label>
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">
                            {item.expectedQuantity} unidades
                          </div>
                        </div>
                        <div>
                          <Label htmlFor={`quantity-${index}`} className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                            Cantidad Recibida <span className="text-red-500">*</span>
                          </Label>
                          <input
                            id={`quantity-${index}`}
                            type="text"
                            inputMode="numeric"
                            value={item.quantityReceived.toString()}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^\d]/g, '')
                              // Permitir cadena vacía mientras se escribe
                              if (value === '') {
                                handleItemChange(index, 'quantityReceived', 0)
                              } else {
                                // Permitir "0" y otros números
                                const qty = parseInt(value, 10)
                                if (!isNaN(qty)) {
                                  handleItemChange(index, 'quantityReceived', qty)
                                }
                              }
                            }}
                            onBlur={(e) => {
                              const value = e.target.value.trim()
                              if (value === '') {
                                // Si está vacío al perder el foco, mantener como 0
                                handleItemChange(index, 'quantityReceived', 0)
                              } else {
                                // Eliminar ceros iniciales excepto si es solo "0"
                                const cleaned = value === '0' ? '0' : value.replace(/^0+/, '') || '0'
                                const qty = parseInt(cleaned, 10)
                                if (!isNaN(qty)) {
                                  handleItemChange(index, 'quantityReceived', qty)
                                }
                              }
                            }}
                            className={`h-10 w-full px-3 text-sm border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${isOver ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                          />
                          {isPartial && (
                            <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                              Faltan {item.expectedQuantity - item.quantityReceived} unidades
                            </p>
                          )}
                          {isOver && (
                            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                              Excede por {item.quantityReceived - item.expectedQuantity} unidades
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Nota */}
                      <div>
                        <Label htmlFor={`note-${index}`} className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                          Nota (Opcional)
                        </Label>
                        <Textarea
                          id={`note-${index}`}
                          value={item.note}
                          onChange={(e) => handleItemChange(index, 'note', e.target.value)}
                          placeholder="Ej: Producto en buen estado, faltante por daño, etc."
                          className="h-20 text-sm resize-none"
                          rows={3}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex-shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
            className="border-gray-300 dark:border-gray-600"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSaving || !receivedItems.some(item => item.quantityReceived > 0)}
            className="bg-cyan-600 hover:bg-cyan-700 text-white"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Confirmando...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirmar Recepción
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
