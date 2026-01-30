'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  CreditCard,
  User,
  Calendar,
  DollarSign,
  Receipt,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Plus,
  FileText,
  Star,
  ArrowLeft
} from 'lucide-react'
import { RoleProtectedRoute } from '@/components/auth/role-protected-route'
import { Credit, PaymentRecord, Sale } from '@/types'
import { CreditsService } from '@/lib/credits-service'
import { SalesService } from '@/lib/sales-service'
import { PaymentModal } from '@/components/credits/payment-modal'

export default function ClientCreditsPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.clientId as string
  
  const [credits, setCredits] = useState<Credit[]>([])
  const [expandedCredits, setExpandedCredits] = useState<Set<string>>(new Set())
  const [paymentHistory, setPaymentHistory] = useState<Record<string, PaymentRecord[]>>({})
  const [sales, setSales] = useState<Record<string, Sale>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [selectedCredit, setSelectedCredit] = useState<Credit | null>(null)
  const [clientName, setClientName] = useState('')

  useEffect(() => {
    if (clientId) {
      loadCredits()
    }
  }, [clientId])

  const loadCredits = async () => {
    try {
      setIsLoading(true)
      const creditsData = await CreditsService.getCreditsByClientId(clientId)
      setCredits(creditsData)
      
      if (creditsData.length > 0) {
        setClientName(creditsData[0].clientName)
      }

      // NO cargar historial y ventas aquí - se cargarán de forma lazy cuando se expanda cada crédito
      // Esto mejora significativamente el rendimiento inicial
    } catch (error) {
      // Error silencioso en producción
      setCredits([])
    } finally {
      setIsLoading(false)
    }
  }

  const toggleCredit = async (creditId: string) => {
    setExpandedCredits(prev => {
      const newSet = new Set(prev)
      if (newSet.has(creditId)) {
        newSet.delete(creditId)
      } else {
        newSet.add(creditId)
        // Cargar datos de forma lazy solo cuando se expande
        loadCreditDetails(creditId)
      }
      return newSet
    })
  }

  // Cargar datos de un crédito de forma lazy cuando se expande
  const loadCreditDetails = async (creditId: string) => {
    // Si ya tenemos los datos, no cargar de nuevo
    if (paymentHistory[creditId] !== undefined) {
      return
    }

    try {
      const credit = credits.find(c => c.id === creditId)
      if (!credit) return

      // Cargar historial y venta en paralelo solo para este crédito
      const [history, sale] = await Promise.all([
        CreditsService.getPaymentHistory(creditId).catch(() => []),
        credit.saleId ? SalesService.getSaleById(credit.saleId).catch(() => null) : Promise.resolve(null)
      ])

      // Actualizar solo los datos de este crédito
      setPaymentHistory(prev => ({
        ...prev,
        [creditId]: history
      }))

      if (sale) {
        setSales(prev => ({
          ...prev,
          [creditId]: sale
        }))
      }
    } catch (error) {
      // Error silencioso - establecer arrays vacíos
      setPaymentHistory(prev => ({
        ...prev,
        [creditId]: []
      }))
    }
  }

  const handlePayment = (credit: Credit) => {
    setSelectedCredit(credit)
    setIsPaymentModalOpen(true)
  }

  const handleAddPayment = async (paymentData: Partial<PaymentRecord>) => {
    if (!selectedCredit) return

    try {
      await CreditsService.createPaymentRecord({
        creditId: selectedCredit.id,
        amount: paymentData.amount!,
        paymentDate: paymentData.paymentDate!,
        paymentMethod: paymentData.paymentMethod!,
        cashAmount: paymentData.cashAmount,
        transferAmount: paymentData.transferAmount,
        description: paymentData.description,
        userId: paymentData.userId || 'current-user-id',
        userName: paymentData.userName || 'Usuario Actual'
      })

      const paymentAmount = paymentData.amount!
      const newPaidAmount = selectedCredit.paidAmount + paymentAmount
      const newPendingAmount = selectedCredit.pendingAmount - paymentAmount
      const newStatus = newPendingAmount <= 0 ? 'completed' : 'partial'

      await CreditsService.updateCredit(selectedCredit.id, {
        paidAmount: newPaidAmount,
        pendingAmount: newPendingAmount,
        status: newStatus,
        lastPaymentAmount: paymentAmount,
        lastPaymentDate: paymentData.paymentDate!,
        lastPaymentUser: paymentData.userId!
      })

      setIsPaymentModalOpen(false)
      setSelectedCredit(null)
      await loadCredits()
    } catch (error) {
      // Error silencioso en producción
      alert('Error al agregar el pago. Por favor intenta de nuevo.')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getDueDateColor = (dueDate: string) => {
    const today = new Date()
    const due = new Date(dueDate)
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return 'text-red-600 dark:text-red-400 font-bold'
    } else if (diffDays <= 7) {
      return 'text-orange-600 dark:text-orange-400 font-bold'
    } else {
      return 'text-green-600 dark:text-green-400 font-bold'
    }
  }

  const isCreditCancelled = (credit: Credit) => {
    return credit.totalAmount === 0 && credit.pendingAmount === 0
  }

  const getStatusColor = (status: string, credit?: Credit) => {
    if (credit && isCreditCancelled(credit)) {
      return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
    }
    
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'partial':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'overdue':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const getStatusIcon = (status: string, credit?: Credit) => {
    if (credit && isCreditCancelled(credit)) {
      return <XCircle className="h-4 w-4" />
    }
    
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />
      case 'partial':
        return <Clock className="h-4 w-4" />
      case 'pending':
        return <AlertCircle className="h-4 w-4" />
      case 'overdue':
        return <XCircle className="h-4 w-4" />
      case 'cancelled':
        return <XCircle className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  const getStatusLabel = (status: string, credit?: Credit) => {
    if (credit && isCreditCancelled(credit)) {
      return 'Anulado'
    }
    
    switch (status) {
      case 'pending':
        return 'Pendiente'
      case 'partial':
        return 'Parcial'
      case 'completed':
        return 'Completado'
      case 'overdue':
        return 'Vencido'
      case 'cancelled':
        return 'Anulado'
      default:
        return status
    }
  }

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash':
        return <DollarSign className="h-4 w-4" />
      case 'transfer':
        return <CreditCard className="h-4 w-4" />
      default:
        return <CreditCard className="h-4 w-4" />
    }
  }

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case 'cash':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'transfer':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getCreditDescription = (credit: Credit): string => {
    // Generar ID del crédito con las primeras 2 letras del cliente + últimos 6 caracteres del UUID
    const clientInitials = credit.clientName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2)
      .padEnd(2, 'X') // Si el nombre tiene menos de 2 palabras, rellenar con X
    
    const creditSuffix = credit.id.substring(credit.id.length - 6).toLowerCase()
    return `${clientInitials}${creditSuffix}`
  }

  const totalDebt = credits.reduce((sum, credit) => sum + credit.pendingAmount, 0)
  const totalPaid = credits.reduce((sum, credit) => sum + credit.paidAmount, 0)
  const totalAmount = credits.reduce((sum, credit) => sum + credit.totalAmount, 0)

  // Calcular score del cliente (1-5 estrellas)
  const calculateClientScore = (): { stars: number; label: string; color: string; description: string } => {
    if (credits.length === 0) {
      return { stars: 0, label: 'Sin historial', color: 'gray', description: 'No hay créditos registrados' }
    }

    // Si todos los créditos están pagados y no hay deuda, es excelente automáticamente
    if (totalDebt === 0 && credits.every(c => c.status === 'completed' || c.pendingAmount === 0)) {
      return { 
        stars: 5, 
        label: 'Excelente', 
        color: 'green', 
        description: 'Cliente perfecto, todos los créditos pagados completamente' 
      }
    }

    // Parámetros para el score:
    // 1. Porcentaje de créditos completados (50% - más peso)
    const completedCredits = credits.filter(c => c.status === 'completed' || c.pendingAmount === 0).length
    const completionRate = (completedCredits / credits.length) * 100

    // 2. Relación deuda actual vs total histórico (30% - más peso)
    const totalHistorical = credits.reduce((sum, c) => sum + c.totalAmount, 0)
    const debtRatio = totalHistorical > 0 ? ((totalHistorical - totalDebt) / totalHistorical) * 100 : 100

    // 3. Porcentaje de pagos a tiempo - créditos completados antes o en fecha de vencimiento (15%)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const onTimeCredits = credits.filter(c => {
      if (!c.dueDate || c.status !== 'completed') return false
      const dueDate = new Date(c.dueDate)
      dueDate.setHours(0, 0, 0, 0)
      // Si está completado y la fecha de vencimiento es hoy o futura, o si se pagó antes del vencimiento
      if (c.lastPaymentDate) {
        const lastPayment = new Date(c.lastPaymentDate)
        lastPayment.setHours(0, 0, 0, 0)
        return lastPayment <= dueDate
      }
      return dueDate >= today
    }).length
    const creditsWithDueDate = credits.filter(c => c.dueDate && c.status === 'completed').length
    const onTimeRate = creditsWithDueDate > 0 
      ? (onTimeCredits / creditsWithDueDate) * 100 
      : completionRate // Si no hay fechas, usar el rate de completados

    // 4. Velocidad de pago - créditos pagados en menos de 60 días (5% - menos peso)
    const quickPayments = credits.filter(c => {
      if (!c.lastPaymentDate || !c.createdAt || c.status !== 'completed') return false
      const created = new Date(c.createdAt)
      const lastPayment = new Date(c.lastPaymentDate)
      const daysDiff = (lastPayment.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
      return daysDiff <= 60 // Más generoso: 60 días
    }).length
    const quickPaymentRate = credits.filter(c => c.status === 'completed').length > 0 
      ? (quickPayments / credits.filter(c => c.status === 'completed').length) * 100 
      : 0

    // Calcular score ponderado (0-100)
    const score = Math.round(
      (completionRate * 0.5) +
      (debtRatio * 0.3) +
      (onTimeRate * 0.15) +
      (quickPaymentRate * 0.05)
    )

    // Convertir a estrellas (1-5) con umbrales más justos
    let stars: number
    let label: string
    let color: string
    let description: string

    if (score >= 95 || (completionRate === 100 && totalDebt === 0)) {
      stars = 5
      label = 'Excelente'
      color = 'green'
      description = 'Cliente muy confiable, paga siempre a tiempo'
    } else if (score >= 80 || (completionRate >= 80 && totalDebt === 0)) {
      stars = 4
      label = 'Bueno'
      color = 'blue'
      description = 'Cliente confiable, buen historial de pagos'
    } else if (score >= 60 || (completionRate >= 60 && debtRatio >= 70)) {
      stars = 3
      label = 'Regular'
      color = 'yellow'
      description = 'Cliente con historial mixto, requiere seguimiento'
    } else if (score >= 40) {
      stars = 2
      label = 'Riesgoso'
      color = 'orange'
      description = 'Cliente con retrasos frecuentes, cuidado'
    } else {
      stars = 1
      label = 'Alto Riesgo'
      color = 'red'
      description = 'Cliente con mal historial, requiere atención'
    }

    return { stars, label, color, description }
  }

  const clientScore = calculateClientScore()

  return (
    <RoleProtectedRoute module="payments" requiredAction="view">
      <div className="p-4 md:p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
        {/* Header con Resumen Integrado */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <User className="h-6 w-6 md:h-8 md:w-8 text-orange-600" />
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                        {clientName || 'Cliente'}
                      </h1>
                      <div 
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600"
                        title={clientScore.description}
                      >
                        {Array.from({ length: 5 }).map((_, index) => (
                          <Star
                            key={index}
                            className={`h-4 w-4 ${
                              index < clientScore.stars
                                ? clientScore.color === 'green' ? 'fill-green-500 text-green-500' :
                                  clientScore.color === 'blue' ? 'fill-blue-500 text-blue-500' :
                                  clientScore.color === 'yellow' ? 'fill-yellow-500 text-yellow-500' :
                                  clientScore.color === 'orange' ? 'fill-orange-500 text-orange-500' :
                                  'fill-red-500 text-red-500'
                                : 'fill-gray-300 text-gray-300 dark:fill-gray-600 dark:text-gray-600'
                            }`}
                          />
                        ))}
                        <span className={`ml-2 text-xs font-semibold ${
                          clientScore.color === 'green' ? 'text-green-600 dark:text-green-400' :
                          clientScore.color === 'blue' ? 'text-blue-600 dark:text-blue-400' :
                          clientScore.color === 'yellow' ? 'text-yellow-600 dark:text-yellow-400' :
                          clientScore.color === 'orange' ? 'text-orange-600 dark:text-orange-400' :
                          'text-red-600 dark:text-red-400'
                        }`}>
                          {clientScore.label}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {credits.length} crédito{credits.length !== 1 ? 's' : ''} registrado{credits.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                
                {/* Resumen en una sola línea */}
                <div className="flex flex-wrap items-center gap-4 md:gap-6 pt-4 border-t border-gray-200 dark:border-gray-600">
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Créditos</div>
                    <div className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(totalAmount)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Pagado</div>
                    <div className="text-lg md:text-xl font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(totalPaid)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Pendiente</div>
                    <div className={`text-lg md:text-xl font-bold ${totalDebt === 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {formatCurrency(totalDebt)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0">
                <Button
                  onClick={() => router.push('/payments')}
                  variant="outline"
                  size="sm"
                  className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Créditos
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Créditos */}
        {isLoading ? (
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardContent className="p-12">
              <div className="flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mb-4"></div>
                <p className="text-gray-500 dark:text-gray-400">Cargando créditos...</p>
              </div>
            </CardContent>
          </Card>
        ) : credits.length === 0 ? (
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardContent className="p-12">
              <div className="text-center">
                <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No hay créditos registrados para este cliente</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {credits.map((credit) => {
              const isExpanded = expandedCredits.has(credit.id)
              const history = paymentHistory[credit.id] || []

              return (
                <Card
                  key={credit.id}
                  className={`bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all cursor-pointer ${
                    isExpanded ? 'border-orange-300 dark:border-orange-600' : ''
                  }`}
                  onClick={() => toggleCredit(credit.id)}
                >
                  <CardContent className="p-4 md:p-6">
                    {/* Header del Crédito */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-4 mb-2">
                          <CreditCard className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div className="flex-1">
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">ID Crédito</div>
                                <div className="text-xl font-bold text-gray-900 dark:text-white font-mono">
                                  #{getCreditDescription(credit)}
                                </div>
                              </div>
                              <div className="border-l border-gray-300 dark:border-gray-600 pl-3">
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Factura</div>
                                <div className="text-sm font-mono font-semibold text-blue-600 dark:text-blue-400">
                                  {credit.invoiceNumber}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total</div>
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                              {formatCurrency(credit.totalAmount)}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pagado</div>
                            <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                              {formatCurrency(credit.paidAmount)}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pendiente</div>
                            <div className={`text-sm font-semibold ${
                              credit.pendingAmount === 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                            }`}>
                              {formatCurrency(credit.pendingAmount)}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Estado</div>
                            <Badge className={`${getStatusColor(credit.status, credit)} flex items-center gap-1 w-fit text-xs`}>
                              {getStatusIcon(credit.status, credit)}
                              {getStatusLabel(credit.status, credit)}
                            </Badge>
                          </div>
                        </div>

                        {credit.dueDate && (
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                              <span className="text-xs text-gray-500 dark:text-gray-400">Vencimiento:</span>
                              <span className={`text-sm font-semibold ${getDueDateColor(credit.dueDate)}`}>
                                {formatDate(credit.dueDate)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        {credit.pendingAmount > 0 && !isCreditCancelled(credit) && credit.status !== 'cancelled' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handlePayment(credit)
                            }}
                            className="bg-orange-600 hover:bg-orange-700 text-white border-orange-600 hover:border-orange-700 dark:bg-orange-600 dark:hover:bg-orange-700 dark:text-white dark:border-orange-600 dark:hover:border-orange-700"
                          >
                            <DollarSign className="h-4 w-4 mr-1" />
                            Abonar
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleCredit(credit.id)
                          }}
                          className="h-8 w-8 p-0 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-orange-600 dark:text-orange-400 font-bold" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-orange-600 dark:text-orange-400 font-bold" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Detalle Expandible */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600 space-y-4">
                        {/* Información Adicional */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Fecha de Creación</div>
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                              {formatDateTime(credit.createdAt)}
                            </div>
                          </div>
                          {credit.createdByName && (
                            <div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Registrado por</div>
                              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                {credit.createdByName}
                              </div>
                            </div>
                          )}
                          {credit.lastPaymentDate && (
                            <div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Último Abono</div>
                              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                {formatDateTime(credit.lastPaymentDate)}
                              </div>
                            </div>
                          )}
                          {credit.lastPaymentAmount && (
                            <div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Monto Último Abono</div>
                              <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                                {formatCurrency(credit.lastPaymentAmount)}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Historial de Abonos */}
                        <div className="mt-4">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                              <FileText className="h-4 w-4 text-orange-600" />
                              Historial de Abonos ({history.length})
                            </h3>
                          </div>
                          
                          {history.length === 0 ? (
                            <div className="text-center py-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                              <CreditCard className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                              <p className="text-sm text-gray-500 dark:text-gray-400">No hay abonos registrados</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {history.map((payment) => (
                                <div
                                  key={payment.id}
                                  className="border rounded-lg p-3 bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600"
                                >
                                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                                    <div className="flex items-center gap-2">
                                      <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                                      <div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Monto</div>
                                        <div className="text-base font-bold text-gray-900 dark:text-white">
                                          {formatCurrency(payment.amount)}
                                        </div>
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Método</div>
                                      <Badge className={`${getPaymentMethodColor(payment.paymentMethod)} flex items-center gap-1 w-fit text-xs`}>
                                        {getPaymentMethodIcon(payment.paymentMethod)}
                                        {payment.paymentMethod === 'cash' ? 'Efectivo' :
                                         payment.paymentMethod === 'transfer' ? 'Transferencia' : payment.paymentMethod}
                                      </Badge>
                                    </div>
                                    <div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Registrado por</div>
                                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                        {payment.userName}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Fecha</div>
                                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                        {formatDateTime(payment.paymentDate)}
                                      </div>
                                    </div>
                                  </div>
                                  {payment.description && (
                                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Descripción</div>
                                      <p className="text-sm text-gray-700 dark:text-gray-300">{payment.description}</p>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Modal de Pago */}
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false)
            setSelectedCredit(null)
          }}
          onAddPayment={handleAddPayment}
          credit={selectedCredit}
        />
      </div>
    </RoleProtectedRoute>
  )
}

