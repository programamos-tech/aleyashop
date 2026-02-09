'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { Client } from '@/types'
import { ClientsService } from '@/lib/clients-service'
import { useAuth } from './auth-context'

interface ClientsContextType {
  clients: Client[]
  loading: boolean
  currentPage: number
  totalClients: number
  hasMore: boolean
  getAllClients: () => Promise<void>
  getClientById: (id: string) => Promise<Client | null>
  createClient: (clientData: Omit<Client, 'id' | 'createdAt'>) => Promise<{ client: Client | null, error: string | null }>
  updateClient: (id: string, updates: Partial<Client>) => Promise<boolean>
  deleteClient: (id: string) => Promise<boolean>
  searchClients: (query: string) => Promise<void>
  goToPage: (page: number) => Promise<void>
}

const ClientsContext = createContext<ClientsContextType | undefined>(undefined)

export function ClientsProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalClients, setTotalClients] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const { user } = useAuth()
  const ITEMS_PER_PAGE = 10

  const fetchClients = useCallback(async (page: number = 1, query: string = '') => {
    setLoading(true)
    try {
      const result = await ClientsService.getClientsByPage(page, ITEMS_PER_PAGE, query)
      setClients(result.clients)
      setCurrentPage(page)
      setTotalClients(result.total)
      setHasMore(result.hasMore)
    } catch (error) {
      // Error silencioso en producción
      setClients([])
      setTotalClients(0)
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }, [user?.storeId])

  const getAllClients = useCallback(async () => {
    setSearchQuery('')
    await fetchClients(1, '')
  }, [fetchClients])

  const getClientById = async (id: string): Promise<Client | null> => {
    try {
      return await ClientsService.getClientById(id)
    } catch (error) {
      // Error silencioso en producción
      return null
    }
  }

  const createClient = async (clientData: Omit<Client, 'id' | 'createdAt'>): Promise<{ client: Client | null, error: string | null }> => {
    try {
      const result = await ClientsService.createClient(clientData, user?.id)
      if (result.client) {
        await fetchClients(1, searchQuery)
      }
      return result
    } catch (error) {
      // Error silencioso en producción
      return { client: null, error: 'Error inesperado al crear el cliente.' }
    }
  }

  const updateClient = async (id: string, updates: Partial<Client>): Promise<boolean> => {
    try {
      const success = await ClientsService.updateClient(id, updates, user?.id)
      if (success) {
        await fetchClients(currentPage, searchQuery)
        return true
      }
      return false
    } catch (error) {
      // Error silencioso en producción
      return false
    }
  }

  const deleteClient = async (id: string): Promise<boolean> => {
    try {
      const success = await ClientsService.deleteClient(id, user?.id)
      if (success) {
        const nextPage = currentPage > 1 && clients.length === 1 ? currentPage - 1 : currentPage
        await fetchClients(nextPage, searchQuery)
        return true
      }
      return false
    } catch (error) {
      // Error silencioso en producción
      return false
    }
  }

  const searchClients = useCallback(async (query: string): Promise<void> => {
    try {
      setSearchQuery(query)
      await fetchClients(1, query)
    } catch (error) {
      // Error silencioso en producción
      setClients([])
    }
  }, [fetchClients])

  const goToPage = useCallback(async (page: number) => {
    const totalPages = Math.ceil(totalClients / ITEMS_PER_PAGE)
    if (page >= 1 && page <= totalPages && !loading) {
      await fetchClients(page, searchQuery)
    }
  }, [fetchClients, searchQuery, totalClients, loading])

  // Cargar clientes al inicializar
  useEffect(() => {
    getAllClients()
  }, [getAllClients, user?.storeId])

  return (
    <ClientsContext.Provider value={{
      clients,
      loading,
      currentPage,
      totalClients,
      hasMore,
      getAllClients,
      getClientById,
      createClient,
      updateClient,
      deleteClient,
      searchClients,
      goToPage
    }}>
      {children}
    </ClientsContext.Provider>
  )
}

export function useClients() {
  const context = useContext(ClientsContext)
  if (context === undefined) {
    throw new Error('useClients must be used within a ClientsProvider')
  }
  return context
}
