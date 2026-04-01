'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { X, TrendingDown, TrendingUp, Package, Plus, Wallet } from 'lucide-react'
import { Sale, Expense, Product, Credit } from '@/types'
import { SalesService } from '@/lib/sales-service'
import { ExpensesService } from '@/lib/expenses-service'
import { CreditsService } from '@/lib/credits-service'
import { ProductsService } from '@/lib/products-service'
import { getCurrentUserStoreId } from '@/lib/store-helper'
import { sumExpensesForNetProfit } from '@/lib/expense-net-profit'
import { useAuth } from '@/contexts/auth-context'
import { toast } from 'sonner'

const CIERRE_CATEGORY = 'Cierre de caja mensual'

/** Misma lógica que el dashboard: margen por ítem (precio de venta sin IVA − costo sin IVA). */
function computeGrossProfitForPeriod(activeSales: Sale[], allProducts: Product[], allCredits: Credit[]): number {
  return activeSales.reduce((totalProfit, sale) => {
    if (sale.paymentMethod === 'credit') {
      const associatedCredit = allCredits.find((c) => c.saleId === sale.id)
      if (!associatedCredit || associatedCredit.status !== 'completed') {
        return totalProfit
      }
    }

    if (!sale.items) return totalProfit

    const saleProfit = sale.items.reduce((itemProfit, item) => {
      const product = allProducts.find((p) => p.id === item.productId)
      const costSinIva = product?.costBeforeTax || Math.round((product?.cost || 0) / 1.19)

      const baseTotal = item.quantity * item.unitPrice
      const discountAmount =
        item.discountType === 'percentage'
          ? (baseTotal * (item.discount || 0)) / 100
          : item.discount || 0
      const salePriceAfterDiscount = Math.max(0, baseTotal - discountAmount)
      const salePriceSinIva = Math.round(salePriceAfterDiscount / 1.19)
      const realUnitPriceSinIva = item.quantity > 0 ? salePriceSinIva / item.quantity : 0
      const itemGrossProfit = (realUnitPriceSinIva - costSinIva) * item.quantity

      return itemProfit + itemGrossProfit
    }, 0)

    return totalProfit + saleProfit
  }, 0)
}

interface MonthlyClosingModalProps {
  isOpen: boolean
  onClose: () => void
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
}

export function MonthlyClosingModal({ isOpen, onClose }: MonthlyClosingModalProps) {
  const { user } = useAuth()
  const today = new Date()
  const maxSelectableDate = endOfDay(today)
  const [closeUntilDate, setCloseUntilDate] = useState<Date>(maxSelectableDate)
  const [sales, setSales] = useState<Sale[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [paymentRecords, setPaymentRecords] = useState<any[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [credits, setCredits] = useState<Credit[]>([])
  const [loading, setLoading] = useState(false)

  const [showAddExpense, setShowAddExpense] = useState(false)
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseNotes, setExpenseNotes] = useState('')
  const [finalExpensePaymentMethod, setFinalExpensePaymentMethod] = useState<'cash' | 'transfer'>('transfer')
  const [finalExpenseIncludesVat, setFinalExpenseIncludesVat] = useState(false)
  const [savingExpense, setSavingExpense] = useState(false)

  const loadData = useCallback(async () => {
    if (!isOpen) return
    setLoading(true)
    try {
      const startOfMonth = new Date(closeUntilDate.getFullYear(), closeUntilDate.getMonth(), 1, 0, 0, 0, 0)
      const endOfDay = new Date(closeUntilDate.getFullYear(), closeUntilDate.getMonth(), closeUntilDate.getDate(), 23, 59, 59, 999)

      const [salesRes, expensesRes, paymentsRes, productsRes, creditsRes] = await Promise.all([
        SalesService.getDashboardSales(startOfMonth, endOfDay),
        ExpensesService.getExpensesByDateRange(startOfMonth, endOfDay),
        CreditsService.getPaymentRecordsByDateRange(startOfMonth, endOfDay),
        ProductsService.getAllProductsLegacy(getCurrentUserStoreId()),
        CreditsService.getAllCredits(),
      ])

      setSales(salesRes || [])
      setExpenses(expensesRes || [])
      setPaymentRecords(paymentsRes || [])
      setProducts(productsRes || [])
      setCredits(creditsRes || [])
    } catch (e) {
      toast.error('Error al cargar datos del cierre')
      setSales([])
      setExpenses([])
      setPaymentRecords([])
      setProducts([])
      setCredits([])
    } finally {
      setLoading(false)
    }
  }, [isOpen, closeUntilDate])

  useEffect(() => {
    loadData()
  }, [loadData])

  const storeId = getCurrentUserStoreId()
  const activeSales = sales.filter((s) => s.status !== 'cancelled' && s.status !== 'draft')
  const activeExpenses = expenses.filter((e) => e.status !== 'cancelled')
  const storeExpenses = storeId ? activeExpenses.filter((e) => !e.storeId || e.storeId === storeId) : activeExpenses
  const validPayments = paymentRecords.filter((p) => p.status !== 'cancelled')

  let cashEntrante = 0
  let transferEntrante = 0
  activeSales.forEach((sale) => {
    if (sale.payments && sale.payments.length > 0) {
      sale.payments.forEach((p) => {
        if (p.paymentType === 'cash') cashEntrante += p.amount || 0
        else if (p.paymentType === 'transfer') transferEntrante += p.amount || 0
      })
    } else {
      if (sale.paymentMethod === 'cash') cashEntrante += sale.total
      else if (sale.paymentMethod === 'transfer') transferEntrante += sale.total
    }
  })
  validPayments.filter((p) => p.paymentMethod === 'cash').forEach((p) => (cashEntrante += p.amount || 0))
  validPayments.filter((p) => p.paymentMethod === 'transfer').forEach((p) => (transferEntrante += p.amount || 0))

  const totalEgresosEfectivo = storeExpenses
    .filter((e) => e.paymentMethod === 'cash')
    .reduce((s, e) => s + (e.amount || 0), 0)
  const totalEgresosTransferencia = storeExpenses
    .filter((e) => e.paymentMethod === 'transfer')
    .reduce((s, e) => s + (e.amount || 0), 0)

  const cashNetoCaja = cashEntrante - totalEgresosEfectivo
  const transferNetoCaja = transferEntrante - totalEgresosTransferencia

  const totalDeliveryFees = activeSales.reduce((sum, s) => sum + (s.isDelivery && s.deliveryFee ? s.deliveryFee : 0), 0)
  // Igual que el dashboard (rango de fechas): efectivo/transf netos de egresos − domicilios
  const totalIngresos = cashNetoCaja + transferNetoCaja - totalDeliveryFees

  const baseSinIvaIngresos = Math.round(totalIngresos / 1.19)
  const ivaRecaudadoIngresos = totalIngresos - baseSinIvaIngresos

  const totalEgresos = storeExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
  const egresosParaUtilidad = sumExpensesForNetProfit(storeExpenses)

  const gananciaBruta = computeGrossProfitForPeriod(activeSales, products, credits)
  const utilidadNeta = gananciaBruta - egresosParaUtilidad

  const unidadesVendidas = activeSales.reduce((sum, s) => sum + (s.items?.reduce((s2, i) => s2 + i.quantity, 0) || 0), 0)

  const handleAddFinalExpense = async () => {
    const amount = Number(expenseAmount.replace(/\D/g, ''))
    if (!amount || amount <= 0) {
      toast.error('Ingresa un monto válido')
      return
    }
    setSavingExpense(true)
    try {
      const lastDayOfMonth = new Date(closeUntilDate.getFullYear(), closeUntilDate.getMonth() + 1, 0)
      const dateStr = lastDayOfMonth.toISOString().split('T')[0]
      const created = await ExpensesService.createExpense(
        {
          storeId: storeId || undefined,
          category: CIERRE_CATEGORY,
          amount,
          date: dateStr,
          paymentMethod: finalExpensePaymentMethod,
          includesVat: finalExpenseIncludesVat,
          notes: expenseNotes.trim() || `Egreso final del mes (cierre de caja)`,
        },
        user?.id
      )
      if (created) {
        toast.success('Egreso de cierre agregado')
        setExpenseAmount('')
        setExpenseNotes('')
        setShowAddExpense(false)
        loadData()
      } else {
        toast.error('No se pudo guardar el egreso')
      }
    } catch {
      toast.error('Error al guardar')
    } finally {
      setSavingExpense(false)
    }
  }

  const startOfMonth = new Date(closeUntilDate.getFullYear(), closeUntilDate.getMonth(), 1)
  const periodLabel = `${startOfMonth.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })} – ${closeUntilDate.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}`

  const handleCloseUntilSelect = (d: Date | null) => {
    if (!d) {
      setCloseUntilDate(maxSelectableDate)
      return
    }
    const picked = endOfDay(d)
    setCloseUntilDate(picked > maxSelectableDate ? maxSelectableDate : picked)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-gray-200 dark:border-gray-700 overflow-visible">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 px-6 sm:px-8 pt-6 shrink-0 border-b border-gray-200 dark:border-gray-700 rounded-t-2xl">
          <CardTitle className="flex items-center gap-3 text-2xl text-gray-900 dark:text-white">
            <Wallet className="h-7 w-7 text-[#f29fc8]" />
            Cierre de caja mensual
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-9 w-9 shrink-0">
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>

        <div className="px-6 sm:px-8 py-4 shrink-0 border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40 overflow-visible">
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3 sm:gap-4">
            <div className="flex flex-col gap-1.5 min-w-0 sm:min-w-[200px]">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Ver cierre hasta</span>
              <DatePicker
                selectedDate={closeUntilDate}
                onDateSelect={handleCloseUntilSelect}
                placeholder="Seleccionar fecha"
                maxDate={today}
                dropdownAlign="start"
                className="w-full sm:w-44 text-sm"
              />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 sm:pb-2">
              <span className="font-medium text-gray-800 dark:text-gray-200">Periodo:</span> {periodLabel}
            </p>
          </div>
        </div>

        <CardContent className="flex-1 min-h-0 overflow-y-auto px-6 sm:px-8 py-6 space-y-6 rounded-b-2xl">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-[#f29fc8] border-t-transparent" />
            </div>
          ) : (
            <>
              <Card className="bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700">
                <CardContent className="pt-5 sm:pt-6 px-4 sm:px-6 pb-5 space-y-4">
                  <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white/60 dark:bg-gray-800/40 p-4 space-y-2">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Desglose de caja</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                      Lo que entró por ventas y abonos no es el ingreso final: los egresos pagados en efectivo o transferencia se restan igual que en el dashboard.
                    </p>
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                      <span>Ventas y abonos en efectivo</span>
                      <span className="tabular-nums font-medium text-gray-900 dark:text-white">{formatCurrency(cashEntrante)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                      <span>Ventas y abonos en transferencia</span>
                      <span className="tabular-nums font-medium text-gray-900 dark:text-white">{formatCurrency(transferEntrante)}</span>
                    </div>
                    {totalEgresosEfectivo > 0 && (
                      <div className="flex justify-between text-sm text-red-600 dark:text-red-400">
                        <span>Egresos pagados en efectivo</span>
                        <span className="tabular-nums font-medium">− {formatCurrency(totalEgresosEfectivo)}</span>
                      </div>
                    )}
                    {totalEgresosTransferencia > 0 && (
                      <div className="flex justify-between text-sm text-red-600 dark:text-red-400">
                        <span>Egresos pagados en transferencia</span>
                        <span className="tabular-nums font-medium">− {formatCurrency(totalEgresosTransferencia)}</span>
                      </div>
                    )}
                    {totalDeliveryFees > 0 && (
                      <div className="flex justify-between text-sm text-amber-700 dark:text-amber-400">
                        <span>Domicilios (no es ingreso del negocio)</span>
                        <span className="tabular-nums font-medium">− {formatCurrency(totalDeliveryFees)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 pt-2 border-t border-dashed border-gray-200 dark:border-gray-600">
                      <span>Efectivo neto (después de egresos)</span>
                      <span className="tabular-nums font-medium text-gray-900 dark:text-white">{formatCurrency(cashNetoCaja)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                      <span>Transferencia neta (después de egresos)</span>
                      <span className="tabular-nums font-medium text-gray-900 dark:text-white">{formatCurrency(transferNetoCaja)}</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-start gap-4">
                      <span className="text-base text-gray-600 dark:text-gray-400">Total ingresos del periodo</span>
                      <span className="text-xl font-bold text-gray-900 dark:text-white tabular-nums">{formatCurrency(totalIngresos)}</span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                      Igual que <span className="font-medium">TOTAL INGRESOS</span> del dashboard (caja neta − domicilios, IVA incluido).
                    </p>
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mt-3 pl-1">
                      <span>Base (sin IVA)</span>
                      <span className="tabular-nums font-medium text-gray-900 dark:text-white">{formatCurrency(baseSinIvaIngresos)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 pl-1">
                      <span>IVA recaudado</span>
                      <span className="tabular-nums font-medium text-gray-900 dark:text-white">{formatCurrency(ivaRecaudadoIngresos)}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-start gap-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                    <span className="text-base text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 shrink-0" /> Ganancia bruta (sin IVA)
                    </span>
                    <span className="text-xl font-bold text-gray-900 dark:text-white tabular-nums">{formatCurrency(gananciaBruta)}</span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 -mt-2 leading-relaxed">
                    Venta sin IVA − costo sin IVA por cada producto vendido.
                  </p>

                  <div className="flex justify-between items-start gap-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                    <span className="text-base text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <TrendingDown className="h-5 w-5 shrink-0" /> Total egresos
                    </span>
                    <span className="text-xl font-bold text-red-600 dark:text-red-400 tabular-nums">- {formatCurrency(totalEgresos)}</span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 -mt-2 leading-relaxed">
                    Total restado en utilidad: <span className="font-medium">{formatCurrency(egresosParaUtilidad)}</span>{' '}
                    <span className="text-gray-500 dark:text-gray-500">(÷ 1,19 solo en egresos marcados con IVA)</span>.
                  </p>

                  <div className="flex justify-between items-start gap-4 pt-3 border-t-2 border-[#f29fc8]/30">
                    <div className="min-w-0">
                      <span className="text-base font-semibold text-gray-900 dark:text-white">Utilidad neta del periodo</span>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                        Ganancia bruta − total restado de egresos (según cada uno lleve IVA o no)
                      </p>
                    </div>
                    <span className={`text-2xl font-bold tabular-nums shrink-0 ${utilidadNeta >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {formatCurrency(utilidadNeta)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-base text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <Package className="h-5 w-5" /> Unidades vendidas
                    </span>
                    <span className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">{unidadesVendidas}</span>
                  </div>
                </CardContent>
              </Card>

              <div>
                <div className="flex items-center justify-between mb-3 gap-2">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">Egresos del mes</h3>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-[#f29fc8] border-[#f29fc8] hover:bg-[#fce4f0] dark:hover:bg-[#f29fc8]/20"
                    onClick={() => setShowAddExpense((v) => !v)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Egreso final del mes
                  </Button>
                </div>
                {showAddExpense && (
                  <Card className="mb-4 border-[#f29fc8]/40 bg-[#fce4f0]/10 dark:bg-[#f29fc8]/5">
                    <CardContent className="pt-4 space-y-3">
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Se descuenta del <span className="font-medium">efectivo</span> o de la{' '}
                        <span className="font-medium">transferencia</span> según elijas (igual que un egreso normal). Afecta utilidad neta y el TOTAL INGRESOS del dashboard.
                      </p>
                      <input
                        type="text"
                        placeholder="Monto"
                        value={expenseAmount}
                        onChange={(e) => setExpenseAmount(e.target.value.replace(/[^\d]/g, ''))}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
                      />
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Pagado con</label>
                        <Select
                          value={finalExpensePaymentMethod}
                          onValueChange={(v) => setFinalExpensePaymentMethod(v as 'cash' | 'transfer')}
                        >
                          <SelectTrigger className="h-10 rounded-lg border-gray-300 dark:border-gray-600">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="z-[400]">
                            <SelectItem value="transfer">Transferencia</SelectItem>
                            <SelectItem value="cash">Efectivo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <label className="flex items-start gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
                        <input
                          type="checkbox"
                          checked={finalExpenseIncludesVat}
                          onChange={(e) => setFinalExpenseIncludesVat(e.target.checked)}
                          className="mt-0.5 rounded border-gray-300 text-[#f29fc8] focus:ring-[#f29fc8]"
                        />
                        <span>
                          El monto <span className="font-medium">incluye IVA</span> (19%) — marcar solo si es factura o servicio gravado; nómina y pagos sin IVA, dejar sin marcar.
                        </span>
                      </label>
                      <input
                        type="text"
                        placeholder="Concepto (opcional)"
                        value={expenseNotes}
                        onChange={(e) => setExpenseNotes(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleAddFinalExpense} disabled={savingExpense} className="bg-[#f29fc8] hover:bg-[#e07ab0]">
                          {savingExpense ? 'Guardando…' : 'Agregar'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setShowAddExpense(false)}>
                          Cancelar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
                <ul className="space-y-2 max-h-56 sm:max-h-64 overflow-y-auto">
                  {storeExpenses.length === 0 ? (
                    <li className="text-sm text-gray-500 dark:text-gray-400 py-2">No hay egresos en este periodo.</li>
                  ) : (
                    storeExpenses.map((exp) => {
                      const metodo =
                        exp.paymentMethod === 'cash'
                          ? 'Efectivo'
                          : exp.paymentMethod === 'transfer'
                            ? 'Transferencia'
                            : exp.paymentMethod
                      const ivaEt = exp.includesVat ? ' · IVA' : ''
                      return (
                        <li
                          key={exp.id}
                          className="flex justify-between items-center gap-2 py-2 border-b border-gray-100 dark:border-gray-700/50 text-sm"
                        >
                          <span className="text-gray-700 dark:text-gray-300 min-w-0">
                            {exp.category} {exp.notes ? `· ${exp.notes}` : ''}
                            <span className="text-gray-500 dark:text-gray-500">
                              {' '}
                              · {metodo}
                              {ivaEt}
                            </span>
                          </span>
                          <span className="font-medium text-red-600 dark:text-red-400 shrink-0">- {formatCurrency(exp.amount)}</span>
                        </li>
                      )
                    })
                  )}
                </ul>
              </div>
            </>
          )}
        </CardContent>
      </div>
    </div>
  )
}
