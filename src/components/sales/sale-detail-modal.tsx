'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  X, 
  Receipt, 
  User, 
  Calendar, 
  CreditCard, 
  AlertTriangle,
  Download,
  Package,
  Eye,
  Edit,
  Truck,
  Bike,
  Copy,
  MapPin,
  Check
} from 'lucide-react'
import { Sale, CompanyConfig, Client, Credit, StoreStockTransfer } from '@/types'
import { CompanyService } from '@/lib/company-service'
import { CreditsService } from '@/lib/credits-service'
import { StoreStockTransferService } from '@/lib/store-stock-transfer-service'
import { ClientsService } from '@/lib/clients-service'
import { InvoiceTemplate } from './invoice-template'
import { StoresService } from '@/lib/stores-service'
import { getCurrentUserStoreId } from '@/lib/store-helper'

interface SaleDetailModalProps {
  isOpen: boolean
  onClose: () => void
  sale: Sale | null
  onCancel?: (saleId: string, reason: string) => Promise<{ success: boolean, totalRefund?: number }>
  onPrint?: (sale: Sale) => void
  onFinalizeDraft?: (saleId: string) => Promise<void>
  onEdit?: (sale: Sale) => void
}

export default function SaleDetailModal({ 
  isOpen, 
  onClose, 
  sale, 
  onCancel,
  onPrint,
  onFinalizeDraft,
  onEdit
}: SaleDetailModalProps) {
  const [showCancelForm, setShowCancelForm] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [isCancelling, setIsCancelling] = useState(false)
  const [companyConfig, setCompanyConfig] = useState<CompanyConfig | null>(null)
  const [clientData, setClientData] = useState<Client | null>(null)
  const [isLoadingPrint, setIsLoadingPrint] = useState(false)
  const [cancelSuccessMessage, setCancelSuccessMessage] = useState<string | null>(null)
  const [isFinalizing, setIsFinalizing] = useState(false)
  const cancelFormRef = useRef<HTMLDivElement>(null)
  const [credit, setCredit] = useState<Credit | null>(null)
  const [transfer, setTransfer] = useState<StoreStockTransfer | null>(null)
  const [deliveryCopied, setDeliveryCopied] = useState(false)

  // Cargar datos del cliente si es un domicilio
  useEffect(() => {
    const loadClientData = async () => {
      if (sale && sale.isDelivery && sale.clientId) {
        try {
          const client = await ClientsService.getClientById(sale.clientId)
          setClientData(client)
        } catch (error) {
          setClientData(null)
        }
      } else {
        setClientData(null)
      }
    }
    
    if (isOpen && sale) {
      loadClientData()
    }
  }, [isOpen, sale])

  // Cargar crédito si la venta es de tipo crédito
  useEffect(() => {
    const loadCredit = async () => {
      if (sale && sale.paymentMethod === 'credit' && sale.invoiceNumber) {
        try {
          const creditData = await CreditsService.getCreditByInvoiceNumber(sale.invoiceNumber)
          setCredit(creditData)
        } catch (error) {
          setCredit(null)
        }
      } else {
        setCredit(null)
      }
    }
    
    if (isOpen && sale) {
      loadCredit()
    }
  }, [isOpen, sale])

  // Cargar transferencia si la venta es de tipo transferencia
  useEffect(() => {
    const loadTransfer = async () => {
      const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
      // Solo buscar transferencia asociada para ventas de la tienda principal
      // La transferencia se identifica por tener un registro en stock_transfers, no por método de pago
      if (sale && sale.storeId === MAIN_STORE_ID) {
        try {
          const transferData = await StoreStockTransferService.getTransferBySaleId(sale.id)
          setTransfer(transferData)
        } catch (error) {
          setTransfer(null)
        }
      } else {
        setTransfer(null)
      }
    }
    
    if (isOpen && sale) {
      loadTransfer()
    }
  }, [isOpen, sale])

  // Función helper para generar ID del crédito
  const getCreditId = (credit: Credit): string => {
    const clientInitials = credit.clientName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2)
      .padEnd(2, 'X')
    
    const creditSuffix = credit.id.substring(credit.id.length - 6).toLowerCase()
    return `${clientInitials}${creditSuffix}`
  }

  // Función helper para generar ID de la transferencia
  const getTransferId = (transfer: StoreStockTransfer): string => {
    if (transfer.transferNumber) {
      return transfer.transferNumber.replace('TRF-', '')
    }
    // Si no hay transferNumber, usar las últimas 8 letras del ID
    return transfer.id.substring(transfer.id.length - 8).toUpperCase()
  }

  useEffect(() => {
    if (showCancelForm && cancelFormRef.current) {
      cancelFormRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [showCancelForm])

  // Cargar configuración de empresa cuando se abre el modal
  useEffect(() => {
    if (isOpen && sale) {
      const loadCompanyConfig = async () => {
        try {
          let config = await CompanyService.getCompanyConfig()
          if (!config) {
            // Si no existe configuración, crear la por defecto
            config = await CompanyService.initializeDefaultConfig()
          }
          setCompanyConfig(config)
        } catch (error) {
      // Error silencioso en producción
        }
      }
      
      loadCompanyConfig()
    }
  }, [isOpen, sale])

  // Limpiar mensaje de confirmación cuando la venta se anula
  useEffect(() => {

    if (sale?.status === 'cancelled') {
      setShowCancelForm(false)
      setCancelReason('')
      setCancelSuccessMessage(null)
    }
  }, [sale?.status])

  if (!isOpen || !sale) return null

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const generateInvoiceNumber = (sale: Sale) => {
    return `#${sale.invoiceNumber?.toString().padStart(3, '0') || '000'}`
  }

  const getInvoiceNumber = (sale: Sale) => {
    // Si invoiceNumber ya incluye #, devolverlo tal como está
    if (sale.invoiceNumber?.toString().startsWith('#')) {
      return sale.invoiceNumber.toString()
    }
    // Si no incluye #, agregarlo
    return `#${sale.invoiceNumber?.toString().padStart(3, '0') || '000'}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-[#fce4f0] text-[#d06a98] dark:bg-[#f29fc8] dark:text-[#f29fc8]/50'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completada'
      case 'pending':
        return 'Pendiente'
      case 'cancelled':
        return 'Cancelada'
      default:
        return status
    }
  }

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case 'cash':
        return 'bg-[#fce4f0] text-[#d06a98] dark:bg-[#f29fc8] dark:text-[#f29fc8]/50'
      case 'credit':
        return 'bg-[#fce4f0] text-[#d06a98] dark:bg-[#f29fc8] dark:text-[#f29fc8]/50'
      case 'transfer':
        return 'bg-[#fce4f0] text-[#d06a98] dark:bg-[#f29fc8] dark:text-[#f29fc8]/50'
      case 'warranty':
        return 'bg-[#fce4f0] text-[#d06a98] dark:bg-[#f29fc8] dark:text-[#f29fc8]/50'
      case 'mixed':
        return 'bg-[#fce4f0] text-[#d06a98] dark:bg-[#f29fc8] dark:text-[#f29fc8]/50'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cash':
        return 'Efectivo/Contado'
      case 'credit':
        return 'Crédito'
      case 'transfer':
        return 'Transferencia'
      case 'warranty':
        return 'Garantía'
      case 'mixed':
        return 'Mixto'
      default:
        return method
    }
  }

  const handleShowCancelForm = () => {
    setShowCancelForm(true)
      setCancelReason('')
    setCancelSuccessMessage(null)
  }

  const handleCancel = async () => {
    if (!cancelReason.trim() || !onCancel) return

    // Validar que el motivo tenga al menos 10 caracteres
    if (cancelReason.trim().length < 10) {
      setCancelSuccessMessage('⚠️ El motivo de anulación debe tener al menos 10 caracteres para mayor claridad. Por favor, proporciona una descripción más detallada.')
      return
    }

    setIsCancelling(true)
    setCancelSuccessMessage(null)
    try {
      const result = await onCancel(sale.id, cancelReason)
      
      // Mostrar mensaje de confirmación con información del reembolso
      if (result && result.totalRefund && result.totalRefund > 0) {
        setCancelSuccessMessage(`Venta anulada exitosamente.\n\nReembolso total: $${result.totalRefund.toLocaleString()}\nProductos devueltos al stock\nCrédito y abonos anulados`)
      } else {
        setCancelSuccessMessage('Venta anulada exitosamente.\n\nProductos devueltos al stock')
      }
      
      // Cerrar solo el formulario de anulación después de 3 segundos
      setTimeout(() => {
      setShowCancelForm(false)
        setCancelReason('')
        setCancelSuccessMessage(null)
        // NO cerrar el modal, mantenerlo abierto para ver el resultado
      }, 3000)
    } catch (error) {
      // Error silencioso en producción
      setCancelSuccessMessage('Error al anular la venta. Por favor, inténtalo de nuevo.')
    } finally {
      setIsCancelling(false)
    }
  }

  const handleFinalizeDraft = async () => {
    if (!sale || !onFinalizeDraft) return
    
    setIsFinalizing(true)
    try {
      await onFinalizeDraft(sale.id)
      // Cerrar el modal después de facturar
      onClose()
    } catch (error: any) {
      // Mostrar mensaje específico del error
      const errorMessage = error?.message || 'Error al facturar el borrador'
      if (errorMessage.includes('No hay suficiente stock')) {
        alert(`⚠️ ${errorMessage}\n\nPor favor, verifica el inventario antes de finalizar el borrador.`)
      } else {
        alert(`Error al facturar el borrador: ${errorMessage}`)
      }
    } finally {
      setIsFinalizing(false)
    }
  }

  const handlePrint = async () => {
    if (!sale) {
      return
    }

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

    // Usar valores por defecto si no hay configuración de empresa o tienda
    const defaultCompanyConfig = {
      id: 'default',
      name: currentStore?.name || 'Aleya Shop SAS',
      nit: currentStore?.nit || '901522077',
      address: currentStore?.address ? `${currentStore.address}${currentStore.city ? `, ${currentStore.city}` : ''}` : 'Calle 28 N25B - 365 interior 01203 barrio Boston',
      phone: '320 5848594',
      email: 'info@aleyashop.com',
      logo: currentStore?.logo || '/logo.jpeg',
      dianResolution: undefined,
      numberingRange: undefined,
      isIvaResponsible: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const config = companyConfig || defaultCompanyConfig

    setIsLoadingPrint(true)
    
    try {
      // Obtener cliente real de la API para tener cédula/documento (si no está cargado)
      let clientToUse: Client | null = clientData || null
      if ((!clientToUse || !clientToUse.document || clientToUse.document === 'N/A') && sale.clientId) {
        const fetched = await ClientsService.getClientById(sale.clientId)
        if (fetched) clientToUse = fetched
      }

      const client: Client = clientToUse || {
        id: sale.clientId,
        name: sale.clientName,
        email: 'N/A',
        phone: 'N/A',
        document: '—',
        address: 'N/A',
        city: 'N/A',
        state: 'N/A',
        type: 'cliente',
        creditLimit: 0,
        currentDebt: 0,
        points: 0,
        status: 'active',
        nit: 'N/A',
        createdAt: sale.createdAt
      }

      // Cédula/documento para la factura (documento o NIT del cliente)
      const clientDoc = (client.document && client.document !== 'N/A' && client.document !== '—' ? client.document : '') || (client.nit && client.nit !== 'N/A' ? client.nit : '') || '—'

      // Calcular valores (misma estructura que factura grande, sin electrónica)
      const itemsTotal = sale.items.reduce((sum, item) => {
        const baseTotal = item.quantity * item.unitPrice
        const discountAmount = item.discountType === 'percentage' ? (baseTotal * (item.discount || 0)) / 100 : (item.discount || 0)
        return sum + Math.max(0, baseTotal - discountAmount)
      }, 0)
      const subtotalSinIva = Math.round(itemsTotal / 1.19)
      const iva = itemsTotal - subtotalSinIva
      const nitFormateado = (config.nit || '901522077').replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d)?/, (_: string, a: string, b: string, c: string, d?: string) => d ? `${a}.${b}.${c}-${d}` : `${a}.${b}.${c}`)
      const paymentLabel = sale.paymentMethod === 'cash' ? 'Contado (efectivo)' : sale.paymentMethod === 'transfer' ? 'Contado (banco)' : sale.paymentMethod === 'credit' ? 'Crédito' : sale.paymentMethod === 'warranty' ? 'Garantía' : 'Mixto'
      const facturaTipoLabel = sale.paymentMethod === 'credit' ? 'Factura de CRÉDITO' : 'Factura de CONTADO: ' + (sale.paymentMethod === 'transfer' ? 'Consignación bancaria.' : 'Efectivo.')

      // Crear ventana de impresión
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        alert('No se pudo abrir la ventana de impresión. Verifica que los pop-ups estén habilitados.')
        return
      }

      // Misma estructura: sin logo, fuente estética, info relevante (comprador, cédula, vendedor nombre)
      const invoiceHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Factura ${sale.invoiceNumber}</title>
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
              <div class="doc">Cédula / Documento: ${clientDoc}</div>
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
    } finally {
      setIsLoadingPrint(false)
    }
  }

  return (
    <div className="fixed inset-0 xl:left-64 bg-white/70 dark:bg-black/60 backdrop-blur-sm z-50 flex flex-col p-4 xl:px-6">
      <div className="bg-white dark:bg-gray-800 rounded-none xl:rounded-2xl shadow-2xl w-full h-full xl:h-auto xl:w-auto xl:max-w-[95vw] xl:max-h-[85vh] xl:m-auto flex flex-col border-0 xl:border border-gray-200 dark:border-gray-700 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200 dark:border-gray-600 flex-shrink-0 bg-[#fce4f0] dark:bg-[#f29fc8]/20">
          <div className="flex items-center space-x-3">
            <Receipt className="h-6 w-6 text-[#f29fc8]" />
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                Detalle de Venta
                {sale.isDelivery && (
                  <Badge className="bg-[#fce4f0] text-[#d06a98] border-[#f29fc8] dark:bg-[#f29fc8]/20 dark:text-[#f29fc8] dark:border-[#f29fc8] flex items-center gap-1">
                    <Bike className="h-4 w-4" />
                    Domicilio
                  </Badge>
                )}
              </h2>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">{getInvoiceNumber(sale)}</p>
            </div>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            disabled={isCancelling}
            className="h-8 w-8 p-0 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Mensaje de confirmación de anulación */}
        {cancelSuccessMessage && (
          <div className={`mx-4 md:mx-6 mt-4 p-4 rounded-lg border-2 ${
            cancelSuccessMessage.includes('exitosamente') 
              ? 'border-[#f29fc8]/50 bg-[#fce4f0] dark:bg-[#f29fc8]/20 dark:border-[#d06a98]'
              : 'border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800'
          }`}>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {cancelSuccessMessage.includes('exitosamente') ? (
                  <div className="w-6 h-6 rounded-full bg-[#fce4f0]0 flex items-center justify-center">
                    <span className="text-white text-sm">✓</span>
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                    <span className="text-white text-sm">⚠</span>
                  </div>
                )}
              </div>
              <div className="ml-3">
                <div className={`text-sm font-medium ${
                  cancelSuccessMessage.includes('exitosamente')
                    ? 'text-[#d06a98] dark:text-[#f29fc8]/50'
                    : 'text-red-800 dark:text-red-200'
                }`}>
                  {cancelSuccessMessage.split('\n').map((line, index) => (
                    <div key={index} className={index === 0 ? 'font-semibold' : ''}>
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-white dark:bg-gray-800">
          <div className="space-y-3 md:space-y-4 mb-4 md:mb-6">
            
            {/* Sale Information */}
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base md:text-lg text-gray-900 dark:text-white flex items-center">
                  <Receipt className="h-4 w-4 md:h-5 md:w-5 mr-2 text-[#f29fc8]" />
                  Información de la Venta
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                {/* Factura e ID Crédito/Transferencia - Estilo exacto a créditos pero invertido */}
                <div className="flex items-center gap-4 mb-2">
                  {sale.paymentMethod === 'credit' ? (
                    <CreditCard className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                  ) : transfer ? (
                    <Truck className="h-5 w-5 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
                  ) : (
                  <Receipt className="h-5 w-5 text-[#f29fc8] dark:text-[#f29fc8] flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Factura</div>
                        <div className="text-xl font-bold text-gray-900 dark:text-white">
                          {getInvoiceNumber(sale)}
                        </div>
                      </div>
                      {sale.paymentMethod === 'credit' && credit && (
                        <div className="border-l border-gray-300 dark:border-gray-600 pl-3">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">ID Crédito</div>
                          <div className="text-sm font-mono font-semibold text-blue-600 dark:text-blue-400">
                            #{getCreditId(credit)}
                          </div>
                        </div>
                      )}
                      {transfer && (sale.paymentMethod === 'transfer' || sale.paymentMethod === 'mixed') && (
                        <div className="border-l border-gray-300 dark:border-gray-600 pl-3">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">ID Transferencia</div>
                          <div className="text-sm font-mono font-semibold text-cyan-600 dark:text-cyan-400">
                            {transfer.transferNumber || `#${getTransferId(transfer)}`}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 md:gap-3">
                  <div className="flex items-center space-x-3">
                    <User className="h-5 w-5 text-[#f29fc8]" />
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">Cliente</div>
                      <div className="font-semibold text-gray-900 dark:text-white">{sale.clientName}</div>
                    </div>
                  </div>
                  
                  {sale.sellerName && (
                    <div className="flex items-center space-x-3">
                      <User className="h-5 w-5 text-[#f29fc8]" />
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">Vendedor</div>
                        <div className="font-semibold text-gray-900 dark:text-white">{sale.sellerName}</div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-[#f29fc8]" />
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">Fecha</div>
                      <div className="font-semibold text-gray-900 dark:text-white">{formatDateTime(sale.createdAt)}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <CreditCard className="h-5 w-5 text-[#f29fc8]" />
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">Tipo de Pago</div>
                      <Badge className={`${getPaymentMethodColor(sale.paymentMethod)} mt-1`}>
                        {getPaymentMethodLabel(sale.paymentMethod)}
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Indicador de domicilio */}
                  {sale.isDelivery && (
                    <div className="flex items-center space-x-3">
                      <Bike className="h-5 w-5 text-[#f29fc8]" />
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">Tipo de Entrega</div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className="bg-[#fce4f0] text-[#d06a98] border-[#f29fc8] dark:bg-[#f29fc8]/20 dark:text-[#f29fc8] dark:border-[#f29fc8]">
                            Domicilio
                          </Badge>
                          {sale.deliveryFee && sale.deliveryFee > 0 && (
                            <span className="text-sm font-medium text-[#d06a98] dark:text-[#f29fc8]">
                              (${sale.deliveryFee.toLocaleString('es-CO')})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Botón para copiar dirección del domicilio */}
                  {sale.isDelivery && clientData && (
                    <div className="col-span-2 mt-2">
                      <Button
                        onClick={() => {
                          const deliveryInfo = `📍 *DOMICILIO*\n\n👤 *Cliente:* ${clientData.name}\n📞 *Teléfono:* ${clientData.phone || 'N/A'}\n🏠 *Dirección:* ${clientData.address || 'N/A'}\n📌 *Referencia:* ${clientData.referencePoint || 'N/A'}`
                          navigator.clipboard.writeText(deliveryInfo)
                          setDeliveryCopied(true)
                          setTimeout(() => setDeliveryCopied(false), 2000)
                        }}
                        className="w-full bg-[#fce4f0] hover:bg-[#f29fc8] text-[#d06a98] hover:text-white border border-[#f29fc8] transition-all"
                        size="sm"
                      >
                        {deliveryCopied ? (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            ¡Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-2" />
                            Copiar dirección para domiciliario
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
                
                {/* Sección de Pagos Mixtos */}
                {sale.paymentMethod === 'mixed' && sale.payments && sale.payments.length > 0 && (
                  <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                      Desglose de Pago Mixto
                    </h4>
                    <div className="space-y-2">
                      {sale.payments.map((payment, index) => (
                        <div key={index} className="flex justify-between items-center py-2 px-3 bg-white dark:bg-gray-600 rounded border border-gray-200 dark:border-gray-500">
                          <div className="flex items-center space-x-3">
                            <Badge className="bg-[#fce4f0] text-[#d06a98] dark:bg-[#f29fc8]/30 dark:text-[#f29fc8]">
                              {getPaymentMethodLabel(payment.paymentType)}
                            </Badge>
                            {payment.notes && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {payment.notes}
                              </span>
                            )}
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white">
                            ${payment.amount.toLocaleString('es-CO')}
                          </span>
                        </div>
                      ))}
                      <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                        <div className="flex justify-between items-center font-medium">
                          <span className="text-gray-900 dark:text-white">Total:</span>
                          <span className="text-[#f29fc8] dark:text-[#f29fc8]">
                            ${sale.payments.reduce((sum, payment) => sum + payment.amount, 0).toLocaleString('es-CO')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="mt-4 pt-4 border-t border-gray-600">
                  <div className="flex items-center space-x-3">
                    <div className="h-5 w-5 flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-[#f29fc8]"></div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">Estado</div>
                      <Badge className={`${getStatusColor(sale.status)} mt-1`}>
                        {getStatusLabel(sale.status)}
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Motivo de cancelación */}
                  {sale.status === 'cancelled' && sale.cancellationReason && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                      <div className="flex items-start space-x-3">
                        <AlertTriangle className="h-5 w-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Motivo de anulación:
                          </div>
                          <div className="text-sm text-gray-900 dark:text-white bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
                            {sale.cancellationReason}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Products Table - Full Width */}
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm mt-3 md:mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base md:text-lg text-gray-900 dark:text-white flex items-center">
                <Package className="h-4 w-4 md:h-5 md:w-5 mr-2 text-[#f29fc8]" />
                Productos Vendidos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: '500px' }}>
                <table className="w-full">
                  <thead className="sticky top-0 bg-white dark:bg-gray-800 z-10">
                    <tr className="border-b border-gray-200 dark:border-gray-600">
                      <th className="text-left py-2 px-2 md:px-4 font-medium text-gray-700 dark:text-gray-300 text-xs md:text-sm">Producto</th>
                      <th className="text-center py-2 px-2 md:px-4 font-medium text-gray-700 dark:text-gray-300 text-xs md:text-sm">Cantidad</th>
                      <th className="text-right py-2 px-2 md:px-4 font-medium text-gray-700 dark:text-gray-300 text-xs md:text-sm">Precio Unit.</th>
                      <th className="text-center py-2 px-2 md:px-4 font-medium text-gray-700 dark:text-gray-300 text-xs md:text-sm">Descuento</th>
                      <th className="text-right py-2 px-2 md:px-4 font-medium text-gray-700 dark:text-gray-300 text-xs md:text-sm">Subtotal</th>
                      <th className="text-left py-2 px-2 md:px-4 font-medium text-gray-700 dark:text-gray-300 text-xs md:text-sm">Vendedor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sale.items.map((item, index) => {
                      const baseTotal = item.quantity * item.unitPrice
                      const discountAmount = item.discountType === 'percentage' 
                        ? (baseTotal * (item.discount || 0)) / 100 
                        : (item.discount || 0)
                      const subtotalAfterDiscount = Math.max(0, baseTotal - discountAmount)
                      
                      return (
                        <tr key={item.id} className={`border-b border-gray-600 ${index % 2 === 0 ? 'bg-gray-100 dark:bg-gray-600' : ''}`}>
                          <td className="py-2 md:py-3 px-2 md:px-4">
                          <div className="font-medium text-gray-900 dark:text-white">{item.productName}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Ref: {item.productReferenceCode || 'N/A'}</div>
                          </td>
                          <td className="py-2 md:py-3 px-2 md:px-4 text-center">
                            <span className="inline-flex items-center justify-center w-8 h-8 bg-[#fce4f0] dark:bg-[#f29fc8] text-[#d06a98] dark:text-[#f29fc8]/50 rounded-full text-sm font-medium">
                              {item.quantity}
                            </span>
                          </td>
                          <td className="py-2 md:py-3 px-2 md:px-4 text-right text-gray-600 dark:text-gray-300">
                            {formatCurrency(item.unitPrice)}
                          </td>
                          <td className="py-2 md:py-3 px-2 md:px-4 text-center">
                            {item.discount && item.discount > 0 ? (
                              <div className="flex flex-col items-center">
                                <span className="text-red-500 font-medium">
                                  {item.discountType === 'percentage' ? `${item.discount}%` : formatCurrency(item.discount)}
                                </span>
                                {discountAmount > 0 && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    ({formatCurrency(discountAmount)})
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="py-2 md:py-3 px-2 md:px-4 text-right">
                            <div className="font-semibold text-gray-900 dark:text-white">
                              {formatCurrency(subtotalAfterDiscount)}
                            </div>
                          </td>
                          <td className="py-6 px-4">
                            <div className="text-sm text-gray-600 dark:text-gray-300">
                              {sale.sellerName || 'No especificado'}
                            </div>
                            {sale.sellerEmail && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {sale.sellerEmail}
                              </div>
                            )}
                        </td>
                      </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Cancel Form */}
          {showCancelForm && (
            <div ref={cancelFormRef} className="mt-4">
              <Card className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600">
              <CardHeader>
                <CardTitle className="text-lg text-red-500 dark:text-red-400 flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2 text-red-400" />
                  Anular Factura
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Motivo de anulación: <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Describa detalladamente el motivo de la anulación (mínimo 10 caracteres)..."
                    disabled={isCancelling}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 bg-white dark:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    rows={4}
                  />
                  <div className="mt-1 text-right">
                    <span className={`text-xs ${cancelReason.length < 10 ? 'text-red-500' : 'text-gray-500'}`}>
                      {cancelReason.length}/10 caracteres mínimo
                    </span>
                  </div>
                </div>
                <div className="flex justify-end space-x-3">
                  <Button
                    onClick={() => setShowCancelForm(false)}
                    variant="outline"
                    disabled={isCancelling}
                    className="border-red-500 text-red-400 hover:bg-red-900/20 hover:border-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleCancel}
                      disabled={!cancelReason.trim() || cancelReason.trim().length < 10 || isCancelling}
                      className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border-0 font-medium px-6 py-2 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 rounded-lg disabled:from-gray-400 disabled:to-gray-500 disabled:transform-none disabled:shadow-none disabled:cursor-not-allowed"
                  >
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      {isCancelling ? 'Anulando...' : 'Anular Factura'}
                  </Button>
                </div>
                
              </CardContent>
            </Card>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 md:p-6 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 flex-shrink-0 sticky bottom-0" style={{ paddingBottom: `calc(max(56px, env(safe-area-inset-bottom)) + 1rem)` }}>
          <div className="flex space-x-3">
            {/* Botones de borrador comentados
            {sale.status === 'draft' && onEdit && (
              <Button
                onClick={() => {
                  onEdit(sale)
                  onClose()
                }}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 font-medium px-6 py-2 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 rounded-lg"
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar Borrador
              </Button>
            )}
            {sale.status === 'draft' && onFinalizeDraft && (
              <Button
                onClick={handleFinalizeDraft}
                disabled={isFinalizing}
                className="bg-gradient-to-r from-[#fce4f0]0 to-[#f29fc8] hover:from-[#f29fc8] hover:to-[#e07ab0] text-white border-0 font-medium px-6 py-2 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 rounded-lg disabled:from-gray-400 disabled:to-gray-500 disabled:transform-none disabled:shadow-none disabled:cursor-not-allowed"
              >
                <Receipt className="h-4 w-4 mr-2" />
                {isFinalizing ? 'Facturando...' : 'Facturar'}
              </Button>
            )}
            */}
            {/* No mostrar botón Anular para facturas de transferencias entre tiendas */}
            {sale.status !== 'cancelled' && sale.status !== 'draft' && !transfer && (
              <Button
                onClick={handleShowCancelForm}
                disabled={isCancelling}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border-0 font-medium px-6 py-2 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 rounded-lg disabled:from-gray-400 disabled:to-gray-500 disabled:transform-none disabled:shadow-none disabled:cursor-not-allowed"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Anular Factura
              </Button>
            )}
            {/* Mensaje informativo para facturas de transferencias */}
            {sale.status !== 'cancelled' && transfer && (
              <div className="text-xs text-cyan-600 dark:text-cyan-400 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                Esta factura solo puede anularse desde Transferencias
              </div>
            )}
          </div>
          
          <div className="flex space-x-3">
            <Button
              onClick={onClose}
              disabled={isCancelling || isFinalizing}
              className="bg-[#f29fc8] hover:bg-[#e07ab0] text-white font-medium px-6 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cerrar
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}