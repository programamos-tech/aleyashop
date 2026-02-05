import { supabase } from './supabase'
import type { Notification } from '@/types'

function mapRowToNotification(row: any): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    message: row.message || null,
    metadata: row.metadata || null,
    readAt: row.read_at || null,
    createdAt: row.created_at
  }
}

export class NotificationsService {
  static async getUnreadForUser(userId: string): Promise<Notification[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .is('read_at', null)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) return []
      return (data || []).map(mapRowToNotification)
    } catch (error) {
      return []
    }
  }

  static async getAllForUser(userId: string, limit = 30): Promise<Notification[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) return []
      return (data || []).map(mapRowToNotification)
    } catch (error) {
      return []
    }
  }

  static async markAsRead(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id)
      return !error
    } catch (error) {
      return false
    }
  }

  static async markAllAsReadForUser(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .is('read_at', null)
      return !error
    } catch (error) {
      return false
    }
  }

  /** Crear notificación (ej. anulación aprobada/rechazada para el solicitante). */
  static async create(notification: {
    userId: string
    type: Notification['type']
    title: string
    message?: string | null
    metadata?: Record<string, unknown> | null
  }): Promise<Notification | null> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: notification.userId,
          type: notification.type,
          title: notification.title,
          message: notification.message ?? null,
          metadata: notification.metadata ?? null
        })
        .select()
        .single()

      if (error || !data) return null
      return mapRowToNotification(data)
    } catch (error) {
      return null
    }
  }
}
