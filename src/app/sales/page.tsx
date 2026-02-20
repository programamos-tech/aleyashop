'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { SalesTable } from '@/components/sales/sales-table'
import { SaleModal } from '@/components/sales/sale-modal'
import SaleDetailModal from '@/components/sales/sale-detail-modal'
import { RoleProtectedRoute } from '@/components/auth/role-protected-route'
import { useSales } from '@/contexts/sales-context'
import { Sale } from '@/types'
import { StoresService } from '@/lib/stores-service'
import { ClientsService } from '@/lib/clients-service'
import { getCurrentUserStoreId } from '@/lib/store-helper'
import { useAuth } from '@/contexts/auth-context'

export default function SalesPage() {
  const router = useRouter()
  const { 
    sales, 
    loading, 
    currentPage, 
    totalSales, 
    hasMore, 
    createSale, 
    updateSale,
    deleteSale, 
    cancelSale,
    finalizeDraftSale,
    goToPage,
    searchSales,
    refreshSales
  } = useSales()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [saleToEdit, setSaleToEdit] = useState<Sale | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  // Marcar como montado para evitar errores de hidratación
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Verificar si hay una factura seleccionada en sessionStorage (solo en cliente)
  useEffect(() => {
    if (!isMounted || typeof window === 'undefined') return
    
    const selectedInvoice = sessionStorage.getItem('selectedInvoice')
    if (selectedInvoice) {
      // Buscar la venta correspondiente a esta factura
      const foundSale = sales.find(sale => 
        sale.invoiceNumber.toLowerCase().includes(selectedInvoice.toLowerCase())
      )
      if (foundSale) {
        setSelectedSale(foundSale)
        setIsDetailModalOpen(true)
        // Limpiar el sessionStorage después de usarlo
        sessionStorage.removeItem('selectedInvoice')
      }
    }
  }, [sales, isMounted])

  // Sincronizar selectedSale con el estado actualizado del contexto
  useEffect(() => {
    if (selectedSale) {
      const updatedSale = sales.find(sale => sale.id === selectedSale.id)
      if (updatedSale && updatedSale.status !== selectedSale.status) {

        setSelectedSale(updatedSale)
      }
    }
  }, [sales, selectedSale])

  const handleEdit = (sale: Sale) => {
    // Solo permitir editar borradores
    if (sale.status === 'draft') {
      setSaleToEdit(sale)
      setIsModalOpen(true)
    }
  }

  const handleDelete = async (sale: Sale) => {
    if (confirm(`¿Estás seguro de que quieres eliminar la venta #${sale.id}?`)) {
      try {
        await deleteSale(sale.id)
      } catch (error) {
      // Error silencioso en producción
        alert('Error al eliminar la venta')
      }
    }
  }

  const handleView = (sale: Sale) => {
    setSelectedSale(sale)
    setIsDetailModalOpen(true)
  }

  const handleRefresh = async () => {
    await refreshSales()
  }

  const handleCreate = () => {
    router.push('/sales/new')
  }

  const handleUpdateSale = async (id: string, saleData: Omit<Sale, 'id' | 'createdAt'>) => {
    try {
      // Convertir a Partial<Sale> para el contexto
      await updateSale(id, saleData as Partial<Sale>)
      setIsModalOpen(false)
      setSaleToEdit(null)
      await refreshSales()
    } catch (error) {
      // Error silencioso en producción
      alert('Error al actualizar el borrador')
    }
  }

  const handleSaveSale = async (saleData: Omit<Sale, 'id' | 'createdAt'>) => {
    try {
      await createSale(saleData)
      setIsModalOpen(false)
    } catch (error) {
      // Error silencioso en producción
      alert('Error al crear la venta')
    }
  }

  const handlePrint = async (sale: Sale) => {
    try {
      // Obtener información de la tienda actual
      const storeId = getCurrentUserStoreId()
      const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
      
      let currentStore
      if (!storeId || storeId === MAIN_STORE_ID) {
        // Obtener tienda principal
        currentStore = await StoresService.getMainStore()
      } else {
        // Obtener micro tienda
        currentStore = await StoresService.getStoreById(storeId)
      }

      // Si no se encuentra la tienda, usar valores por defecto
      if (!currentStore) {
        currentStore = {
          id: MAIN_STORE_ID,
          name: 'Aleya Shop SAS',
          nit: '901522077',
          logo: '/logo.jpeg',
          address: 'Calle 28 N25B - 365 interior 01203 barrio Boston',
          city: '',
          phone: '320 5848594',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      }

      // Obtener cliente real de la API para cédula/documento y datos de domicilio
      let fullClient: Awaited<ReturnType<typeof ClientsService.getClientById>> = null
      let clientDoc = ''
      if (sale.clientId) {
        fullClient = await ClientsService.getClientById(sale.clientId)
        if (fullClient) {
          clientDoc = (fullClient.document && fullClient.document !== 'N/A' ? fullClient.document : '') || (fullClient.nit && fullClient.nit !== 'N/A' ? fullClient.nit : '') || ''
        }
      }

      // Datos del cliente para la factura (nombre, documento y opcionalmente domicilio)
      const client = {
        id: sale.clientId,
        name: sale.clientName,
        document: clientDoc || '—',
        nit: '',
        address: fullClient?.address ?? '—',
        phone: fullClient?.phone ?? '—',
        referencePoint: fullClient?.referencePoint ?? ''
      }

      // Crear ventana de impresión
      const printWindow = window.open('', '_blank', 'width=400,height=600,scrollbars=yes,resizable=yes')
      if (!printWindow) {
        alert('No se pudo abrir la ventana de impresión. Verifica que los pop-ups estén habilitados.')
        return
      }

      // Función para formatear moneda
      const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', {
          style: 'currency',
          currency: 'COP',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(amount)
      }

      // Calcular valores para la factura (estructura tipo factura grande, sin electrónica)
      const itemsTotal = sale.items.reduce((sum, item) => {
        const baseTotal = item.quantity * item.unitPrice
        const discountAmount = item.discountType === 'percentage'
          ? (baseTotal * (item.discount || 0)) / 100
          : (item.discount || 0)
        return sum + Math.max(0, baseTotal - discountAmount)
      }, 0)
      const subtotalSinIva = Math.round(itemsTotal / 1.19)
      const iva = itemsTotal - subtotalSinIva
      const nitFormateado = (currentStore.nit || '901522077').replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d)?/, (_, a, b, c, d) => d ? `${a}.${b}.${c}-${d}` : `${a}.${b}.${c}`)
      const paymentLabel = sale.paymentMethod === 'cash' ? 'Contado (efectivo)' : sale.paymentMethod === 'transfer' ? 'Contado (banco)' : sale.paymentMethod === 'credit' ? 'Crédito' : sale.paymentMethod === 'warranty' ? 'Garantía' : 'Mixto'
      const facturaTipoLabel = sale.paymentMethod === 'credit' ? 'Factura de CRÉDITO' : 'Factura de CONTADO: ' + (sale.paymentMethod === 'transfer' ? 'Consignación bancaria.' : 'Efectivo.')

      // Generar HTML del ticket (info relevante, sin logo, fuente estética)
      const invoiceHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Aleya Shop - Factura</title>
          <style>
            body { font-family: 'Segoe UI', 'Helvetica Neue', -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 10px; color: #1a1a1a; background: #fff; font-size: 11px; line-height: 1.35; }
            .ticket { max-width: 320px; margin: 0 auto; color: #1a1a1a !important; }
            .ticket * { color: #1a1a1a !important; }
            .header { text-align: center; padding: 8px 0; border-bottom: 1px solid #333; }
            .company-name { font-size: 15px; font-weight: 700; letter-spacing: 0.3px; margin-bottom: 4px; }
            .company-info { font-size: 10px; line-height: 1.3; color: #444; }
            .invoice-type { text-align: center; font-size: 12px; font-weight: 600; padding: 8px 0; border-bottom: 1px solid #ddd; }
            .invoice-meta { padding: 6px 0; border-bottom: 1px solid #eee; font-size: 11px; }
            .invoice-meta .row { display: flex; justify-content: space-between; margin: 2px 0; }
            .section-title { font-weight: 600; font-size: 10px; margin-bottom: 4px; color: #333; text-transform: uppercase; letter-spacing: 0.5px; }
            .client-block { padding: 6px 0; border-bottom: 1px solid #eee; font-size: 11px; }
            .client-block .name { font-weight: 600; }
            .client-block .doc { font-size: 10px; color: #555; margin-top: 2px; }
            .products-table { width: 100%; border-collapse: collapse; font-size: 10px; margin: 6px 0; border: 1px solid #ddd; }
            .products-table th { border: 1px solid #ddd; padding: 5px 6px; text-align: left; font-weight: 600; background: #f8f8f8; font-size: 10px; }
            .products-table td { border: 1px solid #ddd; padding: 4px 6px; }
            .products-table .col-num { width: 24px; text-align: center; }
            .products-table .col-dcto { width: 48px; text-align: right; }
            .products-table .col-valor { width: 72px; text-align: right; font-weight: 600; }
            .total-eq { font-weight: 700; font-size: 12px; padding: 6px 0; border-bottom: 1px solid #333; }
            .liquidacion { padding: 6px 0; border-bottom: 1px solid #eee; font-size: 11px; }
            .liquidacion .row { display: flex; justify-content: space-between; margin: 3px 0; }
            .valor-total-box { font-weight: 700; font-size: 12px; margin-top: 6px; }
            .pago-block { padding: 6px 0; border-bottom: 1px solid #eee; font-size: 11px; }
            .pago-block .row { display: flex; justify-content: space-between; margin: 3px 0; }
            .vendedor-line { font-weight: 600; padding: 4px 0; font-size: 11px; }
            .resumen-block { padding: 6px 0; font-size: 10px; color: #555; }
            .footer { text-align: center; padding: 10px 0; font-size: 11px; font-weight: 600; }
            @media print { body { margin: 0; padding: 6px; } .ticket { border: none; } .no-print { display: none !important; } }
            @page { margin: 0; size: 80mm auto; }
            @media print { @page { margin: 0; size: 80mm auto; } body { margin: 0 !important; padding: 0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .ticket { border: none !important; margin: 0 !important; padding: 0 !important; } }
          </style>
        </head>
        <body>
          <div class="ticket">
            <div class="header">
              <div class="company-name">Aleya Shop SAS</div>
              <div class="company-info">NIT: ${nitFormateado} · Responsables de IVA</div>
            </div>

            <div class="invoice-type">Factura de venta</div>
            <div class="invoice-meta">
              <div class="row"><span>No. ${sale.invoiceNumber}</span><span>${new Date(sale.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span></div>
            </div>

            <div class="client-block">
              <div class="section-title">Comprador</div>
              <div class="name">${client.name}</div>
              <div class="doc">Cédula / Documento: ${client.document}</div>
            </div>

            <table class="products-table">
              <thead>
                <tr>
                  <th class="col-num">#</th>
                  <th class="col-desc">Cant. Descripción</th>
                  <th class="col-dcto">Dcto.</th>
                  <th class="col-valor">Valor total</th>
                </tr>
              </thead>
              <tbody>
                ${sale.items.map((item, idx) => {
                  const baseTotal = item.quantity * item.unitPrice
                  const discountAmount = item.discountType === 'percentage' ? (baseTotal * (item.discount || 0)) / 100 : (item.discount || 0)
                  const valorTotal = Math.max(0, baseTotal - discountAmount)
                  const dctoStr = item.discount && item.discount > 0 ? (item.discountType === 'percentage' ? `${item.discount}%` : formatCurrency(item.discount)) : '-'
                  const descripcion = `${item.quantity}  ${item.productName} (Und)`
                  return `<tr><td class="col-num">${idx + 1}</td><td class="col-desc">${descripcion}</td><td class="col-dcto">${dctoStr}</td><td class="col-valor">${formatCurrency(valorTotal)}</td></tr>`
                }).join('')}
              </tbody>
            </table>

            <div class="total-eq">TOTAL = ${formatCurrency(sale.total)}</div>

            <div class="liquidacion">
              <div class="section-title">Desglose IVA y total</div>
              <div class="row"><span>Valor base (sin IVA)</span><span>${formatCurrency(subtotalSinIva)}</span></div>
              <div class="row"><span>IVA (19%)</span><span>${formatCurrency(iva)}</span></div>
              <div class="valor-total-box row"><span>Valor total</span><span>${formatCurrency(sale.total)}</span></div>
            </div>

            <div class="pago-block">
              <div class="row"><span>Forma de pago</span><span>${paymentLabel}</span></div>
              <div class="vendedor-line">Vendedor: ${sale.sellerName || '—'}</div>
            </div>

            ${(sale.clientId || sale.clientName) ? `
            <div class="domicilio-block" style="padding: 8px 0; border-top: 1px solid #333; margin-top: 6px;">
              <div class="section-title">Entrega a domicilio</div>
              <div style="font-size: 11px; line-height: 1.4;">
                <div><strong>Nombre:</strong> ${client.name || '—'}</div>
                <div><strong>Dirección:</strong> ${(client.address && client.address !== 'N/A') ? client.address : '—'}</div>
                <div><strong>Teléfono:</strong> ${(client.phone && client.phone !== 'N/A') ? client.phone : '—'}</div>
                <div><strong>Punto de referencia:</strong> ${(client.referencePoint && client.referencePoint.trim() !== '') ? client.referencePoint : '—'}</div>
              </div>
            </div>
            ` : ''}

            <div class="resumen-block">
              Productos: ${sale.items.length} ítem(s) · IVA incluido
            </div>

            <div class="footer">
              ¡Gracias por su compra! · Aleya Shop
            </div>
          </div>
        </body>
        </html>
      `

      // Escribir el HTML en la ventana
      printWindow.document.write(invoiceHTML)
      printWindow.document.close()

      // Esperar a que se cargue y luego imprimir
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print()
          printWindow.close()
        }, 500)
      }

    } catch (error) {
      // Error silencioso en producción
      alert('Error al generar la factura. Intenta nuevamente.')
    }
  }

  const handleCancelSale = async (saleId: string, reason: string) => {
    try {
      const result = await cancelSale(saleId, reason)
      // NO cerrar el modal, mantenerlo abierto para ver el resultado
      // setIsDetailModalOpen(false)
      // setSelectedSale(null)
      return result
    } catch (error) {
      // Error silencioso en producción
      alert('Error al cancelar la venta')
      throw error
    }
  }

  const handleFinalizeDraft = async (saleId: string) => {
    try {
      await finalizeDraftSale(saleId)
      // Actualizar la venta seleccionada si es la misma
      if (selectedSale && selectedSale.id === saleId) {
        const updatedSale = sales.find(s => s.id === saleId)
        if (updatedSale) {
          setSelectedSale(updatedSale)
        }
      }
    } catch (error: any) {
      // Mostrar mensaje específico del error
      const errorMessage = error?.message || 'Error al facturar el borrador'
      if (errorMessage.includes('No hay suficiente stock')) {
        alert(`⚠️ ${errorMessage}\n\nPor favor, verifica el inventario antes de finalizar el borrador.`)
      } else {
        alert(`Error al facturar el borrador: ${errorMessage}`)
      }
      throw error
    }
  }

  // Calcular total de ventas directas del día de hoy (solo efectivo y transferencia)
  const todaySalesTotal = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    return sales
      .filter(sale => {
        const saleDate = new Date(sale.createdAt)
        return saleDate >= today && saleDate < tomorrow && sale.status !== 'cancelled' && sale.status !== 'draft'
      })
      .reduce((sum, sale) => {
        // Solo contar ventas con pago directo (efectivo o transferencia)
        if (sale.paymentMethod === 'cash' || sale.paymentMethod === 'transfer') {
          return sum + sale.total
        } else if (sale.paymentMethod === 'mixed' && sale.payments) {
          // Para pagos mixtos, solo contar la parte en efectivo/transferencia
          const directPaymentAmount = sale.payments
            .filter(payment => payment.paymentType === 'cash' || payment.paymentType === 'transfer')
            .reduce((paymentSum, payment) => paymentSum + payment.amount, 0)
          return sum + directPaymentAmount
        }
        // No contar ventas a crédito o garantía
        return sum
      }, 0)
  }, [sales])

  if (loading) {
    return (
      <div className="p-6 space-y-6 bg-white dark:bg-gray-900 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-500 dark:border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Cargando ventas...</p>
        </div>
      </div>
    )
  }

  return (
    <RoleProtectedRoute module="sales" requiredAction="view">
      <div className="p-4 md:p-6 space-y-4 md:space-y-6 bg-white dark:bg-gray-900 min-h-screen">
      <SalesTable
        todaySalesTotal={todaySalesTotal}
        sales={sales}
        loading={loading}
        currentPage={currentPage}
        totalSales={totalSales}
        hasMore={hasMore}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onView={handleView}
        onCreate={handleCreate}
        onPrint={handlePrint}
        onPageChange={goToPage}
        onSearch={searchSales}
        onRefresh={handleRefresh}
        onCancel={handleCancelSale}
      />

      <SaleModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSaleToEdit(null)
        }}
        onSave={handleSaveSale}
        sale={saleToEdit}
        onUpdate={handleUpdateSale}
      />

      <SaleDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false)
          setSelectedSale(null)
        }}
        sale={selectedSale}
        onCancel={handleCancelSale}
        onPrint={handlePrint}
        onFinalizeDraft={handleFinalizeDraft}
        onEdit={handleEdit}
      />
    </div>
    </RoleProtectedRoute>
  )
}
