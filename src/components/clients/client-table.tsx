'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Users,
  Building2,
  User,
  RefreshCcw
} from 'lucide-react'
import { Client } from '@/types'

interface ClientTableProps {
  clients: Client[]
  onEdit: (client: Client) => void
  onDelete: (client: Client) => void
  onCreate: () => void
  onRefresh?: () => void
}

export function ClientTable({ 
  clients, 
  onEdit, 
  onDelete, 
  onCreate,
  onRefresh
}: ClientTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')

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
    switch (type) {
      case 'mayorista':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200 hover:text-blue-900 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30 dark:hover:text-blue-300'
      case 'minorista':
        return 'bg-green-100 text-green-800 hover:bg-green-200 hover:text-green-900 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30 dark:hover:text-green-300'
      case 'consumidor_final':
        return 'bg-purple-100 text-purple-800 hover:bg-purple-200 hover:text-purple-900 dark:bg-purple-900/20 dark:text-purple-400 dark:hover:bg-purple-900/30 dark:hover:text-purple-300'
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200 hover:text-gray-900 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 dark:hover:text-gray-200'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'mayorista':
        return 'Mayorista'
      case 'minorista':
        return 'Minorista'
      case 'consumidor_final':
        return 'Cliente Final'
      default:
        return type
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'mayorista':
        return Building2
      case 'minorista':
        return Building2
      case 'consumidor_final':
        return User
      default:
        return User
    }
  }

  const types = ['all', 'mayorista', 'minorista', 'consumidor_final']

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.phone.includes(searchTerm) ||
                         client.document.includes(searchTerm) ||
                         client.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.state.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === 'all' || client.type === filterType
    return matchesSearch && matchesType
  })

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
                  Administra tus clientes minoristas, mayoristas y consumidores finales
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
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full sm:w-auto sm:min-w-[200px] px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#fce4f0]0 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700"
            >
              {types.map(type => (
                <option key={type} value={type}>
                  {type === 'all' ? 'Todos los tipos' : getTypeLabel(type)}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardContent className="p-0">
          {filteredClients.length === 0 ? (
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
                {filteredClients.map((client, index) => {
                  const TypeIcon = getTypeIcon(client.type)
                  return (
                    <div
                      key={client.id}
                      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">#{index + 1}</span>
                            <span className="text-xs font-mono font-semibold text-gray-600 dark:text-gray-300">{client.document}</span>
                          </div>
                          <h3 className="font-semibold text-sm text-gray-900 dark:text-white truncate" title={client.name}>
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
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onEdit(client)}
                              className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 active:scale-95"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onDelete(client)}
                              className="h-8 w-8 p-0 text-[#f29fc8] hover:text-[#f29fc8] dark:text-[#f29fc8] dark:hover:text-[#fce4f0] active:scale-95"
                            >
                              <Trash2 className="h-4 w-4" />
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
                {filteredClients.map((client, index) => {
                  const TypeIcon = getTypeIcon(client.type)
                  return (
                    <Card
                      key={client.id}
                      className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all"
                    >
                      <CardContent className="p-4 md:p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <TypeIcon className="h-5 w-5 text-[#f29fc8] dark:text-[#f29fc8] flex-shrink-0" />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <div className="text-sm font-mono font-semibold text-blue-600 dark:text-blue-400">
                                    {client.document}
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
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onDelete(client)
                                }}
                                className="h-10 w-10 p-0 text-[#f29fc8] hover:text-[#f29fc8] dark:text-[#f29fc8] dark:hover:text-[#fce4f0] hover:bg-[#fce4f0] dark:hover:bg-[#f29fc8]/20"
                                title="Eliminar cliente"
                              >
                                <Trash2 className="h-5 w-5" />
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
        </CardContent>
      </Card>
    </div>
  )
}
