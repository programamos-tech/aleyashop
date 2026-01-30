'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { LogsTable } from '@/components/logs/logs-table'
import { LogDetailModal } from '@/components/logs/log-detail-modal'
import { LogsService, LogEntry } from '@/lib/logs-service'

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [moduleFilter, setModuleFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalLogs, setTotalLogs] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  // Cargar logs iniciales al montar el componente y cuando cambie el filtro
  useEffect(() => {
    loadLogs(1)
  }, [moduleFilter])

  const loadLogs = async (page: number = 1) => {
    setLoading(true)
    try {
      let logsData: LogEntry[] = []
      let total = 0
      let hasMoreData = false

      if (moduleFilter === 'all') {
        // Cargar todos los logs con paginación
        const result = await LogsService.getLogsByPage(page, 20)
        logsData = result.logs
        total = result.total
        hasMoreData = result.hasMore
      } else if (moduleFilter === 'credits') {
        // Para créditos, cargar todos los logs y filtrar en el cliente
        // porque necesitamos incluir logs de módulo 'sales' con acciones de crédito
        const allLogs = await LogsService.getAllLogs()
        const filtered = allLogs.filter(log => 
          log.module === 'credits' || 
          (log.module === 'sales' && (log.action === 'credit_sale_create' || 
            (log.action === 'sale_cancel' && (log.details as any)?.isCreditSale === true)))
        )
        total = filtered.length
        const offset = (page - 1) * 20
        logsData = filtered.slice(offset, offset + 20)
        hasMoreData = offset + 20 < total
      } else {
        // Para otros módulos, cargar por módulo
        const allLogs = await LogsService.getLogsByModule(moduleFilter)
        total = allLogs.length
        const offset = (page - 1) * 20
        logsData = allLogs.slice(offset, offset + 20)
        hasMoreData = offset + 20 < total
      }

      setLogs(logsData)
      setTotalLogs(total)
      setHasMore(hasMoreData)
      setCurrentPage(page)
    } catch (error) {
      // Error silencioso en producción
    } finally {
      setLoading(false)
    }
  }

  const handlePageChange = (page: number) => {
    loadLogs(page)
  }

  const handleCloseDetail = () => {
    setIsDetailModalOpen(false)
    setSelectedLog(null)
  }

  const handleLogClick = (log: LogEntry) => {
    setSelectedLog(log)
    setIsDetailModalOpen(true)
  }

  // Filtrar logs por búsqueda (el filtro de módulo ya se aplica al cargar)
  const filteredLogs = logs.filter(log => {
    if (searchTerm === '') return true
    
    return log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.module.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      JSON.stringify(log.details).toLowerCase().includes(searchTerm.toLowerCase())
  })

  if (loading) {
    return (
      <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f29fc8]"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <LogsTable
        logs={filteredLogs as any}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        moduleFilter={moduleFilter}
        onModuleFilterChange={setModuleFilter}
        onRefresh={() => loadLogs(currentPage)}
        loading={loading}
        currentPage={currentPage}
        totalLogs={totalLogs}
        hasMore={hasMore}
        onPageChange={handlePageChange}
        onLogClick={handleLogClick}
      />

      {/* Mensaje cuando no hay más logs */}
      {!hasMore && logs.length > 0 && (
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500 dark:text-gray-400 text-sm">
            No hay más actividades para mostrar
          </div>
        </div>
      )}

      <LogDetailModal
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetail}
        log={selectedLog as any}
      />
    </div>
  )
}
