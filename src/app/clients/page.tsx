'use client'

import { useState } from 'react'
import { ClientTable } from '@/components/clients/client-table'
import { ClientModal } from '@/components/clients/client-modal'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { useClients } from '@/contexts/clients-context'
import { Client } from '@/types'
import { toast } from 'sonner'
import { Users } from 'lucide-react'

export default function ClientsPage() {
  const { 
    clients, 
    loading, 
    currentPage,
    totalClients,
    createClient, 
    updateClient, 
    deleteClient, 
    getAllClients,
    goToPage,
    searchClients
  } = useClients()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null)

  const handleEdit = (client: Client) => {
    setSelectedClient(client)
    setIsModalOpen(true)
  }

  const handleDelete = (client: Client) => {
    setClientToDelete(client)
    setIsDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (clientToDelete) {
      const success = await deleteClient(clientToDelete.id)
      if (success) {
        toast.success('Cliente eliminado exitosamente')
        setIsDeleteModalOpen(false)
        setClientToDelete(null)
      } else {
        toast.error('Error eliminando cliente')
      }
    }
  }

  const handleRefresh = async () => {
    await getAllClients()
    toast.success('Lista de clientes actualizada')
  }

  const handleCreate = () => {
    setSelectedClient(null)
    setIsModalOpen(true)
  }

  const handleSaveClient = async (clientData: Omit<Client, 'id'>) => {
    if (selectedClient) {
      // Edit existing client
      const success = await updateClient(selectedClient.id, clientData)
      if (success) {
        toast.success('Cliente actualizado exitosamente')
        setIsModalOpen(false)
        setSelectedClient(null)
      } else {
        toast.error('Error actualizando cliente')
      }
    } else {
      // Create new client
      const result = await createClient(clientData)
      if (result.client) {
        toast.success('Cliente creado exitosamente')
        setIsModalOpen(false)
      } else {
        toast.error(result.error || 'Error creando cliente')
      }
    }
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <ClientTable
        clients={clients}
        currentPage={currentPage}
        totalClients={totalClients}
        loading={loading}
        onPageChange={goToPage}
        onSearch={searchClients}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreate={handleCreate}
        onRefresh={handleRefresh}
      />

      <ClientModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedClient(null)
        }}
        onSave={handleSaveClient}
        client={selectedClient}
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false)
          setClientToDelete(null)
        }}
        onConfirm={confirmDelete}
        title="Eliminar Cliente"
        message={`¿Estás seguro de que quieres eliminar el cliente "${clientToDelete?.name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
      />
    </div>
  )
}
