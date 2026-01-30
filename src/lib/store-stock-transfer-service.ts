import { supabase, supabaseAdmin } from './supabase'
import { StoreStockTransfer, StoreStock, TransferItem, Sale, SaleItem } from '@/types'
import { SalesService } from './sales-service'
import { StoresService } from './stores-service'
import { ProductsService } from './products-service'
import { AuthService } from './auth-service'
import { getCurrentUserStoreId } from './store-helper'

export class StoreStockTransferService {
  // Crear transferencia con múltiples productos
  static async createTransfer(
    fromStoreId: string,
    toStoreId: string,
    items: Array<{ productId: string; productName: string; productReference?: string; quantity: number; fromLocation: 'warehouse' | 'store'; unitPrice?: number }>,
    description?: string,
    notes?: string,
    createdBy?: string,
    createdByName?: string,
    paymentInfo?: { method: 'cash' | 'transfer' | 'mixed'; cashAmount: number; transferAmount: number }
  ): Promise<StoreStockTransfer | null> {
    try {
      // Validar que hay items
      if (!items || items.length === 0) {
        console.error('Transfer must have at least one item')
        return null
      }

      const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
      const isFromMainStore = fromStoreId === MAIN_STORE_ID || !fromStoreId

      console.log('[CREATE TRANSFER] Starting transfer creation:', {
        fromStoreId,
        toStoreId,
        itemsCount: items.length,
        isFromMainStore,
        MAIN_STORE_ID,
        paymentInfo,
        items: items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice
        }))
      })

      // Verificar stock disponible para todos los productos
      for (const item of items) {
        if (isFromMainStore) {
          // Para la tienda principal, verificar stock en products
          const { data: product } = await supabaseAdmin
            .from('products')
            .select('stock_warehouse, stock_store')
            .eq('id', item.productId)
            .single()
          
          if (!product) {
            console.error(`Product not found: ${item.productId}`)
            return null
          }

          const availableStock = item.fromLocation === 'warehouse' 
            ? (product.stock_warehouse || 0)
            : (product.stock_store || 0)

          if (availableStock < item.quantity) {
            console.error(`Insufficient stock for product ${item.productName}. Available: ${availableStock}, Requested: ${item.quantity}`)
            return null
          }
        } else {
          // Para micro tiendas, verificar stock en store_stock
          const stock = await this.getStoreStock(fromStoreId, item.productId)
          if (!stock || stock.quantity < item.quantity) {
            console.error(`Insufficient stock for product ${item.productName}`)
            return null
          }
        }
      }

      // Crear la transferencia principal
      const { data: transfer, error: transferError } = await supabaseAdmin
        .from('stock_transfers')
        .insert({
          from_store_id: fromStoreId,
          to_store_id: toStoreId,
          status: 'pending',
          description: description || null,
          notes: notes || null,
          created_by: createdBy || null,
          created_by_name: createdByName || null,
          // Campos legacy para compatibilidad (deprecated)
          // Nota: product_name no existe en stock_transfers, solo en transfer_items
          product_id: items[0].productId,
          quantity: items.reduce((sum, item) => sum + item.quantity, 0)
        })
        .select()
        .maybeSingle()

      if (transferError) {
        console.error('Error creating transfer:', transferError)
        return null
      }

      if (!transfer) {
        console.error('Transfer was not created')
        return null
      }

      // Crear los items de la transferencia con from_location y unit_price
      const transferItems = items.map(item => ({
        transfer_id: transfer.id,
        product_id: item.productId,
        product_name: item.productName,
        product_reference: item.productReference || null,
        quantity: item.quantity,
        from_location: item.fromLocation,
        unit_price: item.unitPrice || null
      }))

      const { error: itemsError } = await supabaseAdmin
        .from('transfer_items')
        .insert(transferItems)

      if (itemsError) {
        console.error('Error creating transfer items:', itemsError)
        // Eliminar la transferencia si falla la creación de items
        await supabaseAdmin.from('stock_transfers').delete().eq('id', transfer.id)
        return null
      }

      // Reducir stock de la tienda origen según el tipo de tienda
      for (const item of items) {
        if (isFromMainStore) {
          // Para la tienda principal, descontar de products.stock_warehouse o products.stock_store
          console.log('[STORE STOCK TRANSFER] Deducting stock from MAIN STORE:', {
            productId: item.productId,
            productName: item.productName,
            fromLocation: item.fromLocation,
            quantity: item.quantity
          })
          
          const { data: product } = await supabaseAdmin
            .from('products')
            .select('stock_warehouse, stock_store')
            .eq('id', item.productId)
            .single()

          if (product) {
            const field = item.fromLocation === 'warehouse' ? 'stock_warehouse' : 'stock_store'
            const currentStock = item.fromLocation === 'warehouse' 
              ? (product.stock_warehouse || 0)
              : (product.stock_store || 0)
            const newStock = currentStock - item.quantity

            console.log('[STORE STOCK TRANSFER] Stock calculation for MAIN STORE:', {
              productId: item.productId,
              field,
              currentStock,
              quantityToDeduct: item.quantity,
              newStock
            })

            if (newStock < 0) {
              console.error(`Insufficient stock for product ${item.productName}`)
              // Revertir la transferencia
              await supabaseAdmin.from('stock_transfers').delete().eq('id', transfer.id)
              return null
            }

            const { error: updateError } = await supabaseAdmin
              .from('products')
              .update({ [field]: newStock })
              .eq('id', item.productId)

            if (updateError) {
              console.error('[STORE STOCK TRANSFER] Error updating product stock:', updateError)
              await supabaseAdmin.from('stock_transfers').delete().eq('id', transfer.id)
              return null
            }
            
            console.log('[STORE STOCK TRANSFER] Stock successfully deducted from MAIN STORE:', {
              productId: item.productId,
              field,
              previousStock: currentStock,
              newStock
            })
          } else {
            console.error('[STORE STOCK TRANSFER] Product not found when trying to deduct stock:', item.productId)
          }
        } else {
          // Para micro tiendas, descontar de store_stock
          console.log('[STORE STOCK TRANSFER] Deducting stock from MICRO STORE:', {
            storeId: fromStoreId,
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity
          })
          await this.updateStoreStock(fromStoreId, item.productId, -item.quantity)
        }
      }

      // Si la transferencia es desde la tienda principal, crear una factura automáticamente
      console.log('[CREATE TRANSFER] Checking if should create invoice:', {
        isFromMainStore,
        fromStoreId,
        MAIN_STORE_ID
      })
      
      if (isFromMainStore) {
        console.log('[CREATE TRANSFER] Is from main store, creating invoice...')
        try {
          // Obtener información de la tienda destino
          const toStore = await StoresService.getStoreById(toStoreId)
          console.log('[CREATE TRANSFER] To store found:', {
            toStoreId,
            toStore: toStore ? { id: toStore.id, name: toStore.name } : null
          })
          
          if (!toStore) {
            console.error('[TRANSFER INVOICE] Store not found:', toStoreId)
          } else {
            // Buscar o crear un cliente para la tienda
            let storeClientId = toStoreId
            
            // Buscar si ya existe un cliente con el nombre de la tienda
            const { data: existingClients, error: searchError } = await supabaseAdmin
              .from('clients')
              .select('id, name')
              .eq('name', toStore.name)
              .limit(1)
            
            if (!searchError && existingClients && existingClients.length > 0) {
              storeClientId = existingClients[0].id
              console.log('[TRANSFER INVOICE] Found existing client for store:', {
                storeName: toStore.name,
                clientId: storeClientId
              })
            } else {
              // Crear un cliente para la tienda si no existe
              console.log('[TRANSFER INVOICE] Creating client for store:', toStore.name)
              const { data: newClient, error: clientError } = await supabaseAdmin
                .from('clients')
                .insert({
                  name: toStore.name,
                  email: `${toStore.name.toLowerCase().replace(/\s+/g, '')}@tienda.local`,
                  phone: '0000000000',
                  document: `STORE-${toStoreId.substring(0, 8)}`,
                  address: toStore.address || 'Sin dirección',
                  city: toStore.city || 'Sin ciudad',
                  state: null,
                  type: 'mayorista',
                  credit_limit: 0,
                  current_debt: 0,
                  status: 'active',
                  store_id: toStoreId
                })
                .select()
                .single()
              
              if (clientError) {
                console.error('[TRANSFER INVOICE] Error creating client for store:', JSON.stringify(clientError, null, 2))
                console.error('[TRANSFER INVOICE] Error details:', {
                  code: clientError.code,
                  message: clientError.message,
                  details: clientError.details,
                  hint: clientError.hint
                })
                // Intentar buscar de nuevo por nombre en caso de error
                const { data: retryClients } = await supabaseAdmin
                  .from('clients')
                  .select('id')
                  .eq('name', toStore.name)
                  .limit(1)
                
                if (retryClients && retryClients.length > 0) {
                  storeClientId = retryClients[0].id
                  console.log('[TRANSFER INVOICE] Found client on retry:', storeClientId)
                } else {
                  console.error('[TRANSFER INVOICE] Could not create or find client for store. Sale creation will fail.')
                  throw new Error(`No se pudo crear o encontrar un cliente para la tienda ${toStore.name}`)
                }
              } else if (newClient) {
                storeClientId = newClient.id
                console.log('[TRANSFER INVOICE] Created client for store:', {
                  clientId: storeClientId,
                  storeName: toStore.name
                })
              }
            }
            // Crear items de la venta con precios (usar precios proporcionados en la transferencia)
            const saleItems: SaleItem[] = []
            let subtotal = 0

            for (const item of items) {
              // Usar el precio proporcionado en la transferencia, o obtenerlo del producto si no se proporcionó
              let unitPrice = item.unitPrice || 0
              
              // Si no se proporcionó precio, obtenerlo del producto
              if (!unitPrice || unitPrice === 0) {
                const product = await ProductsService.getProductById(item.productId)
                unitPrice = product?.price || 0
              }
              
              const quantity = item.quantity
              const totalPrice = unitPrice * quantity
              subtotal += totalPrice

              saleItems.push({
                id: '', // Se generará en la BD
                productId: item.productId,
                productName: item.productName,
                productReferenceCode: item.productReference || '',
                quantity: quantity,
                unitPrice: unitPrice,
                totalPrice: totalPrice,
                total: totalPrice,
                discount: 0
              })
            }

            console.log('[CREATE TRANSFER] Sale items prepared:', {
              saleItemsCount: saleItems.length,
              subtotal,
              items: saleItems.map((item) => ({
                productName: item.productName,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                total: item.total
              }))
            })

            // Solo crear la factura si hay items válidos
            if (saleItems.length > 0 && subtotal > 0) {
              console.log('[CREATE TRANSFER] Creating invoice (subtotal > 0)')
              // Obtener usuario actual
              const currentUser = await AuthService.getCurrentUser()
              const currentUserId = currentUser?.id || createdBy || ''

              // Generar número de factura
              const invoiceNumber = await SalesService.getNextInvoiceNumber()

              console.log('[TRANSFER INVOICE] Creating invoice with payment info:', {
                paymentInfo,
                subtotal,
                paymentMethod: paymentInfo?.method || 'transfer',
                cashAmount: paymentInfo?.cashAmount,
                transferAmount: paymentInfo?.transferAmount,
                invoiceNumber,
                currentUserId,
                toStoreId,
                toStoreName: toStore.name,
                MAIN_STORE_ID
              })

              // Validar que todos los datos necesarios estén presentes
              if (!toStoreId || !toStore.name || !invoiceNumber) {
                console.error('[TRANSFER INVOICE] Missing required data:', {
                  toStoreId: !!toStoreId,
                  toStoreName: !!toStore.name,
                  invoiceNumber: !!invoiceNumber
                })
                throw new Error('Missing required data to create invoice')
              }

              // Crear la venta directamente en la BD (sin descontar stock, ya se descontó en la transferencia)
              // Asegurar que todos los campos requeridos tengan valores válidos
              const saleData: any = {
                client_id: storeClientId, // Usar el ID del cliente de la tienda
                client_name: toStore.name || 'Tienda sin nombre', // Nombre de la tienda como cliente
                  total: subtotal,
                  subtotal: subtotal,
                  tax: 0,
                  discount: 0,
                  status: 'completed', // Venta completada automáticamente
                  payment_method: paymentInfo?.method || 'transfer', // Método de pago
                  invoice_number: invoiceNumber,
                seller_id: currentUserId || createdBy || null,
                  seller_name: currentUser?.name || createdByName || 'Sistema',
                  seller_email: currentUser?.email || '',
                  store_id: MAIN_STORE_ID // La venta es de la tienda principal
              }

              // Remover campos null o undefined que puedan causar problemas
              Object.keys(saleData).forEach(key => {
                if (saleData[key] === undefined) {
                  delete saleData[key]
                }
              })

              console.log('[TRANSFER INVOICE] Sale data to insert:', saleData)
              console.log('[TRANSFER INVOICE] Sale data validation:', {
                hasClientId: !!saleData.client_id,
                hasClientName: !!saleData.client_name,
                hasTotal: saleData.total > 0,
                hasSubtotal: saleData.subtotal > 0,
                hasInvoiceNumber: !!saleData.invoice_number,
                hasStoreId: !!saleData.store_id,
                sellerId: saleData.seller_id
              })

              const { data: sale, error: saleError } = await supabaseAdmin
                .from('sales')
                .insert(saleData)
                .select()
                .single()

              if (saleError) {
                // Mejorar el logging del error
                const errorInfo = {
                  message: saleError?.message || 'Unknown error',
                  code: saleError?.code || 'Unknown code',
                  hint: saleError?.hint || 'No hint',
                  details: saleError?.details || 'No details',
                  error: saleError
                }
                console.error('[TRANSFER INVOICE] Error creating sale:', errorInfo)
                console.error('[TRANSFER INVOICE] Error stringified:', JSON.stringify(errorInfo, null, 2))
                console.error('[TRANSFER INVOICE] Sale data that failed:', saleData)
                
                // Intentar obtener más información del error
                if (saleError instanceof Error) {
                  console.error('[TRANSFER INVOICE] Error stack:', saleError.stack)
                }
                
                // No fallar la transferencia si hay error al crear la factura, pero loguear
                // Continuar con la transferencia aunque falle la factura
              } else if (sale) {
                console.log('[TRANSFER INVOICE] Sale created successfully:', {
                  saleId: sale.id,
                  invoiceNumber: sale.invoice_number,
                  total: sale.total,
                  client_id: sale.client_id,
                  store_id: sale.store_id,
                  created_at: sale.created_at,
                  toStoreId: toStoreId,
                  transferId: transfer.id
                })
                // Crear los items de la venta
                const saleItemsToInsert = saleItems.map(item => ({
                  sale_id: sale.id,
                  product_id: item.productId,
                  product_name: item.productName,
                  product_reference_code: item.productReferenceCode || null,
                  quantity: item.quantity,
                  unit_price: item.unitPrice,
                  discount: item.discount || 0,
                  total: item.total
                }))

                const { error: itemsError } = await supabaseAdmin
                  .from('sale_items')
                  .insert(saleItemsToInsert)

                if (itemsError) {
                  console.error('[TRANSFER INVOICE] Error creating sale items:', itemsError)
                  // Eliminar la venta si falla la creación de items
                  await supabaseAdmin.from('sales').delete().eq('id', sale.id)
                } else {
                  // Crear registros de pago según el método
                  if (paymentInfo && paymentInfo.method === 'mixed') {
                    console.log('[TRANSFER INVOICE] Creating mixed payment records:', {
                      saleId: sale.id,
                      cashAmount: paymentInfo.cashAmount,
                      transferAmount: paymentInfo.transferAmount,
                      total: subtotal
                    })
                    
                    // Pagos mixtos: crear registros en sale_payments (para que el dashboard los vea)
                    const { data: salePaymentsData, error: salePaymentsError } = await supabaseAdmin
                      .from('sale_payments')
                      .insert([
                        {
                          sale_id: sale.id,
                          payment_type: 'cash',
                          amount: paymentInfo.cashAmount
                        },
                        {
                          sale_id: sale.id,
                          payment_type: 'transfer',
                          amount: paymentInfo.transferAmount
                        }
                      ])
                      .select()
                    
                    if (salePaymentsError) {
                      console.error('[TRANSFER INVOICE] Error creating sale_payments:', salePaymentsError)
                      // No fallar la transferencia si hay error, pero loguear
                    } else {
                      console.log('[TRANSFER INVOICE] sale_payments created successfully:', salePaymentsData)
                    }
                  } else {
                    // Pago único
                    const method = paymentInfo?.method || 'transfer'
                    console.log('[TRANSFER INVOICE] Creating single payment:', {
                      saleId: sale.id,
                      method,
                      amount: subtotal
                    })
                    
                    // Crear registro en sale_payments (para que el dashboard lo vea)
                    const { data: salePaymentsData, error: salePaymentsError } = await supabaseAdmin
                      .from('sale_payments')
                      .insert({
                        sale_id: sale.id,
                        payment_type: method,
                        amount: subtotal
                      })
                      .select()
                    
                    if (salePaymentsError) {
                      console.error('[TRANSFER INVOICE] Error creating sale_payments:', salePaymentsError)
                      // No fallar la transferencia si hay error, pero loguear
                    } else {
                      console.log('[TRANSFER INVOICE] sale_payments created successfully:', salePaymentsData)
                    }
                  }

                  console.log('[TRANSFER INVOICE] Invoice created successfully:', {
                    invoiceNumber: invoiceNumber,
                    saleId: sale.id,
                    total: subtotal,
                    itemsCount: saleItems.length,
                    paymentMethod: paymentInfo?.method || 'transfer'
                  })
                }
              } else {
                console.error('[TRANSFER INVOICE] Sale creation returned null or undefined')
              }
            } else {
              console.warn('[CREATE TRANSFER] Not creating invoice because:', {
                saleItemsCount: saleItems.length,
                subtotal,
                reason: saleItems.length === 0 ? 'No sale items' : 'Subtotal is 0'
              })
            }
          }
        } catch (invoiceError) {
          // No fallar la transferencia si hay error al crear la factura
          console.error('[TRANSFER INVOICE] Error creating invoice:', invoiceError)
          console.error('[TRANSFER INVOICE] Error stack:', invoiceError instanceof Error ? invoiceError.stack : 'No stack trace')
          console.error('[TRANSFER INVOICE] Error details:', JSON.stringify(invoiceError, null, 2))
        }
      }

      // Registrar log de transferencia generada
      if (createdBy) {
        try {
          // Obtener información de las tiendas
          const fromStore = await StoresService.getStoreById(fromStoreId)
          const toStore = await StoresService.getStoreById(toStoreId)
          
          // Obtener número de transferencia si existe
          const transferWithNumber = await this.getTransferById(transfer.id)
          
          // Crear descripción con todos los productos
          const productsList = items.map(item => 
            `${item.quantity} unidades de "${item.productName}"${item.productReference ? ` (Ref: ${item.productReference})` : ''}`
          ).join(', ')
          
          const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)
          const totalAmount = items.reduce((sum, item) => sum + ((item.unitPrice || 0) * item.quantity), 0)
          
          await AuthService.logActivity(
            createdBy,
            'transfer_created',
            'transfers',
            {
              description: `Se creó una transferencia de ${totalQuantity} unidades (${items.length} producto${items.length > 1 ? 's' : ''}) desde "${fromStore?.name || 'Tienda origen'}" hacia "${toStore?.name || 'Tienda destino'}"`,
              transferId: transfer.id,
              transferNumber: transferWithNumber?.transferNumber,
              fromStoreId: fromStoreId,
              fromStoreName: fromStore?.name,
              toStoreId: toStoreId,
              toStoreName: toStore?.name,
              itemsCount: items.length,
              totalQuantity: totalQuantity,
              totalAmount: totalAmount,
              products: items.map(item => ({
                productId: item.productId,
                productName: item.productName,
                productReference: item.productReference,
                quantity: item.quantity,
                unitPrice: item.unitPrice || 0,
                fromLocation: item.fromLocation
              })),
              paymentMethod: paymentInfo?.method,
              transferDescription: description || null
            }
          )
        } catch (logError) {
          console.error('[STORE STOCK TRANSFER] Error logging transfer creation:', logError)
          // No fallar la transferencia si hay error en el log
        }
      }

      // Obtener la transferencia completa con items
      return await this.getTransferById(transfer.id)
    } catch (error) {
      console.error('Error in createTransfer:', error)
      return null
    }
  }

  // Obtener transferencia por ID con sus items
  static async getTransferById(transferId: string): Promise<StoreStockTransfer | null> {
    try {
      // Primero obtener la transferencia sin las relaciones para evitar errores
      const { data: transfer, error: transferError } = await supabaseAdmin
        .from('stock_transfers')
        .select('*')
        .eq('id', transferId)
        .single()

      if (transferError) {
        // Si es el error PGRST116, intentar sin .single()
        if (transferError.code === 'PGRST116') {
          const { data: transfers, error: multiError } = await supabaseAdmin
            .from('stock_transfers')
            .select('*')
            .eq('id', transferId)
            .limit(1)
          
          if (multiError || !transfers || transfers.length === 0) {
            console.error('Error fetching transfer:', multiError || transferError)
            return null
          }
          
          // Obtener nombres de las tiendas por separado
          const fromStoreId = transfers[0].from_store_id
          const toStoreId = transfers[0].to_store_id
          
          const [fromStoreResult, toStoreResult] = await Promise.all([
            supabaseAdmin.from('stores').select('id, name').eq('id', fromStoreId).single(),
            supabaseAdmin.from('stores').select('id, name').eq('id', toStoreId).single()
          ])
          
          const transferWithStores = {
            ...transfers[0],
            from_store: fromStoreResult.data || { id: fromStoreId, name: null },
            to_store: toStoreResult.data || { id: toStoreId, name: null }
          }
          
          // Obtener items
          const { data: items } = await supabaseAdmin
            .from('transfer_items')
            .select('*')
            .eq('transfer_id', transferId)
            .order('created_at', { ascending: true })
          
          return this.mapTransfer(transferWithStores, items || [])
        }
        
        console.error('Error fetching transfer:', transferError)
        return null
      }

      if (!transfer) {
        return null
      }

      // Obtener nombres de las tiendas por separado si no están en la relación
      let fromStore = null
      let toStore = null
      
      if (transfer.from_store_id) {
        const { data: fromStoreData } = await supabaseAdmin
          .from('stores')
          .select('id, name')
          .eq('id', transfer.from_store_id)
          .single()
        fromStore = fromStoreData
      }
      
      if (transfer.to_store_id) {
        const { data: toStoreData } = await supabaseAdmin
          .from('stores')
          .select('id, name')
          .eq('id', transfer.to_store_id)
          .single()
        toStore = toStoreData
      }

      const transferWithStores = {
        ...transfer,
        from_store: fromStore || { id: transfer.from_store_id, name: null },
        to_store: toStore || { id: transfer.to_store_id, name: null }
      }

      // Obtener items de la transferencia
      const { data: items, error: itemsError } = await supabaseAdmin
        .from('transfer_items')
        .select('*')
        .eq('transfer_id', transferId)
        .order('created_at', { ascending: true })

      if (itemsError) {
        console.error('Error fetching transfer items:', itemsError)
      }

      return this.mapTransfer(transferWithStores, items || [])
    } catch (error) {
      console.error('Error in getTransferById:', error)
      return null
    }
  }

  // Obtener transferencias pendientes de recepción para una tienda (con paginación)
  static async getPendingTransfers(storeId: string, page: number = 1, limit: number = 10): Promise<{ transfers: StoreStockTransfer[], total: number, hasMore: boolean }> {
    try {
      const offset = (page - 1) * limit
      const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
      const isMainStore = storeId === MAIN_STORE_ID
      
      // Obtener el total de transferencias pendientes
      let countQuery = supabaseAdmin
        .from('stock_transfers')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'in_transit'])
      
      if (!isMainStore) {
        countQuery = countQuery.eq('to_store_id', storeId)
      }
      
      const { count, error: countError } = await countQuery
      
      if (countError) {
        console.error('Error counting pending transfers:', countError)
        return { transfers: [], total: 0, hasMore: false }
      }
      
      // Obtener transferencias paginadas
      let query = supabaseAdmin
        .from('stock_transfers')
        .select('*')
        .in('status', ['pending', 'in_transit'])
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)
      
      // Si es la tienda principal, mostrar todas las transferencias pendientes
      // Si no, solo las que van hacia esa tienda
      if (!isMainStore) {
        query = query.eq('to_store_id', storeId)
      }
      
      const { data: transfers, error } = await query

      if (error) {
        console.error('Error fetching pending transfers:', error)
        return { transfers: [], total: count || 0, hasMore: false }
      }

      if (!transfers || transfers.length === 0) {
        return { transfers: [], total: count || 0, hasMore: false }
      }

      // Obtener nombres de tiendas y items para cada transferencia
      const transfersWithItems = await Promise.all(
        transfers.map(async (transfer: any) => {
          // Obtener nombres de las tiendas por separado
          const [fromStoreResult, toStoreResult] = await Promise.all([
            supabaseAdmin.from('stores').select('id, name').eq('id', transfer.from_store_id).single(),
            supabaseAdmin.from('stores').select('id, name').eq('id', transfer.to_store_id).single()
          ])

          const transferWithStores = {
            ...transfer,
            from_store: fromStoreResult.data || { id: transfer.from_store_id, name: null },
            to_store: toStoreResult.data || { id: transfer.to_store_id, name: null }
          }

          // Obtener items de la transferencia
          const { data: items } = await supabaseAdmin
            .from('transfer_items')
            .select('*')
            .eq('transfer_id', transfer.id)
            .order('created_at', { ascending: true })

          return this.mapTransfer(transferWithStores, items || [])
        })
      )

      const total = count || 0
      const hasMore = offset + transfers.length < total

      return { transfers: transfersWithItems, total, hasMore }
    } catch (error) {
      console.error('Error in getPendingTransfers:', error)
      return { transfers: [], total: 0, hasMore: false }
    }
  }

  // Obtener transferencias pendientes de recepción para una tienda (sin paginación - para compatibilidad)
  static async getPendingTransfersLegacy(storeId: string): Promise<StoreStockTransfer[]> {
    try {
      const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
      const isMainStore = storeId === MAIN_STORE_ID
      
      let query = supabaseAdmin
        .from('stock_transfers')
        .select('*')
        .in('status', ['pending', 'in_transit'])
        .order('created_at', { ascending: false })
      
      // Si es la tienda principal, mostrar todas las transferencias pendientes
      // Si no, solo las que van hacia esa tienda
      if (!isMainStore) {
        query = query.eq('to_store_id', storeId)
      }
      
      const { data: transfers, error } = await query

      if (error) {
        console.error('Error fetching pending transfers:', error)
        return []
      }

      if (!transfers || transfers.length === 0) {
        return []
      }

      // Obtener nombres de tiendas y items para cada transferencia
      const transfersWithItems = await Promise.all(
        transfers.map(async (transfer: any) => {
          // Obtener nombres de las tiendas por separado
          const [fromStoreResult, toStoreResult] = await Promise.all([
            supabaseAdmin.from('stores').select('id, name').eq('id', transfer.from_store_id).single(),
            supabaseAdmin.from('stores').select('id, name').eq('id', transfer.to_store_id).single()
          ])

          const transferWithStores = {
            ...transfer,
            from_store: fromStoreResult.data || { id: transfer.from_store_id, name: null },
            to_store: toStoreResult.data || { id: transfer.to_store_id, name: null }
          }

          // Obtener items de la transferencia
          const { data: items } = await supabaseAdmin
            .from('transfer_items')
            .select('*')
            .eq('transfer_id', transfer.id)
            .order('created_at', { ascending: true })

          return this.mapTransfer(transferWithStores, items || [])
        })
      )

      return transfersWithItems
    } catch (error) {
      console.error('Error in getPendingTransfers:', error)
      return []
    }
  }

  // Obtener transferencias recibidas (completadas) para una tienda (con paginación)
  static async getReceivedTransfers(storeId: string, page: number = 1, limit: number = 10): Promise<{ transfers: StoreStockTransfer[], total: number, hasMore: boolean }> {
    try {
      const offset = (page - 1) * limit
      const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
      const isMainStore = storeId === MAIN_STORE_ID
      
      // Obtener el total de transferencias recibidas
      let countQuery = supabaseAdmin
        .from('stock_transfers')
        .select('*', { count: 'exact', head: true })
        .in('status', ['received', 'partially_received'])
      
      if (!isMainStore) {
        countQuery = countQuery.eq('to_store_id', storeId)
      }
      
      const { count, error: countError } = await countQuery
      
      if (countError) {
        console.error('Error counting received transfers:', countError)
        return { transfers: [], total: 0, hasMore: false }
      }
      
      // Obtener transferencias paginadas
      let query = supabaseAdmin
        .from('stock_transfers')
        .select('*')
        .in('status', ['received', 'partially_received'])
        .order('received_at', { ascending: false })
        .range(offset, offset + limit - 1)
      
      // Si es la tienda principal, mostrar todas las transferencias recibidas
      // Si no, solo las que fueron recibidas por esa tienda
      if (!isMainStore) {
        query = query.eq('to_store_id', storeId)
      }
      
      const { data: transfers, error } = await query

      if (error) {
        console.error('Error fetching received transfers:', error)
        return { transfers: [], total: count || 0, hasMore: false }
      }

      if (!transfers || transfers.length === 0) {
        return { transfers: [], total: count || 0, hasMore: false }
      }

      // Obtener nombres de tiendas y items para cada transferencia
      const transfersWithItems = await Promise.all(
        transfers.map(async (transfer: any) => {
          // Obtener nombres de las tiendas por separado
          const [fromStoreResult, toStoreResult] = await Promise.all([
            supabaseAdmin.from('stores').select('id, name').eq('id', transfer.from_store_id).single(),
            supabaseAdmin.from('stores').select('id, name').eq('id', transfer.to_store_id).single()
          ])

          const transferWithStores = {
            ...transfer,
            from_store: fromStoreResult.data || { id: transfer.from_store_id, name: null },
            to_store: toStoreResult.data || { id: transfer.to_store_id, name: null }
          }

          // Obtener items de la transferencia
          const { data: items } = await supabaseAdmin
            .from('transfer_items')
            .select('*')
            .eq('transfer_id', transfer.id)
            .order('created_at', { ascending: true })

          return this.mapTransfer(transferWithStores, items || [])
        })
      )

      const total = count || 0
      const hasMore = offset + transfers.length < total

      return { transfers: transfersWithItems, total, hasMore }
    } catch (error) {
      console.error('Error in getReceivedTransfers:', error)
      return { transfers: [], total: 0, hasMore: false }
    }
  }

  // Obtener transferencias recibidas (completadas) para una tienda (sin paginación - para compatibilidad)
  static async getReceivedTransfersLegacy(storeId: string): Promise<StoreStockTransfer[]> {
    try {
      const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
      const isMainStore = storeId === MAIN_STORE_ID
      
      let query = supabaseAdmin
        .from('stock_transfers')
        .select('*')
        .in('status', ['received', 'partially_received'])
        .order('received_at', { ascending: false })
      
      // Si es la tienda principal, mostrar todas las transferencias recibidas
      // Si no, solo las que fueron recibidas por esa tienda
      if (!isMainStore) {
        query = query.eq('to_store_id', storeId)
      }
      
      const { data: transfers, error } = await query

      if (error) {
        console.error('Error fetching received transfers:', error)
        return []
      }

      if (!transfers || transfers.length === 0) {
        return []
      }

      // Obtener nombres de tiendas y items para cada transferencia
      const transfersWithItems = await Promise.all(
        transfers.map(async (transfer: any) => {
          // Obtener nombres de las tiendas por separado
          const [fromStoreResult, toStoreResult] = await Promise.all([
            supabaseAdmin.from('stores').select('id, name').eq('id', transfer.from_store_id).single(),
            supabaseAdmin.from('stores').select('id, name').eq('id', transfer.to_store_id).single()
          ])

          const transferWithStores = {
            ...transfer,
            from_store: fromStoreResult.data || { id: transfer.from_store_id, name: null },
            to_store: toStoreResult.data || { id: transfer.to_store_id, name: null }
          }

          // Obtener items de la transferencia
          const { data: items } = await supabaseAdmin
            .from('transfer_items')
            .select('*')
            .eq('transfer_id', transfer.id)
            .order('created_at', { ascending: true })

          return this.mapTransfer(transferWithStores, items || [])
        })
      )

      return transfersWithItems
    } catch (error) {
      console.error('Error in getReceivedTransfers:', error)
      return []
    }
  }

  // Obtener todas las transferencias de una tienda (enviadas y recibidas) con paginación
  static async getStoreTransfers(storeId: string, direction: 'sent' | 'received' | 'all' = 'all', page: number = 1, limit: number = 10): Promise<{ transfers: StoreStockTransfer[], total: number, hasMore: boolean }> {
    try {
      const offset = (page - 1) * limit
      const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
      const isMainStore = storeId === MAIN_STORE_ID
      
      // Obtener el total de transferencias
      let countQuery = supabaseAdmin
        .from('stock_transfers')
        .select('*', { count: 'exact', head: true })
      
      // Aplicar filtros según direction
      if (isMainStore && direction === 'all') {
        // No aplicar ningún filtro para la tienda principal
      } else if (direction === 'sent') {
        countQuery = countQuery.eq('from_store_id', storeId)
      } else if (direction === 'received') {
        countQuery = countQuery
          .eq('to_store_id', storeId)
          .in('status', ['received', 'partially_received'])
      } else {
        countQuery = countQuery.or(`from_store_id.eq.${storeId},to_store_id.eq.${storeId}`)
      }
      
      const { count, error: countError } = await countQuery
      
      if (countError) {
        console.error('Error counting transfers:', countError)
        return { transfers: [], total: 0, hasMore: false }
      }
      
      // Obtener transferencias paginadas
      let query = supabaseAdmin
        .from('stock_transfers')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      // Si es la tienda principal y direction es 'all', mostrar TODAS las transferencias
      if (isMainStore && direction === 'all') {
        // No aplicar ningún filtro, mostrar todas
      } else if (direction === 'sent') {
        query = query.eq('from_store_id', storeId)
      } else if (direction === 'received') {
        // Incluir tanto 'received' como 'partially_received'
        query = query
          .eq('to_store_id', storeId)
          .in('status', ['received', 'partially_received'])
      } else {
        query = query.or(`from_store_id.eq.${storeId},to_store_id.eq.${storeId}`)
      }

      const { data: transfers, error } = await query

      if (error) {
        console.error('Error fetching transfers:', error)
        return { transfers: [], total: count || 0, hasMore: false }
      }

      if (!transfers || transfers.length === 0) {
        return { transfers: [], total: count || 0, hasMore: false }
      }

      // Obtener nombres de tiendas y items para cada transferencia
      const transfersWithItems = await Promise.all(
        transfers.map(async (transfer: any) => {
          // Obtener nombres de las tiendas por separado
          const [fromStoreResult, toStoreResult] = await Promise.all([
            supabaseAdmin.from('stores').select('id, name').eq('id', transfer.from_store_id).single(),
            supabaseAdmin.from('stores').select('id, name').eq('id', transfer.to_store_id).single()
          ])

          const transferWithStores = {
            ...transfer,
            from_store: fromStoreResult.data || { id: transfer.from_store_id, name: null },
            to_store: toStoreResult.data || { id: transfer.to_store_id, name: null }
          }

          // Obtener items de la transferencia
          const { data: items } = await supabaseAdmin
            .from('transfer_items')
            .select('*')
            .eq('transfer_id', transfer.id)
            .order('created_at', { ascending: true })

          return this.mapTransfer(transferWithStores, items || [])
        })
      )

      const total = count || 0
      const hasMore = offset + transfers.length < total

      return { transfers: transfersWithItems, total, hasMore }
    } catch (error) {
      console.error('Error in getStoreTransfers:', error)
      return { transfers: [], total: 0, hasMore: false }
    }
  }

  // Obtener todas las transferencias de una tienda (enviadas y recibidas) sin paginación (para compatibilidad)
  static async getStoreTransfersLegacy(storeId: string, direction: 'sent' | 'received' | 'all' = 'all'): Promise<StoreStockTransfer[]> {
    try {
      const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
      const isMainStore = storeId === MAIN_STORE_ID
      
      // Obtener transferencias sin relaciones para evitar errores
      let query = supabaseAdmin
        .from('stock_transfers')
        .select('*')
        .order('created_at', { ascending: false })

      // Si es la tienda principal y direction es 'all', mostrar TODAS las transferencias
      if (isMainStore && direction === 'all') {
        // No aplicar ningún filtro, mostrar todas
      } else if (direction === 'sent') {
        query = query.eq('from_store_id', storeId)
      } else if (direction === 'received') {
        // Incluir tanto 'received' como 'partially_received'
        query = query
          .eq('to_store_id', storeId)
          .in('status', ['received', 'partially_received'])
      } else {
        query = query.or(`from_store_id.eq.${storeId},to_store_id.eq.${storeId}`)
      }

      const { data: transfers, error } = await query

      if (error) {
        console.error('Error fetching transfers:', error)
        return []
      }

      if (!transfers || transfers.length === 0) {
        return []
      }

      // Obtener nombres de tiendas y items para cada transferencia
      const transfersWithItems = await Promise.all(
        transfers.map(async (transfer: any) => {
          // Obtener nombres de las tiendas por separado
          const [fromStoreResult, toStoreResult] = await Promise.all([
            supabaseAdmin.from('stores').select('id, name').eq('id', transfer.from_store_id).single(),
            supabaseAdmin.from('stores').select('id, name').eq('id', transfer.to_store_id).single()
          ])

          const transferWithStores = {
            ...transfer,
            from_store: fromStoreResult.data || { id: transfer.from_store_id, name: null },
            to_store: toStoreResult.data || { id: transfer.to_store_id, name: null }
          }

          // Obtener items de la transferencia
          const { data: items } = await supabaseAdmin
            .from('transfer_items')
            .select('*')
            .eq('transfer_id', transfer.id)
            .order('created_at', { ascending: true })

          return this.mapTransfer(transferWithStores, items || [])
        })
      )

      return transfersWithItems
    } catch (error) {
      console.error('Error in getStoreTransfers:', error)
      return []
    }
  }

  // Recibir transferencia (marcar como recibida)
  static async receiveTransfer(
    transferId: string,
    receivedBy?: string,
    receivedByName?: string,
    receivedItems?: Array<{ itemId: string; quantityReceived: number; note?: string }>
  ): Promise<boolean> {
    try {
      // Obtener la transferencia con sus items
      const transfer = await this.getTransferById(transferId)
      if (!transfer || transfer.status !== 'pending') {
        console.error('Transfer not found or already processed')
        return false
      }

      // Si se proporcionan items específicos, usar esos; si no, recibir todo
      const itemsToReceive = receivedItems && receivedItems.length > 0
        ? receivedItems
        : (transfer.items || []).map(item => ({
            itemId: item.id,
            quantityReceived: item.quantity,
            note: undefined
          }))

      // Validar que las cantidades recibidas no excedan las esperadas y no sean negativas
      if (transfer.items && transfer.items.length > 0) {
        for (const receivedItem of itemsToReceive) {
          const originalItem = transfer.items.find(item => item.id === receivedItem.itemId)
          if (!originalItem) {
            console.error(`Item ${receivedItem.itemId} not found in transfer`)
            return false
          }
          if (receivedItem.quantityReceived > originalItem.quantity) {
            console.error(`Received quantity (${receivedItem.quantityReceived}) exceeds expected (${originalItem.quantity}) for item ${originalItem.productName}`)
            return false
          }
          if (receivedItem.quantityReceived < 0) {
            console.error(`Received quantity cannot be negative for item ${originalItem.productName}`)
            return false
          }
          // Permitir 0 para recepciones parciales (sin stock recibido)
        }
      }

      // Determinar si es recepción parcial o completa
      let isPartial = false
      if (transfer.items && transfer.items.length > 0) {
        // Verificar si algún item tiene cantidad recibida menor a la esperada
        for (const receivedItem of itemsToReceive) {
          const originalItem = transfer.items.find(item => item.id === receivedItem.itemId)
          if (originalItem && receivedItem.quantityReceived < originalItem.quantity) {
            isPartial = true
            break
          }
        }
      } else {
        // Para transferencias legacy, verificar si la cantidad recibida es menor
        if (transfer.quantity && itemsToReceive.length > 0) {
          const totalReceived = itemsToReceive.reduce((sum, item) => sum + item.quantityReceived, 0)
          if (totalReceived < transfer.quantity) {
            isPartial = true
          }
        }
      }

      // Actualizar estado de la transferencia (received o partially_received)
      const finalStatus = isPartial ? 'partially_received' : 'received'
      const { error: updateError } = await supabaseAdmin
        .from('stock_transfers')
        .update({
          status: finalStatus,
          received_by: receivedBy || null,
          received_by_name: receivedByName || null,
          received_at: new Date().toISOString()
        })
        .eq('id', transferId)

      if (updateError) {
        console.error('Error updating transfer:', updateError)
        return false
      }

      // Actualizar transfer_items con cantidades recibidas y notas
      if (transfer.items && transfer.items.length > 0) {
        for (const receivedItem of itemsToReceive) {
          const originalItem = transfer.items.find(item => item.id === receivedItem.itemId)
          if (originalItem) {
            // Actualizar el item con la cantidad recibida y nota (NO modificar quantity original)
            const { error: updateItemError } = await supabaseAdmin
              .from('transfer_items')
              .update({
                quantity_received: receivedItem.quantityReceived,
                notes: receivedItem.note || null
              })
              .eq('id', receivedItem.itemId)

            if (updateItemError) {
              console.error('Error updating transfer item:', updateItemError)
            }

            // Aumentar stock en la tienda destino solo con la cantidad recibida (si es mayor a 0)
            // Permitir 0 para recepciones parciales sin stock
            if (receivedItem.quantityReceived > 0) {
              const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
              const isToMicroStore = transfer.toStoreId !== MAIN_STORE_ID
              
              // Si es microtienda, establecer cost = unitPrice y price = 0
              // IMPORTANTE: Si unitPrice es 0, también guardarlo (es un precio válido)
              const costToSet = isToMicroStore ? (originalItem.unitPrice ?? 0) : undefined
              const priceToSet = isToMicroStore ? 0 : undefined
              
              console.log('[STORE STOCK TRANSFER] Updating stock for micro store:', {
                storeId: transfer.toStoreId,
                productId: originalItem.productId,
                quantityReceived: receivedItem.quantityReceived,
                unitPrice: originalItem.unitPrice,
                isToMicroStore,
                costToSet,
                priceToSet
              })
              
              const stockUpdated = await this.updateStoreStock(
                transfer.toStoreId, 
                originalItem.productId, 
                receivedItem.quantityReceived,
                costToSet,
                priceToSet
              )
              if (!stockUpdated) {
                console.error('[STORE STOCK TRANSFER] Failed to update stock for product:', originalItem.productId)
              } else {
                console.log('[STORE STOCK TRANSFER] Stock updated successfully')
                
                // Registrar log de recepción
                if (receivedBy) {
                  const storeId = getCurrentUserStoreId()
                  await AuthService.logActivity(
                    receivedBy,
                    'transfer_received',
                    'transfers',
                    {
                      description: `Se recibieron ${receivedItem.quantityReceived} unidades del producto "${originalItem.productName}" (Ref: ${originalItem.productReference || 'N/A'}) en la transferencia ${transfer.transferNumber || transferId}`,
                      transferId: transferId,
                      transferNumber: transfer.transferNumber,
                      productId: originalItem.productId,
                      productName: originalItem.productName,
                      productReference: originalItem.productReference,
                      quantityReceived: receivedItem.quantityReceived,
                      quantityExpected: originalItem.quantity,
                      fromStoreId: transfer.fromStoreId,
                      fromStoreName: transfer.fromStoreName,
                      toStoreId: transfer.toStoreId,
                      toStoreName: transfer.toStoreName,
                      isPartial: receivedItem.quantityReceived < originalItem.quantity,
                      note: receivedItem.note || null
                    }
                  )
                }
              }
            }
          }
        }
      } else {
        // Compatibilidad con transferencias legacy (un solo producto)
        if (transfer.productId && transfer.quantity) {
          const quantityToReceive = itemsToReceive.length > 0 
            ? itemsToReceive[0].quantityReceived 
            : transfer.quantity
          console.log('[STORE STOCK TRANSFER] Updating stock for legacy transfer:', {
            storeId: transfer.toStoreId,
            productId: transfer.productId,
            quantityReceived: quantityToReceive
          })
          const stockUpdated = await this.updateStoreStock(transfer.toStoreId, transfer.productId, quantityToReceive)
          if (!stockUpdated) {
            console.error('[STORE STOCK TRANSFER] Failed to update stock for legacy transfer')
          } else {
            // Registrar log de recepción para transferencia legacy
            if (receivedBy && quantityToReceive > 0) {
              const storeId = getCurrentUserStoreId()
              await AuthService.logActivity(
                receivedBy,
                'transfer_received',
                'transfers',
                {
                  description: `Se recibieron ${quantityToReceive} unidades del producto "${transfer.productName || 'N/A'}" en la transferencia ${transfer.transferNumber || transferId}`,
                  transferId: transferId,
                  transferNumber: transfer.transferNumber,
                  productId: transfer.productId,
                  productName: transfer.productName,
                  quantityReceived: quantityToReceive,
                  quantityExpected: transfer.quantity,
                  fromStoreId: transfer.fromStoreId,
                  fromStoreName: transfer.fromStoreName,
                  toStoreId: transfer.toStoreId,
                  toStoreName: transfer.toStoreName,
                  isPartial: quantityToReceive < transfer.quantity
                }
              )
            }
          }
        }
      }

      return true
    } catch (error) {
      console.error('Error in receiveTransfer:', error)
      return false
    }
  }

  // Cancelar transferencia
  static async cancelTransfer(transferId: string, reason: string, currentUserId?: string): Promise<{ success: boolean; totalRefund?: number }> {
    try {
      console.log('[CANCEL TRANSFER] Starting cancellation:', {
        transferId,
        reason,
        userId: currentUserId
      })

      // Obtener la transferencia con sus items
      const transfer = await this.getTransferById(transferId)
      if (!transfer) {
        console.error('[CANCEL TRANSFER] Transfer not found:', transferId)
        return { success: false }
      }

      // Verificar que la transferencia se puede cancelar (solo pending o in_transit)
      if (transfer.status === 'received' || transfer.status === 'partially_received') {
        console.error('[CANCEL TRANSFER] Cannot cancel received or partially received transfer')
        return { success: false }
      }

      if (transfer.status === 'cancelled') {
        console.error('[CANCEL TRANSFER] Transfer already cancelled')
        return { success: false }
      }

      const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
      const isFromMainStore = transfer.fromStoreId === MAIN_STORE_ID || !transfer.fromStoreId

      // Obtener la venta asociada si existe (solo para transferencias desde la tienda principal)
      let sale: Sale | null = null
      let totalRefund = 0

      if (isFromMainStore) {
        try {
          sale = await this.getTransferSale(transferId)
          console.log('[CANCEL TRANSFER] Sale found:', sale ? {
            id: sale.id,
            invoiceNumber: sale.invoiceNumber,
            total: sale.total,
            paymentMethod: sale.paymentMethod
          } : null)

          // Si hay una venta asociada, cancelarla y devolver el dinero
          // IMPORTANTE: No usar cancelSale porque también devuelve stock, y nosotros ya lo estamos haciendo
          if (sale && sale.status !== 'cancelled' && currentUserId) {
            console.log('[CANCEL TRANSFER] Cancelling associated sale manually:', sale.id)
            
            try {
              // Calcular el reembolso según el método de pago
              if (sale.paymentMethod === 'cash' || sale.paymentMethod === 'transfer') {
                totalRefund = sale.total
              } else if (sale.paymentMethod === 'mixed' && sale.payments) {
                totalRefund = sale.payments
                  .filter(payment => payment.paymentType === 'cash' || payment.paymentType === 'transfer')
                  .reduce((sum, payment) => sum + payment.amount, 0)
              } else if (sale.paymentMethod === 'credit') {
                // Para créditos, cancelar los payment_records
                const { data: paymentData } = await supabaseAdmin
                  .from('payments')
                  .select('id')
                  .eq('invoice_number', sale.invoiceNumber)
                  .eq('client_id', sale.clientId)
                  .maybeSingle()
                
                if (paymentData) {
                  const { data: paymentRecords } = await supabaseAdmin
                    .from('payment_records')
                    .select('id, amount, status')
                    .eq('payment_id', paymentData.id)
                    .neq('status', 'cancelled')
                  
                  if (paymentRecords && paymentRecords.length > 0) {
                    totalRefund = paymentRecords.reduce((sum, payment) => sum + (payment.amount || 0), 0)
                    
                    // Cancelar todos los abonos
                    const { AuthService } = await import('./auth-service')
                    const user = await AuthService.getCurrentUser()
                    const userName = user?.name || 'Usuario'
                    
                    for (const paymentRecord of paymentRecords) {
                      await supabaseAdmin
                        .from('payment_records')
                        .update({ 
                          status: 'cancelled',
                          cancelled_at: new Date().toISOString(),
                          cancelled_by: currentUserId,
                          cancelled_by_name: userName,
                          cancellation_reason: `Cancelación de transferencia: ${reason}`
                        })
                        .eq('id', paymentRecord.id)
                    }
                  }
                }
              }
              
              // Actualizar estado de la venta a cancelled (sin devolver stock, ya lo hacemos nosotros)
              const { error: saleUpdateError } = await supabaseAdmin
                .from('sales')
                .update({
                  status: 'cancelled',
                  cancellation_reason: `Cancelación de transferencia: ${reason}`,
                  updated_at: new Date().toISOString()
                })
                .eq('id', sale.id)
              
              if (saleUpdateError) {
                console.error('[CANCEL TRANSFER] Error updating sale status:', saleUpdateError)
              } else {
                console.log('[CANCEL TRANSFER] Sale cancelled successfully, refund:', totalRefund)
                
                // Registrar log de cancelación de venta
                const { AuthService } = await import('./auth-service')
                await AuthService.logActivity(
                  currentUserId,
                  'sale_cancel',
                  'sales',
                  {
                    description: `Venta cancelada por cancelación de transferencia: ${sale.invoiceNumber || sale.id} - Motivo: ${reason}${totalRefund > 0 ? ` - Reembolso: $${totalRefund.toLocaleString()}` : ''}`,
                    saleId: sale.id,
                    invoiceNumber: sale.invoiceNumber,
                    reason: `Cancelación de transferencia: ${reason}`,
                    totalRefund: totalRefund,
                    isCreditSale: sale.paymentMethod === 'credit',
                    clientName: sale.clientName || null
                  }
                )
              }
            } catch (saleCancelError) {
              console.error('[CANCEL TRANSFER] Error cancelling sale:', saleCancelError)
              // Continuar con la cancelación de la transferencia aunque falle la venta
            }
          }
        } catch (saleError) {
          console.error('[CANCEL TRANSFER] Error handling sale cancellation:', saleError)
          // Continuar con la cancelación de la transferencia aunque falle la venta
        }
      }

      // Devolver stock a la tienda origen para cada producto
      if (transfer.items && transfer.items.length > 0) {
        for (const item of transfer.items) {
          if (isFromMainStore && item.fromLocation) {
            // Para la tienda principal, devolver a products.stock_warehouse o products.stock_store
            const { data: product } = await supabaseAdmin
              .from('products')
              .select('stock_warehouse, stock_store')
              .eq('id', item.productId)
              .single()

            if (product) {
              const field = item.fromLocation === 'warehouse' ? 'stock_warehouse' : 'stock_store'
              const currentStock = item.fromLocation === 'warehouse' 
                ? (product.stock_warehouse || 0)
                : (product.stock_store || 0)
              const newStock = currentStock + item.quantity

              const { error: updateStockError } = await supabaseAdmin
                .from('products')
                .update({ [field]: newStock })
                .eq('id', item.productId)

              if (updateStockError) {
                console.error('[CANCEL TRANSFER] Error returning stock to product:', updateStockError)
              } else {
                console.log('[CANCEL TRANSFER] Stock returned:', {
                  productId: item.productId,
                  quantity: item.quantity,
                  fromLocation: item.fromLocation,
                  previousStock: currentStock,
                  newStock
                })
              }
            }
          } else {
            // Para micro tiendas, devolver a store_stock
            const stockUpdated = await this.updateStoreStock(transfer.fromStoreId, item.productId, item.quantity)
            if (stockUpdated) {
              console.log('[CANCEL TRANSFER] Stock returned to microstore:', {
                storeId: transfer.fromStoreId,
                productId: item.productId,
                quantity: item.quantity
              })
            }
          }
        }
      } else {
        // Compatibilidad con transferencias legacy
        if (transfer.productId && transfer.quantity) {
          if (isFromMainStore) {
            // Asumir warehouse por defecto para legacy
            const { data: product } = await supabaseAdmin
              .from('products')
              .select('stock_warehouse')
              .eq('id', transfer.productId)
              .single()

            if (product) {
              const newStock = (product.stock_warehouse || 0) + transfer.quantity
              await supabaseAdmin
                .from('products')
                .update({ stock_warehouse: newStock })
                .eq('id', transfer.productId)
            }
          } else {
            await this.updateStoreStock(transfer.fromStoreId, transfer.productId, transfer.quantity)
          }
        }
      }

      // Actualizar estado de la transferencia a cancelled
      const { error: updateError } = await supabaseAdmin
        .from('stock_transfers')
        .update({
          status: 'cancelled',
          notes: transfer.notes ? `${transfer.notes}\n\n[CANCELADA] ${reason}` : `[CANCELADA] ${reason}`
        })
        .eq('id', transferId)

      if (updateError) {
        console.error('[CANCEL TRANSFER] Error updating transfer status:', updateError)
        return { success: false }
      }

      // Registrar log de cancelación
      if (currentUserId) {
        try {
          const fromStore = await StoresService.getStoreById(transfer.fromStoreId)
          const toStore = await StoresService.getStoreById(transfer.toStoreId)
          
          const productsList = transfer.items && transfer.items.length > 0
            ? transfer.items.map(item => 
                `${item.quantity} unidades de "${item.productName}"${item.productReference ? ` (Ref: ${item.productReference})` : ''}`
              ).join(', ')
            : `${transfer.quantity} unidades de "${transfer.productName || 'Producto'}"`

          await AuthService.logActivity(
            currentUserId,
            'transfer_cancelled',
            'transfers',
            {
              description: `Transferencia cancelada: ${transfer.transferNumber || transferId.substring(0, 8)} - Motivo: ${reason}. Se devolvieron los productos a "${fromStore?.name || 'Tienda origen'}"${totalRefund > 0 ? ` y se reembolsó $${totalRefund.toLocaleString()}` : ''}`,
              transferId: transferId,
              transferNumber: transfer.transferNumber,
              fromStoreId: transfer.fromStoreId,
              fromStoreName: fromStore?.name,
              toStoreId: transfer.toStoreId,
              toStoreName: toStore?.name,
              reason: reason,
              totalRefund: totalRefund,
              saleId: sale?.id || null,
              invoiceNumber: sale?.invoiceNumber || null,
              products: transfer.items && transfer.items.length > 0
                ? transfer.items.map(item => ({
                    productId: item.productId,
                    productName: item.productName,
                    productReference: item.productReference,
                    quantity: item.quantity,
                    fromLocation: item.fromLocation
                  }))
                : [{
                    productId: transfer.productId || '',
                    productName: transfer.productName || 'Producto',
                    quantity: transfer.quantity || 0,
                    fromLocation: 'warehouse' as const
                  }]
            }
          )
        } catch (logError) {
          console.error('[CANCEL TRANSFER] Error logging cancellation:', logError)
          // No fallar la cancelación si hay error en el log
        }
      }

      console.log('[CANCEL TRANSFER] Transfer cancelled successfully:', {
        transferId,
        totalRefund
      })

      return { success: true, totalRefund }
    } catch (error) {
      console.error('[CANCEL TRANSFER] Error in cancelTransfer:', error)
      return { success: false }
    }
  }

  // Obtener stock de un producto en una tienda
  static async getStoreStock(storeId: string, productId: string): Promise<StoreStock | null> {
    try {
      // Intentar con supabaseAdmin primero
      let data: any = null
      let error: any = null
      
      try {
        const result = await supabaseAdmin
          .from('store_stock')
          .select('*')
          .eq('store_id', storeId)
          .eq('product_id', productId)
          .maybeSingle()
        data = result.data
        error = result.error
      } catch (err) {
        console.warn('[STORE STOCK TRANSFER] supabaseAdmin failed, trying supabase:', err)
        try {
          const result = await supabase
            .from('store_stock')
            .select('*')
            .eq('store_id', storeId)
            .eq('product_id', productId)
            .maybeSingle()
          data = result.data
          error = result.error
        } catch (err2) {
          console.error('[STORE STOCK TRANSFER] Both failed:', err2)
          error = err2
        }
      }

      if (error) {
        // Si no existe, retornar stock 0
        if (error.code === 'PGRST116' || error.code === 'PGRST116') {
          return {
            id: '',
            storeId: storeId,
            productId: productId,
            quantity: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        }
        console.error('[STORE STOCK TRANSFER] Error fetching store stock:', error)
        return null
      }

      if (!data) {
        // Si no hay datos, retornar stock 0
        return {
          id: '',
          storeId: storeId,
          productId: productId,
          quantity: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      }

      return this.mapStoreStock(data)
    } catch (error) {
      console.error('[STORE STOCK TRANSFER] Error in getStoreStock:', error)
      return null
    }
  }

  // Obtener todo el stock de una tienda
  static async getStoreStocks(storeId: string): Promise<StoreStock[]> {
    try {
      const { data, error } = await supabase
        .from('store_stock')
        .select(`
          *,
          product:products(id, name, reference, price, cost)
        `)
        .eq('store_id', storeId)
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Error fetching store stocks:', error)
        return []
      }

      return data.map((stock: any) => this.mapStoreStock(stock))
    } catch (error) {
      console.error('Error in getStoreStocks:', error)
      return []
    }
  }

  // Actualizar stock de una tienda (y opcionalmente cost/price para microtiendas)
  static async updateStoreStock(
    storeId: string,
    productId: string,
    quantityChange: number,
    cost?: number | null,
    price?: number | null
  ): Promise<boolean> {
    try {
      console.log('[STORE STOCK TRANSFER] updateStoreStock called:', {
        storeId,
        productId,
        quantityChange
      })

      // Obtener stock actual
      const currentStock = await this.getStoreStock(storeId, productId)
      const currentQuantity = currentStock?.quantity || 0
      const newQuantity = currentQuantity + quantityChange

      console.log('[STORE STOCK TRANSFER] Stock calculation:', {
        currentQuantity,
        quantityChange,
        newQuantity
      })

      if (newQuantity < 0) {
        console.error('[STORE STOCK TRANSFER] Insufficient stock:', {
          currentQuantity,
          quantityChange,
          newQuantity
        })
        return false
      }

      // Upsert stock - asegurar que location sea 'local' para micro tiendas
      const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
      const isMainStore = storeId === MAIN_STORE_ID
      
      const upsertData: any = {
        store_id: storeId,
        product_id: productId,
        quantity: newQuantity
      }
      
      // Solo establecer location para micro tiendas (siempre 'local')
      if (!isMainStore) {
        upsertData.location = 'local'
        // Para microtiendas, actualizar cost y price si se proporcionan
        if (cost !== undefined) {
          upsertData.cost = cost
        }
        if (price !== undefined) {
          upsertData.price = price
        }
      }

      console.log('[STORE STOCK TRANSFER] Upserting stock:', {
        upsertData,
        isMainStore
      })

      const { data, error } = await supabaseAdmin
        .from('store_stock')
        .upsert(upsertData, {
          onConflict: 'store_id,product_id'
        })
        .select()

      if (error) {
        console.error('[STORE STOCK TRANSFER] Error updating store stock:', {
          error,
          message: error?.message,
          code: error?.code,
          details: error?.details,
          hint: error?.hint,
          storeId,
          productId,
          quantityChange,
          newQuantity,
          upsertData
        })
        // Intentar sin location si el error es por la columna location
        if (error.message && error.message.includes('location')) {
          console.log('[STORE STOCK TRANSFER] Retrying without location column')
          const { error: retryError } = await supabaseAdmin
            .from('store_stock')
            .upsert({
              store_id: storeId,
              product_id: productId,
              quantity: newQuantity
            }, {
              onConflict: 'store_id,product_id'
            })
          
          if (retryError) {
            console.error('[STORE STOCK TRANSFER] Error on retry:', retryError)
            return false
          }
          return true
        }
        return false
      }

      console.log('[STORE STOCK TRANSFER] Stock updated successfully:', data)
      return true
    } catch (error) {
      console.error('[STORE STOCK TRANSFER] Error in updateStoreStock:', error)
      return false
    }
  }

  // Obtener la transferencia asociada a una venta (método inverso)
  static async getTransferBySaleId(saleId: string): Promise<StoreStockTransfer | null> {
    try {
      const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
      
      // Obtener la venta para saber el client_id y la fecha
      const { data: sale, error: saleError } = await supabaseAdmin
        .from('sales')
        .select('id, client_id, store_id, created_at')
        .eq('id', saleId)
        .single()
      
      if (saleError || !sale) {
        console.log('[TRANSFER BY SALE] Sale not found:', saleId)
        return null
      }
      
      // Solo buscar si la venta es de la tienda principal
      if (sale.store_id !== MAIN_STORE_ID) {
        console.log('[TRANSFER BY SALE] Sale is not from main store, skipping transfer lookup')
        return null
      }
      
      // Obtener el cliente para saber su store_id (la tienda destino)
      const { data: client, error: clientError } = await supabaseAdmin
        .from('clients')
        .select('id, store_id, name')
        .eq('id', sale.client_id)
        .single()
      
      if (clientError || !client || !client.store_id) {
        console.log('[TRANSFER BY SALE] Client not found or has no store_id:', sale.client_id)
        return null
      }
      
      const toStoreId = client.store_id
      
      // Buscar transferencias que tengan el toStoreId y fecha de creación cercana (dentro de 2 horas)
      const saleDate = new Date(sale.created_at)
      const startDate = new Date(saleDate.getTime() - 2 * 60 * 60 * 1000) // 2 horas antes
      const endDate = new Date(saleDate.getTime() + 2 * 60 * 60 * 1000) // 2 horas después
      
      const { data: transfers, error } = await supabaseAdmin
        .from('stock_transfers')
        .select('*')
        .eq('to_store_id', toStoreId)
        .eq('from_store_id', MAIN_STORE_ID)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
      
      if (error || !transfers || transfers.length === 0) {
        console.log('[TRANSFER BY SALE] No transfer found for sale:', saleId)
        return null
      }
      
      // Obtener la transferencia completa con items
      return await this.getTransferById(transfers[0].id)
    } catch (error) {
      console.error('[TRANSFER BY SALE] Error in getTransferBySaleId:', error)
      return null
    }
  }

  // Mapear datos de transferencia
  // Obtener la venta asociada a una transferencia
  static async getTransferSale(transferId: string): Promise<Sale | null> {
    try {
      const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
      
      // Obtener la transferencia para saber el toStoreId y la fecha
      const transfer = await this.getTransferById(transferId)
      if (!transfer) {
        console.log('[TRANSFER SALE] Transfer not found:', transferId)
        return null
      }
      
      // Verificar si es desde la tienda principal (igual que en createTransfer)
      const isFromMainStore = transfer.fromStoreId === MAIN_STORE_ID || !transfer.fromStoreId
      
      console.log('[TRANSFER SALE] Looking for sale:', {
        transferId,
        fromStoreId: transfer.fromStoreId,
        toStoreId: transfer.toStoreId,
        createdAt: transfer.createdAt,
        isFromMainStore,
        MAIN_STORE_ID
      })
      
      // Solo buscar si la transferencia es desde la tienda principal
      if (!isFromMainStore) {
        console.log('[TRANSFER SALE] Transfer is not from main store, skipping sale lookup')
        return null
      }
      
      // Buscar el cliente asociado a la tienda destino
      // El cliente tiene store_id = toStoreId
      const { data: storeClients, error: clientSearchError } = await supabaseAdmin
        .from('clients')
        .select('id, name, store_id')
        .eq('store_id', transfer.toStoreId)
        .limit(5) // Puede haber múltiples clientes para la misma tienda
      
      if (clientSearchError || !storeClients || storeClients.length === 0) {
        console.log('[TRANSFER SALE] No client found for store:', transfer.toStoreId)
        // Intentar búsqueda alternativa: buscar por nombre de la tienda
        const { data: toStore } = await supabaseAdmin
          .from('stores')
          .select('id, name')
          .eq('id', transfer.toStoreId)
          .single()
        
        if (toStore) {
          const { data: clientsByName } = await supabaseAdmin
            .from('clients')
            .select('id, name, store_id')
            .eq('name', toStore.name)
            .limit(5)
          
          if (clientsByName && clientsByName.length > 0) {
            console.log('[TRANSFER SALE] Found client by store name:', clientsByName[0].id)
            // Usar el primer cliente encontrado
            const clientIds = clientsByName.map(c => c.id)
            
            // Buscar la venta asociada usando los IDs de clientes encontrados
      const transferDate = new Date(transfer.createdAt)
            const startDate = new Date(transferDate.getTime() - 2 * 60 * 60 * 1000) // 2 horas antes
            const endDate = new Date(transferDate.getTime() + 2 * 60 * 60 * 1000) // 2 horas después
            
            console.log('[TRANSFER SALE] Searching sale with client IDs:', {
              clientIds,
              store_id: MAIN_STORE_ID,
              transferDate: transferDate.toISOString(),
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString()
            })
            
            const { data: sales, error } = await supabaseAdmin
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
              .in('client_id', clientIds)
              .eq('store_id', MAIN_STORE_ID)
              .gte('created_at', startDate.toISOString())
              .lte('created_at', endDate.toISOString())
              .order('created_at', { ascending: false })
              .limit(5)
            
            if (error) {
              console.error('[TRANSFER SALE] Error fetching sale:', error)
              return null
            }
            
            console.log('[TRANSFER SALE] Found sales:', {
              count: sales?.length || 0,
              sales: sales?.map(s => ({
                id: s.id,
                client_id: s.client_id,
                total: s.total,
                created_at: s.created_at,
                invoice_number: s.invoice_number
              }))
            })
            
            if (!sales || sales.length === 0) {
              // Continuar con la búsqueda sin filtro de fecha (lógica más abajo)
              // Por ahora retornar null, la lógica de búsqueda sin fecha está más abajo
              console.log('[TRANSFER SALE] No sale found with date filter, will try without date filter')
            } else {
              // Si hay múltiples, buscar la que tenga los mismos productos
              let sale = sales[0]
              if (sales.length > 1) {
                const transferProductIds = new Set(transfer.items?.map(item => item.productId) || [])
                const matchingSale = sales.find(s => {
                  const saleProductIds = new Set(s.sale_items?.map((item: any) => item.product_id) || [])
                  return transferProductIds.size === saleProductIds.size && 
                    [...transferProductIds].every(id => saleProductIds.has(id))
                })
                if (matchingSale) {
                  sale = matchingSale
                  console.log('[TRANSFER SALE] Found matching sale by products:', sale.id)
                }
              }
              
              return this.mapSaleToType(sale)
            }
            
            // Si hay múltiples, buscar la que tenga los mismos productos
            let sale = sales[0]
            if (sales.length > 1) {
              const transferProductIds = new Set(transfer.items?.map(item => item.productId) || [])
              const matchingSale = sales.find(s => {
                const saleProductIds = new Set(s.sale_items?.map((item: any) => item.product_id) || [])
                return transferProductIds.size === saleProductIds.size && 
                  [...transferProductIds].every(id => saleProductIds.has(id))
              })
              if (matchingSale) {
                sale = matchingSale
                console.log('[TRANSFER SALE] Found matching sale by products:', sale.id)
              }
            }
            
            return this.mapSaleToType(sale)
          }
        }
        
        return null
      }
      
      // Usar los IDs de los clientes encontrados para buscar la venta
      const clientIds = storeClients.map(c => c.id)
      
      // Buscar la venta asociada: client_id en clientIds, store_id = MAIN_STORE_ID
      // y fecha de creación cercana (dentro de 2 horas de la transferencia para ser más flexible)
      const transferDate = new Date(transfer.createdAt)
      const startDate = new Date(transferDate.getTime() - 2 * 60 * 60 * 1000) // 2 horas antes
      const endDate = new Date(transferDate.getTime() + 2 * 60 * 60 * 1000) // 2 horas después
      
      console.log('[TRANSFER SALE] Searching sale with filters:', {
        clientIds,
        store_id: MAIN_STORE_ID,
        transferDate: transferDate.toISOString(),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      })
      
      const { data: sales, error } = await supabaseAdmin
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
        .in('client_id', clientIds)
        .eq('store_id', MAIN_STORE_ID)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(5) // Obtener hasta 5 para ver si hay múltiples
      
      if (error) {
        console.error('[TRANSFER SALE] Error fetching sale:', error)
        return null
      }
      
      console.log('[TRANSFER SALE] Found sales:', {
        count: sales?.length || 0,
        sales: sales?.map(s => ({
          id: s.id,
          client_id: s.client_id,
          total: s.total,
          created_at: s.created_at,
          invoice_number: s.invoice_number
        }))
      })
      
      if (!sales || sales.length === 0) {
        console.log('[TRANSFER SALE] No sale found for transfer with date filter, trying without date filter...')
        // Intentar búsqueda más amplia sin filtro de fecha usando los clientIds
        const { data: salesWithoutDate, error: error2 } = await supabaseAdmin
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
          .in('client_id', clientIds)
          .eq('store_id', MAIN_STORE_ID)
          .order('created_at', { ascending: false })
          .limit(10) // Aumentar el límite para buscar más ventas
        
        if (error2) {
          console.error('[TRANSFER SALE] Error in fallback search:', error2)
          return null
        }
        
        console.log('[TRANSFER SALE] Found sales without date filter:', {
          count: salesWithoutDate?.length || 0,
          sales: salesWithoutDate?.map(s => ({
            id: s.id,
            client_id: s.client_id,
            created_at: s.created_at,
            invoice_number: s.invoice_number
          }))
        })
        
        if (salesWithoutDate && salesWithoutDate.length > 0) {
          // Buscar la venta que tenga los mismos productos
          const transferProductIds = new Set(transfer.items?.map(item => item.productId) || [])
          console.log('[TRANSFER SALE] Transfer product IDs:', Array.from(transferProductIds))
          
          for (const sale of salesWithoutDate) {
          const saleProductIds = new Set(sale.sale_items?.map((item: any) => item.product_id) || [])
            console.log('[TRANSFER SALE] Checking sale:', {
              saleId: sale.id,
              saleProductIds: Array.from(saleProductIds),
              transferProductIds: Array.from(transferProductIds)
            })
            
            // Verificar que los productos coincidan
          const productsMatch = transferProductIds.size === saleProductIds.size && 
              transferProductIds.size > 0 &&
            [...transferProductIds].every(id => saleProductIds.has(id))
          
          if (productsMatch) {
              console.log('[TRANSFER SALE] Found matching sale by products:', sale.id)
            return this.mapSaleToType(sale)
          }
        }
        
          // Si no encontramos por productos, devolver la más reciente
          console.log('[TRANSFER SALE] No matching sale by products, returning most recent:', salesWithoutDate[0].id)
          return this.mapSaleToType(salesWithoutDate[0])
        }
        
        console.log('[TRANSFER SALE] No sale found for transfer after all searches')
        return null
      }
      
      // Si hay ventas encontradas, buscar la que tenga los mismos productos
      let sale = sales[0]
      if (sales.length > 1) {
        const transferProductIds = new Set(transfer.items?.map(item => item.productId) || [])
        const matchingSale = sales.find(s => {
          const saleProductIds = new Set(s.sale_items?.map((item: any) => item.product_id) || [])
          return transferProductIds.size === saleProductIds.size && 
            [...transferProductIds].every(id => saleProductIds.has(id))
        })
        if (matchingSale) {
          sale = matchingSale
          console.log('[TRANSFER SALE] Found matching sale by products:', sale.id)
        }
      }
      
      // Mapear a formato Sale
      return this.mapSaleToType(sale)
    } catch (error) {
      console.error('[TRANSFER SALE] Error in getTransferSale:', error)
      return null
    }
  }

  // Método auxiliar para mapear una venta a formato Sale
  private static mapSaleToType(sale: any): Sale {
      return {
        id: sale.id,
        clientId: sale.client_id,
        clientName: sale.client_name,
        total: sale.total,
        subtotal: sale.subtotal,
        tax: sale.tax || 0,
        discount: sale.discount || 0,
        status: sale.status,
        paymentMethod: sale.payment_method,
        invoiceNumber: sale.invoice_number,
        sellerId: sale.seller_id,
        sellerName: sale.seller_name,
        sellerEmail: sale.seller_email,
        storeId: sale.store_id,
        createdAt: sale.created_at,
        items: sale.sale_items?.map((item: any) => ({
          id: item.id,
          productId: item.product_id,
          productName: item.product_name,
          productReferenceCode: item.product_reference_code,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          discount: item.discount || 0,
          total: item.total
        })) || [],
        payments: sale.sale_payments?.map((payment: any) => ({
          id: payment.id,
          saleId: payment.sale_id,
          paymentType: payment.payment_type,
          amount: payment.amount,
          createdAt: payment.created_at
        })) || []
    }
  }

  private static mapTransfer(data: any, items: any[] = []): StoreStockTransfer {
    const transferItems: TransferItem[] = items.map((item: any) => ({
      id: item.id,
      transferId: item.transfer_id,
      productId: item.product_id,
      productName: item.product_name,
      productReference: item.product_reference || undefined,
      quantity: item.quantity, // Cantidad original/enviada
      quantityReceived: item.quantity_received || undefined, // Cantidad recibida (si aplica)
      fromLocation: item.from_location || undefined,
      unitPrice: item.unit_price || undefined, // Precio unitario de transferencia
      notes: item.notes || undefined, // Nota del item
      createdAt: item.created_at,
      updatedAt: item.updated_at || item.created_at
    }))

    return {
      id: data.id,
      transferNumber: data.transfer_number || undefined,
      fromStoreId: data.from_store_id,
      fromStoreName: data.from_store?.name || undefined,
      toStoreId: data.to_store_id,
      toStoreName: data.to_store?.name || undefined,
      status: data.status,
      description: data.description || undefined,
      notes: data.notes || undefined,
      createdBy: data.created_by || undefined,
      createdByName: data.created_by_name || undefined,
      receivedBy: data.received_by || undefined,
      receivedByName: data.received_by_name || undefined,
      receivedAt: data.received_at || undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      items: transferItems.length > 0 ? transferItems : undefined,
      // Campos legacy para compatibilidad
      productId: data.product_id || (transferItems.length > 0 ? transferItems[0].productId : undefined),
      productName: data.product_name || (transferItems.length > 0 ? transferItems[0].productName : undefined),
      quantity: data.quantity || (transferItems.length > 0 ? transferItems.reduce((sum, item) => sum + item.quantity, 0) : undefined)
    }
  }

  // Mapear datos de stock
  private static mapStoreStock(data: any): StoreStock {
    return {
      id: data.id,
      storeId: data.store_id,
      storeName: data.store?.name || undefined,
      productId: data.product_id,
      productName: data.product?.name || undefined,
      quantity: data.quantity || 0,
      location: data.location || undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }
  }
}
