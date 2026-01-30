'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  X, 
  Shield, 
  User, 
  Package, 
  Calendar, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock,
  AlertTriangle,
  Trash2,
  History,
} from 'lucide-react'
import { Warranty } from '@/types'

interface WarrantyDetailModalProps {
  warranty: Warranty | null
  isOpen: boolean
  onClose: () => void
  onEdit: (warranty: Warranty) => void
  onStatusChange: (warrantyId: string, newStatus: string, notes?: string) => void
}

export function WarrantyDetailModal({ 
  warranty, 
  isOpen, 
  onClose, 
  onEdit,
  onStatusChange 
}: WarrantyDetailModalProps) {

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen || !warranty) return null

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-600'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-600'
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-600'
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-600'
      case 'discarded':
        return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
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
        return <Clock className="h-4 w-4" />
      case 'in_progress':
        return <AlertTriangle className="h-4 w-4" />
      case 'completed':
        return <CheckCircle className="h-4 w-4" />
      case 'rejected':
        return <XCircle className="h-4 w-4" />
      case 'discarded':
        return <Trash2 className="h-4 w-4" />
      default:
        return <Shield className="h-4 w-4" />
    }
  }

  return (
    <>
      {/* Modal Principal */}
      <div className="fixed inset-0 xl:left-64 bg-white/70 dark:bg-black/60 backdrop-blur-sm z-50 flex flex-col xl:items-center xl:justify-center xl:pl-6 xl:pr-4 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-none xl:rounded-2xl shadow-2xl w-full h-full xl:h-auto xl:w-auto xl:max-w-6xl xl:max-h-[95vh] overflow-hidden flex flex-col border-0 xl:border border-gray-200 dark:border-gray-700">
          {/* Header */}
          <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200 dark:border-gray-700 bg-[#fce4f0] dark:bg-[#f29fc8]/20 flex-shrink-0">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 md:h-8 md:w-8 text-[#f29fc8]" />
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                  Garantía #{warranty.id.slice(-6)}
                </h2>
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

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              {/* Información General */}
              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="text-lg text-gray-900 dark:text-white flex items-center gap-2">
                    <FileText className="h-5 w-5 text-[#f29fc8]" />
                    Información General
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Estado:</span>
                    <Badge className={getStatusColor(warranty.status)}>
                      {getStatusIcon(warranty.status)}
                      <span className="ml-1">{getStatusLabel(warranty.status)}</span>
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Fecha de Creación:</span>
                    <span className="text-sm text-gray-900 dark:text-white">
                      {new Date(warranty.createdAt).toLocaleDateString('es-CO', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  {warranty.completedAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Fecha de Completado:</span>
                      <span className="text-sm text-gray-900 dark:text-white">
                        {new Date(warranty.completedAt).toLocaleDateString('es-CO', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Última Actualización:</span>
                    <span className="text-sm text-gray-900 dark:text-white">
                      {new Date(warranty.updatedAt).toLocaleDateString('es-CO', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Información del Cliente */}
              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="text-lg text-gray-900 dark:text-white flex items-center gap-2">
                    <User className="h-5 w-5 text-[#f29fc8]" />
                    Información del Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Nombre:</span>
                    <p className="text-sm text-gray-900 dark:text-white font-medium">{warranty.clientName}</p>
                  </div>
                  {warranty.client?.email && (
                    <div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Email:</span>
                      <p className="text-sm text-gray-900 dark:text-white">{warranty.client.email}</p>
                    </div>
                  )}
                  {warranty.client?.phone && (
                    <div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Teléfono:</span>
                      <p className="text-sm text-gray-900 dark:text-white">{warranty.client.phone}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Producto Recibido */}
              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="text-lg text-gray-900 dark:text-white flex items-center gap-2">
                    <Package className="h-5 w-5 text-red-600" />
                    Producto Recibido (Defectuoso)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Producto:</span>
                    <p className="text-sm text-gray-900 dark:text-white font-medium">{warranty.productReceivedName}</p>
                  </div>
                  {warranty.productReceived?.reference && (
                    <div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Referencia:</span>
                      <p className="text-sm text-gray-900 dark:text-white">{warranty.productReceived.reference}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Cantidad recibida:</span>
                    <p className="text-sm text-gray-900 dark:text-white font-medium">{warranty.quantityReceived ?? 1} unidad{warranty.quantityReceived !== 1 ? 'es' : ''}</p>
                  </div>
                  {warranty.productReceivedSerial && (
                    <div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Número de Serie:</span>
                      <p className="text-sm text-gray-900 dark:text-white font-mono">{warranty.productReceivedSerial}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Motivo de la Garantía:</span>
                    <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      {warranty.reason || '-'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Producto Entregado */}
              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="text-lg text-gray-900 dark:text-white flex items-center gap-2">
                    <Package className="h-5 w-5 text-green-600" />
                    Producto Entregado (Nuevo)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {warranty.productDeliveredName ? (
                    <>
                      <div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Producto:</span>
                        <p className="text-sm text-gray-900 dark:text-white font-medium">{warranty.productDeliveredName}</p>
                      </div>
                      {warranty.productDelivered?.reference && (
                        <div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Referencia:</span>
                          <p className="text-sm text-gray-900 dark:text-white">{warranty.productDelivered.reference}</p>
                        </div>
                      )}
                      <div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Cantidad entregada:</span>
                        <p className="text-sm text-gray-900 dark:text-white font-medium">{warranty.quantityDelivered ?? 1} unidad{warranty.quantityDelivered !== 1 ? 'es' : ''}</p>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      {warranty.notes?.includes('Devolución de dinero') ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-center">
                            <div className="bg-[#fce4f0] dark:bg-[#f29fc8]/30 p-3 rounded-full">
                              <span className="text-2xl">💰</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                              Devolución de Dinero
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {warranty.productReceived?.price ? 
                                `Valor devuelto: $${(warranty.productReceived.price).toLocaleString()}` : 
                                'Valor del producto defectuoso devuelto'
                              }
                            </p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <Package className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {warranty.productDeliveredId ? 'Producto entregado' : 'Sin producto de reemplazo'}
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 md:p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 sticky bottom-0 z-10 flex-shrink-0" style={{ paddingBottom: `calc(max(56px, env(safe-area-inset-bottom)) + 1rem)` }}>
            <div className="flex items-center gap-3">
              {/* Botón de cambiar estado eliminado */}
            </div>
            <Button
              onClick={onClose}
              className="bg-gray-600 hover:bg-gray-700 text-white"
            >
              Cerrar
            </Button>
          </div>
        </div>
      </div>

    </>
  )
}
