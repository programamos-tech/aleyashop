import { supabase } from './supabase'
import { Expense } from '@/types'
import { AuthService } from './auth-service'

function mapRowToExpense(expense: any): Expense {
  return {
    id: expense.id,
    storeId: expense.store_id || null,
    category: expense.category,
    amount: expense.amount,
    date: expense.date,
    paymentMethod: expense.payment_method,
    notes: expense.notes || '',
    status: expense.status || 'active',
    cancelledAt: expense.cancelled_at || null,
    cancelledBy: expense.cancelled_by || null,
    cancellationReason: expense.cancellation_reason || null,
    createdAt: expense.created_at,
    updatedAt: expense.updated_at
  }
}

export class ExpensesService {
  static async getExpensesByDateRange(startDate: Date, endDate: Date): Promise<Expense[]> {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) {
        // Error silencioso en producción
        return []
      }

      return (data || []).map((expense: any) => mapRowToExpense(expense))
    } catch (error) {
      // Error silencioso en producción
      return []
    }
  }

  static async getAllExpenses(): Promise<Expense[]> {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) {
        // Error silencioso en producción
        return []
      }

      return (data || []).map((expense: any) => mapRowToExpense(expense))
    } catch (error) {
      // Error silencioso en producción
      return []
    }
  }

  static async cancelExpense(
    id: string,
    cancellationReason: string,
    currentUserId?: string
  ): Promise<boolean> {
    try {
      const reason = cancellationReason?.trim() || ''
      if (reason.length < 10) return false

      const { error } = await supabase
        .from('expenses')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by: currentUserId || null,
          cancellation_reason: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('status', 'active')

      if (error) return false

      if (currentUserId) {
        await AuthService.logActivity(
          currentUserId,
          'expense_cancel',
          'egresos',
          { description: `Egreso anulado: ${id}`, expenseId: id, reason }
        )
      }
      return true
    } catch (error) {
      return false
    }
  }

  static async createExpense(
    expenseData: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>,
    currentUserId?: string
  ): Promise<Expense | null> {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .insert({
          store_id: expenseData.storeId || null,
          category: expenseData.category,
          amount: expenseData.amount,
          date: expenseData.date,
          payment_method: expenseData.paymentMethod,
          notes: expenseData.notes || null
        })
        .select()
        .single()

      if (error || !data) {
        // Error silencioso en producción
        return null
      }

      const newExpense = mapRowToExpense(data)

      if (currentUserId) {
        await AuthService.logActivity(
          currentUserId,
          'expense_create',
          'egresos',
          {
            description: `Nuevo egreso registrado - concepto "${expenseData.category}"`,
            expenseId: newExpense.id,
            category: expenseData.category,
            amount: expenseData.amount,
            date: expenseData.date,
            paymentMethod: expenseData.paymentMethod
          }
        )
      }

      return newExpense
    } catch (error) {
      // Error silencioso en producción
      return null
    }
  }

  static async updateExpense(
    id: string,
    updates: Partial<Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>>,
    currentUserId?: string
  ): Promise<boolean> {
    try {
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString()
      }

      if (updates.storeId !== undefined) updateData.store_id = updates.storeId
      if (updates.category !== undefined) updateData.category = updates.category
      if (updates.amount !== undefined) updateData.amount = updates.amount
      if (updates.date !== undefined) updateData.date = updates.date
      if (updates.paymentMethod !== undefined) updateData.payment_method = updates.paymentMethod
      if (updates.notes !== undefined) updateData.notes = updates.notes

      const { error } = await supabase
        .from('expenses')
        .update(updateData)
        .eq('id', id)

      if (error) {
        // Error silencioso en producción
        return false
      }

      if (currentUserId) {
        await AuthService.logActivity(
          currentUserId,
          'expense_update',
          'egresos',
          {
            description: `Se actualizó el egreso ${id}. Campos modificados: ${Object.keys(updates).join(', ')}`,
            expenseId: id,
            changes: Object.keys(updates)
          }
        )
      }

      return true
    } catch (error) {
      // Error silencioso en producción
      return false
    }
  }
}
