import type { Expense } from '@/types'

/** Base del egreso comparable a ganancia bruta (sin IVA): factura gravada → ÷ 1,19; si no, monto íntegro. */
export function expenseAmountForNetProfitComparison(
  expense: Pick<Expense, 'amount' | 'includesVat'>
): number {
  const amt = Math.round(expense.amount || 0)
  if (expense.includesVat) {
    return Math.round(amt / 1.19)
  }
  return amt
}

export function sumExpensesForNetProfit(expenses: Expense[]): number {
  return expenses.reduce((s, e) => s + expenseAmountForNetProfitComparison(e), 0)
}
