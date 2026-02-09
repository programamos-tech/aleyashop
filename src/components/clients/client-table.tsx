'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Search, 
  Plus, 
  Edit, 
  Users,
  Building2,
  User,
  RefreshCcw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { Client } from '@/types'

interface ClientTableProps {
  clients: Client[]
  currentPage: number
  totalClients: number
  loading?: boolean
  onPageChange: (page: number) => void
  onSearch: (query: string) => Promise<void>
  onEdit: (client: Client) => void
  onDelete: (client: Client) => void
  onCreate: () => void
  onRefresh?: () => void
}

export function ClientTable({ 
  clients, 
  currentPage,
  totalClients,
  loading,
  onPageChange,
  onSearch,
  onEdit, 
  onDelete, 
  onCreate,
  onRefresh
}: ClientTableProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const ITEMS_PER_PAGE = 10

  const handleViewClient = (clientId: string) => {
    router.push(`/clients/${clientId}`)
  }

  // Función helper para identificar si un cliente es una tienda
  const isStoreClient = (client: Client): boolean => {
    if (!client || !client.name) return false
    const nameLower = client.name.toLowerCase()
    // Filtrar clientes que sean tiendas internas
    const storeKeywords = ['aleya', 'tienda', 'sucursal']
    return storeKeywords.some(keyword => nameLower.includes(keyword))
  }

  const getStatusColor = (status: string) => {
    return status === 'active' 
      ? 'bg-green-100 text-green-800 hover:bg-green-200 hover:text-green-900 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30 dark:hover:text-green-300' 
      : 'bg-[#fce4f0] text-[#d06a98] hover:bg-[#f29fc8]/50 hover:text-[#f29fc8] dark:bg-[#f29fc8]/20 dark:text-[#f29fc8] dark:hover:bg-[#f29fc8]/30 dark:hover:text-[#f29fc8]'
  }

  const getTypeColor = (type: string) => {
    // Todos los clientes usan el mismo color rosa de la marca
    return 'bg-[#fce4f0] text-[#d06a98] hover:bg-[#f29fc8]/30 hover:text-[#c55a88] dark:bg-[#f29fc8]/20 dark:text-[#f29fc8] dark:hover:bg-[#f29fc8]/30 dark:hover:text-[#f29fc8]'
  }

  const getTypeLabel = (type: string) => {
    return 'Cliente'
  }

  const getTypeIcon = (type: string) => {
    return User
  }

  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    const handleSearch = async () => {
      await onSearch(searchTerm.trim())
    }
    const timeoutId = setTimeout(handleSearch, 300)
    return () => clearTimeout(timeoutId)
  }, [searchTerm, onSearch])

  const totalPages = Math.ceil(totalClients / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardHeader className="p-3 md:p-6">
          <div className="flex flex-col gap-3 md:gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 md:gap-4">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2 flex-wrap">
                  <Users className="h-5 w-5 md:h-6 md:w-6 text-[#f29fc8] flex-shrink-0" />
                  <span className="flex-shrink-0">Gestión de Clientes</span>
                </CardTitle>
                <p className="text-xs md:text-base text-gray-600 dark:text-gray-300 mt-1 hidden md:block">
                  Administra tus clientes y ve su historial de compras
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 md:hidden">
                  Administra tus clientes
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
                  <span className="hidden sm:inline">Nuevo Cliente</span>
                  <span className="sm:hidden">Nuevo</span>
                </Button>
              </div>
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
                placeholder="Buscar cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 md:pl-10 pr-4 py-2 md:py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#fce4f0]0 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
              {loading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#f29fc8]"></div>
                </div>
              )}
            </div>
{/* Filtro por tipo eliminado - todos son clientes */}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardContent className="p-0">
          {clients.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No se encontraron clientes
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Comienza creando un nuevo cliente
              </p>
            </div>
          ) : (
            <>
              {/* Vista de Tarjetas para Mobile */}
              <div className="md:hidden space-y-3 p-3">
                {clients.map((client, index) => {
                  const TypeIcon = getTypeIcon(client.type)
                  return (
                    <div
                      key={client.id}
                      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2 cursor-pointer hover:border-[#f29fc8] hover:shadow-md transition-all"
                      onClick={() => handleViewClient(client.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                              #{startIndex + index + 1}
                            </span>
                            <span className="text-xs font-mono font-semibold text-gray-600 dark:text-gray-300">{client.document}</span>
                          </div>
                          <h3 
                            className="font-semibold text-sm text-gray-900 dark:text-white truncate cursor-pointer hover:text-[#f29fc8] transition-colors" 
                            title={client.name}
                            onClick={() => handleViewClient(client.id)}
                          >
                            {client.name}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={getTypeLabel(client.type)}>
                            {getTypeLabel(client.type)}
                          </p>
                        </div>
                        <Badge className={`${getStatusColor(client.status)} text-xs shrink-0`}>
                          <div className="flex items-center space-x-1">
                            {client.status === 'active' ? (
                              <span className="text-green-600 dark:text-green-400">●</span>
                            ) : (
                              <span className="text-[#f29fc8] dark:text-[#f29fc8]">●</span>
                            )}
                            <span className="hidden sm:inline">{client.status === 'active' ? 'Activo' : 'Inactivo'}</span>
                          </div>
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <div className="text-center">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Email</div>
                          <div className="text-xs font-semibold text-gray-900 dark:text-white truncate" title={client.email || 'Sin email'}>
                            {client.email || 'Sin email'}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Teléfono</div>
                          <div className="text-xs font-semibold text-gray-900 dark:text-white truncate" title={client.phone || 'Sin teléfono'}>
                            {client.phone || 'Sin teléfono'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                        <Badge className={`${getTypeColor(client.type)} text-xs`} title={getTypeLabel(client.type)}>
                          {getTypeLabel(client.type)}
                        </Badge>
                        {!isStoreClient(client) && (
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onEdit(client)}
                              className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 active:scale-95"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        {isStoreClient(client) && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 italic">
                            Editar desde Microtiendas
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Vista de Cards para Desktop */}
              <div className="hidden md:block space-y-4 p-4 md:p-6">
                {clients.map((client, index) => {
                  const TypeIcon = getTypeIcon(client.type)
                  return (
                    <Card
                      key={client.id}
                      className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-[#f29fc8] transition-all cursor-pointer"
                      onClick={() => handleViewClient(client.id)}
                    >
                      <CardContent className="p-4 md:p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <TypeIcon className="h-5 w-5 text-[#f29fc8] dark:text-[#f29fc8] flex-shrink-0" />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                <div className="text-sm font-mono font-semibold text-blue-600 dark:text-blue-400">
                                  #{startIndex + index + 1} · {client.document}
                                </div>
                                  {client.status === 'active' && (
                                    <div className="h-4 w-4 rounded-full bg-green-500 flex-shrink-0" title="Activo" />
                                  )}
                                </div>
                                <div className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                                  {client.name}
                                </div>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                              <div>
                                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Tipo</div>
                                <Badge className={`${getTypeColor(client.type)} flex items-center gap-1 w-fit text-sm whitespace-nowrap`}>
                                  {getTypeLabel(client.type)}
                                </Badge>
                              </div>
                              <div>
                                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Email</div>
                                <div className="text-sm font-semibold text-gray-900 dark:text-white truncate" title={client.email || 'Sin email'}>
                                  {client.email || 'Sin email'}
                                </div>
                              </div>
                              <div>
                                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Teléfono</div>
                                <div className="text-sm font-semibold text-gray-900 dark:text-white truncate" title={client.phone || 'Sin teléfono'}>
                                  {client.phone || 'Sin teléfono'}
                                </div>
                              </div>
                              <div>
                                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Estado</div>
                                <Badge className={`${getStatusColor(client.status)} flex items-center gap-1 w-fit text-sm whitespace-nowrap`}>
                                  {client.status === 'active' ? 'Activo' : 'Inactivo'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          
                          {!isStoreClient(client) && (
                            <div className="flex items-center gap-2 ml-4">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onEdit(client)
                                }}
                                className="h-10 w-10 p-0 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
                                title="Editar cliente"
                              >
                                <Edit className="h-5 w-5" />
                              </Button>
                            </div>
                          )}
                          {isStoreClient(client) && (
                            <div className="flex items-center ml-4">
                              <span className="text-sm text-gray-500 dark:text-gray-400 italic">
                                Editar desde Microtiendas
                              </span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 px-4 md:px-6">
              <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="h-7 w-7 flex items-center justify-center rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>

              <div className="flex items-center gap-0.5">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  if (
                    page === 1 ||
                    page === 2 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={page}
                        onClick={() => onPageChange(page)}
                        className={`h-7 w-7 flex items-center justify-center rounded-md text-sm transition-colors ${
                          currentPage === page
                            ? 'bg-[#fce4f0] text-[#d06a98] dark:bg-[#f29fc8]/20 dark:text-[#f29fc8] font-medium'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800'
                        }`}
                      >
                        {page}
                      </button>
                    )
                  }
                  if (page === currentPage - 2 || page === currentPage + 2) {
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
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="h-7 w-7 flex items-center justify-center rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
