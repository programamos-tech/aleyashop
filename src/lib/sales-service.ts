import { supabase } from './supabase'
import { Sale, SaleItem, SalePayment } from '@/types'
import { AuthService } from './auth-service'
import { ProductsService } from './products-service'
import { getCurrentUserStoreId, canAccessAllStores, getCurrentUser } from './store-helper'

export class SalesService {
  // Generar el siguiente número de factura
  static async getNextInvoiceNumber(): Promise<string> {
    try {
      const user = getCurrentUser()
      const storeId = getCurrentUserStoreId()
      const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
      
      let query = supabase
        .from('sales')
        .select('*', { count: 'exact', head: true })

      // Filtrar por store_id:
      // - Si storeId es null o MAIN_STORE_ID, solo contar ventas de la tienda principal (store_id = MAIN_STORE_ID o null)
      // - Si storeId es una microtienda, solo contar ventas de esa microtienda
      if (!storeId || storeId === MAIN_STORE_ID) {
        // Tienda principal: solo contar ventas de la tienda principal (store_id = MAIN_STORE_ID o null)
        query = query.or(`store_id.is.null,store_id.eq.${MAIN_STORE_ID}`)
      } else {
        // Microtienda: solo contar ventas de esa microtienda
        query = query.eq('store_id', storeId)
      }

      const { count, error } = await query

      if (error) {
      // Error silencioso en producción
        return '#001' // Fallback
      }

      const nextNumber = (count || 0) + 1
      return `#${nextNumber.toString().padStart(3, '0')}`
    } catch (error) {
      // Error silencioso en producción
      return '#001' // Fallback
    }
  }

  static async getAllSales(page: number = 1, limit: number = 10): Promise<{ sales: Sale[], total: number, hasMore: boolean }> {
    try {
      const offset = (page - 1) * limit
      const user = getCurrentUser()
      const storeId = getCurrentUserStoreId()
      const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
      
      // Obtener el total de ventas
      let countQuery = supabase
        .from('sales')
        .select('*', { count: 'exact', head: true })

      // Filtrar por store_id:
      // - Si storeId es null o MAIN_STORE_ID, solo mostrar ventas de la tienda principal (store_id = MAIN_STORE_ID o null)
      // - Si storeId es una microtienda, solo mostrar ventas de esa microtienda
      if (!storeId || storeId === MAIN_STORE_ID) {
        // Tienda principal: solo ventas de la tienda principal (store_id = MAIN_STORE_ID o null)
        countQuery = countQuery.or(`store_id.is.null,store_id.eq.${MAIN_STORE_ID}`)
      } else {
        // Microtienda: solo ventas de esa microtienda
        countQuery = countQuery.eq('store_id', storeId)
      }

      const { count, error: countError } = await countQuery
      
      if (countError) {
      // Error silencioso en producción
        throw countError
      }
      
      // Obtener las ventas paginadas con los códigos de referencia y pagos mixtos
      let dataQuery = supabase
        .from('sales')
        .select(`
          *,
          sale_items (
            id,
            product_id,
            product_name,
            product_reference_code,
            quantity,
            unit_price,
            discount,
            total
          ),
          sale_payments (
            id,
            sale_id,
            payment_type,
            amount,
            created_at
          )
        `)

      // Filtrar por store_id:
      // - Si storeId es null o MAIN_STORE_ID, solo mostrar ventas de la tienda principal (store_id = MAIN_STORE_ID o null)
      // - Si storeId es una microtienda, solo mostrar ventas de esa microtienda
      if (!storeId || storeId === MAIN_STORE_ID) {
        // Tienda principal: solo ventas de la tienda principal (store_id = MAIN_STORE_ID o null)
        dataQuery = dataQuery.or(`store_id.is.null,store_id.eq.${MAIN_STORE_ID}`)
      } else {
        // Microtienda: solo ventas de esa microtienda
        dataQuery = dataQuery.eq('store_id', storeId)
      }

      const { data, error } = await dataQuery
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) {
      // Error silencioso en producción
        throw error
      }

      // Obtener referencias de productos para items que no las tienen
      // Y obtener información de créditos para ventas a crédito
      const sales = await Promise.all(
        (data || []).map(async (sale) => {
          const itemsWithReferences = await Promise.all(
            (sale.sale_items || []).map(async (item: any) => {
              let productReference = item.product_reference_code
              
              // Si no hay referencia guardada, obtenerla desde la tabla products
              if (!productReference || productReference === 'N/A' || productReference === null) {
                const { data: product } = await supabase
                  .from('products')
                  .select('reference')
                  .eq('id', item.product_id)
                  .single()
                
                productReference = product?.reference || 'N/A'
              }
              
              return {
                id: item.id,
                productId: item.product_id,
                productName: item.product_name,
                productReferenceCode: productReference,
                quantity: item.quantity,
                unitPrice: item.unit_price,
                discount: item.discount || 0,
                discountType: item.discount_type || 'amount',
                tax: item.tax || 0,
                total: item.total
              }
            })
          )

          // Obtener información del crédito si es una venta a crédito
          let creditStatus = null
          if (sale.payment_method === 'credit' && sale.invoice_number) {
            try {
              const { CreditsService } = await import('./credits-service')
              const credit = await CreditsService.getCreditByInvoiceNumber(sale.invoice_number)
              if (credit) {
                creditStatus = credit.status
              }
            } catch (error) {
              // Error silencioso - continuar sin información de crédito
            }
          }

          return {
            id: sale.id,
            clientId: sale.client_id,
            clientName: sale.client_name,
            total: sale.total,
            subtotal: sale.subtotal,
            tax: sale.tax,
            discount: sale.discount,
            discountType: sale.discount_type || 'amount',
            status: sale.status,
            paymentMethod: sale.payment_method,
            payments: sale.sale_payments?.map((payment: any) => ({
              id: payment.id,
              saleId: payment.sale_id,
              paymentType: payment.payment_type,
              amount: payment.amount,
              createdAt: payment.created_at,
              updatedAt: payment.updated_at || payment.created_at
            })) || [],
            invoiceNumber: sale.invoice_number,
            sellerId: sale.seller_id,
            sellerName: sale.seller_name,
            sellerEmail: sale.seller_email,
            storeId: sale.store_id || undefined,
            createdAt: sale.created_at,
            items: itemsWithReferences,
            creditStatus: creditStatus, // Estado del crédito asociado
            cancellationReason: sale.cancellation_reason || undefined,
            isDelivery: sale.is_delivery || false,
            deliveryFee: sale.delivery_fee || 0
          }
        })
      )

      return {
        sales,
        total: count || 0,
        hasMore: (offset + limit) < (count || 0)
      }
    } catch (error) {
      // Error silencioso en producción
      throw error
    }
  }

  // Método optimizado para dashboard con filtrado por fecha
  static async getDashboardSales(startDate?: Date, endDate?: Date): Promise<Sale[]> {
    try {
      const user = getCurrentUser()
      const storeId = getCurrentUserStoreId()
      const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'

      console.log('[SALES SERVICE] getDashboardSales - Initial:', {
        storeId,
        userStoreId: user?.storeId,
        userRole: user?.role,
        userId: user?.id,
        userName: user?.name,
        isMainStore: storeId === MAIN_STORE_ID || !storeId,
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
        localStorageStoreId: typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('aleya_user') || '{}')?.storeId || null) : null
      })

      // Construir query base
      let query = supabase
        .from('sales')
        .select(`
          *,
          sale_items (
            id,
            product_id,
            product_name,
            product_reference_code,
            quantity,
            unit_price,
            discount,
            total
          ),
          sale_payments (
            id,
            sale_id,
            payment_type,
            amount,
            created_at
          )
        `)

      // Filtrar por store_id:
      // - Si storeId es null o MAIN_STORE_ID, solo mostrar ventas de la tienda principal (store_id = MAIN_STORE_ID o null)
      // - Si storeId es una microtienda, solo mostrar ventas de esa microtienda
      if (!storeId || storeId === MAIN_STORE_ID) {
        // Tienda principal: solo ventas de la tienda principal (store_id = MAIN_STORE_ID o null)
        query = query.or(`store_id.is.null,store_id.eq.${MAIN_STORE_ID}`)
        console.log('[SALES SERVICE] Filtering by main store (store_id = null or MAIN_STORE_ID)')
      } else {
        // Microtienda: solo ventas de esa microtienda
        query = query.eq('store_id', storeId)
        console.log('[SALES SERVICE] Filtering by store_id:', storeId)
      }

      query = query.order('created_at', { ascending: false })

      // Aplicar filtros de fecha si existen
      if (startDate) {
        // Usar inicio del día en hora local (sin conversión UTC)
        const startLocal = new Date(
          startDate.getFullYear(),
          startDate.getMonth(),
          startDate.getDate(),
          0, 0, 0, 0
        )
        query = query.gte('created_at', startLocal.toISOString())
        console.log('[SALES SERVICE] Date filter - startDate:', {
          original: startDate.toISOString(),
          local: startLocal.toISOString(),
          localString: startLocal.toLocaleString('es-CO')
        })
      }
      if (endDate) {
        // Usar final del día en hora local (sin conversión UTC)
        const endLocal = new Date(
          endDate.getFullYear(),
          endDate.getMonth(),
          endDate.getDate(),
          23, 59, 59, 999
        )
        query = query.lte('created_at', endLocal.toISOString())
        console.log('[SALES SERVICE] Date filter - endDate:', {
          original: endDate.toISOString(),
          local: endLocal.toISOString(),
          localString: endLocal.toLocaleString('es-CO')
        })
      }

      // Ejecutar query - Supabase tiene límite de 1,000 registros por query
      // Necesitamos hacer paginado para obtener todos los registros
      let allSales: any[] = []
      let offset = 0
      const limit = 1000 // Límite real de Supabase
      let hasMore = true
      
      while (hasMore) {
        const user = getCurrentUser()
        const storeId = getCurrentUserStoreId()

        let paginatedQuery = supabase
          .from('sales')
          .select(`
            *,
            sale_items (
              id,
              product_id,
              product_name,
              product_reference_code,
              quantity,
              unit_price,
              discount,
              total
            ),
            sale_payments (
              id,
              sale_id,
              payment_type,
              amount,
              created_at
            )
          `)

        // Filtrar por store_id:
        // - Si storeId es null o MAIN_STORE_ID, solo mostrar ventas de la tienda principal (store_id = MAIN_STORE_ID o null)
        // - Si storeId es una microtienda, solo mostrar ventas de esa microtienda
        if (!storeId || storeId === MAIN_STORE_ID) {
          // Tienda principal: solo ventas de la tienda principal (store_id = MAIN_STORE_ID o null)
          paginatedQuery = paginatedQuery.or(`store_id.is.null,store_id.eq.${MAIN_STORE_ID}`)
          console.log('[SALES SERVICE] Paginated query filtering by main store (store_id = null or MAIN_STORE_ID)')
        } else {
          // Microtienda: solo ventas de esa microtienda
          paginatedQuery = paginatedQuery.eq('store_id', storeId)
          console.log('[SALES SERVICE] Paginated query filtering by store_id:', storeId)
        }

        paginatedQuery = paginatedQuery.order('created_at', { ascending: false })
          .range(offset, offset + limit - 1) // Lotes de 1,000

        // Aplicar filtros de fecha si existen
        if (startDate) {
          // Usar inicio del día en hora local (sin conversión UTC)
          const startLocal = new Date(
            startDate.getFullYear(),
            startDate.getMonth(),
            startDate.getDate(),
            0, 0, 0, 0
          )
          paginatedQuery = paginatedQuery.gte('created_at', startLocal.toISOString())
        }
        if (endDate) {
          // Usar final del día en hora local (sin conversión UTC)
          const endLocal = new Date(
            endDate.getFullYear(),
            endDate.getMonth(),
            endDate.getDate(),
            23, 59, 59, 999
          )
          paginatedQuery = paginatedQuery.lte('created_at', endLocal.toISOString())
        }

        const { data, error } = await paginatedQuery

        if (error) {
          // Error silencioso en producción
          console.error('Error en paginado de ventas:', error)
          break
        }

        if (data && data.length > 0) {
          allSales = [...allSales, ...data]
          offset += data.length
          // Si recibimos menos de 1,000, significa que no hay más datos
          hasMore = data.length === limit
        } else {
          hasMore = false
        }
      }

      console.log('[SALES SERVICE] getDashboardSales - Raw sales from DB:', {
        totalSales: allSales.length,
        sales: allSales.slice(0, 5).map(s => ({
          id: s.id,
          invoice_number: s.invoice_number,
          store_id: s.store_id,
          total: s.total,
          created_at: s.created_at,
          status: s.status
        }))
      })

      // Procesar referencias de productos (mismo código que getAllSales)
      const sales = await Promise.all(
        allSales.map(async (sale) => {
          const itemsWithReferences = await Promise.all(
            (sale.sale_items || []).map(async (item: any) => {
              let productReference = item.product_reference_code
              
              if (!productReference || productReference === 'N/A' || productReference === null) {
                const { data: product } = await supabase
                  .from('products')
                  .select('reference')
                  .eq('id', item.product_id)
                  .single()
                
                productReference = product?.reference || 'N/A'
              }
              
              return {
                id: item.id,
                productId: item.product_id,
                productName: item.product_name,
                productReferenceCode: productReference,
                quantity: item.quantity,
                unitPrice: item.unit_price,
                discount: item.discount || 0,
                discountType: item.discount_type || 'amount',
                tax: item.tax || 0,
                total: item.total
              }
            })
          )

          return {
            id: sale.id,
            clientId: sale.client_id,
            clientName: sale.client_name,
            total: sale.total,
            subtotal: sale.subtotal,
            tax: sale.tax,
            discount: sale.discount,
            discountType: sale.discount_type || 'amount',
            status: sale.status,
            paymentMethod: sale.payment_method,
            payments: sale.sale_payments?.map((payment: any) => ({
              id: payment.id,
              saleId: payment.sale_id,
              paymentType: payment.payment_type,
              amount: payment.amount,
              createdAt: payment.created_at,
              updatedAt: payment.updated_at || payment.created_at
            })) || [],
            invoiceNumber: sale.invoice_number,
        sellerId: sale.seller_id,
        sellerName: sale.seller_name,
        sellerEmail: sale.seller_email,
        storeId: sale.store_id || undefined,
        createdAt: sale.created_at,
        items: itemsWithReferences,
        cancellationReason: sale.cancellation_reason || undefined,
        isDelivery: sale.is_delivery || false,
        deliveryFee: sale.delivery_fee || 0
      }
        })
      )

      console.log('[SALES SERVICE] getDashboardSales - Processed sales:', {
        totalSales: sales.length,
        sales: sales.slice(0, 5).map(s => ({
          id: s.id,
          invoice: s.invoiceNumber,
          storeId: s.storeId,
          total: s.total,
          createdAt: s.createdAt,
          status: s.status
        }))
      })

      return sales
    } catch (error) {
      // Error silencioso en producción
      throw error
    }
  }

  static async getSaleById(id: string): Promise<Sale | null> {
    try {
      const user = getCurrentUser()
      const storeId = getCurrentUserStoreId()
      let query = supabase
        .from('sales')
        .select(`
          *,
          sale_items (
            id,
            product_id,
            product_name,
            product_reference_code,
            quantity,
            unit_price,
            discount,
            total
          ),
          sale_payments (
            id,
            sale_id,
            payment_type,
            amount,
            created_at
          )
        `)
        .eq('id', id)

      // Filtrar por store_id si el usuario no puede acceder a todas las tiendas
      if (storeId && !canAccessAllStores(user)) {
        query = query.eq('store_id', storeId)
      }

      const { data, error } = await query.single()

      if (error) {
      // Error silencioso en producción
        throw error
      }

      if (!data) return null

      console.log('🔍 DEBUG getSaleById - data.sale_items:', data.sale_items)
      console.log('🔍 DEBUG getSaleById - data.sale_items type:', typeof data.sale_items)
      console.log('🔍 DEBUG getSaleById - data.sale_items length:', data.sale_items?.length)

      // Obtener referencias de productos si no están en sale_items (para ventas antiguas)
      const itemsWithReferences = await Promise.all(
        (data.sale_items || []).map(async (item: any) => {
          let productReference = item.product_reference_code
          
          // Si no hay referencia guardada, obtenerla desde la tabla products
          if (!productReference || productReference === 'N/A' || productReference === null) {
            const { data: product } = await supabase
              .from('products')
              .select('reference')
              .eq('id', item.product_id)
              .single()
            
            productReference = product?.reference || 'N/A'
          }
          
          return {
            id: item.id,
            productId: item.product_id,
            productName: item.product_name,
            productReferenceCode: productReference,
            quantity: item.quantity,
            unitPrice: item.unit_price,
            discount: item.discount || 0,
            discountType: item.discount_type || 'amount',
            tax: item.tax || 0,
            total: item.total
          }
        })
      )

      console.log('🔍 DEBUG getSaleById - itemsWithReferences:', itemsWithReferences)
      console.log('🔍 DEBUG getSaleById - itemsWithReferences length:', itemsWithReferences.length)

      const result = {
        id: data.id,
        clientId: data.client_id,
        clientName: data.client_name,
        total: data.total,
        subtotal: data.subtotal,
        tax: data.tax,
        discount: data.discount,
        discountType: data.discount_type || 'amount',
        cancellationReason: data.cancellation_reason || undefined,
        status: data.status,
        paymentMethod: data.payment_method,
        payments: data.sale_payments?.map((payment: any) => ({
          id: payment.id,
          saleId: payment.sale_id,
          paymentType: payment.payment_type,
          amount: payment.amount,
          createdAt: payment.created_at,
          updatedAt: payment.updated_at || payment.created_at
        })) || [],
        invoiceNumber: data.invoice_number,
        sellerId: data.seller_id,
        sellerName: data.seller_name,
        sellerEmail: data.seller_email,
        storeId: data.store_id || undefined,
        createdAt: data.created_at,
        items: itemsWithReferences,
        isDelivery: data.is_delivery || false,
        deliveryFee: data.delivery_fee || 0
      }

      console.log('🔍 DEBUG getSaleById - result.items:', result.items)
      console.log('🔍 DEBUG getSaleById - returning result')

      return result
    } catch (error) {
      // Error silencioso en producción
      throw error
    }
  }

  static async createSale(saleData: Omit<Sale, 'id' | 'createdAt'>, currentUserId: string): Promise<Sale> {
    try {
      // Generar número de factura secuencial
      const invoiceNumber = await this.getNextInvoiceNumber()
      
      // Obtener información del usuario actual
      const currentUser = await AuthService.getCurrentUser()
      
      // Obtener store_id del usuario actual
      const storeId = getCurrentUserStoreId()

      // Crear la venta
      console.log('Creando venta con datos:', {
        isDelivery: saleData.isDelivery,
        deliveryFee: saleData.deliveryFee,
        total: saleData.total
      })
      
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          client_id: saleData.clientId,
          client_name: saleData.clientName,
          total: saleData.total,
          subtotal: saleData.subtotal,
          tax: saleData.tax,
          discount: saleData.discount,
          status: saleData.status,
          payment_method: saleData.paymentMethod,
          invoice_number: invoiceNumber,
          seller_id: currentUser?.id || currentUserId,
          seller_name: currentUser?.name || 'Usuario',
          seller_email: currentUser?.email || '',
          store_id: storeId || '00000000-0000-0000-0000-000000000001', // Tienda principal por defecto
          is_delivery: Boolean(saleData.isDelivery),
          delivery_fee: Number(saleData.deliveryFee) || 0
        })
        .select()
        .single()

      if (saleError) {
        console.error('Error al crear venta en Supabase:', JSON.stringify(saleError, null, 2))
        throw saleError
      }

      // Crear los items de la venta y descontar stock (solo si no es borrador)
      const itemsWithStockInfo: Array<any> = []
      if (saleData.items && saleData.items.length > 0) {
        // Si NO es borrador, descontar stock de todos los productos
        if (saleData.status !== 'draft') {
          // Primero descontar stock de todos los productos
          for (const item of saleData.items) {
            const stockResult = await ProductsService.deductStockForSale(
              item.productId, 
              item.quantity, 
              currentUserId
            )
            
            if (!stockResult.success || !stockResult.stockInfo) {
              // Si no se pudo descontar stock, revertir la venta
              await supabase.from('sales').delete().eq('id', sale.id)
              throw new Error(`No hay suficiente stock para el producto: ${item.productName}`)
            }

            // Guardar información del item con su descuento de stock
            itemsWithStockInfo.push({
              productName: item.productName,
              productReference: item.productReferenceCode,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              stockInfo: stockResult.stockInfo
            })
          }
        } else {
          // Si es borrador, solo guardar información básica sin descuento de stock
          itemsWithStockInfo.push(...saleData.items.map(item => ({
            productName: item.productName,
            productReference: item.productReferenceCode,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice
          })))
        }

        // Si todo el stock se descontó correctamente, crear los items de la venta
        const saleItems = saleData.items.map(item => ({
          sale_id: sale.id,
          product_id: item.productId,
          product_name: item.productName,
          product_reference_code: item.productReferenceCode || null,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          discount: item.discount || 0,
          discount_type: item.discountType || 'amount',
          total: item.total
        }))

        const { error: itemsError } = await supabase
          .from('sale_items')
          .insert(saleItems)

        if (itemsError) {
      // Error silencioso en producción
            throw itemsError
        }
      }

      // Crear registros de pago según el método (solo si NO es borrador)
      if (saleData.status !== 'draft') {
        if (saleData.paymentMethod === 'mixed' && saleData.payments && saleData.payments.length > 0) {
          // Crear pagos mixtos
          const paymentRecords = saleData.payments.map(payment => ({
            sale_id: sale.id,
            payment_type: payment.paymentType,
            amount: payment.amount
          }))

          const { error: paymentsError } = await supabase
            .from('sale_payments')
            .insert(paymentRecords)

          if (paymentsError) {
        // Error silencioso en producción
            throw paymentsError
          }
        } else if (saleData.paymentMethod === 'credit') {
          // Crear crédito para ventas a crédito
          const { CreditsService } = await import('./credits-service')
          
          await CreditsService.createCredit({
            saleId: sale.id,
            clientId: saleData.clientId,
            clientName: saleData.clientName,
            invoiceNumber: invoiceNumber,
            totalAmount: saleData.total,
            paidAmount: 0,
            pendingAmount: saleData.total,
            status: 'pending',
            dueDate: saleData.dueDate || null,
            lastPaymentAmount: null,
            lastPaymentDate: null,
            lastPaymentUser: null,
            createdBy: currentUserId,
            createdByName: currentUser?.name || 'Usuario'
          })
        } else {
          // Crear pago único para métodos no mixtos (cash, transfer, etc.)
          const { error: paymentError } = await supabase
            .from('payments')
            .insert({
              sale_id: sale.id,
              client_id: saleData.clientId,
              client_name: saleData.clientName,
              invoice_number: invoiceNumber,
              total_amount: saleData.total,
              paid_amount: saleData.paymentMethod === 'cash' ? saleData.total : 0,
              pending_amount: saleData.paymentMethod === 'cash' ? 0 : saleData.total,
              status: saleData.paymentMethod === 'cash' ? 'completed' : 'pending'
            })

          if (paymentError) {
        // Error silencioso en producción
            throw paymentError
          }
        }
      }

      // Log de actividad
      const paymentMethodLabel = saleData.paymentMethod === 'credit' ? 'Venta a Crédito' : 
                                 saleData.paymentMethod === 'cash' ? 'Venta en Efectivo' :
                                 saleData.paymentMethod === 'transfer' ? 'Venta por Transferencia' :
                                 saleData.paymentMethod === 'mixed' ? 'Venta Mixta' : 'Venta'
      
      // Usar acción diferente según el tipo de venta
      const logAction = saleData.status === 'draft' 
        ? 'sale_draft_create' 
        : saleData.paymentMethod === 'credit' 
          ? 'credit_sale_create' 
          : 'sale_create'
      
      const logDescription = saleData.status === 'draft'
        ? `Borrador de ${paymentMethodLabel}: ${saleData.clientName} - Total: $${saleData.total.toLocaleString()}`
        : `${paymentMethodLabel}: ${saleData.clientName} - Total: $${saleData.total.toLocaleString()}`
      
      // Obtener la fecha de vencimiento del crédito si existe
      let creditDueDate = null
      if (saleData.paymentMethod === 'credit') {
        // Intentar obtener la fecha de saleData (puede no estar en el tipo pero se pasa desde el modal)
        const saleDataWithDueDate = saleData as any
        if (saleDataWithDueDate.dueDate) {
          creditDueDate = saleDataWithDueDate.dueDate
        } else {
          // Si no, obtenerla del crédito recién creado
          try {
            const { CreditsService } = await import('./credits-service')
            const credit = await CreditsService.getCreditByInvoiceNumber(invoiceNumber)
            if (credit && credit.dueDate) {
              creditDueDate = credit.dueDate
            }
          } catch (error) {
            // Error silencioso
          }
        }
      }

      await AuthService.logActivity(
        currentUserId,
        logAction,
        'sales',
        {
          description: logDescription,
          saleId: sale.id,
          invoiceNumber: invoiceNumber,
          clientName: saleData.clientName,
          // Información financiera con IVA
          subtotal: saleData.subtotal,
          tax: saleData.tax,
          total: saleData.total,
          isDelivery: saleData.isDelivery,
          deliveryFee: saleData.deliveryFee || 0,
          paymentMethod: saleData.paymentMethod,
          status: saleData.status,
          itemsCount: itemsWithStockInfo.length,
          items: itemsWithStockInfo,
          // Incluir fecha de vencimiento si es una venta a crédito
          dueDate: creditDueDate
        }
      )

      // Obtener la venta completa con toda la información (códigos de referencia, vendedor, etc.)
      const completeSale = await this.getSaleById(sale.id)
      
      if (!completeSale) {
        throw new Error('Error al obtener la venta creada')
      }

      return completeSale
    } catch (error) {
      // Error silencioso en producción
      throw error
    }
  }

  static async updateSale(id: string, saleData: Partial<Sale>, currentUserId: string): Promise<Sale> {
    try {
      // Validar que solo se puedan actualizar ventas en estado draft
      const existingSale = await this.getSaleById(id)
      if (!existingSale) {
        throw new Error('Venta no encontrada')
      }

      // Verificar que la venta pertenece a la tienda del usuario (si no es admin principal)
      const user = getCurrentUser()
      const storeId = getCurrentUserStoreId()
      if (storeId && !canAccessAllStores(user) && existingSale.storeId !== storeId) {
        throw new Error('No tienes permiso para editar esta venta')
      }
      
      if (existingSale.status !== 'draft') {
        throw new Error('Solo se pueden editar ventas en estado borrador')
      }

      // Actualizar la venta
      const { data, error } = await supabase
        .from('sales')
        .update({
          client_id: saleData.clientId,
          client_name: saleData.clientName,
          total: saleData.total,
          subtotal: saleData.subtotal,
          tax: saleData.tax,
          discount: saleData.discount,
          status: saleData.status,
          payment_method: saleData.paymentMethod,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
      // Error silencioso en producción
        throw error
      }

      // Si hay items en saleData, actualizar los items de la venta
      if (saleData.items && saleData.items.length > 0) {
        // Eliminar items antiguos
        const { error: deleteError } = await supabase
          .from('sale_items')
          .delete()
          .eq('sale_id', id)

        if (deleteError) {
          // Error silencioso en producción
          throw deleteError
        }

        // Crear nuevos items
        const saleItems = saleData.items.map(item => ({
          sale_id: id,
          product_id: item.productId,
          product_name: item.productName,
          product_reference_code: item.productReferenceCode || null,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          discount: item.discount || 0,
          discount_type: item.discountType || 'amount',
          total: item.total
        }))

        const { error: itemsError } = await supabase
          .from('sale_items')
          .insert(saleItems)

        if (itemsError) {
      // Error silencioso en producción
            throw itemsError
        }
      }

      // Obtener la venta actualizada con los items
      const updatedSale = await this.getSaleById(id)
      if (!updatedSale) {
        throw new Error('Error al obtener la venta actualizada')
      }

      // Log de actividad
      await AuthService.logActivity(
        currentUserId,
        'sale_update',
        'sales',
        {
          description: `Borrador actualizado: ${saleData.clientName || 'Venta'} - Total: $${saleData.total?.toLocaleString() || 'N/A'}`,
          saleId: id,
          changes: Object.keys(saleData).join(', ')
        }
      )

      return updatedSale
    } catch (error) {
      // Error silencioso en producción
      throw error
    }
  }

  // Finalizar un borrador: descuenta stock y crea crédito si corresponde
  static async finalizeDraftSale(id: string, currentUserId: string): Promise<Sale> {
    try {
      // Obtener la venta borrador
      const draftSale = await this.getSaleById(id)
      console.log('🔍 DEBUG finalizeDraftSale - draftSale received:', draftSale)
      console.log('🔍 DEBUG finalizeDraftSale - draftSale.items:', draftSale?.items)
      console.log('🔍 DEBUG finalizeDraftSale - draftSale.items type:', typeof draftSale?.items)
      console.log('🔍 DEBUG finalizeDraftSale - draftSale.items length:', draftSale?.items?.length)

      if (!draftSale) {
        throw new Error('Venta no encontrada')
      }

      if (draftSale.status !== 'draft') {
        throw new Error('Esta venta no es un borrador')
      }

      // Obtener información del usuario actual
      const currentUser = await AuthService.getCurrentUser()

      console.log('🔍 DEBUG finalizeDraftSale - About to check items condition')
      console.log('🔍 DEBUG finalizeDraftSale - draftSale.items:', draftSale.items)
      console.log('🔍 DEBUG finalizeDraftSale - draftSale.items?.length:', draftSale.items?.length)

      // Descontar stock de todos los productos
      if (draftSale.items && draftSale.items.length > 0) {
        console.log('🟢 DEBUG finalizeDraftSale - ENTERING stock deduction loop')
        for (const item of draftSale.items) {
          // Verificar stock disponible antes de descontar
          const product = await ProductsService.getProductById(item.productId)
          if (!product) {
            throw new Error(`Producto no encontrado: ${item.productName}`)
          }
          
          const totalStock = (product.stock?.warehouse || 0) + (product.stock?.store || 0)
          if (totalStock < item.quantity) {
            throw new Error(`No hay suficiente stock para el producto "${item.productName}". Stock disponible: ${totalStock}, Cantidad requerida: ${item.quantity}`)
          }
          
          const stockResult = await ProductsService.deductStockForSale(
            item.productId, 
            item.quantity, 
            currentUserId
          )
          
          if (!stockResult.success) {
            throw new Error(`No hay suficiente stock para el producto "${item.productName}". Stock disponible: ${totalStock}, Cantidad requerida: ${item.quantity}`)
          }
        }
      } else {
        console.log('🔴 DEBUG finalizeDraftSale - NOT ENTERING stock deduction loop')
        console.log('🔴 DEBUG finalizeDraftSale - Condition failed: draftSale.items && draftSale.items.length > 0')
      }

      // Crear crédito si el método de pago es crédito
      if (draftSale.paymentMethod === 'credit') {
        const { CreditsService } = await import('./credits-service')
        
        // Intentar obtener la fecha de vencimiento del log de creación del borrador
        let creditDueDate = null
        try {
          const { data: logs } = await supabase
            .from('logs')
            .select('details')
            .eq('module', 'sales')
            .eq('action', 'sale_draft_create')
            .order('created_at', { ascending: false })
            .limit(100)
          
          // Buscar el log que corresponde a este borrador
          if (logs && logs.length > 0) {
            for (const log of logs) {
              let details = log.details
              if (typeof details === 'string') {
                try {
                  details = JSON.parse(details)
                } catch {
                  continue
                }
              }
              if (details && typeof details === 'object' && details.saleId === draftSale.id && details.dueDate) {
                creditDueDate = details.dueDate
                break
              }
            }
          }
        } catch (error) {
          // Error silencioso - usar null si no se encuentra
        }
        
        await CreditsService.createCredit({
          saleId: draftSale.id,
          clientId: draftSale.clientId,
          clientName: draftSale.clientName,
          invoiceNumber: draftSale.invoiceNumber || '',
          totalAmount: draftSale.total,
          paidAmount: 0,
          pendingAmount: draftSale.total,
          status: 'pending',
          dueDate: creditDueDate,
          lastPaymentAmount: null,
          lastPaymentDate: null,
          lastPaymentUser: null,
          createdBy: currentUserId,
          createdByName: currentUser?.name || 'Usuario'
        })
      }

      // Actualizar el status a 'completed'
      const updatedSale = await this.updateSale(id, { status: 'completed' }, currentUserId)

      // Log de actividad
      await AuthService.logActivity(
        currentUserId,
        'sale_draft_finalize',
        'sales',
        {
          description: `Borrador facturado: ${draftSale.clientName} - Total: $${draftSale.total.toLocaleString()}`,
          saleId: id,
          clientName: draftSale.clientName,
          total: draftSale.total,
          paymentMethod: draftSale.paymentMethod
        }
      )

      return updatedSale
    } catch (error) {
      // Error silencioso en producción
      throw error
    }
  }

  static async deleteSale(id: string, currentUserId: string): Promise<void> {
    try {
      // Verificar que la venta pertenece a la tienda del usuario (si no es admin principal)
      const existingSale = await this.getSaleById(id)
      if (!existingSale) {
        throw new Error('Venta no encontrada')
      }

      const user = getCurrentUser()
      const storeId = getCurrentUserStoreId()
      if (storeId && !canAccessAllStores(user) && existingSale.storeId !== storeId) {
        throw new Error('No tienes permiso para eliminar esta venta')
      }

      const { error } = await supabase
        .from('sales')
        .delete()
        .eq('id', id)

      if (error) {
      // Error silencioso en producción
        throw error
      }

      // Log de actividad
      await AuthService.logActivity(
        currentUserId,
        'sale_delete',
        'sales',
        {
          description: `Venta eliminada: ID ${id}`,
          saleId: id
        }
      )
    } catch (error) {
      // Error silencioso en producción
      throw error
    }
  }

  static async cancelSale(id: string, reason: string, currentUserId: string): Promise<{ success: boolean, totalRefund?: number }> {
    try {
      // Obtener la venta para verificar si tiene crédito
      const sale = await this.getSaleById(id)
      if (!sale) {
        throw new Error('Venta no encontrada')
      }

      let totalRefund = 0

      // 🚀 OPTIMIZACIÓN: Obtener crédito una sola vez al inicio si es necesario
      let credit = null
      if (sale.paymentMethod === 'credit') {
        const { CreditsService } = await import('./credits-service')
        credit = await CreditsService.getCreditByInvoiceNumber(sale.invoiceNumber)
        
        if (credit) {
          // Para ventas a crédito, obtener todos los abonos del crédito que no estén cancelados
          // Primero buscar el payment relacionado al crédito
          const { data: paymentData, error: paymentError } = await supabase
            .from('payments')
            .select('id')
            .eq('invoice_number', sale.invoiceNumber)
            .eq('client_id', sale.clientId)
            .single()
          
          if (!paymentError && paymentData) {
            // Obtener todos los payment_records relacionados a este payment que no estén cancelados
            const { data: paymentRecords, error: recordsError } = await supabase
              .from('payment_records')
              .select('id, amount, status')
              .eq('payment_id', paymentData.id)
              .neq('status', 'cancelled')
            
            if (!recordsError && paymentRecords && paymentRecords.length > 0) {
              // Calcular el reembolso total
              totalRefund = paymentRecords.reduce((sum, payment) => sum + (payment.amount || 0), 0)
              
              // Obtener el nombre del usuario que está cancelando
              let userName = 'Usuario'
              try {
                const { AuthService } = await import('./auth-service')
                const user = await AuthService.getCurrentUser()
                if (user?.name) {
                  userName = user.name
                }
              } catch (error) {
                // Error silencioso - usar nombre por defecto
              }
              
              // Cancelar todos los abonos del crédito
              for (const paymentRecord of paymentRecords) {
                const { error: cancelError } = await supabase
                  .from('payment_records')
                  .update({ 
                    status: 'cancelled',
                    cancelled_at: new Date().toISOString(),
                    cancelled_by: currentUserId,
                    cancelled_by_name: userName,
                    cancellation_reason: `Cancelación de factura: ${sale.invoiceNumber} - ${reason}`
                  })
                  .eq('id', paymentRecord.id)

                if (cancelError) {
                  // Error silencioso en producción
                  // Continuar con la anulación aunque algunos abonos no se pudieron cancelar
                }
              }
            }
          }
        }
      } else if (sale.paymentMethod === 'cash' || sale.paymentMethod === 'transfer') {
        // Para ventas en efectivo o transferencia, el reembolso es el total de la venta
        totalRefund = sale.total
      } else if (sale.paymentMethod === 'mixed' && sale.payments) {
        // Para pagos mixtos, calcular el reembolso basado en los pagos directos (efectivo/transferencia)
        totalRefund = sale.payments
          .filter(payment => payment.paymentType === 'cash' || payment.paymentType === 'transfer')
          .reduce((sum, payment) => sum + payment.amount, 0)
      }
      
      // Preparar items para devolución de stock
      const stockReturnItems = sale.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        productName: item.productName
      }))

      // Devolver stock al local (siempre hacer esto para ventas canceladas)
      // 🚀 OPTIMIZACIÓN: Usar procesamiento en lote en lugar de loop secuencial
      const stockReturnResult = await ProductsService.returnStockFromSaleBatch(stockReturnItems, currentUserId)
      
      // Capturar información del stock devuelto para el log
      let stockReturnInfo = null
      if (stockReturnResult.success && stockReturnResult.results.length > 0) {
        stockReturnInfo = {
          successfulUpdates: stockReturnResult.results.filter(r => r.success).map(r => ({
            productId: r.productId,
            productName: r.productName || sale.items.find(i => i.productId === r.productId)?.productName || 'N/A',
            productReference: r.productReference || sale.items.find(i => i.productId === r.productId)?.productReferenceCode || 'N/A',
            quantityReturned: r.quantity || 0,
            previousStoreStock: r.previousStock || 0,
            newStoreStock: r.newStock || 0
          }))
        }
      }
      
      if (!stockReturnResult.success) {
        const failedReturns = stockReturnResult.results.filter(r => !r.success)
        // Continuar con la anulación aunque algunos productos no se pudieron devolver
      }

      // Si es una venta a crédito, actualizar el crédito para reflejar la cancelación parcial
      if (sale.paymentMethod === 'credit' && credit) {
        // Recalcular el estado del crédito basado en las ventas activas
        // Esto se moverá después de actualizar la venta
      }

      // Anular la venta
      const { error } = await supabase
        .from('sales')
        .update({
          status: 'cancelled',
          cancellation_reason: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) {
      // Error silencioso en producción
        throw error
      }

      // Verificar que la venta se actualizó correctamente
      const { data: updatedSale, error: verifyError } = await supabase
        .from('sales')
        .select('id, status, invoice_number')
        .eq('id', id)
        .single()

      if (verifyError) {
      // Error silencioso en producción
      } else {

        // 🚀 OPTIMIZACIÓN: Solo actualizar crédito si es necesario (evitar query redundante)
        if (sale.paymentMethod === 'credit') {

          // Usar el crédito que ya obtuvimos anteriormente en lugar de hacer otra query
          if (credit) {
            await this.updateCreditStatusAfterSaleCancellation(credit.id, sale.id, currentUserId)
          } else {

          }
        }
      }

      // Log de actividad
      await AuthService.logActivity(
        currentUserId,
        'sale_cancel',
        'sales',
        {
          description: sale.paymentMethod === 'credit' 
            ? `Factura perteneciente a un crédito cancelada: ${sale.invoiceNumber} - Motivo: ${reason}${totalRefund > 0 ? ` - Reembolso: $${totalRefund.toLocaleString()}` : ''}`
            : `Venta cancelada: ID ${id} - Motivo: ${reason}${totalRefund > 0 ? ` - Reembolso: $${totalRefund.toLocaleString()}` : ''}`,
          saleId: id,
          invoiceNumber: sale.invoiceNumber,
          reason: reason,
          totalRefund: totalRefund,
          isCreditSale: sale.paymentMethod === 'credit',
          creditId: credit?.id || null,
          clientName: sale.clientName || null,
          stockReturnInfo: stockReturnInfo
        }
      )

      return { success: true, totalRefund }
    } catch (error) {
      // Error silencioso en producción
      throw error
    }
  }

  // Actualizar el estado del crédito después de cancelar una venta
  static async updateCreditStatusAfterSaleCancellation(creditId: string, cancelledSaleId: string, cancellingUserId: string): Promise<void> {
    try {

      // Obtener la venta cancelada para obtener el cliente
      const cancelledSale = await this.getSaleById(cancelledSaleId)
      if (!cancelledSale) {
      // Error silencioso en producción
        return
      }

      // Obtener todas las ventas con el mismo número de factura (crédito específico)
      const { data: allSales, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .eq('invoice_number', cancelledSale.invoiceNumber)
        .order('created_at', { ascending: true })

      if (salesError) {
      // Error silencioso en producción
        return
      }

      if (!allSales || allSales.length === 0) {

        return
      }

      // Calcular totales solo de ventas activas (no canceladas)
      const activeSales = allSales.filter(sale => sale.status !== 'cancelled')
      const totalAmount = activeSales.reduce((sum, sale) => sum + sale.total, 0)

      // Si no hay ventas activas, el crédito debe cancelarse completamente
      if (activeSales.length === 0) {
        // Obtener información del crédito antes de actualizarlo para el log
        const { data: creditBeforeUpdate, error: creditBeforeError } = await supabase
          .from('credits')
          .select('*')
          .eq('id', creditId)
          .single()

        // Obtener el nombre del usuario que está cancelando
        let userName = 'Usuario'
        try {
          const { AuthService } = await import('./auth-service')
          const user = await AuthService.getCurrentUser()
          if (user?.name) {
            userName = user.name
          }
        } catch (error) {
          // Error silencioso - usar nombre por defecto
        }

        // Actualizar el crédito: poner montos en 0 y cambiar estado a cancelled
        const { error: updateError } = await supabase
          .from('credits')
          .update({
            total_amount: 0,
            pending_amount: 0,
            paid_amount: 0,
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            cancelled_by: cancellingUserId,
            cancelled_by_name: userName,
            cancellation_reason: `Cancelación de factura: ${cancelledSale.invoiceNumber}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', creditId)

        if (updateError) {
      // Error silencioso en producción
          throw updateError
        }

        // Log de cancelación de crédito
        if (creditBeforeUpdate && cancellingUserId) {
          try {
            const { AuthService } = await import('./auth-service')
            await AuthService.logActivity(
              cancellingUserId,
              'credit_cancelled',
              'credits',
              {
                description: `Crédito cancelado: ${creditBeforeUpdate.client_name} - Factura: ${creditBeforeUpdate.invoice_number} - Motivo: Cancelación de factura asociada`,
                creditId: creditId,
                invoiceNumber: creditBeforeUpdate.invoice_number,
                clientName: creditBeforeUpdate.client_name,
                totalAmount: creditBeforeUpdate.total_amount,
                paidAmount: creditBeforeUpdate.paid_amount || 0,
                reason: 'Cancelación de factura asociada',
                cancelledSaleId: cancelledSaleId
              }
            )
          } catch (logError) {
            // Error silencioso en producción
          }
        }

        return
      }

      // Obtener el monto pagado actual del crédito
      const { data: creditData, error: creditError } = await supabase
        .from('credits')
        .select('paid_amount')
        .eq('id', creditId)
        .single()

      if (creditError) {
      // Error silencioso en producción
        return
      }

      const paidAmount = creditData.paid_amount || 0
      const pendingAmount = totalAmount - paidAmount

      // Determinar el nuevo estado del crédito
      let newStatus = 'pending'
      if (pendingAmount <= 0) {
        newStatus = 'completed'
      } else if (paidAmount > 0) {
        newStatus = 'partial'
      }

      // Obtener información del crédito antes de actualizarlo para el log
      const { data: creditBeforeUpdate, error: creditBeforeError } = await supabase
        .from('credits')
        .select('*')
        .eq('id', creditId)
        .single()

      // Actualizar el crédito
      const { error: updateError } = await supabase
        .from('credits')
        .update({
          total_amount: totalAmount,
          pending_amount: pendingAmount,
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', creditId)

      if (updateError) {
      // Error silencioso en producción
        throw updateError
      }

      // Si no hay ventas activas, el crédito fue cancelado completamente
      if (activeSales.length === 0 && creditBeforeUpdate) {
        // Obtener historial de pagos para calcular el total a devolver
        const { CreditsService } = await import('./credits-service')
        const paymentHistory = await CreditsService.getPaymentHistory(creditId)
        const totalRefund = paymentHistory.reduce((sum, payment) => sum + payment.amount, 0)

        // Log de cancelación de crédito
        if (cancellingUserId) {
          const { AuthService } = await import('./auth-service')
          await AuthService.logActivity(
            cancellingUserId,
            'credit_cancelled',
            'credits',
            {
              description: `Crédito cancelado: ${creditBeforeUpdate.client_name} - Factura: ${creditBeforeUpdate.invoice_number} - Motivo: Cancelación de factura asociada`,
              creditId: creditId,
              invoiceNumber: creditBeforeUpdate.invoice_number,
              clientName: creditBeforeUpdate.client_name,
              totalAmount: creditBeforeUpdate.total_amount,
              paidAmount: creditBeforeUpdate.paid_amount || 0,
              totalRefund: totalRefund,
              reason: 'Cancelación de factura asociada',
              cancelledSaleId: cancelledSaleId
            }
          )
        }
      }

    } catch (error) {
      // Error silencioso en producción
      throw error
    }
  }

  static async searchSalesForWarranty(searchTerm: string): Promise<Sale[]> {
    try {
      // Limpiar el término de búsqueda
      const cleanTerm = searchTerm.trim()
      if (!cleanTerm) return []

      const user = getCurrentUser()
      const storeId = getCurrentUserStoreId()

      // Construir la consulta de búsqueda (SIN excluir ventas canceladas para garantías)
      let searchQuery = supabase
        .from('sales')
        .select(`
          *,
          sale_items (
            id,
            product_id,
            product_name,
            product_reference_code,
            quantity,
            unit_price,
            discount,
            total
          )
        `)

      // Filtrar por store_id si el usuario no puede acceder a todas las tiendas
      if (storeId && !canAccessAllStores(user)) {
        searchQuery = searchQuery.eq('store_id', storeId)
      }

      // Lógica de búsqueda mejorada
      let searchConditions: string[] = []

      // Si el término es un número, priorizar búsqueda por número de factura
      if (!isNaN(Number(cleanTerm))) {
        const numericValue = Number(cleanTerm)
        
        // Buscar por número de factura exacto (sin el #)
        searchConditions.push(`invoice_number.eq.#${cleanTerm.padStart(3, '0')}`)
        
        // Buscar por número de factura que contenga el número (para casos como #010, #100, etc.)
        searchConditions.push(`invoice_number.ilike.%${cleanTerm}%`)
        
        // Buscar por monto exacto
        searchConditions.push(`total.eq.${numericValue}`)
        searchConditions.push(`subtotal.eq.${numericValue}`)
        
        // Buscar en otros campos que puedan contener el número
        searchConditions.push(`client_name.ilike.%${cleanTerm}%`)
        searchConditions.push(`seller_name.ilike.%${cleanTerm}%`)
      } else {
        // Para términos no numéricos, buscar en campos de texto
        searchConditions = [
          `client_name.ilike.%${cleanTerm}%`,
          `invoice_number.ilike.%${cleanTerm}%`,
          `payment_method.ilike.%${cleanTerm}%`,
          `seller_name.ilike.%${cleanTerm}%`,
          `seller_email.ilike.%${cleanTerm}%`
        ]
        
        // Agregar búsqueda por métodos de pago en español
        const paymentMethodMappings = {
          'efectivo': 'cash',
          'contado': 'cash',
          'efectivo/contado': 'cash',
          'crédito': 'credit',
          'credito': 'credit',
          'transferencia': 'transfer',
          'garantía': 'warranty',
          'garantia': 'warranty',
          'mixto': 'mixed'
        }
        
        // Si el término coincide con un método de pago en español, buscar por el valor en inglés
        const lowerTerm = cleanTerm.toLowerCase()
        if (paymentMethodMappings[lowerTerm]) {
          searchConditions.push(`payment_method.eq.${paymentMethodMappings[lowerTerm]}`)
        }
      }

      const { data, error } = await searchQuery
        .or(searchConditions.join(','))
        // NO excluir ventas canceladas para garantías
        .order('created_at', { ascending: false })

      if (error) {
      // Error silencioso en producción
        throw error
      }

      // Filtrar y ordenar resultados para priorizar coincidencias exactas
      const results = data?.map(sale => ({
        id: sale.id,
        clientId: sale.client_id,
        clientName: sale.client_name,
        total: sale.total,
        subtotal: sale.subtotal,
        tax: sale.tax,
        discount: sale.discount,
        discountType: sale.discount_type || 'amount',
        status: sale.status,
        paymentMethod: sale.payment_method,
        invoiceNumber: sale.invoice_number,
        sellerId: sale.seller_id,
        sellerName: sale.seller_name,
        sellerEmail: sale.seller_email,
        createdAt: sale.created_at,
        items: sale.sale_items?.map((item: any) => ({
          id: item.id,
          productId: item.product_id,
          productName: item.product_name,
          productReferenceCode: item.product_reference_code || 'N/A',
          quantity: item.quantity,
          unitPrice: item.unit_price,
          discount: item.discount || 0,
          discountType: item.discount_type || 'amount',
          tax: item.tax || 0,
          total: item.total
        })) || [],
        isDelivery: sale.is_delivery || false,
        deliveryFee: sale.delivery_fee || 0
      })) || []

      // Si el término es numérico, priorizar resultados que coincidan con el número de factura
      if (!isNaN(Number(cleanTerm))) {
        return results.sort((a, b) => {
          // Priorizar coincidencias exactas en el número de factura
          const aExactMatch = a.invoiceNumber === `#${cleanTerm.padStart(3, '0')}` ? 3 : 0
          const bExactMatch = b.invoiceNumber === `#${cleanTerm.padStart(3, '0')}` ? 3 : 0
          
          // Luego coincidencias parciales en el número de factura
          const aPartialMatch = a.invoiceNumber?.includes(cleanTerm) ? 2 : 0
          const bPartialMatch = b.invoiceNumber?.includes(cleanTerm) ? 2 : 0
          
          // Finalmente coincidencias en otros campos
          const aOtherMatch = (a.clientName?.includes(cleanTerm) || a.sellerName?.includes(cleanTerm)) ? 1 : 0
          const bOtherMatch = (b.clientName?.includes(cleanTerm) || b.sellerName?.includes(cleanTerm)) ? 1 : 0
          
          const aScore = aExactMatch + aPartialMatch + aOtherMatch
          const bScore = bExactMatch + bPartialMatch + bOtherMatch
          
          return bScore - aScore
        })
      }

      return results
    } catch (error) {
      // Error silencioso en producción
      throw error
    }
  }

  static async searchSales(searchTerm: string): Promise<Sale[]> {
    try {
      const cleanTerm = searchTerm.trim()
      if (!cleanTerm) return []

      // Detectar si es un número (para buscar por ID de factura)
      const numericValue = cleanTerm.replace('#', '')
      const isNumber = !isNaN(Number(numericValue)) && numericValue.length > 0
      
      const user = getCurrentUser()
      const storeId = getCurrentUserStoreId()

      let query = supabase
        .from('sales')
        .select(`
          *,
          sale_items (
            id,
            product_id,
            product_name,
            product_reference_code,
            quantity,
            unit_price,
            discount,
            total
          )
        `)

      // Filtrar por store_id si el usuario no puede acceder a todas las tiendas
      if (storeId && !canAccessAllStores(user)) {
        query = query.eq('store_id', storeId)
      }

      // Buscar en ambos campos: número de factura Y nombre del cliente
      if (isNumber) {
        // Si es un número, buscar por número de factura Y nombre del cliente
        query = query.or(`invoice_number.eq.#${numericValue.padStart(3, '0')},invoice_number.ilike.%${numericValue}%,client_name.ilike.%${cleanTerm}%`)
      } else {
        // Si no es un número, buscar solo por nombre del cliente
        query = query.ilike('client_name', `%${cleanTerm}%`)
      }
      
      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) {
        // Error silencioso en producción
        throw error
      }

      return await Promise.all(data?.map(async sale => {
        // Obtener items de la venta con referencia de productos
        const items = await Promise.all((sale.sale_items || []).map(async (item: any) => {
          let productReference = item.product_reference_code
          
          // Si no hay referencia guardada, obtenerla desde la tabla products (para ventas antiguas)
          if (!productReference || productReference === 'N/A' || productReference === null) {
            const { data: product } = await supabase
              .from('products')
              .select('reference')
              .eq('id', item.product_id)
              .single()
            
            productReference = product?.reference || 'N/A'
          }
          
          return {
            id: item.id,
            productId: item.product_id,
            productName: item.product_name,
            productReferenceCode: productReference,
            quantity: item.quantity,
            unitPrice: item.unit_price,
            discount: item.discount || 0,
            discountType: item.discount_type || 'amount',
            tax: item.tax || 0,
            total: item.total
          }
        }))

        // Obtener pagos mixtos si existe
        let payments: SalePayment[] = []
        if (sale.payment_method === 'mixed') {
          const { data: paymentData } = await supabase
            .from('sale_payments')
            .select('id,sale_id,payment_type,amount,created_at')
            .eq('sale_id', sale.id)
          
          payments = (paymentData || []).map((p: any) => ({
            id: p.id,
            saleId: p.sale_id,
            paymentType: p.payment_type,
            amount: p.amount,
            createdAt: p.created_at,
            updatedAt: p.updated_at || p.created_at
          }))
        }

        // Obtener información del crédito si es una venta a crédito
        let creditStatus = null
        if (sale.payment_method === 'credit' && sale.invoice_number) {
          try {
            const { CreditsService } = await import('./credits-service')
            const credit = await CreditsService.getCreditByInvoiceNumber(sale.invoice_number)
            if (credit) {
              creditStatus = credit.status
            }
          } catch (error) {
            // Error silencioso - continuar sin información de crédito
          }
        }

        return {
          id: sale.id,
          clientId: sale.client_id,
          clientName: sale.client_name,
          total: sale.total,
          subtotal: sale.subtotal,
          tax: sale.tax,
          discount: sale.discount,
          discountType: sale.discount_type || 'amount',
          status: sale.status,
          paymentMethod: sale.payment_method,
          invoiceNumber: sale.invoice_number,
          sellerId: sale.seller_id,
          sellerName: sale.seller_name || '',
          sellerEmail: sale.seller_email || '',
          storeId: sale.store_id || undefined,
          createdAt: sale.created_at,
          items,
          payments: payments.length > 0 ? payments : undefined,
          creditStatus: creditStatus, // Estado del crédito asociado
          isDelivery: sale.is_delivery || false,
          deliveryFee: sale.delivery_fee || 0
        }
      }) || [])
    } catch (error) {
      // Error silencioso en producción
      throw error
    }
  }

  // Obtener todas las ventas de un producto específico
  static async getSalesByProductId(productId: string, startDate?: Date): Promise<Sale[]> {
    try {
      // Obtener los IDs de ventas que contienen este producto
      const { data: saleItems, error: itemsError } = await supabase
        .from('sale_items')
        .select('sale_id')
        .eq('product_id', productId)

      if (itemsError) {
        console.error('Error obteniendo sale_items:', itemsError)
        return []
      }

      if (!saleItems || saleItems.length === 0) {
        return []
      }

      // Obtener los IDs de ventas únicos
      const saleIds = [...new Set(saleItems.map((item: any) => item.sale_id))]
      
      if (saleIds.length === 0) {
        return []
      }

      // Supabase tiene un límite en .in(), así que dividimos en lotes si es necesario
      const batchSize = 100
      const batches: string[][] = []
      for (let i = 0; i < saleIds.length; i += batchSize) {
        batches.push(saleIds.slice(i, i + batchSize))
      }

      // Obtener todas las ventas en lotes
      const allSalesData: any[] = []
      for (const batch of batches) {
        const storeId = getCurrentUserStoreId()

        let salesQuery = supabase
          .from('sales')
          .select(`
            *,
            sale_items (
              id,
              product_id,
              product_name,
              product_reference_code,
              quantity,
              unit_price,
              discount,
              discount_type,
              total
            ),
            sale_payments (
              id,
              sale_id,
              payment_type,
              amount,
              created_at
            )
          `)
          .in('id', batch)
        
        // Siempre filtrar por la tienda actual: análisis de rotación y márgenes es por tienda
        const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
        if (!storeId || storeId === MAIN_STORE_ID) {
          salesQuery = salesQuery.or(`store_id.is.null,store_id.eq.${MAIN_STORE_ID}`)
        } else {
          salesQuery = salesQuery.eq('store_id', storeId)
        }
        
        // Si hay una fecha de inicio, filtrar por fecha
        if (startDate) {
          salesQuery = salesQuery.gte('created_at', startDate.toISOString())
        }
        
        const { data: salesData, error: salesError } = await salesQuery
          .order('created_at', { ascending: false })

        if (salesError) {
          console.error('Error obteniendo ventas (batch):', salesError)
          continue // Continuar con el siguiente lote aunque este falle
        }

        if (salesData) {
          allSalesData.push(...salesData)
        }
      }

      if (allSalesData.length === 0) {
        return []
      }

      // Obtener todas las referencias de productos de una vez (optimización)
      const allProductIds = new Set<string>()
      allSalesData.forEach((sale: any) => {
        (sale.sale_items || []).forEach((item: any) => {
          if (item.product_id && (!item.product_reference_code || item.product_reference_code === 'N/A' || item.product_reference_code === null)) {
            allProductIds.add(item.product_id)
          }
        })
      })

      // Obtener todas las referencias de productos en una sola consulta
      const productReferencesMap = new Map<string, string>()
      if (allProductIds.size > 0) {
        const productIdsArray = Array.from(allProductIds)
        const batchSize = 100
        for (let i = 0; i < productIdsArray.length; i += batchSize) {
          const batch = productIdsArray.slice(i, i + batchSize)
          const { data: products } = await supabase
            .from('products')
            .select('id, reference')
            .in('id', batch)
          
          if (products) {
            products.forEach((product: any) => {
              productReferencesMap.set(product.id, product.reference || 'N/A')
            })
          }
        }
      }

      // Mapear las ventas al formato Sale
      const sales = allSalesData.map((sale: any) => {
        // Obtener referencias de productos del mapa
        const itemsWithReferences = (sale.sale_items || []).map((item: any) => {
          let productReference = item.product_reference_code
          
          if (!productReference || productReference === 'N/A' || productReference === null) {
            productReference = productReferencesMap.get(item.product_id) || 'N/A'
          }
          
          return {
            id: item.id,
            productId: item.product_id,
            productName: item.product_name,
            productReferenceCode: productReference,
            quantity: item.quantity,
            unitPrice: item.unit_price,
            discount: item.discount || 0,
            discountType: item.discount_type || 'amount',
            tax: item.tax || 0,
            total: item.total
          }
        })

          return {
            id: sale.id,
            clientId: sale.client_id,
            clientName: sale.client_name,
            total: sale.total,
            subtotal: sale.subtotal,
            tax: sale.tax,
            discount: sale.discount,
            discountType: sale.discount_type || 'amount',
            status: sale.status,
            paymentMethod: sale.payment_method,
            invoiceNumber: sale.invoice_number,
            sellerId: sale.seller_id,
            sellerName: sale.seller_name || '',
            sellerEmail: sale.seller_email || '',
            storeId: sale.store_id || undefined,
            createdAt: sale.created_at,
            items: itemsWithReferences,
            payments: sale.sale_payments?.map((payment: any) => ({
              id: payment.id,
              saleId: payment.sale_id,
              paymentType: payment.payment_type,
              amount: payment.amount,
              createdAt: payment.created_at,
              updatedAt: payment.updated_at || payment.created_at
            })) || [],
            isDelivery: sale.is_delivery || false,
            deliveryFee: sale.delivery_fee || 0
          }
        })

      // Filtrar solo las ventas que tienen el producto
      const salesWithProduct = sales.filter(sale => {
        return sale.items?.some(item => item.productId === productId) || false
      }) as Sale[]

      return salesWithProduct
    } catch (error) {
      console.error('Error en getSalesByProductId:', error)
      return []
    }
  }
}
