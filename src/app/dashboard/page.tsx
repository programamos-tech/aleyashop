'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { 
  DollarSign, 
  TrendingUp,
  Users,
  Package,
  Shield,
  CreditCard,
  ShoppingCart,
  BarChart3,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  XCircle,
  RefreshCw,
  Store as StoreIcon,
  Home,
  Crown,
  Eye,
  EyeOff,
  Wallet,
  Calculator
} from 'lucide-react'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts'
import { useSales } from '@/contexts/sales-context'
import { useProducts } from '@/contexts/products-context'
import { useAuth } from '@/contexts/auth-context'
import { getCurrentUserStoreId, isMainStoreUser } from '@/lib/store-helper'
import { StoresService } from '@/lib/stores-service'
import { RoleProtectedRoute } from '@/components/auth/role-protected-route'
import { Sale, Expense } from '@/types'
import { CancelledInvoicesModal } from '@/components/dashboard/cancelled-invoices-modal'
import { MonthlyClosingModal } from '@/components/dashboard/monthly-closing-modal'

type DateFilter = 'today' | 'range' | 'all'

export default function DashboardPage() {
  const router = useRouter()
  const { sales } = useSales()
  const { totalProducts: totalProductsFromContext, products: productsFromContext, productsLastUpdated } = useProducts()
  const { user } = useAuth()
  const [dateFilter, setDateFilter] = useState<DateFilter>('today')
  const [rangeStart, setRangeStart] = useState<Date | null>(null)
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null)
  const [isFiltering, setIsFiltering] = useState(false)
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [availableYears, setAvailableYears] = useState<number[]>([new Date().getFullYear()])
  
  // Verificar si el usuario es Super Admin (Diego)
  const isSuperAdmin = user?.role === 'superadmin' || user?.role === 'Super Admin' || user?.role === 'Super Administrador'
  
  // Verificar si el usuario puede ver información de créditos (superadmin, admin, vendedor)
  const canViewCredits = user?.role === 'superadmin' || user?.role === 'admin' || user?.role === 'vendedor'
  const isVendedor = user?.role === 'vendedor' || user?.role === 'Vendedor' || user?.role === 'vendedora' || user?.role === 'Vendedora'
  
  // Para usuarios no-Super Admin, forzar el filtro a 'today' y mostrar dashboard completo
  const effectiveDateFilter = isSuperAdmin ? dateFilter : 'today'
  const [allSales, setAllSales] = useState<Sale[]>([])
  const [allWarranties, setAllWarranties] = useState<any[]>([])
  const [allCredits, setAllCredits] = useState<any[]>([])
  const [allClients, setAllClients] = useState<any[]>([])
  const [allProducts, setAllProducts] = useState<any[]>([])
  const [allPaymentRecords, setAllPaymentRecords] = useState<any[]>([])
  const [allExpenses, setAllExpenses] = useState<Expense[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [showCancelledModal, setShowCancelledModal] = useState(false)
  const [showMonthlyClosingModal, setShowMonthlyClosingModal] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [hideNumbers, setHideNumbers] = useState(false)
  const [currentStoreName, setCurrentStoreName] = useState<string | null>(null)
  const [currentStoreCity, setCurrentStoreCity] = useState<string | null>(null)

  // Cargar información de la tienda actual y recargar datos cuando cambie el storeId
  useEffect(() => {
    const loadStoreInfo = async () => {
      const storeId = getCurrentUserStoreId()
      console.log('[DASHBOARD] Loading store info:', { storeId, user: user?.id, isMainStore: isMainStoreUser(user) })
      
      if (storeId && !isMainStoreUser(user)) {
        try {
          console.log('[DASHBOARD] Fetching store data for:', storeId)
          const store = await StoresService.getStoreById(storeId)
          console.log('[DASHBOARD] Store data received:', store)
          
          if (store) {
            setCurrentStoreName(store.name)
            setCurrentStoreCity(store.city || null)
            console.log('[DASHBOARD] Store info set:', { name: store.name, city: store.city })
          }
        } catch (error) {
          console.error('[DASHBOARD] Error loading store info:', error)
        }
      } else {
        console.log('[DASHBOARD] Not loading store info - isMainStore or no storeId')
        setCurrentStoreName(null)
        setCurrentStoreCity(null)
      }
      
      // Recargar datos del dashboard cuando cambia el storeId
      console.log('[DASHBOARD] StoreId changed, reloading dashboard data')
      loadDashboardData()
    }
    if (user) {
      loadStoreInfo()
    }
  }, [user, user?.storeId])

  // Detectar modo oscuro directamente desde el DOM
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'))
    }
    
    // Verificar inicialmente
    checkDarkMode()
    
    // Observar cambios en la clase del documento
    const observer = new MutationObserver(checkDarkMode)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })
    
    // También escuchar cambios en el media query del sistema
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleMediaChange = () => {
      // Solo actualizar si no hay una clase explícita
      if (!document.documentElement.classList.contains('dark') && 
          !document.documentElement.classList.contains('light')) {
        checkDarkMode()
      }
    }
    mediaQuery.addEventListener('change', handleMediaChange)
    
    return () => {
      observer.disconnect()
      mediaQuery.removeEventListener('change', handleMediaChange)
    }
  }, [])

  const goToCredits = useCallback(() => {
    router.push('/payments')
  }, [router])

  // Función helper para agregar timeout a las promesas
  const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number = 10000): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error(`Timeout después de ${timeoutMs}ms`)), timeoutMs)
      )
    ])
  }

  // Función para cargar datos del dashboard
  const loadDashboardData = async (showLoading = false, overrideFilter?: DateFilter, overrideYear?: number, overrideRangeStart?: Date | null, overrideRangeEnd?: Date | null) => {
    try {
      // Prevenir ejecuciones duplicadas
      if (isRefreshing || isFiltering) {
        console.log('⚠️ [DASHBOARD] loadDashboardData ya está ejecutándose, saltando...')
        return
      }
      
      if (showLoading) {
        setIsRefreshing(true)
      }
      
      // Si es la carga inicial, mostrar loading
      if (isInitialLoading) {
        setIsInitialLoading(true)
      }
      
      // Importar servicios
      const { SalesService } = await import('@/lib/sales-service')
      const { WarrantyService } = await import('@/lib/warranty-service')
      const { CreditsService } = await import('@/lib/credits-service')
      const { ClientsService } = await import('@/lib/clients-service')
      const { ProductsService } = await import('@/lib/products-service')
      const { ExpensesService } = await import('@/lib/expenses-service')
      
      // Determinar si necesitamos filtrar por fecha
      // IMPORTANTE: Usar los valores pasados como override, o los del estado si no se pasan
      let currentFilter = overrideFilter !== undefined ? overrideFilter : (isSuperAdmin ? dateFilter : 'today')
      
      if (currentFilter === 'range' && !overrideRangeStart && !rangeStart) {
        console.warn('⚠️ [DASHBOARD] Filtro "range" sin fechas, cambiando a "today"')
        currentFilter = 'today'
      }
      const yearToUse = overrideYear !== undefined ? overrideYear : selectedYear
      const shouldFilterByDate = currentFilter !== 'all'
      const rangeStartToUse = overrideRangeStart !== undefined ? overrideRangeStart : rangeStart
      const rangeEndToUse = overrideRangeEnd !== undefined ? overrideRangeEnd : rangeEnd
      const { startDate, endDate } = shouldFilterByDate ? getDateRange(currentFilter, yearToUse, rangeStartToUse, rangeEndToUse) : { startDate: null, endDate: null }
      
      console.log('🔍 [DASHBOARD DEBUG]', {
        dateFilter,
        currentFilter,
        rangeStart: rangeStartToUse?.toISOString(),
        rangeEnd: rangeEndToUse?.toISOString(),
        yearToUse,
        isSuperAdmin,
        shouldFilterByDate,
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString()
      })
      
      // Si hay filtro de fecha (today o specific), usar métodos optimizados con filtrado en backend
      if (shouldFilterByDate && startDate && endDate) {
        console.log('🔍 [DASHBOARD] Cargando datos con filtro de fecha:', {
          filtro: currentFilter,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        })
        
        // Para la gráfica: hoy → 15 días hacia atrás; rango → usar el mismo rango
        let chartStartDate = startDate
        if (currentFilter === 'today') {
          const extendedStart = new Date()
          extendedStart.setDate(extendedStart.getDate() - 14)
          extendedStart.setHours(0, 0, 0, 0)
          chartStartDate = extendedStart
        }
        
        const [salesResult, warrantiesResult, creditsResult, clientsResult, productsResult, paymentRecordsResult, expensesResult] = await Promise.allSettled([
          // Para ventas, usar el rango extendido para la gráfica
          withTimeout(SalesService.getDashboardSales(chartStartDate, endDate), 20000),
          withTimeout(WarrantyService.getWarrantiesByDateRange(startDate, endDate), 15000),
          withTimeout(CreditsService.getAllCredits(), 15000), // SIEMPRE cargar TODOS los créditos para mostrar el total adeudado hasta hoy
          withTimeout(ClientsService.getAllClients(), 15000), // Clientes siempre todos
          withTimeout(ProductsService.getAllProductsLegacy(getCurrentUserStoreId()), 15000), // Productos siempre todos
          // Para pagos, usar el rango extendido para la gráfica
          withTimeout(CreditsService.getPaymentRecordsByDateRange(chartStartDate, endDate), 15000),
          withTimeout(ExpensesService.getExpensesByDateRange(startDate, endDate), 15000)
        ])
        
        // Procesar resultados
        const sales = salesResult.status === 'fulfilled' ? salesResult.value : []
        const warranties = warrantiesResult.status === 'fulfilled' ? warrantiesResult.value : []
        const credits = creditsResult.status === 'fulfilled' ? creditsResult.value : []
        const clients = clientsResult.status === 'fulfilled' ? clientsResult.value : []
        const products = productsResult.status === 'fulfilled' ? productsResult.value : []
        const payments = paymentRecordsResult.status === 'fulfilled' ? paymentRecordsResult.value : []
        const expenses = expensesResult.status === 'fulfilled' ? expensesResult.value : []
        
        const currentStoreId = getCurrentUserStoreId()
        const userFromStorage = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('aleya_user') || '{}') : null
        
        console.log('✅ [DASHBOARD] Datos cargados con filtro:', {
          ventas: sales.length,
          garantias: warranties.length,
          creditos: credits.length,
          abonos: payments.length,
          fechaInicio: startDate.toISOString(),
          fechaFin: endDate.toISOString(),
          storeId: currentStoreId,
          userStoreId: user?.storeId,
          localStorageStoreId: userFromStorage?.storeId,
          ventasDetalle: sales.slice(0, 5).map(s => ({
            id: s.id,
            invoice: s.invoiceNumber,
            total: s.total,
            storeId: s.storeId,
            createdAt: s.createdAt,
            paymentMethod: s.paymentMethod,
            status: s.status
          })),
          todasLasVentasStoreIds: sales.map(s => s.storeId).filter(Boolean),
          ventasUnicasStoreIds: [...new Set(sales.map(s => s.storeId).filter(Boolean))]
        })
        
        setAllSales(sales)
        setAllWarranties(warranties)
        setAllCredits(credits)
        setAllClients(clients)
        setAllProducts(products)
        setAllPaymentRecords(payments)
        setAllExpenses(expenses)
        setLastUpdated(new Date())
        
        // Log de errores si los hay
        const errors = [salesResult, warrantiesResult, creditsResult, clientsResult, productsResult, paymentRecordsResult, expensesResult]
          .filter(result => result.status === 'rejected')
          .map(result => (result as PromiseRejectedResult).reason)
        
        if (errors.length > 0) {
          console.error('⚠️ [DASHBOARD] Errores al cargar datos:', errors)
        }
        
        // IMPORTANTE: Salir aquí para no ejecutar el bloque de "Todo el Tiempo"
        return
      } else {
        // Para "Todo el Tiempo", cargar año seleccionado completo
        // Desde 1 enero del año seleccionado hasta hoy (si es año actual) o 31 dic (si es año anterior)
        const { startDate, endDate } = getDateRange('all', yearToUse)
        
        if (!startDate || !endDate) {
          console.error('⚠️ [DASHBOARD] No se pudieron calcular las fechas para el año seleccionado')
          return
        }
        
        console.log('📊 [DASHBOARD] Cargando datos del año', yearToUse, {
          desde: startDate.toLocaleDateString('es-CO'),
          hasta: endDate.toLocaleDateString('es-CO'),
          desdeISO: startDate.toISOString(),
          hastaISO: endDate.toISOString()
        })
        
        const [salesResult, warrantiesResult, creditsResult, clientsResult, productsResult, paymentRecordsResult, expensesResult] = await Promise.allSettled([
          withTimeout(SalesService.getDashboardSales(startDate, endDate), 30000), // Más tiempo para años completos
          withTimeout(WarrantyService.getWarrantiesByDateRange(startDate, endDate), 20000),
          withTimeout(CreditsService.getAllCredits(), 20000), // SIEMPRE cargar TODOS los créditos para mostrar el total adeudado hasta hoy
          withTimeout(ClientsService.getAllClients(), 15000),
          withTimeout(ProductsService.getAllProductsLegacy(getCurrentUserStoreId()), 15000), // Pasar storeId para filtrar por tienda
          withTimeout(CreditsService.getPaymentRecordsByDateRange(startDate, endDate), 20000),
          withTimeout(ExpensesService.getExpensesByDateRange(startDate, endDate), 20000)
        ])
        
        // Procesar resultados
        const sales = salesResult.status === 'fulfilled' ? salesResult.value : []
        const warranties = warrantiesResult.status === 'fulfilled' ? warrantiesResult.value : []
        const credits = creditsResult.status === 'fulfilled' ? creditsResult.value : []
        const clients = clientsResult.status === 'fulfilled' ? clientsResult.value : []
        const products = productsResult.status === 'fulfilled' ? productsResult.value : []
        const payments = paymentRecordsResult.status === 'fulfilled' ? paymentRecordsResult.value : []
        const expenses = expensesResult.status === 'fulfilled' ? expensesResult.value : []
        
        console.log('✅ [DASHBOARD] Datos cargados (año', yearToUse, '):', {
          ventas: sales.length,
          garantias: warranties.length,
          creditos: credits.length,
          abonos: payments.length
        })
        
        setAllSales(sales)
        setAllWarranties(warranties)
        setAllCredits(credits)
        setAllClients(clients)
        setAllProducts(products)
        setAllPaymentRecords(payments)
        setAllExpenses(expenses)
        setLastUpdated(new Date())
        
        // Log de errores si los hay
        const errors = [salesResult, warrantiesResult, creditsResult, clientsResult, productsResult, paymentRecordsResult, expensesResult]
          .filter(result => result.status === 'rejected')
          .map(result => (result as PromiseRejectedResult).reason)
        
        if (errors.length > 0) {
          console.error('⚠️ [DASHBOARD] Errores al cargar datos:', errors)
        }
      }
    } catch (error) {
      // Error silencioso para no exponer detalles en producción
      // No cambiar los datos en caso de error, mantener los existentes
    } finally {
      // Siempre desactivar el indicador de carga
      setIsInitialLoading(false)
      if (showLoading) {
        setIsRefreshing(false)
      }
    }
  }

  // Función para actualización manual del dashboard
  const handleRefresh = () => {
    // Forzar recarga completa de todos los datos, especialmente productos
    setAllProducts([])
    console.log('🔄 [DASHBOARD] Actualizando datos con filtro actual:', {
      dateFilter,
      rangeStart: rangeStart?.toISOString(),
      rangeEnd: rangeEnd?.toISOString(),
      selectedYear
    })
    // Pasar los parámetros explícitamente para evitar problemas de timing con el estado
    loadDashboardData(true, dateFilter, selectedYear, rangeStart, rangeEnd)
  }

  // Cargar años disponibles al montar
  useEffect(() => {
    const loadAvailableYears = async () => {
      try {
        // Obtener la primera venta para saber desde qué año empezar
        const { supabase } = await import('@/lib/supabase')
        const { data, error } = await supabase
          .from('sales')
          .select('created_at')
          .order('created_at', { ascending: true })
          .limit(1)
        
        if (error || !data || data.length === 0) {
          // Si no hay ventas, retornar solo el año actual
          setAvailableYears([new Date().getFullYear()])
          setSelectedYear(new Date().getFullYear())
          return
        }
        
        const firstSaleDate = new Date(data[0].created_at)
        const firstYear = firstSaleDate.getFullYear()
        const currentYear = new Date().getFullYear()
        
        // Generar array de años desde la primera venta hasta el año actual
        const years: number[] = []
        for (let year = firstYear; year <= currentYear; year++) {
          years.push(year)
        }
        
        setAvailableYears(years.reverse()) // Más reciente primero
        setSelectedYear(currentYear) // Año actual por defecto
      } catch (error) {
        // En caso de error, retornar solo el año actual
        setAvailableYears([new Date().getFullYear()])
        setSelectedYear(new Date().getFullYear())
      }
    }
    
    loadAvailableYears()
  }, [])

  // Cargar datos solo una vez al montar el componente
  useEffect(() => {
    // Solo cargar si no hay datos aún (evitar doble carga)
    // El filtro inicial es 'today', así que cargará datos de hoy
    if (allSales.length === 0 && allProducts.length === 0) {
      console.log('🚀 [DASHBOARD] Carga inicial - filtro:', effectiveDateFilter)
      loadDashboardData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Solo ejecutar una vez al montar

  // Escuchar cambios en el storeId del usuario y recargar datos
  useEffect(() => {
    if (!user) return
    
    const currentStoreId = getCurrentUserStoreId()
    console.log('[DASHBOARD] Monitoring storeId changes:', {
      userStoreId: user.storeId,
      currentStoreId,
      shouldReload: currentStoreId !== user.storeId
    })
    
    // Si el storeId cambió, limpiar y recargar datos
    if (currentStoreId !== user.storeId) {
      console.log('[DASHBOARD] StoreId changed, reloading data')
      // Limpiar datos anteriores
      setAllSales([])
      setAllWarranties([])
      setAllCredits([])
      setAllClients([])
      setAllProducts([])
      setAllPaymentRecords([])
      // Recargar datos
      loadDashboardData()
    }
  }, [user?.storeId])

  // Escuchar cambios en las ventas del contexto para actualizar el dashboard
  useEffect(() => {
    console.log('[DASHBOARD LISTENER] Checking for new sales:', {
      salesInContext: sales.length,
      salesInDashboard: allSales.length,
      salesIds: sales.map(s => s.id),
      dashboardIds: allSales.map(s => s.id)
    })
    
    // Si hay ventas en el contexto, verificar si hay una venta nueva
    if (sales.length > 0) {
      // Verificar si hay una venta nueva que no esté en allSales
      const newSales = sales.filter(sale => {
        const saleDate = new Date(sale.createdAt)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const saleDay = new Date(saleDate)
        saleDay.setHours(0, 0, 0, 0)
        
        // Solo considerar ventas de hoy
        const isToday = saleDay.getTime() === today.getTime()
        const notInDashboard = !allSales.find(existingSale => existingSale.id === sale.id)
        
        if (isToday && notInDashboard) {
          console.log('[DASHBOARD LISTENER] Found new sale:', {
            id: sale.id,
            invoice: sale.invoiceNumber,
            total: sale.total,
            createdAt: sale.createdAt,
            storeId: sale.storeId
          })
        }
        
        return isToday && notInDashboard
      })
      
      if (newSales.length > 0) {
        console.log('🔄 [DASHBOARD] Nueva venta detectada, actualizando dashboard...', {
          newSalesCount: newSales.length,
          newSales: newSales.map(s => ({ id: s.id, invoice: s.invoiceNumber, total: s.total }))
        })
        // Recargar datos del dashboard para incluir la nueva venta
        // Usar un pequeño delay para asegurar que la venta esté completamente guardada
        const timeoutId = setTimeout(() => {
          loadDashboardData(false, effectiveDateFilter, selectedYear, rangeStart, rangeEnd)
        }, 1000) // Aumentar delay a 1 segundo
        
        return () => clearTimeout(timeoutId)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sales.length, allSales.length, sales]) // Incluir sales completo para detectar cambios

  // Función para obtener fechas de filtro
  const getDateRange = (filter: DateFilter, year?: number, rangeStartParam?: Date | null, rangeEndParam?: Date | null) => {
    const now = new Date()
    const targetYear = year || selectedYear
    let startDate: Date | null
    let endDate: Date | null

    switch (filter) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
        break
      case 'range': {
        const start = rangeStartParam ?? rangeStart
        const end = rangeEndParam ?? rangeEnd
        if (!start) {
          return { startDate: null, endDate: null }
        }
        const s = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0)
        const e = end && end >= start
          ? new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999)
          : new Date(s.getFullYear(), s.getMonth(), s.getDate(), 23, 59, 59, 999)
        if (e < s) {
          startDate = new Date(e.getFullYear(), e.getMonth(), e.getDate(), 0, 0, 0, 0)
          endDate = new Date(s.getFullYear(), s.getMonth(), s.getDate(), 23, 59, 59, 999)
        } else {
          startDate = s
          endDate = e
        }
        break
      }
      case 'all':
        startDate = new Date(targetYear, 0, 1, 0, 0, 0, 0)
        endDate = new Date(targetYear, 11, 31, 23, 59, 59, 999)
        break
      default:
        return { startDate: null, endDate: null }
    }

    return { startDate, endDate }
  }

  // Filtrar datos por período
  // NOTA: Ahora los datos ya vienen filtrados del backend cuando hay un filtro de fecha
  // NO aplicar filtrado adicional para evitar problemas de zona horaria
  const filteredData = useMemo(() => {
    // Si es "Todo el Tiempo", devolver todos los datos cargados (últimos 90 días)
    if (effectiveDateFilter === 'all') {
      return {
        sales: allSales,
        warranties: allWarranties,
        credits: allCredits,
        paymentRecords: allPaymentRecords,
        expenses: allExpenses
      }
    }

    if (effectiveDateFilter === 'range' && !rangeStart) {
      return {
        sales: [],
        warranties: [],
        credits: [],
        paymentRecords: [],
        expenses: []
      }
    }

    // Para 'range' los datos ya vienen filtrados por el backend (rango completo)
    if (effectiveDateFilter === 'range') {
      return {
        sales: allSales,
        warranties: allWarranties,
        credits: allCredits,
        paymentRecords: allPaymentRecords,
        expenses: allExpenses
      }
    }

    // Para 'today' filtrar solo el día actual
    if (effectiveDateFilter === 'today') {
      const targetDate = new Date()
      targetDate.setHours(0, 0, 0, 0)
      const nextDay = new Date(targetDate)
      nextDay.setDate(nextDay.getDate() + 1)
      
      // Filtrar ventas solo del día seleccionado
      // Usar comparación más flexible para evitar problemas de zona horaria
      const filteredSales = allSales.filter(sale => {
        const saleDate = new Date(sale.createdAt)
        // Normalizar ambas fechas a medianoche en hora local
        const saleDateNormalized = new Date(saleDate.getFullYear(), saleDate.getMonth(), saleDate.getDate())
        const targetDateNormalized = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate())
        const matches = saleDateNormalized.getTime() === targetDateNormalized.getTime()
        
        // Log para debugging (solo para las primeras ventas)
        if (allSales.length > 0 && allSales.length < 20) {
          console.log('[DASHBOARD] Filtering sale:', {
            saleId: sale.id,
            invoiceNumber: sale.invoiceNumber,
            saleDate: saleDateNormalized.toISOString(),
            targetDate: targetDateNormalized.toISOString(),
            saleDateTime: saleDateNormalized.getTime(),
            targetDateTime: targetDateNormalized.getTime(),
            matches,
            createdAt: sale.createdAt,
            paymentMethod: sale.paymentMethod,
            total: sale.total
          })
        }
        
        return matches
      })
      
      console.log('[DASHBOARD] Filtered sales for date:', {
        totalSales: allSales.length,
        filteredSales: filteredSales.length,
        targetDate: targetDate.toISOString(),
        sales: filteredSales.map(s => ({ 
          id: s.id, 
          invoice: s.invoiceNumber, 
          total: s.total, 
          createdAt: s.createdAt,
          paymentMethod: s.paymentMethod,
          payments: s.payments?.length || 0
        }))
      })
      
      // Filtrar pagos solo del día seleccionado
      const filteredPayments = allPaymentRecords.filter(payment => {
        const paymentDate = new Date(payment.paymentDate)
        paymentDate.setHours(0, 0, 0, 0)
        return paymentDate.getTime() === targetDate.getTime()
      })

      const formatLocalDateString = (date: Date) => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }

      const targetDateString = formatLocalDateString(targetDate)
      const filteredExpenses = allExpenses.filter(expense => expense.date === targetDateString)
      
      // Warranties y credits ya vienen filtrados del backend (solo del día)
      return {
        sales: filteredSales,
        warranties: allWarranties,
        credits: allCredits,
        paymentRecords: filteredPayments,
        expenses: filteredExpenses
      }
    }

    // Para 'all', devolver todos los datos sin filtrar
    return {
      sales: allSales,
      warranties: allWarranties,
      credits: allCredits,
      paymentRecords: allPaymentRecords,
      expenses: allExpenses
    }
  }, [allSales, allWarranties, allCredits, allPaymentRecords, allExpenses, effectiveDateFilter, rangeStart])

  // Calcular métricas del dashboard
  const metrics = useMemo(() => {
    const { sales, warranties, credits, paymentRecords, expenses } = filteredData
    
    // Ingresos por ventas (nuevas ventas) - excluir canceladas y borradores
    const activeSalesForRevenue = sales.filter(sale => sale.status !== 'cancelled' && sale.status !== 'draft')
    const salesRevenue = activeSalesForRevenue.reduce((sum, sale) => sum + sale.total, 0)
    
    // Filtrar abonos cancelados (los abonos de facturas canceladas se marcan como 'cancelled' en payment_records)
    const validPaymentRecords = paymentRecords.filter(payment => {
      // Excluir abonos que estén marcados como cancelados
      return payment.status !== 'cancelled'
    })
    
    // Ingresos por abonos de créditos (solo de facturas/créditos activos)
    const creditPaymentsRevenue = validPaymentRecords.reduce((sum, payment) => sum + payment.amount, 0)
    
    // Ingresos por método de pago (ventas + abonos válidos)
    // Excluir ventas canceladas y borradores del cálculo de ingresos
    const activeSales = sales.filter(sale => sale.status !== 'cancelled' && sale.status !== 'draft')
    
    let cashRevenue = 0
    let transferRevenue = 0
    
    // Procesar solo ventas activas (no canceladas)
    activeSales.forEach(sale => {
      // Priorizar usar sale.payments si están disponibles (más preciso)
      if (sale.payments && sale.payments.length > 0) {
        // Usar los registros de pagos (más preciso, especialmente para transferencias)
        sale.payments.forEach(payment => {
          if (payment.paymentType === 'cash') {
            cashRevenue += payment.amount || 0
          } else if (payment.paymentType === 'transfer') {
            transferRevenue += payment.amount || 0
          }
        })
      } else {
        // Fallback: usar paymentMethod si no hay registros de payments
        if (sale.paymentMethod === 'cash') {
          cashRevenue += sale.total
        } else if (sale.paymentMethod === 'transfer') {
          transferRevenue += sale.total
        } else if (sale.paymentMethod === 'mixed') {
          // Si es mixed pero no tiene payments, loguear para debugging
          console.warn('[DASHBOARD] Sale with mixed payment method but no payments:', {
            saleId: sale.id,
            invoiceNumber: sale.invoiceNumber,
            total: sale.total,
            payments: sale.payments
          })
        }
      }
    })
    
    console.log('[DASHBOARD] Revenue calculation:', {
      activeSalesCount: activeSales.length,
      cashRevenue,
      transferRevenue,
      totalRevenue: cashRevenue + transferRevenue,
      mixedSales: activeSales.filter(s => s.paymentMethod === 'mixed').length,
      mixedSalesWithPayments: activeSales.filter(s => s.paymentMethod === 'mixed' && s.payments && s.payments.length > 0).length
    })
    
    // Agregar abonos de créditos
    cashRevenue += validPaymentRecords
      .filter(p => p.paymentMethod === 'cash')
      .reduce((sum, payment) => sum + payment.amount, 0)
    
    transferRevenue += validPaymentRecords
      .filter(p => p.paymentMethod === 'transfer')
      .reduce((sum, payment) => sum + payment.amount, 0)

    // Descontar egresos activos por método de pago (efectivo y transferencia)
    const activeExpenses = expenses.filter((e: { status?: string }) => e.status !== 'cancelled')
    activeExpenses.forEach((expense: { amount?: number; paymentMethod?: string }) => {
      const amount = expense.amount || 0
      if (expense.paymentMethod === 'cash') {
        cashRevenue -= amount
      } else if (expense.paymentMethod === 'transfer') {
        transferRevenue -= amount
      }
    })

    // Calcular domicilios (dinero que NO es ingreso, va para el domiciliario)
    const totalDeliveryFees = activeSales.reduce((sum, sale) => {
      return sum + (sale.isDelivery && sale.deliveryFee ? sale.deliveryFee : 0)
    }, 0)
    
    // Ingresos totales = efectivo + transferencia - domicilios (el domicilio NO es ingreso)
    const totalRevenue = (cashRevenue + transferRevenue) - totalDeliveryFees
    
    // El total de productos vendidos (con IVA) es el ingreso real
    const productsSubtotal = totalRevenue
    
    // IVA recaudado (solo sobre productos)
    const productsSinIva = Math.round(productsSubtotal / 1.19)
    const ivaRecaudado = productsSubtotal - productsSinIva

    // Calcular el saldo pendiente de créditos (no el total de ventas a crédito)
    // Solo contar créditos que están pendientes o parciales (no completados)
    const creditRevenue = credits
      .filter(c => c.status === 'pending' || c.status === 'partial')
      .reduce((sum, credit) => sum + (credit.pendingAmount || 0), 0)

    // Total egresos (activeExpenses ya definido arriba para descontar de efectivo/transferencia)
    const totalExpenses = activeExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0)

    // Calcular el total real de métodos de pago conocidos
    const knownPaymentMethodsTotal = cashRevenue + transferRevenue + creditRevenue
    
    // Productos más vendidos - Excluir ventas canceladas
    const productSales: { [key: string]: { name: string; quantity: number; revenue: number } } = {}
    activeSales.forEach(sale => {
      if (sale.items) {
        sale.items.forEach(item => {
          if (!productSales[item.productId]) {
            productSales[item.productId] = {
              name: item.productName,
              quantity: 0,
              revenue: 0
            }
          }
          productSales[item.productId].quantity += item.quantity
          productSales[item.productId].revenue += item.price * item.quantity
        })
      }
    })

    const topProducts = Object.entries(productSales)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)

    // Productos más vendidos recientemente con facturas asociadas
    const recentProductSales: { [key: string]: { productId: string; productName: string; saleId: string; invoiceNumber: string | null; createdAt: string; quantity: number } } = {}
    activeSales.forEach(sale => {
      if (sale.items) {
        sale.items.forEach(item => {
          const key = item.productId
          if (!recentProductSales[key] || new Date(sale.createdAt) > new Date(recentProductSales[key].createdAt)) {
            recentProductSales[key] = {
              productId: item.productId,
              productName: item.productName,
              saleId: sale.id,
              invoiceNumber: sale.invoiceNumber || null,
              createdAt: sale.createdAt,
              quantity: item.quantity
            }
          }
        })
      }
    })

    const recentTopProducts = Object.values(recentProductSales)
      .sort((a, b) => {
        // Ordenar por fecha más reciente primero
        const dateA = new Date(a.createdAt).getTime()
        const dateB = new Date(b.createdAt).getTime()
        return dateB - dateA
      })
      .slice(0, 3)
      .map((item) => {
        const saleDate = new Date(item.createdAt)
        const dateLabel = saleDate.toLocaleDateString('es-CO', {
          day: 'numeric',
          month: 'short'
        }).replace('.', '')
        const timeLabel = saleDate.toLocaleTimeString('es-CO', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })
        return {
          id: item.productId,
          productName: item.productName,
          invoiceNumber: item.invoiceNumber,
          dateLabel,
          timeLabel,
          quantity: item.quantity
        }
      })

    // Garantías
    const completedWarranties = warranties.filter(w => w.status === 'completed').length
    const pendingWarranties = warranties.filter(w => w.status === 'pending').length
    
    // Métricas adicionales para garantías - Excluir ventas canceladas
    const warrantyRate = activeSales.length > 0 ? ((completedWarranties / activeSales.length) * 100).toFixed(1) : '0.0'
    
    // Calcular valor total de productos reemplazados en garantías
    const completedWarrantyDetails = warranties
      .filter(w => w.status === 'completed')
      .sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.createdAt).getTime()
        const dateB = new Date(b.updatedAt || b.createdAt).getTime()
        return dateB - dateA
      })

    const totalWarrantyValue = completedWarrantyDetails.reduce((sum, warranty) => {
      const replacementProduct = allProducts.find(p => p.id === warranty.productDeliveredId)
      return sum + (replacementProduct?.price || 0)
    }, 0)

    const recentWarrantyReplacements = completedWarrantyDetails
      .slice(0, 5)
      .map(warranty => {
        const replacementProduct = allProducts.find(p => p.id === warranty.productDeliveredId)
        const deliveredName = warranty.productDeliveredName || replacementProduct?.name || 'Producto entregado'
        const reference = replacementProduct?.reference
        const value = replacementProduct?.price || 0
        const quantityDelivered = warranty.quantityDelivered || 1
        const warrantyDate = new Date(warranty.updatedAt || warranty.createdAt)
        const dateLabel = warrantyDate.toLocaleDateString('es-CO', {
          day: '2-digit',
          month: 'short'
        }).replace('.', '')
        const timeLabel = warrantyDate.toLocaleTimeString('es-CO', {
          hour: '2-digit',
          minute: '2-digit'
        })

        return {
          id: warranty.id,
          deliveredName,
          reference,
          value,
          quantityDelivered,
          dateLabel,
          timeLabel
        }
      })
    
    // Calcular días desde la última garantía completada (usar todas las garantías, no solo las filtradas)
    const lastWarranty = allWarranties
      .filter(w => w.status === 'completed')
      .sort((a, b) => {
        // Usar updatedAt si está disponible (fecha de completado), sino createdAt
        const dateA = new Date(a.updatedAt || a.createdAt).getTime()
        const dateB = new Date(b.updatedAt || b.createdAt).getTime()
        return dateB - dateA
      })[0]
    
    const daysSinceLastWarranty = lastWarranty 
      ? Math.floor((new Date().getTime() - new Date(lastWarranty.updatedAt || lastWarranty.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      : null

    // Créditos pendientes y parciales (dinero afuera) - TODOS los créditos, no filtrados por fecha
    // Excluir créditos cancelados (que tienen totalAmount y pendingAmount en 0)
    const pendingCredits = allCredits.filter(c => 
      (c.status === 'pending' || c.status === 'partial') && 
      !(c.totalAmount === 0 && c.pendingAmount === 0)
    )
    const totalDebt = pendingCredits.reduce((sum, credit) => sum + (credit.pendingAmount || credit.totalAmount || 0), 0)
    const recentPendingCredits = pendingCredits
      .slice()
      .sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.createdAt || '').getTime()
        const dateB = new Date(b.updatedAt || b.createdAt || '').getTime()
        return dateB - dateA
      })
      .slice(0, 4)
      .map((credit) => {
        const creditDate = new Date(credit.updatedAt || credit.createdAt || '')
        const dateLabel = creditDate.toLocaleDateString('es-CO', {
          day: '2-digit',
          month: 'short'
        }).replace('.', '')
        const timeLabel = creditDate.toLocaleTimeString('es-CO', {
          hour: '2-digit',
          minute: '2-digit'
        })
        return {
          id: credit.id,
          clientName: credit.clientName || 'Cliente',
          reference: credit.invoiceNumber,
          status: credit.status,
          pendingAmount: credit.pendingAmount || credit.totalAmount || 0,
          dateLabel,
          timeLabel
        }
      })
    
    // Créditos del día actual (para usuarios no-superadmin)
    const dailyCredits = credits.filter(c => 
      (c.status === 'pending' || c.status === 'partial') && 
      !(c.totalAmount === 0 && c.pendingAmount === 0)
    )
    const dailyCreditsDebt = dailyCredits.reduce((sum, credit) => sum + (credit.pendingAmount || credit.totalAmount || 0), 0)
    const dailyCreditsCount = dailyCredits.length
    
    // Créditos vencidos (para información adicional de vendedores)
    const overdueCredits = allCredits.filter(c => {
      if (c.status !== 'pending' && c.status !== 'partial') return false
      if (c.totalAmount === 0 && c.pendingAmount === 0) return false
      if (!c.dueDate) return false
      
      const dueDate = new Date(c.dueDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      return dueDate < today
    })
    const overdueCreditsCount = overdueCredits.length
    const overdueCreditsDebt = overdueCredits.reduce((sum, credit) => sum + (credit.pendingAmount || credit.totalAmount || 0), 0)

    // Clientes únicos que han comprado en el período seleccionado - Excluir ventas canceladas
    const uniqueClients = new Set(activeSales.map(sale => sale.clientId)).size

    // Calcular ganancia bruta (ventas SIN IVA - costo SIN IVA)
    // El IVA no es ganancia, es dinero recaudado para el gobierno
    // Excluir ventas canceladas del cálculo de ganancia bruta
    // Para ventas a crédito: solo contar la ganancia cuando el crédito esté completado
    const grossProfit = activeSales.reduce((totalProfit, sale) => {
      // Si es una venta a crédito, verificar si el crédito está completado
      if (sale.paymentMethod === 'credit') {
        // Buscar el crédito asociado a esta venta
        const associatedCredit = allCredits.find(c => c.saleId === sale.id)
        
        // Solo contar la ganancia si el crédito está completado
        // Si no hay crédito asociado o no está completado, no contar la ganancia
        if (!associatedCredit || associatedCredit.status !== 'completed') {
          return totalProfit
        }
      }
      
      if (!sale.items) return totalProfit
      
      const saleProfit = sale.items.reduce((itemProfit, item) => {
        // Buscar el producto para obtener su costo
        const product = allProducts.find(p => p.id === item.productId)
        // Usar costo SIN IVA (costBeforeTax o calcular)
        const costSinIva = product?.costBeforeTax || Math.round((product?.cost || 0) / 1.19)
        
        // Calcular el precio real de venta después de descuentos (con IVA)
        const baseTotal = item.quantity * item.unitPrice
        const discountAmount = item.discountType === 'percentage' 
          ? (baseTotal * (item.discount || 0)) / 100 
          : (item.discount || 0)
        const salePriceAfterDiscount = Math.max(0, baseTotal - discountAmount)
        
        // Convertir precio de venta a SIN IVA
        const salePriceSinIva = Math.round(salePriceAfterDiscount / 1.19)
        
        // El precio unitario real SIN IVA después de descuentos
        const realUnitPriceSinIva = item.quantity > 0 ? salePriceSinIva / item.quantity : 0
        
        // Ganancia bruta = (precio de venta SIN IVA - costo SIN IVA) * cantidad
        const itemGrossProfit = (realUnitPriceSinIva - costSinIva) * item.quantity
        
        return itemProfit + itemGrossProfit
      }, 0)
      
      return totalProfit + saleProfit
    }, 0)

    // Calcular las ventas más rentables para mostrar en la lista (SIN IVA)
    // Excluir ventas canceladas
    // Para ventas a crédito: solo contar la ganancia cuando el crédito esté completado
    const topProfitableSales = activeSales.map(sale => {
      // Si es una venta a crédito, verificar si el crédito está completado
      if (sale.paymentMethod === 'credit') {
        // Buscar el crédito asociado a esta venta
        const associatedCredit = allCredits.find(c => c.saleId === sale.id)
        
        // Solo contar la ganancia si el crédito está completado
        // Si no hay crédito asociado o no está completado, retornar ganancia 0
        if (!associatedCredit || associatedCredit.status !== 'completed') {
          return { ...sale, profit: 0 }
        }
      }
      
      if (!sale.items) return { ...sale, profit: 0 }
      
      const saleProfit = sale.items.reduce((itemProfit, item) => {
        const product = allProducts.find(p => p.id === item.productId)
        // Usar costo SIN IVA
        const costSinIva = product?.costBeforeTax || Math.round((product?.cost || 0) / 1.19)
        
        // Calcular el precio real de venta después de descuentos (con IVA)
        const baseTotal = item.quantity * item.unitPrice
        const discountAmount = item.discountType === 'percentage' 
          ? (baseTotal * (item.discount || 0)) / 100 
          : (item.discount || 0)
        const salePriceAfterDiscount = Math.max(0, baseTotal - discountAmount)
        
        // Convertir a SIN IVA
        const salePriceSinIva = Math.round(salePriceAfterDiscount / 1.19)
        const realUnitPriceSinIva = item.quantity > 0 ? salePriceSinIva / item.quantity : 0
        
        // Ganancia bruta = (precio SIN IVA - costo SIN IVA) * cantidad
        const itemGrossProfit = (realUnitPriceSinIva - costSinIva) * item.quantity
        
        return itemProfit + itemGrossProfit
      }, 0)
      
      return { ...sale, profit: saleProfit }
    })
    .filter(sale => sale.profit > 0) // Solo ventas con ganancia positiva
    .sort((a, b) => {
      // Ordenar por ganancia descendente primero, luego por fecha más reciente
      if (b.profit !== a.profit) {
        return b.profit - a.profit // Mayor ganancia primero
      }
      const dateA = new Date(a.createdAt).getTime()
      const dateB = new Date(b.createdAt).getTime()
      return dateB - dateA // Si misma ganancia, más reciente primero
    })
    .slice(0, 5) // Tomar las 5 con mayor ganancia

    // Facturas anuladas en el período seleccionado
    const cancelledSales = sales.filter(sale => sale.status === 'cancelled').length
    
    // Valor perdido por facturas anuladas en el período seleccionado
    const lostValue = sales
      .filter(sale => sale.status === 'cancelled')
      .reduce((sum, sale) => sum + sale.total, 0)

    // Contar TODOS los productos para stock e inversión (activos e inactivos)
    // Solo excluir productos discontinuados explícitamente
    const productsForCalculation = allProducts.filter(p => {
      const status = p.status?.toLowerCase()
      // Excluir solo productos explícitamente discontinuados
      return status !== 'discontinued'
    })
    
    // Filtrar solo productos con stock > 0 para el cálculo de métricas
    // Para una tienda nueva, todos los productos deberían tener stock 0
    const productsWithStock = productsForCalculation.filter(p => {
      const storeStock = Number(p.stock?.store) || 0;
      const warehouseStock = Number(p.stock?.warehouse) || 0;
      const totalStock = storeStock + warehouseStock;
      return totalStock > 0;
    })
    
    // DEBUG: Log para verificar productos con stock y sus costos
    const sampleWithCost = productsWithStock.filter(p => p.cost > 0).slice(0, 5)
    const totalInvestmentCalc = productsWithStock.reduce((sum, p) => {
      const localStock = p.stock?.store || 0
      const warehouseStock = p.stock?.warehouse || 0
      const totalStock = localStock + warehouseStock
      return sum + ((p.cost || 0) * totalStock)
    }, 0)
    
    console.log('[DASHBOARD] Products debug:', {
      totalProducts: allProducts.length,
      productsForCalculation: productsForCalculation.length,
      productsWithStock: productsWithStock.length,
      productsWithCostGreaterThan0: productsWithStock.filter(p => p.cost > 0).length,
      totalInvestmentCalc: totalInvestmentCalc,
      sampleProductsWithStock: productsWithStock.slice(0, 3).map(p => ({
        name: p.name,
        cost: p.cost,
        price: p.price,
        stock: p.stock
      })),
      sampleProductsWithCost: sampleWithCost.map(p => ({
        name: p.name,
        cost: p.cost,
        stock: p.stock
      }))
    })
    
    // Total de unidades en stock (local + bodega) - solo productos con stock > 0
    const totalStockUnits = productsWithStock.reduce((sum, p) => {
      const storeStock = Number(p.stock?.store) || 0;
      const warehouseStock = Number(p.stock?.warehouse) || 0;
      const productTotal = storeStock + warehouseStock;
      return sum + productTotal;
    }, 0)
    
    // Productos con stock bajo - solo productos con stock > 0
    // Stock bajo = total <= 5 unidades y > 0
    const lowStockProducts = productsWithStock.filter(p => {
      const storeStock = Number(p.stock?.store) || 0;
      const warehouseStock = Number(p.stock?.warehouse) || 0;
      const totalStock = storeStock + warehouseStock;
      return totalStock > 0 && totalStock <= 5;
    }).length

    // Calcular inversión total en stock (precio de compra * stock actual) - solo productos con stock > 0
    const totalStockInvestment = productsWithStock.reduce((sum, product) => {
      const localStock = product.stock?.store || 0;
      const warehouseStock = product.stock?.warehouse || 0;
      const totalStock = localStock + warehouseStock;
      const costPrice = product.cost || 0; // Precio de compra/costo
      return sum + (costPrice * totalStock);
    }, 0)
    
    // Calcular inversión potencial (costo total de todos los productos, asumiendo 1 unidad de cada uno)
    // Solo para productos con stock > 0
    const potentialInvestment = productsWithStock.reduce((sum, product) => {
      const costPrice = product.cost || 0;
      return sum + costPrice;
    }, 0)

    // Calcular valor estimado de ventas (precio de venta * stock actual) - solo productos con stock > 0
    const estimatedSalesValue = productsWithStock.reduce((sum, product) => {
      const localStock = product.stock?.store || 0;
      const warehouseStock = product.stock?.warehouse || 0;
      const totalStock = localStock + warehouseStock;
      const sellingPrice = product.price || 0; // Precio de venta
      return sum + (sellingPrice * totalStock);
    }, 0)

    // Datos para gráficos - Debe coincidir exactamente con totalRevenue (efectivo + transferencia + abonos)
    // Excluir ventas canceladas y borradores del gráfico
    // IMPORTANTE: Usar la misma lógica que totalRevenue para que los números coincidan

    // Función helper para normalizar fecha y obtener formato consistente
    const getDateKey = (dateInput: Date | string): string => {
      const date = new Date(dateInput)
      // Normalizar a medianoche en hora local para evitar problemas de zona horaria
      const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      return normalizedDate.toLocaleDateString('es-CO', { 
        weekday: 'short',
        day: '2-digit', 
        month: '2-digit' 
      })
    }

    // IMPORTANTE: Calcular salesByDay - Ventas de productos SIN domicilios (igual que totalRevenue)
    const salesByDay = activeSales.reduce((acc: { [key: string]: { amount: number, count: number } }, sale) => {
      const date = getDateKey(sale.createdAt)
      if (!acc[date]) {
        acc[date] = { amount: 0, count: 0 }
      }
      
      // Restar domicilios del total (el domicilio no es ingreso, es para el delivery)
      const deliveryFee = sale.isDelivery && sale.deliveryFee ? sale.deliveryFee : 0
      const saleAmount = sale.total - deliveryFee
      
      if (sale.paymentMethod === 'cash') {
        acc[date].amount += saleAmount
        acc[date].count += 1
      } else if (sale.paymentMethod === 'transfer') {
        acc[date].amount += saleAmount
        acc[date].count += 1
      } else if (sale.paymentMethod === 'mixed' && sale.payments) {
        // Para pagos mixtos, sumar pagos menos proporción de domicilio
        const totalPayments = sale.payments.reduce((sum, p) => sum + (p.amount || 0), 0)
        const deliveryProportion = totalPayments > 0 ? deliveryFee / totalPayments : 0
        
        sale.payments.forEach(payment => {
          if (payment.paymentType === 'cash' || payment.paymentType === 'transfer') {
            // Restar proporción del domicilio de cada pago
            const paymentWithoutDelivery = (payment.amount || 0) * (1 - deliveryProportion)
            acc[date].amount += paymentWithoutDelivery
          }
        })
        const hasRealPayment = sale.payments.some(p => 
          p.paymentType === 'cash' || p.paymentType === 'transfer'
        )
        if (hasRealPayment) {
          acc[date].count += 1
        }
      }
      
      return acc
    }, {})

    // Agregar abonos de créditos al gráfico (EXACTAMENTE igual que se suma arriba en líneas 442-449)
    // IMPORTANTE: Usar los mismos validPaymentRecords que se usan para calcular totalRevenue
    // Esto asegura que el gráfico muestre exactamente lo mismo que totalRevenue
    validPaymentRecords.forEach(payment => {
      const date = getDateKey(payment.paymentDate)
      if (!salesByDay[date]) {
        salesByDay[date] = { amount: 0, count: 0 }
      }
      // Sumar abonos en efectivo y transferencia (EXACTAMENTE igual que líneas 443-449)
      if (payment.paymentMethod === 'cash') {
        salesByDay[date].amount += payment.amount
      } else if (payment.paymentMethod === 'transfer') {
        salesByDay[date].amount += payment.amount
      }
      // No incrementar count para abonos, solo para ventas nuevas
    })

    // Debug: Verificar que los totales coincidan (tolerancia de 100 por redondeos)
    const totalFromChart = Object.values(salesByDay).reduce((sum, day) => sum + day.amount, 0)
    if (Math.abs(totalFromChart - totalRevenue) > 100) {
      console.warn('[DASHBOARD] Diferencia entre gráfico y totalRevenue:', {
        totalFromChart,
        totalRevenue,
        difference: totalFromChart - totalRevenue
      })
    }

    // Generar todos los días del período seleccionado
    const generateAllDays = () => {
      const days: string[] = []
      const today = new Date()
      
      if (effectiveDateFilter === 'today') {
        days.push(getDateKey(today))
      } else if (effectiveDateFilter === 'range' && rangeStart) {
        const end = rangeEnd && rangeEnd >= rangeStart ? rangeEnd : rangeStart
        const start = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate())
        const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate())
        for (let d = new Date(start); d <= endDate; d.setDate(d.getDate() + 1)) {
          days.push(getDateKey(d))
        }
      } else if (effectiveDateFilter === 'all') {
        const startDate = new Date(today)
        startDate.setDate(today.getDate() - 29)
        for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
          days.push(getDateKey(d))
        }
      }
      
      return days
    }

    const allDays = generateAllDays()
    const salesChartData = allDays
      .map(date => {
        const data = salesByDay[date] || { amount: 0, count: 0 }
        return { 
          date, 
          amount: data.amount,
          count: data.count,
          average: data.count > 0 ? data.amount / data.count : 0
        }
      })
      .filter(day => {
        // Para semana/mes/año mostrar todos los días del rango; para un día solo los con ventas
        if (effectiveDateFilter === 'range' || effectiveDateFilter === 'all') return true
        return day.amount > 0
      })

    const paymentMethodData = [
      { name: 'Efectivo', value: cashRevenue, color: '#f29fc8' },
      { name: 'Transferencia', value: transferRevenue, color: '#3B82F6' },
      { name: 'Crédito', value: creditRevenue, color: '#F59E0B' }
    ].filter(item => item.value > 0)

    const topProductsChart = topProducts.slice(0, 5).map(product => ({
      name: product.name.length > 15 ? product.name.substring(0, 15) + '...' : product.name,
      cantidad: product.quantity,
      ingresos: product.revenue
    }))

    return {
      totalRevenue,
      salesRevenue,
      creditPaymentsRevenue,
      cashRevenue,
      transferRevenue,
      creditRevenue,
      totalExpenses,
      knownPaymentMethodsTotal,
      // Desglose IVA (solo sobre productos, sin domicilios)
      totalDeliveryFees,
      productsSubtotal,
      productsSinIva,
      ivaRecaudado,
      totalSales: activeSales.length, // Solo contar ventas activas (no canceladas ni borradores)
      topProducts,
      completedWarranties,
      pendingWarranties,
      warrantyRate,
      totalWarrantyValue,
      recentWarrantyReplacements,
      recentPendingCredits,
      daysSinceLastWarranty,
      totalDebt,
      pendingCreditsCount: pendingCredits.length,
      dailyCreditsDebt,
      dailyCreditsCount,
      overdueCreditsCount,
      overdueCreditsDebt,
      uniqueClients,
      grossProfit,
      topProfitableSales,
      recentTopProducts,
      cancelledSales,
      lostValue,
      lowStockProducts,
      totalProducts: totalStockUnits,
      totalProductsCount: productsForCalculation.length, // Número total de productos
      totalStockInvestment,
      potentialInvestment, // Inversión potencial (costo de todos los productos)
      estimatedSalesValue,
      totalClients: allClients.length,
      salesChartData,
      paymentMethodData,
      topProductsChart
    }
  }, [filteredData, allProducts, allClients, allWarranties, allCredits, effectiveDateFilter, rangeStart, rangeEnd])

  // Función helper para formatear moneda con opción de ocultar
  const formatCurrency = (amount: number): string => {
    if (hideNumbers) {
      return '$ ••••••'
    }
    return new Intl.NumberFormat('es-CO', { 
      style: 'currency', 
      currency: 'COP',
      minimumFractionDigits: 0 
    }).format(amount)
  }

  // Función helper para formatear números sin símbolo de moneda
  const formatNumber = (num: number): string => {
    if (hideNumbers) {
      return '••••'
    }
    return num.toLocaleString('es-CO')
  }

  // Obtener etiqueta del filtro de fecha
  const getDateFilterLabel = (filter: DateFilter) => {
    if (filter === 'today') return 'Hoy'
    if (filter === 'all') return 'Seleccionar Año'
    if (filter === 'range') {
      if (!rangeStart) return 'Rango de fechas'
      const startStr = rangeStart.toLocaleDateString('es-CO')
      if (!rangeEnd || rangeEnd.getTime() === rangeStart.getTime()) return startStr
      return `${startStr} - ${rangeEnd.toLocaleDateString('es-CO')}`
    }
    return filter
  }

  // Función para manejar cambio de filtro con indicador de carga
  const handleFilterChange = async (newFilter: DateFilter) => {
    setIsFiltering(true)
    setDateFilter(newFilter)
    if (newFilter === 'all') {
      setRangeStart(null)
      setRangeEnd(null)
      const currentYear = new Date().getFullYear()
      setSelectedYear(currentYear)
      loadDashboardData(true, newFilter, currentYear).then(() => setIsFiltering(false))
    } else if (newFilter === 'range') {
      const today = new Date()
      setRangeStart(today)
      setRangeEnd(today)
      loadDashboardData(true, newFilter, selectedYear, today, today).then(() => setIsFiltering(false))
    } else {
      loadDashboardData(true, newFilter, selectedYear, rangeStart, rangeEnd).then(() => setIsFiltering(false))
    }
  }

  // Función para manejar cambio de año
  const handleYearChange = (year: number) => {
    setSelectedYear(year)
    setIsFiltering(true)
    loadDashboardData(true, dateFilter, year, rangeStart, rangeEnd).then(() => setIsFiltering(false))
  }

  const handleRangeStartSelect = (date: Date | null) => {
    setRangeStart(date)
    if (date) {
      setRangeEnd(prev => (prev && prev >= date ? prev : date))
      setIsFiltering(true)
      const end = !rangeEnd || rangeEnd < date ? date : rangeEnd
      loadDashboardData(true, 'range', selectedYear, date, end).then(() => setIsFiltering(false))
    }
  }

  const handleRangeEndSelect = (date: Date | null) => {
    setRangeEnd(date)
    if (date && rangeStart && date < rangeStart) {
      setRangeStart(date)
      setIsFiltering(true)
      loadDashboardData(true, 'range', selectedYear, date, date).then(() => setIsFiltering(false))
    } else if (date) {
      setIsFiltering(true)
      loadDashboardData(true, 'range', selectedYear, rangeStart, date).then(() => setIsFiltering(false))
    }
  }

  // Mostrar skeleton loader durante la carga inicial
  if (isInitialLoading && allSales.length === 0 && allProducts.length === 0) {
    return (
      <RoleProtectedRoute module="dashboard" requiredAction="view">
        <div className="p-4 md:p-6 bg-white dark:bg-gray-900 min-h-screen">
          {/* Header Skeleton */}
          <div className="mb-4 md:mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                  <div className="h-7 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
                <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Cards Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 md:p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                  <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
                </div>
                <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
            ))}
          </div>

          {/* Loading indicator */}
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              {/* Spinner minimalista */}
              <div className="w-16 h-16 mx-auto mb-6">
                <div className="w-full h-full border-2 border-[#fce4f0] dark:border-[#f29fc8]/30 rounded-full border-t-[#f29fc8] dark:border-t-[#f29fc8] animate-spin"></div>
              </div>
              <p className="text-lg font-medium text-[#d06a98] dark:text-[#f29fc8] mb-1">
                Cargando datos del dashboard...
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Esto puede tomar unos segundos
              </p>
            </div>
          </div>
        </div>
      </RoleProtectedRoute>
    )
  }

  return (
    <RoleProtectedRoute module="dashboard" requiredAction="view">
      <div className="p-4 md:p-6 bg-white dark:bg-gray-900 min-h-screen relative">
      {/* Overlay de carga para actualizaciones */}
      {(isRefreshing || isFiltering) && (
        <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex flex-col items-center justify-center -mt-[200px]">
            {/* Spinner minimalista */}
            <div className="w-12 h-12 mb-4">
              <div className="w-full h-full border-2 border-[#fce4f0] dark:border-[#f29fc8]/30 rounded-full border-t-[#f29fc8] dark:border-t-[#f29fc8] animate-spin"></div>
            </div>
            <p className="text-base font-medium text-[#d06a98] dark:text-[#f29fc8]">
              {isFiltering ? 'Cargando datos del día...' : 'Actualizando dashboard...'}
            </p>
          </div>
        </div>
      )}

      {/* Header con estilo de las otras páginas */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 mb-3 md:mb-6">
        <CardHeader className="p-3 md:p-6">
          <div className="flex flex-col gap-2 md:gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 md:gap-4">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2 flex-wrap">
                  <BarChart3 className="h-5 w-5 md:h-6 md:w-6 text-[#f29fc8] flex-shrink-0" />
                  <span className="flex-shrink-0">Dashboard</span>
                  {currentStoreName && !isMainStoreUser(user) && (
                    <Badge className="bg-[#fce4f0] text-[#d06a98] dark:bg-[#f29fc8]/20 dark:text-[#f29fc8] text-sm md:text-base px-3 py-1.5 flex-shrink-0 border border-[#f29fc8]/50 dark:border-[#f29fc8]/30">
                      <StoreIcon className="h-4 w-4 md:h-5 md:w-5 mr-1.5" />
                      {currentStoreName}
                    </Badge>
                  )}
                  {(isRefreshing || isFiltering) && (
                    <Badge className="bg-[#fce4f0] text-[#d06a98] dark:bg-[#f29fc8]/20 dark:text-[#f29fc8] text-xs flex-shrink-0">
                      Actualizando...
                    </Badge>
                  )}
                </CardTitle>
                <p className="text-xs md:text-base text-gray-600 dark:text-gray-300 mt-0.5 md:mt-1">
                  {currentStoreName && !isMainStoreUser(user) 
                    ? 'Estás viendo el dashboard de esta micro tienda. Los datos mostrados corresponden únicamente a esta ubicación.'
                    : isMainStoreUser(user)
                    ? 'Resumen ejecutivo y métricas de rendimiento de la tienda principal'
                    : 'Resumen ejecutivo y métricas de rendimiento'}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {isSuperAdmin ? (
                  <>
                    {/* Selector de período simplificado */}
                    <div className="relative w-full sm:w-auto">
                      <select
                        value={dateFilter}
                        onChange={(e) => handleFilterChange(e.target.value as DateFilter)}
                        className="w-full appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 md:px-3 md:py-2 pr-9 md:pr-8 text-sm md:text-sm font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#f29fc8] focus:border-[#f29fc8]"
                      >
                        {(['today', 'range', 'all'] as DateFilter[]).map((filter) => (
                          <option key={filter} value={filter}>
                            {getDateFilterLabel(filter)}
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 md:pr-2 pointer-events-none">
                        <svg className="w-4 h-4 md:w-4 md:h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    
                    {/* Selector de año cuando "Todo el Tiempo" está seleccionado */}
                    {dateFilter === 'all' && isSuperAdmin && (
                      <div className="relative w-full sm:w-auto sm:ml-2">
                        <select
                          value={selectedYear}
                          onChange={(e) => handleYearChange(Number(e.target.value))}
                          className="w-full appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 md:px-3 md:py-2 pr-9 md:pr-8 text-sm md:text-sm font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#f29fc8] focus:border-[#f29fc8]"
                        >
                          {availableYears.map((year) => (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 md:pr-2 pointer-events-none">
                          <svg className="w-4 h-4 md:w-4 md:h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    )}

                    {/* Rango: fecha inicial y final */}
                    {dateFilter === 'range' && (
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Desde</span>
                          <DatePicker
                            selectedDate={rangeStart}
                            onDateSelect={handleRangeStartSelect}
                            placeholder="Inicial"
                            className="w-full sm:w-36 text-xs md:text-sm"
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Hasta</span>
                          <DatePicker
                            selectedDate={rangeEnd}
                            onDateSelect={handleRangeEndSelect}
                            placeholder="Final"
                            className="w-full sm:w-36 text-xs md:text-sm"
                          />
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-2 px-2 md:px-3 py-1 md:py-1.5 bg-[#fce4f0] dark:bg-[#f29fc8]/20 border border-[#f29fc8]/50 dark:border-[#f29fc8]/30 rounded-lg">
                    <Calendar className="h-3 w-3 md:h-4 md:w-4 text-[#f29fc8]" />
                    <span className="text-xs md:text-sm font-medium text-[#d06a98] dark:text-[#f29fc8] hidden sm:inline">
                      Vista del día actual
                    </span>
                    <span className="text-xs font-medium text-[#d06a98] dark:text-[#f29fc8] sm:hidden">
                      Hoy
                    </span>
                  </div>
                )}
                {/* Botones de acción agrupados */}
                <div className="flex items-center gap-2">
                  <Button 
                    onClick={() => setHideNumbers(!hideNumbers)}
                    variant="outline"
                    className="justify-center text-gray-600 border-gray-300 hover:bg-gray-50 dark:text-gray-400 dark:border-gray-600 dark:hover:bg-gray-700 text-xs md:text-sm px-2.5 md:px-3 py-2"
                    title={hideNumbers ? 'Mostrar números' : 'Ocultar números'}
                  >
                    {hideNumbers ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button 
                    onClick={() => setShowMonthlyClosingModal(true)}
                    variant="outline"
                    className="justify-center gap-2 text-[#f29fc8] border-[#f29fc8] hover:bg-[#fce4f0] dark:text-[#f29fc8] dark:border-[#f29fc8] dark:hover:bg-[#f29fc8]/20 text-xs md:text-sm px-2.5 md:px-4 py-2"
                    title="Cierre de caja mensual"
                  >
                    <Calculator className="h-4 w-4" />
                    <span className="hidden md:inline">Cierre mensual</span>
                  </Button>
                  <Button 
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    variant="outline"
                    className="justify-center gap-2 text-[#f29fc8] border-[#f29fc8] hover:bg-[#fce4f0] dark:text-[#f29fc8] dark:border-[#f29fc8] dark:hover:bg-[#f29fc8]/20 disabled:opacity-50 text-xs md:text-sm px-2.5 md:px-4 py-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span className="hidden md:inline">Actualizar</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Métricas principales - 3 o 4 cards según el rol */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
        {/* Total Ingresos */}
        <div 
          onClick={() => router.push('/sales')}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 md:p-6 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-1.5 bg-[#fce4f0] dark:bg-[#f29fc8]/30 rounded-lg">
              <BarChart3 className="h-3.5 w-3.5 text-[#f29fc8] dark:text-[#f29fc8]" />
            </div>
            <div className="text-right">
              <span className="text-xs md:text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Total Ingresos</span>
              <p className="text-[10px] md:text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {effectiveDateFilter === 'today' ? 'Hoy' : 
                 effectiveDateFilter === 'all' ? 'Todos los Períodos' : 
                 getDateFilterLabel(effectiveDateFilter)}
              </p>
            </div>
          </div>
          <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {formatCurrency(metrics.totalRevenue)}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
            {metrics.totalSales} ventas realizadas
          </p>
          {/* Desglose IVA */}
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-1">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Base (sin IVA):</span>
              <span>{formatCurrency(metrics.productsSinIva)}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>IVA recaudado:</span>
              <span>{formatCurrency(metrics.ivaRecaudado)}</span>
            </div>
          </div>
        </div>

        {/* Efectivo */}
        <div 
          onClick={() => router.push('/sales')}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 md:p-6 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-1.5 bg-[#fce4f0] dark:bg-[#f29fc8]/20 rounded-lg">
              <DollarSign className="h-3.5 w-3.5 text-[#d06a98] dark:text-[#f29fc8]" />
            </div>
            <div className="text-right">
              <span className="text-xs md:text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Efectivo</span>
              <p className="text-[10px] md:text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {effectiveDateFilter === 'today' ? 'Hoy' : 
                 effectiveDateFilter === 'all' ? 'Todos los Períodos' : 
                 getDateFilterLabel(effectiveDateFilter)}
              </p>
            </div>
          </div>
          <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {formatCurrency(metrics.cashRevenue)}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {(metrics.cashRevenue + metrics.transferRevenue) > 0 ? ((metrics.cashRevenue / (metrics.cashRevenue + metrics.transferRevenue)) * 100).toFixed(1) : 0}% del total
          </p>
        </div>

        {/* Transferencia */}
        <div 
          onClick={() => router.push('/sales')}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 md:p-6 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-1.5 bg-[#fce4f0] dark:bg-[#f29fc8]/20 rounded-lg">
              <TrendingUp className="h-3.5 w-3.5 text-[#d06a98] dark:text-[#f29fc8]" />
            </div>
            <div className="text-right">
              <span className="text-xs md:text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Transferencia</span>
              <p className="text-[10px] md:text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {effectiveDateFilter === 'today' ? 'Hoy' : 
                 effectiveDateFilter === 'all' ? 'Todos los Períodos' : 
                 getDateFilterLabel(effectiveDateFilter)}
              </p>
            </div>
          </div>
          <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {formatCurrency(metrics.transferRevenue)}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {(metrics.cashRevenue + metrics.transferRevenue) > 0 ? ((metrics.transferRevenue / (metrics.cashRevenue + metrics.transferRevenue)) * 100).toFixed(1) : 0}% del total
          </p>
        </div>

        {/* Crédito o Facturas Anuladas - Depende del rol */}
        {user && user.role !== 'vendedor' && user.role !== 'Vendedor' ? (
          isSuperAdmin ? (
            // Facturas Anuladas para Super Admin
            <div 
              onClick={() => setShowCancelledModal(true)}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 md:p-6 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-1.5 bg-[#fce4f0] dark:bg-[#f29fc8]/20 rounded-lg">
                  <XCircle className="h-3.5 w-3.5 text-[#d06a98] dark:text-[#f29fc8]" />
                </div>
                <div className="text-right">
                  <span className="text-xs md:text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Facturas Anuladas</span>
                  <p className="text-[10px] md:text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {effectiveDateFilter === 'today' ? 'Hoy' : 
                     effectiveDateFilter === 'all' ? 'Todos los Períodos' : 
                     getDateFilterLabel(effectiveDateFilter)}
                  </p>
                </div>
              </div>
              <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {metrics.cancelledSales}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                de {metrics.totalSales} ventas totales
              </p>
            </div>
          ) : (
            // Crédito para Admin (no Super Admin)
            <div 
              onClick={() => router.push('/payments')}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 md:p-6 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-1.5 bg-[#fce4f0] dark:bg-[#f29fc8]/20 rounded-lg">
                  <CreditCard className="h-3.5 w-3.5 text-[#d06a98] dark:text-[#f29fc8]" />
                </div>
                <div className="text-right">
                  <span className="text-xs md:text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Crédito</span>
                  <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-0.5">
                    {effectiveDateFilter === 'today' ? 'Hoy' : 
                     effectiveDateFilter === 'all' ? 'Todos los Períodos' : 
                     getDateFilterLabel(effectiveDateFilter)}
                  </p>
                </div>
              </div>
              <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {formatCurrency(metrics.creditRevenue)}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {filteredData.credits.filter((c: any) => (c.status === 'pending' || c.status === 'partial') && (c.pendingAmount || 0) > 0).length} créditos pendientes
              </p>
            </div>
          )
        ) : null}

        {/* Total Egresos - 4º card para vendedor (misma fila: Ingresos, Efectivo, Transferencia, Egresos) */}
        {isVendedor && (
          <div 
            onClick={() => router.push('/egresos')}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 md:p-6 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-1.5 bg-[#fce4f0] dark:bg-[#f29fc8]/20 rounded-lg">
                <Wallet className="h-3.5 w-3.5 text-[#d06a98] dark:text-[#f29fc8]" />
              </div>
              <div className="text-right">
                <span className="text-xs md:text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Total Egresos</span>
                <p className="text-[10px] md:text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {effectiveDateFilter === 'today' ? 'Hoy' : 
                   effectiveDateFilter === 'all' ? 'Todos los Períodos' : 
                   getDateFilterLabel(effectiveDateFilter)}
                </p>
              </div>
            </div>
            <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {formatCurrency(metrics.totalExpenses)}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Gastos registrados en el período
            </p>
          </div>
        )}
      </div>

      {/* Segunda fila de métricas - Solo para Super Admin */}
      {isSuperAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-10 items-stretch">
          {/* Total Egresos */}
          <div 
            onClick={() => router.push('/egresos')}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 md:p-6 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-1.5 bg-[#fce4f0] dark:bg-[#f29fc8]/20 rounded-lg">
                <Wallet className="h-3.5 w-3.5 text-[#d06a98] dark:text-[#f29fc8]" />
              </div>
              <div className="text-right">
                <span className="text-xs md:text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Total Egresos</span>
                <p className="text-[10px] md:text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {effectiveDateFilter === 'today' ? 'Hoy' : 
                   effectiveDateFilter === 'all' ? 'Todos los Períodos' : 
                   getDateFilterLabel(effectiveDateFilter)}
                </p>
              </div>
            </div>
            <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {formatCurrency(metrics.totalExpenses)}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Gastos registrados en el período
            </p>
          </div>

          {/* Ganancia Bruta */}
          <div 
            onClick={() => router.push('/sales')}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 md:p-6 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col h-full"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-1.5 bg-[#fce4f0] dark:bg-[#f29fc8]/20 rounded-lg">
                <TrendingUp className="h-3.5 w-3.5 text-[#d06a98] dark:text-[#f29fc8]" />
              </div>
              <div className="text-right">
                <span className="text-xs md:text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Ganancia Bruta</span>
                <p className="text-[10px] md:text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {effectiveDateFilter === 'today' ? 'Hoy' : 
                   effectiveDateFilter === 'all' ? 'Todos los Períodos' : 
                   getDateFilterLabel(effectiveDateFilter)}
                </p>
              </div>
            </div>
            <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {formatCurrency(metrics.grossProfit)}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
              Beneficio real (sin IVA)
            </p>
            {/* Desglose */}
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-1">
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>IVA recaudado (DIAN):</span>
                <span>{formatCurrency(metrics.ivaRecaudado)}</span>
              </div>
            </div>
          </div>

          {/* Inversión en Stock */}
          <div 
            onClick={() => router.push('/inventory/products')}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 md:p-6 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col h-full"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-1.5 bg-[#fce4f0] dark:bg-[#f29fc8]/20 rounded-lg">
                <Package className="h-3.5 w-3.5 text-[#d06a98] dark:text-[#f29fc8]" />
              </div>
              <div className="text-right">
                <span className="text-xs md:text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Inversión en Stock</span>
              </div>
            </div>
            <p className="text-xl md:text-2xl font-bold text-[#d06a98] dark:text-[#f29fc8] mb-1">
              {formatCurrency(metrics.totalStockInvestment > 0 ? metrics.totalStockInvestment : metrics.potentialInvestment)}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Dinero invertido en productos (costo con IVA)
            </p>
          </div>

          {/* Placeholder para mantener la grilla alineada */}
          <div className="bg-white/60 dark:bg-gray-800/40 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-4 md:p-6 shadow-sm flex items-center justify-center text-xs text-gray-400 dark:text-gray-500">
            —
          </div>
        </div>
      )}

      {/* Gráficos y estadísticas mejoradas */}
      <div className="space-y-4 md:space-y-6 mb-6 md:mb-8">
        {/* Tendencia de Ingresos - Dinámica según filtros */}
        {isSuperAdmin && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 md:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#fce4f0] dark:bg-[#f29fc8]/30 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-[#f29fc8] dark:text-[#f29fc8]" />
                </div>
                <div>
                  <h3 className="text-sm md:text-base font-bold text-gray-900 dark:text-white">Tendencia de Ingresos</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {effectiveDateFilter === 'all' ? 'Por mes' : 'Últimos 15 días'}
                  </p>
                </div>
              </div>
            </div>
            <div className="h-[250px] md:h-[300px]">
              {(() => {
                // Si es anual, mostrar por mes
                if (effectiveDateFilter === 'all') {
                  // Agrupar datos por mes
                  const monthlyData: { [key: string]: number } = {}
                  
                  filteredData.sales.forEach((sale: Sale) => {
                    if (sale.status !== 'cancelled') {
                      const saleDate = new Date(sale.createdAt)
                      const monthKey = saleDate.toLocaleDateString('es-CO', { 
                        month: 'short',
                        year: 'numeric'
                      })
                      
                      if (!monthlyData[monthKey]) {
                        monthlyData[monthKey] = 0
                      }
                      
                      // Sumar efectivo y transferencia
                      if (sale.paymentMethod === 'cash' || sale.paymentMethod === 'transfer') {
                        monthlyData[monthKey] += sale.total || 0
                      } else if (sale.paymentMethod === 'mixed' && sale.payments) {
                        sale.payments.forEach(payment => {
                          if (payment.paymentType === 'cash' || payment.paymentType === 'transfer') {
                            monthlyData[monthKey] += payment.amount || 0
                          }
                        })
                      }
                    }
                  })
                  
                  // Agregar abonos de créditos
                  filteredData.paymentRecords.forEach((payment: any) => {
                    if (payment.status !== 'cancelled' && (payment.paymentMethod === 'cash' || payment.paymentMethod === 'transfer')) {
                      const paymentDate = new Date(payment.paymentDate)
                      const monthKey = paymentDate.toLocaleDateString('es-CO', { 
                        month: 'short',
                        year: 'numeric'
                      })
                      
                      if (!monthlyData[monthKey]) {
                        monthlyData[monthKey] = 0
                      }
                      monthlyData[monthKey] += payment.amount || 0
                    }
                  })
                  
                  // Convertir a array y ordenar por fecha
                  const monthlyArray = Object.entries(monthlyData)
                    .map(([month, amount]) => ({
                      date: month,
                      amount,
                      count: 0,
                      average: 0
                    }))
                    .sort((a, b) => {
                      const dateA = new Date(a.date)
                      const dateB = new Date(b.date)
                      return dateA.getTime() - dateB.getTime()
                    })
                  
                  // Colores adaptativos para modo oscuro
                  const gridColor = isDarkMode ? '#111827' : '#f0f0f0' // Grid casi invisible en modo oscuro
                  const axisColor = isDarkMode ? '#6b7280' : '#666'
                  const lineColor = isDarkMode ? '#f29fc8' : '#d06a98' // Rosa de la marca
                  const dotStrokeColor = isDarkMode ? '#111827' : '#fff'
                  const tooltipBg = isDarkMode ? '#1f2937' : 'white'
                  const tooltipBorder = isDarkMode ? '#374151' : '#e5e7eb'
                  const tooltipText = isDarkMode ? '#f3f4f6' : '#111827'
                  
                  return monthlyArray.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyArray}>
                        <CartesianGrid 
                          strokeDasharray="3 3" 
                          stroke={gridColor} 
                          strokeOpacity={isDarkMode ? 0.3 : 1}
                        />
                        <XAxis 
                          dataKey="date" 
                          stroke={axisColor}
                          fontSize={12}
                          tick={{ fontSize: 12, fill: axisColor }}
                        />
                        <YAxis 
                          stroke={axisColor}
                          fontSize={12}
                          tick={{ fontSize: 12, fill: axisColor }}
                          tickFormatter={(value) => {
                            if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
                            if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`
                            return `$${value}`
                          }}
                        />
                        <Tooltip 
                          formatter={(value: number) => [
                            new Intl.NumberFormat('es-CO', { 
                              style: 'currency', 
                              currency: 'COP',
                              minimumFractionDigits: 0 
                            }).format(value),
                            'Ingresos'
                          ]}
                          contentStyle={{ 
                            backgroundColor: tooltipBg, 
                            border: `1px solid ${tooltipBorder}`,
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            color: tooltipText
                          }}
                          labelStyle={{ color: tooltipText }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="amount" 
                          stroke={lineColor} 
                          strokeWidth={3}
                          dot={{ fill: lineColor, r: 5, strokeWidth: 2, stroke: dotStrokeColor }}
                          activeDot={{ r: 7, fill: lineColor }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-sm text-gray-500 dark:text-gray-400">No hay datos disponibles</p>
                    </div>
                  )
                }
                
                // Para fecha específica o hoy: últimos 15 días
                const getDateKey = (dateInput: Date | string): string => {
                  const date = new Date(dateInput)
                  const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
                  return normalizedDate.toLocaleDateString('es-CO', { 
                    weekday: 'short',
                    day: '2-digit', 
                    month: '2-digit' 
                  })
                }
                
                // Determinar la fecha de referencia
                let referenceDate: Date
                if (effectiveDateFilter === 'range' && rangeStart) {
                  referenceDate = new Date(rangeStart)
                } else {
                  referenceDate = new Date()
                }
                referenceDate.setHours(0, 0, 0, 0)
                
                // Generar las 15 fechas desde la fecha de referencia hacia atrás (incluyendo la fecha de referencia)
                const last15Days: Date[] = []
                for (let i = 0; i < 15; i++) {
                  const date = new Date(referenceDate)
                  date.setDate(date.getDate() - i)
                  last15Days.push(date)
                }
                
                // Invertir para que el más antiguo esté primero
                last15Days.reverse()
                
                // Calcular ingresos por día desde TODOS los datos (no filteredData)
                // porque filteredData solo tiene el día seleccionado, pero necesitamos los 15 días
                const dailyData: { [key: string]: number } = {}
                
                // Inicializar todos los días con 0
                last15Days.forEach(date => {
                  const dateKey = getDateKey(date)
                  dailyData[dateKey] = 0
                })
                
                // Crear un Set de timestamps para verificación rápida
                const dayTimestamps = new Set<number>()
                last15Days.forEach(day => {
                  const dayStart = new Date(day)
                  dayStart.setHours(0, 0, 0, 0)
                  dayTimestamps.add(dayStart.getTime())
                })
                
                // Obtener el storeId actual para filtrar ventas
                const currentStoreId = getCurrentUserStoreId()
                const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
                
                // Sumar ventas desde allSales (todos los datos)
                // IMPORTANTE: Filtrar por store_id para micro tiendas
                allSales.forEach((sale: Sale) => {
                  // Filtrar por store_id si es una micro tienda
                  if (currentStoreId && currentStoreId !== MAIN_STORE_ID) {
                    if (sale.storeId !== currentStoreId) {
                      return // Saltar ventas de otras tiendas
                    }
                  }
                  
                  if (sale.status !== 'cancelled') {
                    const saleDate = new Date(sale.createdAt)
                    saleDate.setHours(0, 0, 0, 0)
                    
                    // Verificar si la venta está en el rango de los últimos 15 días
                    if (dayTimestamps.has(saleDate.getTime())) {
                      const dateKey = getDateKey(saleDate)
                      
                      // Sumar efectivo y transferencia
                      if (sale.paymentMethod === 'cash' || sale.paymentMethod === 'transfer') {
                        dailyData[dateKey] = (dailyData[dateKey] || 0) + (sale.total || 0)
                      } else if (sale.paymentMethod === 'mixed' && sale.payments) {
                        sale.payments.forEach(payment => {
                          if (payment.paymentType === 'cash' || payment.paymentType === 'transfer') {
                            dailyData[dateKey] = (dailyData[dateKey] || 0) + (payment.amount || 0)
                          }
                        })
                      }
                    }
                  }
                })
                
                // Obtener el storeId actual para filtrar pagos
                // (ya está definido arriba, pero lo reutilizamos)
                
                // Sumar abonos de créditos desde allPaymentRecords
                // IMPORTANTE: Filtrar por store_id para micro tiendas
                allPaymentRecords.forEach((payment: any) => {
                  // Filtrar por store_id si es una micro tienda
                  if (currentStoreId && currentStoreId !== MAIN_STORE_ID) {
                    // Los pagos pueden tener storeId en el crédito asociado
                    // Por ahora, si el pago no tiene storeId, asumimos que es de la tienda principal
                    // y lo excluimos para micro tiendas
                    if (payment.storeId && payment.storeId !== currentStoreId) {
                      return // Saltar pagos de otras tiendas
                    }
                    // Si no tiene storeId, probablemente es de la tienda principal, saltarlo
                    if (!payment.storeId) {
                      return
                    }
                  }
                  
                  if (payment.status !== 'cancelled' && (payment.paymentMethod === 'cash' || payment.paymentMethod === 'transfer')) {
                    const paymentDate = new Date(payment.paymentDate)
                    paymentDate.setHours(0, 0, 0, 0)
                    
                    // Verificar si el pago está en el rango
                    if (dayTimestamps.has(paymentDate.getTime())) {
                      const dateKey = getDateKey(paymentDate)
                      dailyData[dateKey] = (dailyData[dateKey] || 0) + (payment.amount || 0)
                    }
                  }
                })
                
                // Convertir a array ordenado
                const chartData = last15Days.map(date => {
                  const dateKey = getDateKey(date)
                  return {
                    date: dateKey,
                    amount: dailyData[dateKey] || 0,
                    count: 0,
                    average: 0
                  }
                })
                
                // Colores adaptativos para modo oscuro
                const gridColor = isDarkMode ? '#374151' : '#e5e7eb' // Grid más visible
                const axisColor = isDarkMode ? '#9ca3af' : '#666'
                const lineColor = isDarkMode ? '#f29fc8' : '#d06a98' // Rosa de la marca
                const dotStrokeColor = isDarkMode ? '#111827' : '#fff'
                const tooltipBg = isDarkMode ? '#1f2937' : 'white'
                const tooltipBorder = isDarkMode ? '#374151' : '#e5e7eb'
                const tooltipText = isDarkMode ? '#f3f4f6' : '#111827'
                
                return chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                    <CartesianGrid 
                      strokeDasharray="3 3" 
                      stroke={gridColor} 
                      strokeOpacity={isDarkMode ? 0.5 : 0.8}
                    />
                    <XAxis 
                      dataKey="date" 
                      stroke={axisColor}
                      fontSize={10}
                      tick={{ fontSize: 10, fill: axisColor }}
                    />
                    <YAxis 
                      stroke={axisColor}
                      fontSize={10}
                      tick={{ fontSize: 10, fill: axisColor }}
                      tickFormatter={(value) => {
                        if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
                        if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`
                        return `$${value}`
                      }}
                    />
                    <Tooltip 
                      formatter={(value: number) => [
                        new Intl.NumberFormat('es-CO', { 
                          style: 'currency', 
                          currency: 'COP',
                          minimumFractionDigits: 0 
                        }).format(value),
                        'Ingresos'
                      ]}
                      contentStyle={{ 
                        backgroundColor: tooltipBg, 
                        border: `1px solid ${tooltipBorder}`,
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        color: tooltipText
                      }}
                      labelStyle={{ color: tooltipText }}
                    />
                      <Line 
                        type="monotone" 
                        dataKey="amount" 
                        stroke={lineColor} 
                        strokeWidth={3}
                        dot={{ fill: lineColor, r: 5, strokeWidth: 2, stroke: dotStrokeColor }}
                        activeDot={{ r: 7, fill: lineColor }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-sm text-gray-500 dark:text-gray-400">No hay datos disponibles</p>
                  </div>
                )
              })()}
            </div>
          </div>
        )}

        {/* Gráficas lado a lado */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Top Productos Más Rentables */}
          {isSuperAdmin && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 md:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#fce4f0] dark:bg-[#f29fc8]/20 rounded-lg">
                    <Package className="h-4 w-4 text-[#d06a98] dark:text-[#f29fc8]" />
                  </div>
                  <div>
                    <h3 className="text-sm md:text-base font-bold text-gray-900 dark:text-white">Productos Más Rentables</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Por ganancia generada</p>
                  </div>
                </div>
              </div>
              <div className="h-[250px] md:h-[300px]">
                {(() => {
                  // Calcular ganancia por producto
                  const productProfits: { [key: string]: { name: string; profit: number; sales: number } } = {}
                  
                  // Usar allProducts del estado
                  const productsMap = new Map(allProducts.map(p => [p.id, p]))
                  
                  filteredData.sales.forEach((sale: Sale) => {
                    if (sale.status !== 'cancelled' && sale.items) {
                      sale.items.forEach((item) => {
                        const productName = item.productName || 'Producto desconocido'
                        const product = productsMap.get(item.productId)
                        // Usar costo SIN IVA
                        const costSinIva = product?.costBeforeTax || Math.round((product?.cost || 0) / 1.19)
                        const unitPrice = item.unitPrice || 0
                        const quantity = item.quantity || 0
                        
                        // Calcular precio real después de descuentos (con IVA)
                        const baseTotal = quantity * unitPrice
                        const discountAmount = item.discountType === 'percentage' 
                          ? (baseTotal * (item.discount || 0)) / 100 
                          : (item.discount || 0)
                        const salePriceAfterDiscount = Math.max(0, baseTotal - discountAmount)
                        // Convertir a SIN IVA
                        const salePriceSinIva = Math.round(salePriceAfterDiscount / 1.19)
                        const realUnitPriceSinIva = quantity > 0 ? salePriceSinIva / quantity : 0
                        
                        // Ganancia = (precio SIN IVA - costo SIN IVA) * cantidad
                        const profit = (realUnitPriceSinIva - costSinIva) * quantity
                        
                        if (!productProfits[productName]) {
                          productProfits[productName] = { name: productName, profit: 0, sales: 0 }
                        }
                        productProfits[productName].profit += profit
                        productProfits[productName].sales += 1
                      })
                    }
                  })
                  
                  const topProducts = Object.values(productProfits)
                    .filter(p => p.profit > 0) // Solo productos con ganancia positiva
                    .sort((a, b) => b.profit - a.profit)
                    .slice(0, 5)
                  
                  return topProducts.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        layout="vertical"
                        data={topProducts.map(p => ({ name: p.name, profit: p.profit }))}
                        margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                      >
                        <defs>
                          <linearGradient id="colorProfit" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="5%" stopColor="#d06a98" stopOpacity={0.9}/>
                            <stop offset="95%" stopColor="#c55a88" stopOpacity={0.7}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                        <XAxis 
                          type="number"
                          stroke="#666"
                          fontSize={11}
                          tick={{ fontSize: 11 }}
                          tickFormatter={(value) => {
                            if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
                            if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`
                            return `$${value}`
                          }}
                        />
                        <YAxis 
                          type="category"
                          dataKey="name"
                          stroke="#666"
                          fontSize={11}
                          tick={{ fontSize: 11 }}
                          width={140}
                          tickFormatter={(value) => value.length > 22 ? value.slice(0, 22) + '…' : value}
                        />
                        <Tooltip 
                          formatter={(value: number) => [
                            new Intl.NumberFormat('es-CO', { 
                              style: 'currency', 
                              currency: 'COP',
                              minimumFractionDigits: 0 
                            }).format(value),
                            'Ganancia'
                          ]}
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                          labelFormatter={(label) => label}
                        />
                        <Bar 
                          dataKey="profit" 
                          fill="url(#colorProfit)" 
                          radius={[0, 4, 4, 0]}
                          stroke="#c55a88"
                          strokeWidth={1}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-sm text-gray-500">No hay datos disponibles</p>
                    </div>
                  )
                })()}
              </div>
            </div>
          )}

          {/* Ingresos por Método de Pago */}
          {isSuperAdmin && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 md:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#fce4f0] dark:bg-[#f29fc8]/20 rounded-lg">
                    <CreditCard className="h-4 w-4 text-[#d06a98] dark:text-[#f29fc8]" />
                  </div>
                  <div>
                    <h3 className="text-sm md:text-base font-bold text-gray-900 dark:text-white">Ingresos por Método de Pago</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Efectivo, Transferencia y Mixto</p>
                  </div>
                </div>
              </div>
              <div className="h-[250px] md:h-[300px]">
                {(() => {
                  // Calcular ingresos por método de pago
                  let efectivoTotal = 0
                  let transferenciaTotal = 0
                  let mixtoTotal = 0
                  
                  filteredData.sales.forEach((sale: Sale) => {
                    if (sale.status !== 'cancelled') {
                      if (sale.paymentMethod === 'cash') {
                        efectivoTotal += sale.total || 0
                      } else if (sale.paymentMethod === 'transfer') {
                        transferenciaTotal += sale.total || 0
                      } else if (sale.paymentMethod === 'mixed' && sale.payments) {
                        sale.payments.forEach(payment => {
                          if (payment.paymentType === 'cash') {
                            efectivoTotal += payment.amount || 0
                          } else if (payment.paymentType === 'transfer') {
                            transferenciaTotal += payment.amount || 0
                          }
                        })
                        mixtoTotal += sale.total || 0
                      }
                    }
                  })
                  
                  // Agregar abonos de créditos
                  filteredData.paymentRecords.forEach((payment: any) => {
                    if (payment.status !== 'cancelled') {
                      if (payment.paymentMethod === 'cash') {
                        efectivoTotal += payment.amount || 0
                      } else if (payment.paymentMethod === 'transfer') {
                        transferenciaTotal += payment.amount || 0
                      }
                    }
                  })
                  
                  const paymentData = [
                    { name: 'Efectivo', value: efectivoTotal, color: '#f29fc8' },
                    { name: 'Transferencia', value: transferenciaTotal, color: '#3B82F6' },
                    { name: 'Mixto', value: mixtoTotal, color: '#F59E0B' }
                  ].filter(item => item.value > 0)
                  
                  return paymentData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={paymentData}
                        margin={{ top: 10, right: 10, left: 5, bottom: 5 }}
                      >
                        <defs>
                          <linearGradient id="colorEfectivo" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f29fc8" stopOpacity={0.9}/>
                            <stop offset="95%" stopColor="#d06a98" stopOpacity={0.7}/>
                          </linearGradient>
                          <linearGradient id="colorTransferencia" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.9}/>
                            <stop offset="95%" stopColor="#2563EB" stopOpacity={0.7}/>
                          </linearGradient>
                          <linearGradient id="colorMixto" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.9}/>
                            <stop offset="95%" stopColor="#D97706" stopOpacity={0.7}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis 
                          dataKey="name"
                          stroke="#666"
                          fontSize={11}
                          tick={{ fontSize: 11 }}
                        />
                        <YAxis 
                          stroke="#666"
                          fontSize={11}
                          tick={{ fontSize: 11 }}
                          tickFormatter={(value) => {
                            if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
                            if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`
                            return `$${value}`
                          }}
                        />
                        <Tooltip 
                          formatter={(value: number) => [
                            new Intl.NumberFormat('es-CO', { 
                              style: 'currency', 
                              currency: 'COP',
                              minimumFractionDigits: 0 
                            }).format(value),
                            'Ingresos'
                          ]}
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                        <Bar 
                          dataKey="value" 
                          radius={[4, 4, 0, 0]}
                          strokeWidth={1}
                        >
                          {paymentData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.name === 'Efectivo' ? 'url(#colorEfectivo)' : 
                                    entry.name === 'Transferencia' ? 'url(#colorTransferencia)' : 
                                    'url(#colorMixto)'}
                              stroke={entry.color}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-sm text-gray-500">No hay datos disponibles</p>
                    </div>
                  )
                })()}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Modal de Facturas Anuladas - Disponible para todos */}
        <CancelledInvoicesModal
          isOpen={showCancelledModal}
          onClose={() => setShowCancelledModal(false)}
          sales={filteredData.sales}
          allSales={allSales}
        />
        <MonthlyClosingModal
          isOpen={showMonthlyClosingModal}
          onClose={() => setShowMonthlyClosingModal(false)}
        />
    </div>
    </RoleProtectedRoute>
  )
}
