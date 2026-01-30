'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  CreditCard,
  Plus,
  Search,
  Eye,
  Calendar,
  User,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  RefreshCcw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { Credit } from '@/types'
import { StoreBadge } from '@/components/ui/store-badge'

// Funciones para manejar estados

const getStatusIcon = (status: string, credit?: any) => {
  // Si el crédito está cancelado (montos en 0), usar ícono X
  if (isCreditCancelled(credit)) {
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

// Función para verificar si un crédito está cancelado
const isCreditCancelled = (credit: any) => {
  // Si totalAmount y pendingAmount son 0, el crédito está cancelado
  return credit?.totalAmount === 0 && credit?.pendingAmount === 0
}

const getStatusText = (status: string, credit?: any) => {
  // Si el crédito está cancelado (montos en 0), mostrar "Anulado"
  if (isCreditCancelled(credit)) {

    return 'Anulado'
  }

  switch (status) {
    case 'completed':
      return 'Completado'
    case 'partial':
      return 'Parcial'
    case 'pending':
      return 'Pendiente'
    case 'overdue':
      return 'Vencido'
    case 'cancelled':
      return 'Anulado'
    default:
      return status
  }
}

interface CreditTableProps {
  credits: Credit[]
  onView: (credit: Credit) => void
  onCreate: () => void
  isLoading?: boolean
  onRefresh?: () => void
  todayPaymentsTotal?: number
}

export function CreditTable({ credits, onView, onCreate, isLoading = false, onRefresh, todayPaymentsTotal }: CreditTableProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount)
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  const getDueDateColor = (dueDate: string) => {
    const today = new Date()
    const due = new Date(dueDate)
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return 'text-red-600 dark:text-red-400 font-bold' // Vencido
    } else if (diffDays <= 7) {
      return 'text-orange-600 dark:text-orange-400 font-bold' // Cercano (0 a 7 días)
    } else {
      return 'text-green-600 dark:text-green-400 font-bold' // Lejano (> 7 días)
    }
  }

  const getInvoiceCount = (invoiceNumber: string) => {
    // Extraer el número de facturas del string como "10 facturas" o "7 facturas"
    const match = invoiceNumber.match(/(\d+)\s+factura/)
    const count = match ? parseInt(match[1]) : 1

    return count
  }


  const totalDebt = credits
    .filter(credit => credit.status !== 'cancelled')
    .reduce((sum, credit) => sum + credit.pendingAmount, 0)

  const filteredCredits = credits.filter(credit => {
    const matchesSearch = credit.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         credit.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || credit.status === filterStatus
    return matchesSearch && matchesStatus
  })

  // Calcular paginación
  const totalPages = Math.ceil(filteredCredits.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedCredits = filteredCredits.slice(startIndex, endIndex)

  const goToPage = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const getStatusColor = (status: string, credit?: any) => {
    // Si el crédito está cancelado (montos en 0), usar color rojo
    if (isCreditCancelled(credit)) {
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

  const getStatusLabel = (status: string, credit?: any) => {
    // Si el crédito está cancelado (montos en 0), mostrar "Anulado"
    if (isCreditCancelled(credit)) {
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

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardHeader className="p-3 md:p-6">
          <div className="flex flex-col gap-3 md:gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 md:gap-4">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2 flex-wrap">
                  <CreditCard className="h-5 w-5 md:h-6 md:w-6 text-orange-600 flex-shrink-0" />
                  <span className="flex-shrink-0">Gestión de Créditos</span>
                  <StoreBadge />
                  {todayPaymentsTotal !== undefined && (
                    <span className="text-xs md:text-base font-normal text-gray-600 dark:text-gray-400 ml-2">
                      <span className="hidden md:inline">• Hoy: </span>
                      <span className="font-semibold">{formatCurrency(todayPaymentsTotal)}</span>
                    </span>
                  )}
                </CardTitle>
                <p className="text-xs md:text-base text-gray-600 dark:text-gray-300 mt-1 hidden md:block">
                  Administra los créditos y pagos pendientes de tus clientes
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 md:hidden">
                  Administra los créditos
                </p>
                <div className="text-xs md:text-sm text-gray-600 dark:text-gray-300 mt-1 md:hidden">
                  <span className="font-semibold text-orange-600">Deuda: {formatCurrency(totalDebt)}</span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 md:gap-4">
                <div className="text-right hidden md:block lg:hidden">
                  <div className="text-xs text-gray-600 dark:text-gray-300">Total Deuda:</div>
                  <div className="text-lg font-extrabold text-orange-600">
                    {formatCurrency(totalDebt)}
                  </div>
                </div>
                <div className="text-right hidden lg:block">
                  <div className="text-sm text-gray-600 dark:text-gray-300">Total Deuda:</div>
                  <div className="text-2xl font-extrabold text-orange-600">
                    {formatCurrency(totalDebt)}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                  {onRefresh && (
                    <Button 
                      onClick={onRefresh} 
                      variant="outline"
                      className="text-orange-600 border-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:border-orange-400 dark:hover:bg-orange-900/20 text-xs md:text-sm px-2 md:px-4 py-1.5 md:py-2"
                    >
                      <RefreshCcw className="h-3.5 w-3.5 md:h-4 md:w-4 md:mr-2" />
                      <span className="hidden md:inline">Actualizar</span>
                    </Button>
                  )}
                  <Button onClick={onCreate} className="bg-orange-600 hover:bg-orange-700 text-white text-xs md:text-sm px-2 md:px-4 py-1.5 md:py-2 flex-1 sm:flex-none">
                    <Plus className="h-3.5 w-3.5 md:h-4 md:w-4 md:mr-1" />
                    <span className="hidden sm:inline">Nuevo Crédito</span>
                    <span className="sm:hidden">Nuevo</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Search and Filters */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardContent className="p-3 md:p-4">
          <div className="flex flex-col md:flex-row gap-2 md:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 md:left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por cliente o número de factura..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full pl-9 md:pl-10 pr-4 py-2 md:py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value)
                setCurrentPage(1)
              }}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700 md:w-auto w-full"
            >
              <option value="all">Todos los estados</option>
              <option value="pending">Pendiente</option>
              <option value="partial">Parcial</option>
              <option value="completed">Completado</option>
              <option value="overdue">Vencido</option>
              <option value="cancelled">Anulado</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Cargando créditos...
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Por favor espera mientras cargamos la información.
              </p>
            </div>
          ) : filteredCredits.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No se encontraron créditos pendientes
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                No hay créditos registrados en el sistema
              </p>
            </div>
          ) : (
            <>
              {/* Vista de Tarjetas para Mobile */}
              <div className="md:hidden space-y-3 p-3">
                {paginatedCredits.map((credit, index) => {
                  const globalIndex = startIndex + index
                  return (
                    <div
                      key={credit.id}
                      onClick={() => router.push(`/payments/${credit.clientId}`)}
                      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2 cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">#{globalIndex + 1}</span>
                            <CreditCard className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
                            <span className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400 truncate" title={credit.invoiceNumber}>
                              {credit.invoiceNumber}
                            </span>
                          </div>
                          <h3 className="font-semibold text-sm text-gray-900 dark:text-white truncate" title={credit.clientName}>
                            {credit.clientName}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={getStatusLabel(credit.status, credit)}>
                            {getStatusLabel(credit.status, credit)}
                          </p>
                        </div>
                        <Badge className={`${getStatusColor(credit.status, credit)} text-xs shrink-0`}>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(credit.status, credit)}
                            <span className="hidden sm:inline">{getStatusLabel(credit.status, credit)}</span>
                          </div>
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <div className="text-center">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Total</div>
                          <div className="text-xs font-semibold text-gray-900 dark:text-white">{formatCurrency(credit.totalAmount)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Pendiente</div>
                          <div className={`text-xs font-semibold ${credit.pendingAmount === 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {formatCurrency(credit.pendingAmount)}
                          </div>
                        </div>
                      </div>
                      
                      {credit.dueDate && credit.status !== 'completed' && (
                        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500 dark:text-gray-400">Vencimiento:</span>
                            <span className={`font-semibold ${getDueDateColor(credit.dueDate)}`}>
                              {formatDate(credit.dueDate)}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex-1 min-w-0">
                          {credit.lastPaymentAmount && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={`Último abono: ${formatCurrency(credit.lastPaymentAmount)}`}>
                              Último: {formatCurrency(credit.lastPaymentAmount)}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onView(credit)}
                            className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 active:scale-95"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Vista de Cards para Desktop */}
              <div className="hidden md:block space-y-4 p-4 md:p-6">
                {paginatedCredits.map((credit) => {
                  return (
                    <div key={credit.id}>
                      {/* Card Principal */}
                      <Card 
                        className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all cursor-pointer"
                        onClick={() => {
                          // Navegar a la página del cliente
                          router.push(`/payments/${credit.clientId}`)
                        }}
                      >
                        <CardContent className="p-4 md:p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-2">
                                <CreditCard className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                                <div>
                                  <div className="text-sm font-mono font-semibold text-blue-600 dark:text-blue-400">
                            {credit.invoiceNumber}
                          </div>
                                  <div className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                          {credit.clientName}
                        </div>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                                <div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total</div>
                                  <div className="text-base font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(credit.totalAmount)}
                        </div>
                                </div>
                                <div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Pendiente</div>
                                  <div className={`text-base font-semibold ${credit.pendingAmount === 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {formatCurrency(credit.pendingAmount)}
                        </div>
                                </div>
                                <div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Estado</div>
                                  <Badge className={`${getStatusColor(credit.status, credit)} flex items-center gap-1 w-fit text-sm whitespace-nowrap`}>
                                    {getStatusIcon(credit.status, credit)}
                                    {getStatusLabel(credit.status, credit)}
                                  </Badge>
                                </div>
                                {credit.dueDate && (
                                  <div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Vencimiento</div>
                                    <div className={`text-base font-semibold ${getDueDateColor(credit.dueDate)}`}>
                                      {formatDate(credit.dueDate)}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )
                })}

                {/* Paginación */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-1 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="h-7 w-7 flex items-center justify-center rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                        // Mostrar siempre las primeras 2 páginas, la última, y las páginas alrededor de la actual
                        if (
                          page === 1 ||
                          page === 2 ||
                          page === totalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1)
                        ) {
                          return (
                            <button
                              key={page}
                              onClick={() => goToPage(page)}
                              className={`h-7 w-7 flex items-center justify-center rounded-md text-sm transition-colors ${
                                currentPage === page
                                  ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400 font-medium'
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
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="h-7 w-7 flex items-center justify-center rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}