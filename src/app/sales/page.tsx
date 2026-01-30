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
          name: 'Aleya Shop',
          nit: '',
          logo: '/favicon.png',
          address: 'Sincelejo, Sucre, Colombia.',
          city: 'Sincelejo',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      }

      // Crear datos del cliente (usar datos de la venta o valores por defecto)
      const client = {
        id: sale.clientId,
        name: sale.clientName,
        email: 'N/A',
        phone: 'N/A',
        document: 'N/A',
        address: 'N/A',
        city: 'N/A',
        state: 'N/A',
        type: 'consumidor_final' as const,
        creditLimit: 0,
        currentDebt: 0,
        status: 'active' as const,
        nit: 'N/A',
        createdAt: sale.createdAt
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

      // Generar HTML del ticket (incluye logo y datos de la tienda)
      const invoiceHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Aleya Shop - Factura</title>
          <style>
            body { 
              font-family: 'Courier New', monospace; 
              margin: 0; 
              padding: 5px; 
              color: #000; 
              background: #fff;
              font-size: 12px;
              line-height: 1.2;
            }
            .ticket { 
              color: #000 !important;
            }
            .ticket * {
              color: #000 !important;
            }
            .product-details, .product-details *, .product-details span, .product-details strong {
              color: #000 !important;
              font-weight: bold !important;
            }
            .product-ref, .product-ref *, .product-ref strong {
              color: #000 !important;
              font-weight: bold !important;
            }
            /* Mantener color rojo para descuentos */
            [style*="color: #d32f2f"], [style*="color:#d32f2f"] {
              color: #d32f2f !important;
            }
            .ticket { 
              width: 300px; 
              margin: 0 auto; 
              border: 1px solid #000;
            }
            .header { 
              text-align: center; 
              padding: 10px 5px; 
              border-bottom: 1px dashed #000;
            }
            .logo {
              width: 64px;
              height: 64px;
              object-fit: contain;
              margin: 0 auto 6px auto;
              display: block;
            }
            .company-name { 
              font-size: 16px; 
              font-weight: bold; 
              margin-bottom: 5px;
            }
            .company-info { 
              font-size: 10px; 
              line-height: 1.1;
              color: #000;
            }
            .invoice-title { 
              text-align: center; 
              font-size: 14px; 
              font-weight: bold; 
              padding: 8px 0;
              border-bottom: 1px dashed #000;
            }
            .invoice-details { 
              padding: 8px 5px; 
              border-bottom: 1px dashed #000;
            }
            .detail-row { 
              display: flex; 
              justify-content: space-between; 
              margin: 3px 0; 
              font-size: 11px;
              color: #000;
            }
            .detail-row strong {
              font-weight: bold;
              color: #000;
            }
            .client-info { 
              padding: 8px 5px; 
              border-bottom: 1px dashed #000;
            }
            .client-title { 
              font-weight: bold; 
              margin-bottom: 5px; 
              font-size: 12px;
              color: #000;
            }
            .client-details { 
              font-size: 11px; 
              line-height: 1.3;
              font-weight: 600;
              color: #000;
            }
            .products { 
              border-bottom: 1px dashed #000;
            }
            .product-item { 
              padding: 5px; 
              border-bottom: 1px dotted #ccc;
            }
            .product-name { 
              font-weight: bold; 
              font-size: 11px; 
              margin-bottom: 2px;
              color: #000;
            }
            .product-details { 
              display: flex; 
              justify-content: space-between; 
              font-size: 11px;
              color: #000 !important;
              font-weight: bold !important;
            }
            .product-details span {
              color: #000 !important;
              font-weight: bold !important;
            }
            .product-details * {
              color: #000 !important;
              font-weight: bold !important;
            }
            .product-price {
              font-weight: bold;
              color: #000;
              font-size: 11px;
            }
            .product-ref { 
              font-size: 10px; 
              color: #000 !important; 
              margin-top: 2px;
              font-weight: bold !important;
            }
            .product-ref * {
              color: #000 !important;
              font-weight: bold !important;
            }
            .summary { 
              padding: 8px 5px; 
              border-bottom: 1px dashed #000;
            }
            .summary-row { 
              display: flex; 
              justify-content: space-between; 
              margin: 3px 0; 
              font-size: 11px;
              font-weight: bold;
              color: #000;
            }
            .subtotal-row {
              background-color: #f5f5f5;
              padding: 4px 5px;
              margin: 5px 0;
              border: 1px solid #000;
            }
            .total-row { 
              border-top: 2px solid #000; 
              padding-top: 8px; 
              margin-top: 8px; 
              font-weight: bold; 
              font-size: 14px;
              color: #000;
            }
            .total-row span {
              font-size: 14px;
              font-weight: bold;
            }
            .payment-info { 
              padding: 8px 5px; 
              border-bottom: 1px dashed #000;
            }
            .payment-info .detail-row {
              font-weight: 600;
              color: #000;
            }
            .footer { 
              text-align: center; 
              padding: 10px 5px; 
              font-size: 10px; 
              line-height: 1.3;
              color: #000;
              font-weight: 600;
            }
            .separator { 
              text-align: center; 
              margin: 5px 0; 
              font-size: 10px;
            }
            @media print {
              body { margin: 0; padding: 0; }
              .ticket { border: none; }
              .no-print { display: none !important; }
            }
            @page {
              margin: 0;
              size: 80mm auto;
            }
            @media print {
              @page {
                margin: 0;
                size: 80mm auto;
              }
              body {
                margin: 0 !important;
                padding: 0 !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .ticket {
                border: none !important;
                margin: 0 !important;
                padding: 0 !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="ticket">
            <!-- Header -->
            <div class="header">
              <img src="${currentStore.logo || '/favicon.png'}" class="logo" alt="${currentStore.name}" />
              <div class="company-name">${currentStore.name}</div>
              <div class="company-info">
                ${currentStore.nit ? `<strong>NIT ${currentStore.nit}</strong><br>` : ''}
                ${currentStore.address ? `<strong>${currentStore.address}${currentStore.city ? `, ${currentStore.city}` : ''}</strong><br>` : ''}
              </div>
            </div>

            <!-- Título de Factura -->
            <div class="invoice-title">FACTURA DE VENTA</div>

            <!-- Detalles de la Factura -->
            <div class="invoice-details">
              <div class="detail-row">
                <span><strong>No. Factura:</strong></span>
                <span><strong>${sale.invoiceNumber}</strong></span>
              </div>
              <div class="detail-row">
                <span><strong>Fecha:</strong></span>
                <span><strong>${new Date(sale.createdAt).toLocaleDateString('es-CO')}</strong></span>
              </div>
              <div class="detail-row">
                <span><strong>Hora:</strong></span>
                <span><strong>${new Date(sale.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</strong></span>
              </div>
            </div>

            <!-- Información del Cliente -->
            <div class="client-info">
              <div class="client-title">CLIENTE:</div>
              <div class="client-details">
                <strong>${client.name}</strong><br>
                ${client.nit && client.nit !== 'N/A' ? `<strong>NIT: ${client.nit}</strong>` : ''}
              </div>
            </div>

            <!-- Productos -->
            <div class="products">
              ${sale.items.map(item => {
                const baseTotal = item.quantity * item.unitPrice
                const discountAmount = item.discountType === 'percentage' 
                  ? (baseTotal * (item.discount || 0)) / 100 
                  : (item.discount || 0)
                const subtotalAfterDiscount = Math.max(0, baseTotal - discountAmount)
                
                return `
                  <div class="product-item">
                    <div class="product-name">${item.productName}</div>
                    <div class="product-details" style="color: #000 !important; font-weight: bold !important;">
                      <span style="color: #000 !important; font-weight: bold !important;"><strong style="color: #000 !important; font-weight: bold !important;">${item.quantity} x ${formatCurrency(item.unitPrice)}</strong></span>
                      <span class="product-price" style="color: #000 !important; font-weight: bold !important;">${formatCurrency(subtotalAfterDiscount)}</span>
                    </div>
                    ${item.discount && item.discount > 0 ? `
                      <div style="font-size: 9px; color: #d32f2f !important;">
                        <strong>Desc: ${item.discountType === 'percentage' ? `${item.discount}%` : formatCurrency(item.discount)}</strong>
                      </div>
                    ` : ''}
                    <div class="product-ref" style="color: #000 !important; font-weight: bold !important;"><strong style="color: #000 !important; font-weight: bold !important;">Ref: ${item.productReferenceCode || 'N/A'}</strong></div>
                  </div>
                `
              }).join('')}
            </div>

            <!-- Resumen -->
            <div class="summary">
              <div class="summary-row subtotal-row">
                <span><strong>Subtotal:</strong></span>
                <span><strong>${formatCurrency(sale.items.reduce((sum, item) => {
                  const baseTotal = item.quantity * item.unitPrice
                  const discountAmount = item.discountType === 'percentage' 
                    ? (baseTotal * (item.discount || 0)) / 100 
                    : (item.discount || 0)
                  return sum + Math.max(0, baseTotal - discountAmount)
                }, 0))}</strong></span>
              </div>
              ${sale.discount && sale.discount > 0.001 ? `
                <div class="summary-row" style="color: #d32f2f;">
                  <span>Descuento:</span>
                  <span>${sale.discountType === 'percentage' ? `-${sale.discount}%` : `-${formatCurrency(sale.discount)}`}</span>
                </div>
              ` : ''}
              ${sale.tax && sale.tax > 0 ? `
                <div class="summary-row">
                  <span>IVA (19%):</span>
                  <span>${formatCurrency(sale.tax)}</span>
                </div>
              ` : ''}
              <div class="summary-row total-row">
                <span><strong>TOTAL:</strong></span>
                <span><strong>${formatCurrency(sale.total)}</strong></span>
              </div>
            </div>

            <!-- Información de Pago -->
            <div class="payment-info">
              <div class="detail-row">
                <span>Método de Pago:</span>
                <span>${sale.paymentMethod === 'cash' ? 'Efectivo' : sale.paymentMethod === 'credit' ? 'Crédito' : sale.paymentMethod === 'transfer' ? 'Transferencia' : sale.paymentMethod === 'warranty' ? 'Garantía' : 'Mixto'}</span>
              </div>
              ${sale.paymentMethod === 'mixed' && sale.payments && sale.payments.length > 0 ? `
                <div style="margin-top: 8px;">
                  <div style="font-weight: bold; margin-bottom: 4px;">Desglose de Pago:</div>
                  ${sale.payments.map(payment => `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 2px; font-size: 11px;">
                      <span>${payment.paymentType === 'cash' ? 'Efectivo' : payment.paymentType === 'transfer' ? 'Transferencia' : payment.paymentType === 'credit' ? 'Crédito' : 'Garantía'}${payment.notes ? ` (${payment.notes})` : ''}:</span>
                      <span>${formatCurrency(payment.amount)}</span>
                    </div>
                  `).join('')}
                </div>
              ` : ''}
              <div class="detail-row">
                <span>Estado:</span>
                <span>${sale.status === 'completed' ? 'Completada' : sale.status === 'pending' ? 'Pendiente' : 'Anulada'}</span>
              </div>
            </div>

            <!-- Footer -->
            <div class="footer">
              <div class="separator">═══════════════════════════════</div>
              <div><strong>Factura: ${sale.invoiceNumber}</strong></div>
              <div>¡Gracias por su compra!</div>
              <div>${currentStore.name}</div>
              <div class="separator">═══════════════════════════════</div>
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
