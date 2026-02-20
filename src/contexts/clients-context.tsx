'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { Client } from '@/types'
import { ClientsService } from '@/lib/clients-service'
import { useAuth } from './auth-context'

const PAGE_SIZE = 20

interface ClientsContextType {
  clients: Client[]
  loading: boolean
  totalClients: number
  currentPage: number
  pageSize: number
  getAllClients: () => Promise<void>
  fetchPage: (page: number) => Promise<void>
  getClientById: (id: string) => Promise<Client | null>
  createClient: (clientData: Omit<Client, 'id' | 'createdAt'>) => Promise<{ client: Client | null, error: string | null }>
  updateClient: (id: string, updates: Partial<Client>) => Promise<boolean>
  deleteClient: (id: string) => Promise<boolean>
  searchClients: (query: string) => Promise<Client[]>
}

const ClientsContext = createContext<ClientsContextType | undefined>(undefined)

export function ClientsProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)
  const [totalClients, setTotalClients] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const { user } = useAuth()

  const fetchPage = useCallback(async (page: number) => {
    setLoading(true)
    try {
      const { clients: data, total, hasMore } = await ClientsService.getClientsByPage(page, PAGE_SIZE)
      setClients(data)
      setTotalClients(total)
      setCurrentPage(page)
    } catch (error) {
      setClients([])
      setTotalClients(0)
    } finally {
      setLoading(false)
    }
  }, [user?.storeId])

  const getAllClients = useCallback(async () => {
    await fetchPage(currentPage)
  }, [fetchPage, currentPage])

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
        await fetchPage(1)
      }
      return result
    } catch (error) {
      return { client: null, error: 'Error inesperado al crear el cliente.' }
    }
  }

  const updateClient = async (id: string, updates: Partial<Client>): Promise<boolean> => {
    try {
      const success = await ClientsService.updateClient(id, updates, user?.id)
      if (success) {
        setClients(prev =>
          prev.map(client =>
            client.id === id ? { ...client, ...updates } : client
          )
        )
        return true
      }
      return false
    } catch (error) {
      return false
    }
  }

  const deleteClient = async (id: string): Promise<boolean> => {
    try {
      const success = await ClientsService.deleteClient(id, user?.id)
      if (success) {
        const remaining = clients.filter(c => c.id !== id)
        if (remaining.length === 0 && currentPage > 1) {
          await fetchPage(currentPage - 1)
        } else {
          setClients(remaining)
          setTotalClients(prev => Math.max(0, prev - 1))
        }
        return true
      }
      return false
    } catch (error) {
      return false
    }
  }

  const searchClients = async (query: string): Promise<Client[]> => {
    try {
      return await ClientsService.searchClients(query)
    } catch (error) {
      // Error silencioso en producción
      return []
    }
  }

  useEffect(() => {
    fetchPage(1)
  }, [fetchPage, user?.storeId])

  return (
    <ClientsContext.Provider value={{
      clients,
      loading,
      totalClients,
      currentPage,
      pageSize: PAGE_SIZE,
      getAllClients,
      fetchPage,
      getClientById,
      createClient,
      updateClient,
      deleteClient,
      searchClients
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
