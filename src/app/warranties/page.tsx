'use client'

import { useState, useMemo } from 'react'
import { WarrantyTable } from '@/components/warranties/warranty-table'
import { WarrantyDetailModal } from '@/components/warranties/warranty-detail-modal'
import { WarrantyModal } from '@/components/warranties/warranty-modal'
import { useWarranties } from '@/contexts/warranty-context'
import { Warranty } from '@/types'

export default function WarrantiesPage() {
  const {
    warranties,
    loading,
    createWarranty,
    updateWarrantyStatus,
    searchWarranties,
    refreshWarranties
  } = useWarranties()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedWarranty, setSelectedWarranty] = useState<Warranty | null>(null)
  const [searchResults, setSearchResults] = useState<Warranty[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const handleRefresh = async () => {
    await refreshWarranties()
  }

  const handleCreateWarranty = () => {
    setSelectedWarranty(null)
    setShowCreateModal(true)
  }

  const handleViewWarranty = (warranty: Warranty) => {
    setSelectedWarranty(warranty)
    setShowDetailModal(true)
  }

  const handleEditWarranty = (warranty: Warranty) => {
    // Modal de edición eliminado - las garantías se completan automáticamente

  }

  const handleSaveWarranty = async (warrantyData: Omit<Warranty, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await createWarranty(warrantyData)
      setShowCreateModal(false)
      setShowEditModal(false)
      await refreshWarranties()
    } catch (error) {
      // Error silencioso en producción
    }
  }

  const handleStatusChange = async (warrantyId: string, newStatus: string, notes?: string) => {
    try {
      await updateWarrantyStatus(warrantyId, newStatus, notes)
      await refreshWarranties()
    } catch (error) {
      // Error silencioso en producción
    }
  }

  const handleSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    try {
      const results = await searchWarranties(searchTerm)
      setSearchResults(results)
    } catch (error) {
      // Error silencioso en producción
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const warrantiesToShow = searchResults.length > 0 ? searchResults : warranties

  // Calcular cantidad de garantías creadas hoy
  const todayWarrantiesCount = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    return warranties.filter(warranty => {
      const warrantyDate = new Date(warranty.createdAt)
      return warrantyDate >= today && warrantyDate < tomorrow
    }).length
  }, [warranties])

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <WarrantyTable
        todayWarrantiesCount={todayWarrantiesCount}
          warranties={warrantiesToShow}
          loading={loading || isSearching}
          onCreate={handleCreateWarranty}
          onView={handleViewWarranty}
          onEdit={handleEditWarranty}
          onStatusChange={handleStatusChange}
          onSearch={handleSearch}
          onRefresh={handleRefresh}
        />

        {/* Modales */}
        {showCreateModal && (
          <WarrantyModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onSave={handleSaveWarranty}
          />
        )}

        {showEditModal && selectedWarranty && (
          <WarrantyModal
            isOpen={showEditModal}
            onClose={() => setShowEditModal(false)}
            onSave={handleSaveWarranty}
            warranty={selectedWarranty}
          />
        )}

        {showDetailModal && selectedWarranty && (
          <WarrantyDetailModal
            warranty={selectedWarranty}
            isOpen={showDetailModal}
            onClose={() => setShowDetailModal(false)}
            onEdit={handleEditWarranty}
            onStatusChange={handleStatusChange}
          />
        )}

    </div>
  )
}
