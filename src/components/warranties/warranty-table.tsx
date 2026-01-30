'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, 
  Search, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Trash2,
  Clock,
  AlertTriangle,
  Shield,
  RefreshCcw
} from 'lucide-react'
import { Warranty } from '@/types'

interface WarrantyTableProps {
  warranties: Warranty[]
  loading: boolean
  onCreate: () => void
  onView: (warranty: Warranty) => void
  onEdit: (warranty: Warranty) => void
  onStatusChange: (warrantyId: string, newStatus: string, notes?: string) => void
  onSearch: (searchTerm: string) => void
  onRefresh?: () => void
  todayWarrantiesCount?: number
}

export function WarrantyTable({ 
  warranties, 
  loading, 
  onCreate, 
  onView, 
  onEdit, 
  onStatusChange,
  onSearch,
  onRefresh,
  todayWarrantiesCount
}: WarrantyTableProps) {
  const [searchTerm, setSearchTerm] = useState('')

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 hover:text-yellow-900 dark:bg-yellow-900/20 dark:text-yellow-400 dark:hover:bg-yellow-900/30 dark:hover:text-yellow-300'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200 hover:text-blue-900 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30 dark:hover:text-blue-300'
      case 'completed':
        return 'bg-green-100 text-green-800 hover:bg-green-200 hover:text-green-900 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30 dark:hover:text-green-300'
      case 'rejected':
        return 'bg-red-100 text-red-800 hover:bg-red-200 hover:text-red-900 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:text-red-300'
      case 'discarded':
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200 hover:text-gray-900 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 dark:hover:text-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200 hover:text-gray-900 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 dark:hover:text-gray-200'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendiente'
      case 'in_progress':
        return 'En Proceso'
      case 'completed':
        return 'Completado'
      case 'rejected':
        return 'Rechazado'
      case 'discarded':
        return 'Descartado'
      default:
        return status
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-3 w-3" />
      case 'in_progress':
        return <AlertTriangle className="h-3 w-3" />
      case 'completed':
        return <CheckCircle className="h-3 w-3" />
      case 'rejected':
        return <XCircle className="h-3 w-3" />
      case 'discarded':
        return <Trash2 className="h-3 w-3" />
      default:
        return <Shield className="h-3 w-3" />
    }
  }

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    onSearch(value)
  }

  const getStatusOptions = (currentStatus: string) => {
    const allStatuses = [
      { value: 'pending', label: 'Pendiente', icon: <Clock className="h-4 w-4" /> },
      { value: 'in_progress', label: 'En Proceso', icon: <AlertTriangle className="h-4 w-4" /> },
      { value: 'completed', label: 'Completado', icon: <CheckCircle className="h-4 w-4" /> },
      { value: 'rejected', label: 'Rechazado', icon: <XCircle className="h-4 w-4" /> },
      { value: 'discarded', label: 'Descartado', icon: <Trash2 className="h-4 w-4" /> }
    ]

    return allStatuses.filter(status => status.value !== currentStatus)
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
                  <Shield className="h-5 w-5 md:h-6 md:w-6 text-[#f29fc8] flex-shrink-0" />
                  <span className="flex-shrink-0">Gestión de Garantías</span>
                  {todayWarrantiesCount !== undefined && (
                    <span className="text-xs md:text-base font-normal text-gray-600 dark:text-gray-400 ml-2">
                      <span className="hidden md:inline">• Hoy: </span>
                      <span className="font-semibold">{todayWarrantiesCount}</span>
                    </span>
                  )}
                </CardTitle>
                <p className="text-xs md:text-base text-gray-600 dark:text-gray-300 mt-1 hidden md:block">
                  Administra las garantías y productos devueltos
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 md:hidden">
                  Administra las garantías
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {onRefresh && (
                  <Button 
                    onClick={onRefresh} 
                    variant="outline"
                    className="text-[#f29fc8] border-[#f29fc8] hover:bg-[#fce4f0] dark:text-[#f29fc8] dark:border-[#f29fc8] dark:hover:bg-[#f29fc8]/20 text-xs md:text-sm px-2 md:px-4 py-1.5 md:py-2"
                  >
                    <RefreshCcw className="h-3.5 w-3.5 md:h-4 md:w-4 md:mr-2" />
                    <span className="hidden md:inline">Actualizar</span>
                  </Button>
                )}
                <Button 
                  onClick={onCreate}
                  className="bg-[#f29fc8] hover:bg-[#e07ab0] text-white text-xs md:text-sm px-2 md:px-4 py-1.5 md:py-2 flex-1 sm:flex-none"
                >
                  <Plus className="h-3.5 w-3.5 md:h-4 md:w-4 md:mr-1" />
                  <span className="hidden sm:inline">Nueva Garantía</span>
                  <span className="sm:hidden">Nueva</span>
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Search */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardContent className="p-3 md:p-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 md:left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar garantía..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-9 md:pl-10 pr-4 py-2 md:py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#fce4f0]0 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f29fc8]"></div>
            </div>
          ) : warranties.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No hay garantías registradas
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Comienza creando una nueva garantía
              </p>
            </div>
          ) : (
            <>
              {/* Vista de Tarjetas para Mobile */}
              <div className="md:hidden space-y-3 p-3">
                {warranties.map((warranty, index) => {
                  const formatDate = (dateString: string) => {
                    return new Date(dateString).toLocaleDateString('es-CO', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit'
                    })
                  }
                  return (
                    <div
                      key={warranty.id}
                      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2 cursor-pointer hover:shadow-md transition-all"
                      onClick={() => onView(warranty)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">#{index + 1}</span>
                            <span className="text-xs font-semibold text-[#f29fc8] dark:text-[#f29fc8]">#{warranty.id.slice(-6)}</span>
                          </div>
                          <h3 className="font-semibold text-sm text-gray-900 dark:text-white truncate" title={warranty.clientName}>
                            {warranty.clientName}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={warranty.productReceivedName}>
                            {warranty.productReceivedName}
                          </p>
                          {warranty.productReceivedSerial && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 truncate" title={`S/N: ${warranty.productReceivedSerial}`}>
                              S/N: {warranty.productReceivedSerial}
                            </p>
                          )}
                        </div>
                        <Badge className={`${getStatusColor(warranty.status)} text-xs shrink-0`}>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(warranty.status)}
                            <span className="hidden sm:inline">{getStatusLabel(warranty.status)}</span>
                          </div>
                        </Badge>
                      </div>
                      
                      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5 text-center">Fecha</div>
                        <div className="text-xs font-semibold text-gray-900 dark:text-white text-center">{formatDate(warranty.createdAt)}</div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={warranty.reason}>
                            {warranty.reason}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onView(warranty)}
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
                {warranties.map((warranty) => {
                  const formatDate = (dateString: string) => {
                    return new Date(dateString).toLocaleDateString('es-CO', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit'
                    })
                  }
                  return (
                    <Card
                      key={warranty.id}
                      className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all cursor-pointer"
                      onClick={() => onView(warranty)}
                    >
                      <CardContent className="p-4 md:p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <Shield className="h-5 w-5 text-[#f29fc8] dark:text-[#f29fc8] flex-shrink-0" />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <div className="text-sm font-mono font-semibold text-blue-600 dark:text-blue-400">
                                    #{warranty.id.slice(-6)}
                                  </div>
                                  {warranty.status === 'completed' && (
                                    <div className="h-4 w-4 rounded-full bg-green-500 flex-shrink-0" title="Completado" />
                                  )}
                                </div>
                                <div className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                                  {warranty.clientName}
                                </div>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                              <div>
                                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Producto</div>
                                <div className="text-sm font-semibold text-gray-900 dark:text-white truncate" title={warranty.productReceivedName}>
                                  {warranty.productReceivedName}
                                </div>
                                {warranty.productReceivedSerial && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate" title={`S/N: ${warranty.productReceivedSerial}`}>
                                    S/N: {warranty.productReceivedSerial}
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Motivo</div>
                                <div className="text-sm font-semibold text-gray-900 dark:text-white truncate" title={warranty.reason}>
                                  {warranty.reason}
                                </div>
                              </div>
                              <div>
                                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Estado</div>
                                <Badge className={`${getStatusColor(warranty.status)} flex items-center gap-1 w-fit text-sm whitespace-nowrap`}>
                                  {getStatusIcon(warranty.status)}
                                  {getStatusLabel(warranty.status)}
                                </Badge>
                              </div>
                              <div>
                                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Fecha</div>
                                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {formatDate(warranty.createdAt)}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 ml-4">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation()
                                onView(warranty)
                              }}
                              className="h-10 w-10 p-0 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
                              title="Ver detalles"
                            >
                              <Eye className="h-5 w-5" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

    </div>
  )
}
