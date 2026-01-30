'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Search,
  Filter,
  ArrowRightLeft,
  ShoppingCart,
  Package,
  Users,
  Tag,
  Trash2,
  Edit,
  Plus,
  RefreshCw,
  Shield,
  Eye,
  ChevronRight,
  CreditCard,
  CheckCircle,
  DollarSign,
  X,
  Receipt,
  Wallet,
  TrendingUp
} from 'lucide-react'
import { LogEntry } from '@/types/logs'

interface LogsTableProps {
  logs: LogEntry[]
  searchTerm?: string
  onSearchChange?: (term: string) => void
  moduleFilter?: string
  onModuleFilterChange?: (module: string) => void
  onRefresh?: () => void
  loading?: boolean
  currentPage?: number
  totalLogs?: number
  hasMore?: boolean
  onPageChange?: (page: number) => void
  onLogClick?: (log: LogEntry) => void
}

export function LogsTable({ 
  logs, 
  searchTerm = '', 
  onSearchChange,
  moduleFilter = 'all',
  onModuleFilterChange,
  onRefresh,
  loading = false,
  currentPage = 1,
  totalLogs = 0,
  hasMore = true,
  onPageChange,
  onLogClick
}: LogsTableProps) {
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm)
  const [localFilterModule, setLocalFilterModule] = useState(moduleFilter)

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'transfer':
        return ArrowRightLeft
      case 'sale':
      case 'sale_create':
        return ShoppingCart
      case 'credit_sale_create':
        return CreditCard
      case 'sale_cancel':
        return X
      case 'credit_sale_cancel':
        return X
      case 'sale_stock_deduction':
        return Package
      case 'sale_cancellation_stock_return':
        return TrendingUp
      case 'product_create':
        return Plus
      case 'product_update':
      case 'product_edit':
        return Edit
      case 'product_delete':
        return Trash2
      case 'adjustment':
      case 'stock_adjustment':
        return Package
      case 'transfer':
      case 'stock_transfer':
        return ArrowRightLeft
      case 'category_create':
        return Tag
      case 'category_update':
        return Edit
      case 'category_delete':
        return Trash2
      case 'client_create':
        return Plus
      case 'client_edit':
      case 'client_update':
        return Edit
      case 'client_delete':
        return Trash2
      case 'category_create':
        return Tag
      case 'category_edit':
        return Edit
      case 'category_delete':
        return Trash2
      case 'warranty_create':
        return Plus
      case 'warranty_status_update':
        return RefreshCw
      case 'warranty_update':
        return Edit
      case 'credit_create':
        return Receipt
      case 'credit_payment':
        return DollarSign
      case 'credit_completed':
        return CheckCircle
      case 'credit_cancelled':
        return X
      case 'roles':
      case 'user_create':
        return Plus
      case 'user_edit':
      case 'user_update':
        return Edit
      case 'user_delete':
        return Trash2
      case 'permissions_assigned':
        return Shield
      case 'permissions_revoked':
        return Shield
      case 'role_changed':
        return Users
      case 'user_deactivated':
        return X
      case 'user_reactivated':
        return CheckCircle
      case 'login':
        return Users
       default:
        return Users
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'credit_sale_create':
      case 'credit_sale_cancel':
      case 'credit_create':
      case 'credit_payment':
      case 'credit_completed':
      case 'credit_cancelled':
        return 'bg-[#fce4f0] text-[#d06a98] dark:bg-[#f29fc8]/20 dark:text-[#f29fc8]'
      case 'sale':
      case 'sale_create':
      case 'sale_cancel':
      case 'sale_stock_deduction':
      case 'sale_cancellation_stock_return':
        return 'bg-[#fce4f0] text-[#d06a98] dark:bg-[#f29fc8]/20 dark:text-[#f29fc8]'
      case 'product_create':
      case 'product_update':
      case 'product_edit':
      case 'product_delete':
      case 'adjustment':
      case 'stock_adjustment':
      case 'transfer':
      case 'stock_transfer':
        return 'bg-[#fce4f0] text-[#d06a98] dark:bg-[#f29fc8]/20 dark:text-[#f29fc8]'
      case 'category_create':
        return 'bg-[#fce4f0] text-[#d06a98] dark:bg-[#f29fc8]/20 dark:text-[#f29fc8]'
      case 'category_update':
        return 'bg-[#fce4f0] text-[#d06a98] dark:bg-[#f29fc8]/20 dark:text-[#f29fc8]'
      case 'category_delete':
        return 'bg-[#fce4f0] text-[#d06a98] dark:bg-[#f29fc8]/20 dark:text-[#f29fc8]'
      case 'client_create':
      case 'client_edit':
      case 'client_update':
      case 'client_delete':
        return 'bg-[#fce4f0] text-[#d06a98] dark:bg-[#f29fc8]/20 dark:text-[#f29fc8]'
      case 'category_create':
        return 'bg-[#fce4f0] text-[#d06a98] dark:bg-[#f29fc8]/20 dark:text-[#f29fc8]'
      case 'category_edit':
        return 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-400'
      case 'category_delete':
        return 'bg-[#fce4f0] text-[#d06a98] dark:bg-[#f29fc8]/20 dark:text-[#f29fc8]'
      case 'warranty_create':
      case 'warranty_status_update':
      case 'warranty_update':
        return 'bg-[#fce4f0] text-[#d06a98] dark:bg-[#f29fc8]/20 dark:text-[#f29fc8]'
      case 'roles':
      case 'user_create':
      case 'user_edit':
      case 'user_update':
      case 'user_delete':
      case 'permissions_assigned':
      case 'permissions_revoked':
      case 'role_changed':
      case 'user_deactivated':
      case 'user_reactivated':
        return 'bg-[#fce4f0] text-[#d06a98] dark:bg-[#f29fc8]/20 dark:text-[#f29fc8]'
      case 'login':
        return 'bg-[#fce4f0] text-[#d06a98] dark:bg-[#f29fc8]/20 dark:text-[#f29fc8]'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'transfer':
        return 'Transferencia de Stock'
      case 'sale':
      case 'sale_create':
        return 'Venta'
      case 'credit_sale_create':
        return 'Venta a Crédito'
      case 'sale_cancel':
        return 'Venta Cancelada'
      case 'credit_sale_cancel':
        return 'Venta tipo crédito cancelada'
      case 'sale_stock_deduction':
        return 'Descuento de Stock'
      case 'sale_cancellation_stock_return':
        return 'Devolución de Stock'
      case 'sale_cancellation_stock_return_batch':
        return 'Devolución de Stock Masiva'
      case 'product_create':
        return 'Producto Creado'
      case 'product_update':
        return 'Producto Actualizado'
      case 'product_edit':
        return 'Producto Editado'
      case 'product_delete':
        return 'Producto Eliminado'
      case 'adjustment':
        return 'Ajuste de Stock'
      case 'category_create':
        return 'Categoría Creada'
      case 'category_update':
        return 'Categoría Actualizada'
      case 'category_delete':
        return 'Categoría Eliminada'
      case 'client_create':
        return 'Cliente Creado'
      case 'client_edit':
      case 'client_update':
        return 'Cliente Editado'
      case 'client_delete':
        return 'Cliente Eliminado'
      case 'category_create':
        return 'Categoría Creada'
      case 'category_edit':
        return 'Categoría Editada'
      case 'category_delete':
        return 'Categoría Eliminada'
      case 'warranty_create':
        return 'Garantía Creada'
      case 'warranty_status_update':
        return 'Estado de Garantía Actualizado'
      case 'warranty_update':
        return 'Garantía Actualizada'
      case 'credit_create':
        return 'Crédito Creado'
      case 'credit_payment':
        return 'Abono Registrado'
      case 'credit_completed':
        return 'Pago Completado'
      case 'credit_cancelled':
        return 'Crédito Cancelado'
      case 'roles':
        return 'Gestión de Usuarios'
      case 'transfers':
        return 'Gestión de Transferencias'
      case 'user_create':
        return 'Usuario Creado'
      case 'user_edit':
      case 'user_update':
        return 'Usuario Editado'
      case 'user_delete':
        return 'Usuario Eliminado'
      case 'permissions_assigned':
        return 'Permisos Asignados'
      case 'permissions_revoked':
        return 'Permisos Revocados'
      case 'role_changed':
        return 'Rol Cambiado'
      case 'user_deactivated':
        return 'Usuario Desactivado'
      case 'user_reactivated':
        return 'Usuario Reactivado'
      case 'login':
        return 'Inicio de Sesión'
      default:
        return type || 'Actividad'
    }
  }

  const formatDateTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const filteredLogs = logs.filter(log => {
    const matchesSearch = (onSearchChange ? searchTerm : localSearchTerm) === '' ||
      log.description?.toLowerCase().includes((onSearchChange ? searchTerm : localSearchTerm).toLowerCase()) ||
      log.action.toLowerCase().includes((onSearchChange ? searchTerm : localSearchTerm).toLowerCase()) ||
      log.user_name?.toLowerCase().includes((onSearchChange ? searchTerm : localSearchTerm).toLowerCase())

    const currentModuleFilter = onModuleFilterChange ? moduleFilter : localFilterModule
    let matchesModule = false
    if (currentModuleFilter === 'all') {
      matchesModule = true
    } else if (currentModuleFilter === 'credits') {
      // Para créditos, incluir logs con módulo 'credits' y también ventas a crédito
      matchesModule = log.module === 'credits' || 
        (log.module === 'sales' && (log.action === 'credit_sale_create' || 
          (log.action === 'sale_cancel' && (log.details as any)?.isCreditSale === true)))
    } else {
      matchesModule = log.module === currentModuleFilter
    }

    return matchesSearch && matchesModule
  })

  const modules = [
    { value: 'all', label: 'Todos los módulos' },
    { value: 'products', label: 'Productos' },
    { value: 'clients', label: 'Clientes' },
    { value: 'sales', label: 'Ventas' },
    { value: 'credits', label: 'Créditos' },
    { value: 'warranties', label: 'Garantías' },
    { value: 'transfers', label: 'Transferencias' },
    { value: 'roles', label: 'Roles' }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardHeader className="p-3 md:p-6">
          <div className="flex flex-col gap-3 md:gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 md:gap-4">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2 flex-wrap">
                  <RefreshCw className="h-5 w-5 md:h-6 md:w-6 text-[#f29fc8] flex-shrink-0" />
                  <span className="flex-shrink-0">Registro de Actividades</span>
                </CardTitle>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300 mt-1 hidden md:block">
                  Historial completo de todas las operaciones del sistema
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 md:hidden">
                  Historial de operaciones
                </p>
              </div>
              {onRefresh && (
                <Button
                  onClick={onRefresh}
                  variant="outline"
                  className="text-xs md:text-sm px-2 md:px-4 py-1.5 md:py-2"
                >
                  <RefreshCw className="h-3.5 w-3.5 md:h-4 md:w-4 md:mr-2" />
                  <span className="hidden md:inline">Actualizar</span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Search and Filters */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardContent className="p-3 md:p-4">
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 md:left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar registro..."
                value={onSearchChange ? searchTerm : localSearchTerm}
                onChange={(e) => {
                  const value = e.target.value
                  if (onSearchChange) {
                    onSearchChange(value)
                  } else {
                    setLocalSearchTerm(value)
                  }
                }}
                className="w-full pl-9 md:pl-10 pr-4 py-2 md:py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>
            <div>
              <select
                value={onModuleFilterChange ? moduleFilter : localFilterModule}
                onChange={(e) => {
                  const value = e.target.value
                  if (onModuleFilterChange) {
                    onModuleFilterChange(value)
                  } else {
                    setLocalFilterModule(value)
                  }
                }}
                className="w-full sm:w-auto sm:min-w-[200px] px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700"
              >
                {modules.map(module => (
                  <option key={module.value} value={module.value}>
                    {module.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardContent className="p-0">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No se encontraron registros
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                No hay actividades registradas en el sistema
              </p>
            </div>
          ) : (
            <>
              {/* Vista de Tarjetas para Mobile */}
              <div className="md:hidden space-y-3 p-3">
                {filteredLogs.map((log, index) => {
                  const getLogType = (log: any) => {
                    if (log.action === 'sale_cancellation_stock_return') return 'sale_cancellation_stock_return'
                    if (log.action === 'sale_cancellation_stock_return_batch') return 'sale_cancellation_stock_return'
                    
                    if (log.module === 'sales') {
                      if (log.action === 'sale_create') return 'sale'
                      if (log.action === 'credit_sale_create') return 'credit_sale_create'
                      if (log.action === 'sale_cancel') {
                        // Si es una factura de crédito, usar el tipo 'credit_sale_cancel'
                        return (log.details as any)?.isCreditSale ? 'credit_sale_cancel' : 'sale_cancel'
                      }
                      if (log.action === 'sale_stock_deduction') return 'sale_stock_deduction'
                      if (log.action === 'sale_cancellation_stock_return') return 'sale_cancellation_stock_return'
                      return 'sale'
                    }
                    if (log.module === 'roles') {
                      if (log.action === 'Usuario Creado') return 'user_create'
                      if (log.action === 'Usuario Editado') return 'user_edit'
                      if (log.action === 'Usuario Eliminado') return 'user_delete'
                      if (log.action === 'Permisos Asignados') return 'permissions_assigned'
                      if (log.action === 'Permisos Revocados') return 'permissions_revoked'
                      if (log.action === 'Rol Cambiado') return 'role_changed'
                      if (log.action === 'Usuario Desactivado') return 'user_deactivated'
                      if (log.action === 'Usuario Reactivado') return 'user_reactivated'
                      return 'roles'
                    }
                    if (log.module === 'products') {
                      if (log.action === 'product_create') return 'product_create'
                      if (log.action === 'product_update') return 'product_update'
                      if (log.action === 'product_delete') return 'product_delete'
                      if (log.action === 'stock_transfer') return 'transfer'
                      if (log.action === 'stock_adjustment') return 'adjustment'
                      return 'product_create'
                    }
                    if (log.module === 'categories') {
                      if (log.action === 'category_create') return 'category_create'
                      if (log.action === 'category_update') return 'category_update'
                      if (log.action === 'category_delete') return 'category_delete'
                      return 'category_create'
                    }
                    if (log.module === 'clients') {
                      if (log.action === 'client_create') return 'client_create'
                      if (log.action === 'client_update') return 'client_update'
                      if (log.action === 'client_delete') return 'client_delete'
                      return 'client_create'
                    }
                    if (log.module === 'warranties') {
                      if (log.action === 'warranty_create') return 'warranty_create'
                      if (log.action === 'warranty_status_update') return 'warranty_status_update'
                      if (log.action === 'warranty_update') return 'warranty_update'
                      return 'warranty_create'
                    }
                    if (log.module === 'credits') {
                      if (log.action === 'credit_create') return 'credit_create'
                      if (log.action === 'credit_payment') {
                        // Si el crédito se completó con este abono, usar el tipo 'credit_completed'
                        return (log.details as any)?.isCompleted ? 'credit_completed' : 'credit_payment'
                      }
                      if (log.action === 'credit_completed') return 'credit_completed'
                      if (log.action === 'credit_cancelled') return 'credit_cancelled'
                      return 'credit_create'
                    }
                    if (log.module === 'auth') return 'login'
                    return 'roles'
                  }
                  
                  const logType = getLogType(log)
                  const TypeIcon = getTypeIcon(logType)
                  const formatDate = (timestamp: string) => {
                    const date = new Date(timestamp)
                    return date.toLocaleDateString('es-CO', {
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  }
                  
                  const getActionLabel = () => {
                    if (log.module === 'auth') return 'Acceso'
                    if (log.module === 'sales') {
                      if (log.action === 'sale_create') return 'Crear Venta'
                      if (log.action === 'credit_sale_create') return 'Crear Venta a Crédito'
                      if (log.action === 'sale_cancel') {
                        return (log.details as any)?.isCreditSale ? 'Cancelar Factura de Crédito' : 'Cancelar Venta'
                      }
                      if (log.action === 'sale_stock_deduction') return 'Descontar Stock'
                      if (log.action === 'sale_cancellation_stock_return') return 'Devolver Stock'
                      return log.action
                    }
                    if (log.module === 'products') {
                      if (log.action === 'product_create') return 'Crear'
                      if (log.action === 'product_update') return 'Actualizar'
                      if (log.action === 'product_delete') return 'Eliminar'
                      if (log.action === 'stock_transfer') return 'Transferir'
                      if (log.action === 'stock_adjustment') return 'Ajustar'
                      return log.action
                    }
                    if (log.module === 'categories') {
                      if (log.action === 'category_create') return 'Crear'
                      if (log.action === 'category_update') return 'Actualizar'
                      if (log.action === 'category_delete') return 'Eliminar'
                      return log.action
                    }
                    if (log.module === 'clients') {
                      if (log.action === 'client_create') return 'Crear Cliente'
                      if (log.action === 'client_update') return 'Actualizar Cliente'
                      if (log.action === 'client_delete') return 'Eliminar Cliente'
                      return log.action
                    }
                    if (log.module === 'warranties') {
                      if (log.action === 'warranty_create') return 'Crear Garantía'
                      if (log.action === 'warranty_status_update') return 'Actualizar Estado'
                      if (log.action === 'warranty_update') return 'Actualizar Garantía'
                      return log.action
                    }
                    if (log.module === 'credits') {
                      if (log.action === 'credit_create') return 'Crear Crédito'
                      if (log.action === 'credit_payment') {
                        return (log.details as any)?.isCompleted ? 'Pago Completado' : 'Registrar Abono'
                      }
                      if (log.action === 'credit_completed') return 'Completar Crédito'
                      if (log.action === 'credit_cancelled') return 'Cancelar Crédito'
                      return log.action
                    }
                    return log.action
                  }
                  
                  return (
                    <div
                      key={log.id}
                      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => onLogClick && onLogClick(log)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className={`p-1.5 rounded-lg ${getTypeColor(logType)} flex-shrink-0`}>
                            <TypeIcon className="h-3.5 w-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">#{totalLogs - ((currentPage - 1) * 20) - index}</span>
                            </div>
                            <h3 className="font-semibold text-sm text-gray-900 dark:text-white truncate" title={getTypeLabel(logType)}>
                              {getTypeLabel(logType)}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={getActionLabel()}>
                              {getActionLabel()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-gray-400">
                          <Eye className="h-4 w-4" />
                          <ChevronRight className="h-3.5 w-3.5" />
                        </div>
                      </div>
                      
                      {log.description && (
                        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                          <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2" title={log.description}>
                            {log.description}
                          </p>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <div className="text-center">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Usuario</div>
                          <div className="text-xs font-semibold text-gray-900 dark:text-white truncate" title={log.user_name || 'Desconocido'}>
                            {log.user_name || 'Desconocido'}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Fecha</div>
                          <div className="text-xs font-semibold text-gray-900 dark:text-white">{formatDate(log.created_at)}</div>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex items-center justify-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <Eye className="h-3 w-3" />
                        <span>Ver detalle</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Vista de Tabla para Desktop */}
              <div className="hidden md:block overflow-x-auto logs-table-tablet-container">
                <table className="w-full table-fixed logs-table-tablet">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="w-12 md:w-16 pl-3 md:pl-4 pr-1 md:pr-2 py-2 md:py-3 text-left text-xs md:text-sm font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      #
                    </th>
                    <th className="w-36 md:w-48 pl-3 md:pl-4 pr-1 md:pr-2 py-2 md:py-3 text-left text-xs md:text-sm font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="w-28 md:w-36 pl-3 md:pl-4 pr-1 md:pr-2 py-2 md:py-3 text-left text-xs md:text-sm font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Acción
                    </th>
                    <th className="w-64 md:w-80 pl-3 md:pl-4 pr-1 md:pr-2 py-2 md:py-3 text-left text-xs md:text-sm font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden lg:table-cell">
                      Descripción
                    </th>
                    <th className="w-24 md:w-32 pl-3 md:pl-4 pr-1 md:pr-2 py-2 md:py-3 text-left text-xs md:text-sm font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden lg:table-cell">
                      Usuario
                    </th>
                    <th className="w-28 md:w-36 pl-3 md:pl-4 pr-3 md:pr-4 py-2 md:py-3 text-left text-xs md:text-sm font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="w-12 md:w-16 pl-3 md:pl-4 pr-3 md:pr-4 py-2 md:py-3 text-center text-xs md:text-sm font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      <Eye className="h-4 w-4 mx-auto" />
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredLogs.map((log, index) => {
                    // Mapear el tipo basado en el módulo y acción
                    const getLogType = (log: any) => {
                      // Manejar casos específicos independientemente del módulo
                      if (log.action === 'sale_cancellation_stock_return') return 'sale_cancellation_stock_return'
                      if (log.action === 'sale_cancellation_stock_return_batch') return 'sale_cancellation_stock_return'
                      
                      if (log.module === 'sales') {
                        if (log.action === 'sale_create') return 'sale'
                        if (log.action === 'credit_sale_create') return 'credit_sale_create'
                        if (log.action === 'sale_cancel') {
                          // Si es una factura de crédito, usar el tipo 'credit_sale_cancel'
                          return (log.details as any)?.isCreditSale ? 'credit_sale_cancel' : 'sale_cancel'
                        }
                        if (log.action === 'sale_stock_deduction') return 'sale_stock_deduction'
                        if (log.action === 'sale_cancellation_stock_return') return 'sale_cancellation_stock_return'
                        return 'sale'
                      }
                      if (log.module === 'roles') {
                        if (log.action === 'Usuario Creado') return 'user_create'
                        if (log.action === 'Usuario Editado') return 'user_edit'
                        if (log.action === 'Usuario Eliminado') return 'user_delete'
                        if (log.action === 'Permisos Asignados') return 'permissions_assigned'
                        if (log.action === 'Permisos Revocados') return 'permissions_revoked'
                        if (log.action === 'Rol Cambiado') return 'role_changed'
                        if (log.action === 'Usuario Desactivado') return 'user_deactivated'
                        if (log.action === 'Usuario Reactivado') return 'user_reactivated'
                        return 'roles'
                      }
                      if (log.module === 'products') {
                        if (log.action === 'product_create') return 'product_create'
                        if (log.action === 'product_update') return 'product_update'
                        if (log.action === 'product_delete') return 'product_delete'
                        if (log.action === 'stock_transfer') return 'transfer'
                        if (log.action === 'stock_adjustment') return 'adjustment'
                        if (log.action === 'sale_cancellation_stock_return') return 'sale_cancellation_stock_return'
                        return 'product_create'
                      }
                      if (log.module === 'categories') {
                        if (log.action === 'category_create') return 'category_create'
                        if (log.action === 'category_update') return 'category_update'
                        if (log.action === 'category_delete') return 'category_delete'
                        return 'category_create'
                      }
                      if (log.module === 'clients') {
                        if (log.action === 'client_create') return 'client_create'
                        if (log.action === 'client_update') return 'client_update'
                        if (log.action === 'client_delete') return 'client_delete'
                        return 'client_create'
                      }
                      if (log.module === 'warranties') {
                        if (log.action === 'warranty_create') return 'warranty_create'
                        if (log.action === 'warranty_status_update') return 'warranty_status_update'
                        if (log.action === 'warranty_update') return 'warranty_update'
                        return 'warranty_create'
                      }
                      if (log.module === 'sales') {
                        if (log.action.includes('Venta')) return 'sale'
                        return 'sale'
                      }
                      if (log.module === 'payments') {
                        if (log.action.includes('Transferencia')) return 'transfer'
                        return 'transfer'
                      }
                      if (log.module === 'credits') {
                        if (log.action === 'credit_create') return 'credit_create'
                        if (log.action === 'credit_payment') {
                          // Si el crédito se completó con este abono, usar el tipo 'credit_completed'
                          return (log.details as any)?.isCompleted ? 'credit_completed' : 'credit_payment'
                        }
                        if (log.action === 'credit_completed') return 'credit_completed'
                        if (log.action === 'credit_cancelled') return 'credit_cancelled'
                        return 'credit_create'
                      }
                      if (log.module === 'auth') {
                        return 'login' // Tipo específico para login
                      }
                      if (log.module === 'transfers') {
                        if (log.action === 'transfer_created') return 'transfer'
                        if (log.action === 'transfer_received') return 'transfer'
                        if (log.action === 'transfer_cancelled') return 'transfer'
                        return 'transfer'
                      }
                      return 'roles' // Default
                    }
                    
                    const logType = getLogType(log)
                    const TypeIcon = getTypeIcon(logType)
                    return (
                      <tr 
                        key={log.id} 
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                        onClick={() => onLogClick && onLogClick(log)}
                      >
                        <td className="pl-3 md:pl-4 pr-1 md:pr-2 py-2 md:py-4 whitespace-nowrap">
                          <div className="text-xs md:text-sm font-medium text-gray-900 dark:text-white">
                            {totalLogs - ((currentPage - 1) * 20) - index}
                          </div>
                        </td>
                        <td className="pl-3 md:pl-4 pr-1 md:pr-2 py-2 md:py-4">
                          <div className="flex items-center space-x-2 md:space-x-3">
                            <div className={`p-1.5 md:p-2 rounded-lg ${getTypeColor(logType)} flex-shrink-0`}>
                              <TypeIcon className="h-3.5 w-3.5 md:h-4 md:w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs md:text-sm font-medium text-gray-900 dark:text-white truncate" title={getTypeLabel(logType)}>
                                {getTypeLabel(logType)}
                              </div>
                              <div className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 truncate">
                                {log.module === 'roles' ? 'Usuarios' : 
                                 log.module === 'products' ? 'Productos' :
                                 log.module === 'clients' ? 'Clientes' :
                                 log.module === 'credits' ? 'Créditos' :
                                 log.module === 'warranties' ? 'Garantías' :
                                 log.module === 'sales' ? 'Ventas' :
                                 log.module === 'payments' ? 'Abonos' :
                                 log.module === 'transfers' ? 'Transferencias' :
                                 log.module === 'logs' ? 'Logs' :
                                 log.module === 'auth' ? 'Login' :
                                 log.module || 'Sistema'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="pl-3 md:pl-4 pr-1 md:pr-2 py-2 md:py-4">
                          <div 
                            className="text-xs md:text-sm font-medium text-gray-900 dark:text-white truncate" 
                            title={
                              log.module === 'auth' ? 'Acceso' : 
                              log.module === 'sales' ?
                                (log.action === 'sale_create' ? 'Crear Venta' :
                                 log.action === 'credit_sale_create' ? 'Crear Venta a Crédito' :
                                 log.action === 'sale_cancel' ? ((log.details as any)?.isCreditSale ? 'Cancelar Factura de Crédito' : 'Cancelar Venta') :
                                 log.action === 'sale_stock_deduction' ? 'Descontar Stock' :
                                 log.action === 'sale_cancellation_stock_return' ? 'Devolver Stock' :
                                 log.action === 'sale_cancellation_stock_return_batch' ? 'Devolver Stock Masivo' :
                                 log.action) :
                              log.module === 'products' ? 
                                (log.action === 'product_create' ? 'Crear' :
                                 log.action === 'product_update' ? 'Actualizar' :
                                 log.action === 'product_delete' ? 'Eliminar' :
                                 log.action === 'stock_transfer' ? 'Transferir' :
                                 log.action === 'stock_adjustment' ? 'Ajustar' :
                                 log.action === 'sale_cancellation_stock_return' ? 'Devolver Stock' :
                                 log.action === 'sale_cancellation_stock_return_batch' ? 'Devolver Stock Masivo' :
                                 log.action) :
                              log.module === 'transfers' ?
                                (log.action === 'transfer_created' ? 'Transferencia Creada' :
                                 log.action === 'transfer_received' ? 'Transferencia Recibida' :
                                 log.action === 'transfer_cancelled' ? 'Transferencia Cancelada' :
                                 log.action) :
                              log.module === 'categories' ?
                                (log.action === 'category_create' ? 'Crear' :
                                 log.action === 'category_update' ? 'Actualizar' :
                                 log.action === 'category_delete' ? 'Eliminar' :
                                 log.action) :
                              log.module === 'clients' ?
                                (log.action === 'client_create' ? 'Crear Cliente' :
                                 log.action === 'client_update' ? 'Actualizar Cliente' :
                                 log.action === 'client_delete' ? 'Eliminar Cliente' :
                                 log.action) :
                              log.module === 'warranties' ?
                                (log.action === 'warranty_create' ? 'Crear Garantía' :
                                 log.action === 'warranty_status_update' ? 'Actualizar Estado' :
                                 log.action === 'warranty_update' ? 'Actualizar Garantía' :
                                 log.action) :
                             log.module === 'credits' ?
                               (log.action === 'credit_create' ? 'Crear Crédito' :
                                log.action === 'credit_payment' ? ((log.details as any)?.isCompleted ? 'Pago Completado' : 'Registrar Abono') :
                                log.action === 'credit_completed' ? 'Completar Crédito' :
                                log.action === 'credit_cancelled' ? 'Cancelar Crédito' :
                                log.action) :
                              log.action
                            }
                          >
                            {log.module === 'auth' ? 'Acceso' :
                             log.module === 'sales' ?
                               (log.action === 'sale_create' ? 'Crear Venta' :
                                log.action === 'credit_sale_create' ? 'Crear Venta a Crédito' :
                                log.action === 'sale_cancel' ? 'Cancelar Venta' :
                                log.action === 'sale_stock_deduction' ? 'Descontar Stock' :
                                log.action === 'sale_cancellation_stock_return' ? 'Devolver Stock' :
                                log.action === 'sale_cancellation_stock_return_batch' ? 'Devolver Stock Masivo' :
                                log.action) :
                             log.module === 'products' ? 
                               (log.action === 'product_create' ? 'Crear' :
                                log.action === 'product_update' ? 'Actualizar' :
                                log.action === 'product_delete' ? 'Eliminar' :
                                log.action === 'stock_transfer' ? 'Transferir' :
                                log.action === 'stock_adjustment' ? 'Ajustar' :
                                log.action === 'sale_cancellation_stock_return' ? 'Devolver Stock' :
                                log.action === 'sale_cancellation_stock_return_batch' ? 'Devolver Stock Masivo' :
                                log.action) :
                             log.module === 'transfers' ?
                               (log.action === 'transfer_created' ? 'Transferencia' :
                                log.action === 'transfer_received' ? 'Transferencia' :
                                log.action === 'transfer_cancelled' ? 'Cancelar Transferencia' :
                                log.action) :
                             log.module === 'categories' ?
                               (log.action === 'category_create' ? 'Crear' :
                                log.action === 'category_update' ? 'Actualizar' :
                                log.action === 'category_delete' ? 'Eliminar' :
                                log.action) :
                             log.module === 'clients' ?
                               (log.action === 'client_create' ? 'Crear Cliente' :
                                log.action === 'client_update' ? 'Actualizar Cliente' :
                                log.action === 'client_delete' ? 'Eliminar Cliente' :
                                log.action) :
                             log.module === 'warranties' ?
                               (log.action === 'warranty_create' ? 'Crear Garantía' :
                                log.action === 'warranty_status_update' ? 'Actualizar Estado' :
                                log.action === 'warranty_update' ? 'Actualizar Garantía' :
                                log.action) :
                             log.module === 'credits' ?
                               (log.action === 'credit_create' ? 'Crear Crédito' :
                                log.action === 'credit_payment' ? ((log.details as any)?.isCompleted ? 'Pago Completado' : 'Registrar Abono') :
                                log.action === 'credit_completed' ? 'Completar Crédito' :
                                log.action === 'credit_cancelled' ? 'Cancelar Crédito' :
                                log.action) :
                             log.action}
                          </div>
                        </td>
                        <td className="pl-3 md:pl-4 pr-1 md:pr-2 py-2 md:py-4 hidden lg:table-cell">
                          <div 
                            className="text-xs md:text-sm text-gray-600 dark:text-gray-300 leading-relaxed overflow-hidden text-overflow-ellipsis line-clamp-2" 
                            title={
                              log.details ? 
                                (log.module === 'sales' ?
                                  (log.action === 'sale_create' ? `Nueva venta: ${log.details.clientName || 'Cliente'} - $${(log.details.total || 0).toLocaleString('es-CO')}` :
                                   log.action === 'credit_sale_create' ? `Venta a crédito: ${log.details.clientName || 'Cliente'} - $${(log.details.total || 0).toLocaleString('es-CO')}` :
                                   log.action === 'sale_cancel' ? ((log.details as any)?.isCreditSale 
                                     ? `Factura perteneciente a un crédito cancelada: ${log.details.invoiceNumber || 'N/A'} - ${log.details.reason || 'Sin motivo'}`
                                     : `Venta cancelada: ${log.details.reason || 'Sin motivo'}`) :
                                   log.action === 'sale_stock_deduction' ? log.details.description || 'Stock descontado por venta' :
                                   log.action === 'sale_cancellation_stock_return' ? log.details.description || 'Stock devuelto por cancelación' :
                                   log.details.description || log.action) :
                                 log.module === 'roles' ? 
                                  (log.action === 'Usuario Creado' ? `Nuevo usuario: ${log.details.newUser?.name || 'Usuario'}` :
                                   log.action === 'Usuario Editado' ? `Actualización: ${log.details.userName || 'Usuario'}` :
                                   log.action === 'Usuario Eliminado' ? `Usuario eliminado: ${log.details.deletedUser?.name || 'Usuario'}` :
                                   log.action === 'Permisos Asignados' ? `${log.details.description || 'Permisos asignados'}` :
                                   log.action) :
                                  log.module === 'transfers' ?
                                    (log.action === 'transfer_created' || log.action === 'transfer_received' || log.action === 'transfer_cancelled' ?
                                      (() => {
                                        if (log.action === 'transfer_cancelled') {
                                          return log.details.description || 'Transferencia cancelada'
                                        }
                                        const products = (log.details as any)?.products
                                        if (products && Array.isArray(products) && products.length > 0) {
                                          const productsList = products.map((p: any) => 
                                            `${p.quantity || 0} ${p.productName || 'Producto'}${p.productReference ? ` (${p.productReference})` : ''}`
                                          ).join(', ')
                                          return productsList
                                        }
                                        return log.details.description || 'Transferencia de productos'
                                      })() :
                                      log.details.description || 'Transferencia') :
                                  log.module === 'products' ?
                                    (log.details.description || log.action) :
                                  log.module === 'categories' ?
                                    (log.action === 'category_create' ? `Nueva categoría: "${log.details.categoryName || 'Categoría'}"` :
                                     log.action === 'category_update' ? `Categoría actualizada: "${log.details.categoryName || 'Categoría'}"` :
                                     log.action === 'category_delete' ? `Categoría eliminada: "${log.details.categoryName || 'Categoría'}"` :
                                     log.details.description || log.action) :
                                  log.module === 'clients' ?
                                    (log.action === 'client_create' ? `Nuevo cliente: "${log.details.clientName || 'Cliente'}"` :
                                     log.action === 'client_update' ? `Cliente actualizado: "${log.details.clientName || 'Cliente'}"` :
                                     log.action === 'client_delete' ? `Cliente eliminado: "${log.details.clientName || 'Cliente'}"` :
                                     log.details.description || log.action) :
                                  log.module === 'warranties' ?
                                    (log.action === 'warranty_create' ? `Nueva garantía: "${log.details.clientName || 'Cliente'}" - ${log.details.productReceivedName || 'Producto'}` :
                                     log.action === 'warranty_status_update' ? `Estado actualizado: ${log.details.previousStatus || 'N/A'} → ${log.details.newStatus || 'N/A'}` :
                                     log.action === 'warranty_update' ? `Garantía actualizada: "${log.details.clientName || 'Cliente'}"` :
                                     log.details.description || log.action) :
                                  log.module === 'credits' ?
                                    (log.action === 'credit_create' ? `Crédito creado: ${log.details.clientName || 'Cliente'} - Factura: ${log.details.invoiceNumber || 'N/A'} - Monto: $${(log.details.totalAmount || 0).toLocaleString('es-CO')}` :
                                     log.action === 'credit_payment' ? ((log.details as any)?.isCompleted 
                                       ? `Pago completado: ${log.details.clientName || 'Cliente'} - Factura: ${log.details.invoiceNumber || 'N/A'} - Monto: $${(log.details.paymentAmount || 0).toLocaleString('es-CO')}`
                                       : `Abono registrado: ${log.details.clientName || 'Cliente'} - Factura: ${log.details.invoiceNumber || 'N/A'} - Monto: $${(log.details.paymentAmount || 0).toLocaleString('es-CO')}`) :
                                     log.action === 'credit_completed' ? `Crédito completado: ${log.details.clientName || 'Cliente'} - Factura: ${log.details.invoiceNumber || 'N/A'}` :
                                     log.action === 'credit_cancelled' ? `Crédito cancelado: ${log.details.clientName || 'Cliente'} - Factura: ${log.details.invoiceNumber || 'N/A'}` :
                                     log.details.description || log.action) :
                                  log.module === 'auth' ? 
                                    `Ingresó al sistema` :
                                  log.action) :
                                log.module === 'auth' ? 
                                  `Ingresó al sistema` :
                                log.action
                            }
                          >
                            {log.details ? 
                              (log.module === 'sales' ?
                                (log.action === 'sale_create' ? `Nueva venta: ${log.details.clientName || 'Cliente'} - $${(log.details.total || 0).toLocaleString('es-CO')}` :
                                 log.action === 'credit_sale_create' ? `Venta a crédito: ${log.details.clientName || 'Cliente'} - $${(log.details.total || 0).toLocaleString('es-CO')}` :
                                 log.action === 'sale_cancel' ? ((log.details as any)?.isCreditSale 
                                   ? `Factura perteneciente a un crédito cancelada: ${log.details.invoiceNumber || 'N/A'} - ${log.details.reason || 'Sin motivo'}`
                                   : `Venta cancelada: ${log.details.reason || 'Sin motivo'}`) :
                                 log.action === 'sale_stock_deduction' ? log.details.description || 'Stock descontado por venta' :
                                 log.action === 'sale_cancellation_stock_return' ? log.details.description || 'Stock devuelto por cancelación' :
                                 log.details.description || log.action) :
                               log.module === 'roles' ? 
                                (log.action === 'Usuario Creado' ? `Nuevo usuario: ${log.details.newUser?.name || 'Usuario'}` :
                                 log.action === 'Usuario Editado' ? `Actualización: ${log.details.userName || 'Usuario'}` :
                                 log.action === 'Usuario Eliminado' ? `Usuario eliminado: ${log.details.deletedUser?.name || 'Usuario'}` :
                                 log.action === 'Permisos Asignados' ? `${log.details.description || 'Permisos asignados'}` :
                                 log.action) :
                                log.module === 'transfers' ?
                                  (log.action === 'transfer_created' || log.action === 'transfer_received' || log.action === 'transfer_cancelled' ?
                                    (() => {
                                      if (log.action === 'transfer_cancelled') {
                                        return log.details.description || 'Transferencia cancelada'
                                      }
                                      const products = (log.details as any)?.products
                                      if (products && Array.isArray(products) && products.length > 0) {
                                        const productsList = products.map((p: any) => 
                                          `${p.quantity || 0} ${p.productName || 'Producto'}${p.productReference ? ` (${p.productReference})` : ''}`
                                        ).join(', ')
                                        return productsList
                                      }
                                      return log.details.description || 'Transferencia de productos'
                                    })() :
                                    log.details.description || 'Transferencia') :
                                log.module === 'products' ?
                                  (log.details.description || log.action) :
                                log.module === 'categories' ?
                                  (log.action === 'category_create' ? `Nueva categoría: "${log.details.categoryName || 'Categoría'}"` :
                                   log.action === 'category_update' ? `Categoría actualizada: "${log.details.categoryName || 'Categoría'}"` :
                                   log.action === 'category_delete' ? `Categoría eliminada: "${log.details.categoryName || 'Categoría'}"` :
                                   log.details.description || log.action) :
                                log.module === 'clients' ?
                                  (log.action === 'client_create' ? `Nuevo cliente: "${log.details.clientName || 'Cliente'}"` :
                                   log.action === 'client_update' ? 
                                     (log.details.changes && Object.keys(log.details.changes).length > 0
                                       ? `Cliente actualizado: "${log.details.clientName || 'Cliente'}" - Campos: ${Object.keys(log.details.changes).join(', ')}`
                                       : `Cliente actualizado: "${log.details.clientName || 'Cliente'}"`) :
                                   log.action === 'client_delete' ? `Cliente eliminado: "${log.details.clientName || 'Cliente'}"` :
                                   log.details.description || log.action) :
                                log.module === 'warranties' ?
                                  (log.action === 'warranty_create' ? `Nueva garantía: "${log.details.clientName || 'Cliente'}" - ${log.details.productReceivedName || 'Producto'}` :
                                   log.action === 'warranty_status_update' ? `Estado actualizado: ${log.details.previousStatus || 'N/A'} → ${log.details.newStatus || 'N/A'}` :
                                   log.action === 'warranty_update' ? `Garantía actualizada: "${log.details.clientName || 'Cliente'}"` :
                                   log.details.description || log.action) :
                                log.module === 'credits' ?
                                  (log.action === 'credit_create' ? `Crédito creado: ${log.details.clientName || 'Cliente'} - Factura: ${log.details.invoiceNumber || 'N/A'} - Monto: $${(log.details.totalAmount || 0).toLocaleString('es-CO')}` :
                                   log.action === 'credit_payment' ? ((log.details as any)?.isCompleted 
                                     ? `Pago completado: ${log.details.clientName || 'Cliente'} - Factura: ${log.details.invoiceNumber || 'N/A'} - Monto: $${(log.details.paymentAmount || 0).toLocaleString('es-CO')}`
                                     : `Abono registrado: ${log.details.clientName || 'Cliente'} - Factura: ${log.details.invoiceNumber || 'N/A'} - Monto: $${(log.details.paymentAmount || 0).toLocaleString('es-CO')}`) :
                                   log.action === 'credit_completed' ? `Crédito completado: ${log.details.clientName || 'Cliente'} - Factura: ${log.details.invoiceNumber || 'N/A'}` :
                                   log.action === 'credit_cancelled' ? `Crédito cancelado: ${log.details.clientName || 'Cliente'} - Factura: ${log.details.invoiceNumber || 'N/A'}` :
                                   log.details.description || log.action) :
                                log.module === 'auth' ? 
                                  `Ingresó al sistema` :
                                log.action) :
                              log.module === 'auth' ? 
                                `Ingresó al sistema` :
                              log.action}
                          </div>
                        </td>
                        <td className="pl-3 md:pl-4 pr-1 md:pr-2 py-2 md:py-4 hidden lg:table-cell">
                          <div className="text-xs md:text-sm text-gray-900 dark:text-white truncate" title={log.user_name || 'Desconocido'}>
                            {log.user_name || 'Desconocido'}
                          </div>
                        </td>
                        <td className="pl-3 md:pl-4 pr-3 md:pr-4 py-2 md:py-4">
                          <div className="text-xs md:text-sm text-gray-600 dark:text-gray-300">
                            {new Date(log.created_at).toLocaleDateString('es-CO', {
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </td>
                        <td className="pl-3 md:pl-4 pr-3 md:pr-4 py-2 md:py-4 text-center">
                          <div className="flex items-center justify-center">
                            <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Paginación */}
      {totalLogs > 20 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-3 md:px-6 py-3 md:py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
          {/* Información de página */}
          <div className="text-xs md:text-sm text-gray-600 dark:text-gray-400 text-center sm:text-left">
            <span className="hidden sm:inline">Mostrando </span>
            <span className="font-semibold">{((currentPage - 1) * 20) + 1}</span>
            <span className="hidden sm:inline"> - </span>
            <span className="sm:hidden">-</span>
            <span className="font-semibold">{Math.min(currentPage * 20, totalLogs)}</span>
            <span className="hidden sm:inline"> de </span>
            <span className="sm:hidden">/</span>
            <span className="font-semibold">{totalLogs}</span>
            <span className="hidden md:inline"> registros</span>
          </div>
          
          {/* Controles de paginación */}
          <div className="flex items-center space-x-1 md:space-x-2">
            {/* Botón Anterior */}
            <button
              onClick={() => onPageChange && onPageChange(currentPage - 1)}
              disabled={currentPage === 1 || loading}
              className="px-2 md:px-3 py-1.5 text-xs md:text-sm rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-95"
            >
              <span className="hidden sm:inline">Anterior</span>
              <span className="sm:hidden">‹</span>
            </button>
            
            {/* Números de página */}
            <div className="flex items-center space-x-0.5 md:space-x-1">
              {Array.from({ length: Math.ceil(totalLogs / 20) }, (_, i) => i + 1)
                .filter(page => {
                  // Mostrar solo páginas cercanas a la actual
                  return page === 1 || 
                         page === Math.ceil(totalLogs / 20) || 
                         Math.abs(page - currentPage) <= 2
                })
                .map((page, index, array) => {
                  // Agregar "..." si hay gap
                  const showEllipsis = index > 0 && page - array[index - 1] > 1
                  
                  return (
                    <div key={page} className="flex items-center">
                      {showEllipsis && (
                        <span className="px-1 md:px-2 text-gray-400 text-xs md:text-sm">...</span>
                      )}
                      <button
                        onClick={() => onPageChange && onPageChange(page)}
                        disabled={loading}
                        className={`px-2 md:px-3 py-1.5 text-xs md:text-sm rounded-md transition-colors min-w-[28px] md:min-w-[32px] active:scale-95 ${
                          page === currentPage 
                            ? "bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 font-medium" 
                            : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                        }`}
                      >
                        {page}
                      </button>
                    </div>
                  )
                })}
            </div>
            
            {/* Botón Siguiente */}
            <button
              onClick={() => onPageChange && onPageChange(currentPage + 1)}
              disabled={currentPage >= Math.ceil(totalLogs / 20) || loading}
              className="px-2 md:px-3 py-1.5 text-xs md:text-sm rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-95"
            >
              <span className="hidden sm:inline">Siguiente</span>
              <span className="sm:hidden">›</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
