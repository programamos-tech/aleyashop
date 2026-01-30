'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  X, 
  DollarSign, 
  CreditCard, 
  Receipt, 
  User,
  Calendar,
  AlertCircle,
  Coins
} from 'lucide-react'
import { Credit, PaymentRecord } from '@/types'
import { useAuth } from '@/contexts/auth-context'

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onAddPayment: (paymentData: Partial<PaymentRecord>) => void
  credit: Credit | null
}

export function PaymentModal({ isOpen, onClose, onAddPayment, credit }: PaymentModalProps) {
  const { user } = useAuth()
  
  const [formData, setFormData] = useState({
    amount: '',
    paymentMethod: 'cash' as 'cash' | 'transfer' | 'mixed',
    cashAmount: '',
    transferAmount: '',
    receivedAmount: '', // Monto recibido en efectivo
    description: ''
  })

  const [errors, setErrors] = useState<{[key: string]: string}>({})

  // Función para formatear números con puntos
  const formatNumber = (value: string): string => {
    const numericValue = value.replace(/[^\d]/g, '')
    if (!numericValue) return ''
    return parseInt(numericValue).toLocaleString('es-CO')
  }

  // Función para parsear números formateados
  const parseFormattedNumber = (value: string): number => {
    return parseFloat(value.replace(/[^\d]/g, '')) || 0
  }

  // Función para manejar cambios en inputs numéricos
  const handleNumberChange = (field: string, value: string) => {
    const formatted = formatNumber(value)
    setFormData(prev => ({ ...prev, [field]: formatted }))
    
    // Validación en tiempo real para el monto del abono
    if (field === 'amount' && credit) {
      const amountValue = parseFormattedNumber(formatted)
      if (amountValue > credit.pendingAmount) {
        setErrors(prev => ({ 
          ...prev, 
          amount: `El monto no puede exceder el saldo pendiente de $${credit.pendingAmount.toLocaleString('es-CO')}` 
        }))
      } else if (errors.amount) {
        setErrors(prev => ({ ...prev, amount: '' }))
      }
    }
    
    // Limpiar errores cuando el usuario empiece a escribir (para otros campos)
    if (field !== 'amount' && errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!credit) return

    const errors: {[key: string]: string} = {}

    // Validaciones
    const amountValue = parseFormattedNumber(formData.amount)
    if (!formData.amount || amountValue <= 0) {
      errors.amount = 'El monto debe ser mayor a 0'
    }

    if (amountValue > credit.pendingAmount) {
      errors.amount = 'El monto no puede ser mayor al saldo pendiente'
    }

    if (formData.paymentMethod === 'cash') {
      // El monto recibido es opcional, pero si se ingresa debe ser válido
      if (formData.receivedAmount) {
        const receivedValue = parseFormattedNumber(formData.receivedAmount)
        if (receivedValue <= 0) {
          errors.receivedAmount = 'El monto recibido debe ser mayor a 0'
        } else if (receivedValue < amountValue) {
          errors.receivedAmount = 'El monto recibido no puede ser menor al monto del abono'
        }
      }
    }

    if (formData.paymentMethod === 'mixed') {
      const cashValue = parseFormattedNumber(formData.cashAmount)
      const transferValue = parseFormattedNumber(formData.transferAmount)
      const receivedValue = parseFormattedNumber(formData.receivedAmount)
      
      if (!formData.cashAmount || cashValue <= 0) {
        errors.cashAmount = 'El monto en efectivo debe ser mayor a 0'
      }
      if (!formData.transferAmount || transferValue <= 0) {
        errors.transferAmount = 'El monto por transferencia debe ser mayor a 0'
      }
      // El monto recibido es opcional, pero si se ingresa debe ser válido
      if (formData.receivedAmount) {
        if (receivedValue <= 0) {
          errors.receivedAmount = 'El monto recibido en efectivo debe ser mayor a 0'
        } else if (receivedValue < cashValue) {
          errors.receivedAmount = 'El monto recibido no puede ser menor al monto en efectivo'
        }
      }
      
      const totalMixed = cashValue + transferValue
      
      if (Math.abs(totalMixed - amountValue) > 0.01) {
        const difference = amountValue - totalMixed
        if (difference > 0) {
          errors.mixed = `Faltan $${difference.toLocaleString('es-CO')} para completar el monto total`
        } else {
          errors.mixed = `Sobran $${Math.abs(difference).toLocaleString('es-CO')} del monto total`
        }
      }
    }

    setErrors(errors)

    if (Object.keys(errors).length > 0) {
      return
    }

    const paymentData: Partial<PaymentRecord> = {
      creditId: credit.id,
      amount: parseFormattedNumber(formData.amount),
      paymentDate: new Date().toISOString(),
      paymentMethod: formData.paymentMethod,
      description: formData.description,
      userId: user?.id || 'current-user-id',
      userName: user?.name || 'Usuario Actual',
      createdAt: new Date().toISOString()
    }

    if (formData.paymentMethod === 'mixed') {
      paymentData.cashAmount = parseFormattedNumber(formData.cashAmount)
      paymentData.transferAmount = parseFormattedNumber(formData.transferAmount)
    }

    onAddPayment(paymentData)
    onClose()
    resetForm()
  }

  const resetForm = () => {
    setFormData({
      amount: '',
      paymentMethod: 'cash',
      cashAmount: '',
      transferAmount: '',
      receivedAmount: '',
      description: ''
    })
    setErrors({})
  }

  const handleClose = () => {
    onClose()
    resetForm()
  }

  const handlePaymentMethodChange = (value: 'cash' | 'transfer' | 'mixed') => {
    setFormData(prev => ({ 
      ...prev, 
      paymentMethod: value,
      cashAmount: '',
      transferAmount: '',
      receivedAmount: ''
    }))
    setErrors({})
  }

  // Calcular el vuelto
  const calculateChange = (): number => {
    if (formData.paymentMethod === 'transfer') return 0
    
    if (!formData.amount || !formData.receivedAmount) return 0
    
    const amountValue = parseFormattedNumber(formData.amount)
    const receivedValue = parseFormattedNumber(formData.receivedAmount)
    
    if (formData.paymentMethod === 'cash') {
      // El vuelto es la diferencia entre lo recibido y lo que se está abonando
      return receivedValue > amountValue ? receivedValue - amountValue : 0
    }
    
    if (formData.paymentMethod === 'mixed') {
      const cashValue = parseFormattedNumber(formData.cashAmount)
      // El vuelto es la diferencia entre lo recibido en efectivo y el monto en efectivo del abono
      return receivedValue > cashValue ? receivedValue - cashValue : 0
    }
    
    return 0
  }

  if (!isOpen || !credit) return null

  return (
    <div className="fixed inset-0 xl:left-56 bg-white/70 dark:bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-0 md:p-4 pb-20 md:pb-4">
      <div className="bg-white dark:bg-gray-900 rounded-none md:rounded-lg xl:rounded-xl shadow-2xl w-full h-full md:h-auto md:max-h-[90vh] xl:h-[calc(98vh-4rem)] xl:w-[calc(100vw-18rem)] xl:max-h-[calc(98vh-4rem)] xl:max-w-[calc(100vw-18rem)] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-700 relative z-[10000]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200 dark:border-gray-600 flex-shrink-0 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30">
          <div className="flex items-center space-x-3">
            <DollarSign className="h-6 w-6 text-orange-600" />
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                Agregar Abono
              </h2>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                Registra un nuevo abono para el crédito seleccionado.
              </p>
            </div>
          </div>
          <Button
            onClick={handleClose}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 bg-white dark:bg-gray-800 min-h-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {/* Información del Crédito */}
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
              <CardHeader className="pb-2 px-3 md:px-6 pt-3 md:pt-6">
                <CardTitle className="text-base md:text-lg text-gray-900 dark:text-white flex items-center">
                  <Receipt className="h-4 w-4 md:h-5 md:w-5 mr-2 text-orange-600" />
                  Información del Crédito
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 md:p-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <User className="h-5 w-5 text-orange-600 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">Cliente</div>
                      <div className="text-base font-semibold text-gray-900 dark:text-white">
                        {credit.clientName}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <Receipt className="h-5 w-5 text-orange-600 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">Factura</div>
                      <div className="text-base font-semibold text-gray-900 dark:text-white">
                        {credit.invoiceNumber}
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
                    <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">Total</div>
                    <div className="text-xl font-semibold text-gray-900 dark:text-white">
                      ${credit.totalAmount.toLocaleString('es-CO')}
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
                    <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">Saldo Pendiente</div>
                    <div className="text-xl font-semibold text-red-600 dark:text-red-400">
                      ${credit.pendingAmount.toLocaleString('es-CO')}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Detalles del Abono */}
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
              <CardHeader className="pb-2 px-3 md:px-6 pt-3 md:pt-6">
                <CardTitle className="text-base md:text-lg text-gray-900 dark:text-white flex items-center">
                  <CreditCard className="h-4 w-4 md:h-5 md:w-5 mr-2 text-orange-600" />
                  Detalles del Abono
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 md:p-6 space-y-4">
                <div>
                  <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Monto del Abono *
                  </label>
                  <input
                    type="text"
                    value={formData.amount}
                    onChange={(e) => handleNumberChange('amount', e.target.value)}
                    placeholder="0"
                    className={`w-full px-4 py-3 text-base border-2 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                      errors.amount || (formData.amount && parseFormattedNumber(formData.amount) > credit.pendingAmount)
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                  {errors.amount && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-2 font-medium flex items-center">
                      <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                      {errors.amount}
                    </p>
                  )}
                  {!errors.amount && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                      Máximo: ${credit.pendingAmount.toLocaleString('es-CO')}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Método de Pago *
                  </label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => handlePaymentMethodChange(e.target.value as 'cash' | 'transfer' | 'mixed')}
                    className="w-full px-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="cash">Efectivo</option>
                    <option value="transfer">Transferencia</option>
                    <option value="mixed">Mixto (Efectivo + Transferencia)</option>
                  </select>
                </div>

                {(formData.paymentMethod === 'cash' || formData.paymentMethod === 'mixed') && (
                  <div>
                    <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {formData.paymentMethod === 'cash' ? 'Monto Recibido' : 'Monto Recibido en Efectivo'} (Opcional)
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      Ingresa el monto que recibiste del cliente para calcular el vuelto
                    </p>
                    <input
                      type="text"
                      value={formData.receivedAmount}
                      onChange={(e) => handleNumberChange('receivedAmount', e.target.value)}
                      placeholder="0"
                      className={`w-full px-4 py-3 text-base border-2 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                        errors.receivedAmount ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    />
                    {errors.receivedAmount && (
                      <p className="text-sm text-red-600 dark:text-red-400 mt-2 font-medium">{errors.receivedAmount}</p>
                    )}
                    {formData.receivedAmount && formData.amount && (
                      <div className={`mt-3 p-3 rounded-lg border ${
                        calculateChange() > 0 
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                          : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Coins className={`h-4 w-4 mr-2 ${
                              calculateChange() > 0 
                                ? 'text-green-600 dark:text-green-400' 
                                : 'text-gray-500 dark:text-gray-400'
                            }`} />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Vuelto:</span>
                          </div>
                          <span className={`text-lg font-bold ${
                            calculateChange() > 0 
                              ? 'text-green-600 dark:text-green-400' 
                              : 'text-gray-500 dark:text-gray-400'
                          }`}>
                            ${calculateChange().toLocaleString('es-CO')}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {formData.paymentMethod === 'mixed' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Monto en Efectivo *
                      </label>
                      <input
                        type="text"
                        value={formData.cashAmount}
                        onChange={(e) => handleNumberChange('cashAmount', e.target.value)}
                        placeholder="0"
                        className={`w-full px-4 py-3 text-base border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                          errors.cashAmount ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                        }`}
                      />
                      {errors.cashAmount && (
                        <p className="text-sm text-red-500 mt-1">{errors.cashAmount}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Monto por Transferencia *
                      </label>
                      <input
                        type="text"
                        value={formData.transferAmount}
                        onChange={(e) => handleNumberChange('transferAmount', e.target.value)}
                        placeholder="0"
                        className={`w-full px-4 py-3 text-base border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                          errors.transferAmount ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                        }`}
                      />
                      {errors.transferAmount && (
                        <p className="text-sm text-red-500 mt-1">{errors.transferAmount}</p>
                      )}
                    </div>
                    {errors.mixed && (
                      <p className="text-sm text-red-500 col-span-2">{errors.mixed}</p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Observaciones (Opcional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Agregar observaciones sobre el abono..."
                    rows={3}
                    className="w-full px-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 md:p-6 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 flex-shrink-0">
          <div className="flex-1"></div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            <Button
              onClick={handleClose}
              variant="outline"
              className="text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 px-4 sm:px-6 py-2.5 w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              className="bg-orange-600 hover:bg-orange-700 text-white font-medium px-4 sm:px-6 py-2.5 w-full sm:w-auto"
            >
              Registrar Abono
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}