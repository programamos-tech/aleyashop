import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Obtener variables de entorno
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Crear clientes solo si las variables están disponibles
let supabase: SupabaseClient
let supabaseAdmin: SupabaseClient

if (supabaseUrl && supabaseAnonKey) {
  // Cliente para operaciones del cliente (anon)
  supabase = createClient(supabaseUrl, supabaseAnonKey)
  
  // Cliente para operaciones del servidor (service role)
  supabaseAdmin = supabaseServiceKey 
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })
    : supabase
} else {
  // Crear un cliente dummy para evitar errores durante build
  const dummyUrl = 'http://localhost:54331'
  const dummyKey = 'dummy-key'
  supabase = createClient(dummyUrl, dummyKey)
  supabaseAdmin = supabase
  
  if (typeof window !== 'undefined') {
    console.error('Variables de entorno de Supabase no configuradas')
  }
}

export { supabase, supabaseAdmin }

// Tipos para la base de datos
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          name: string
          email: string
          password: string
          role: string
          permissions: any[]
          is_active: boolean
          last_login: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          password: string
          role: string
          permissions?: any[]
          is_active?: boolean
          last_login?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          password?: string
          role?: string
          permissions?: any[]
          is_active?: boolean
          last_login?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      roles: {
        Row: {
          id: string
          name: string
          description: string
          permissions: any[]
          is_system: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description: string
          permissions?: any[]
          is_system?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          permissions?: any[]
          is_system?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      logs: {
        Row: {
          id: string
          user_id: string
          action: string
          module: string
          details: any
          ip_address: string | null
          user_agent: string | null
          store_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          action: string
          module: string
          details?: any
          ip_address?: string | null
          user_agent?: string | null
          store_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          action?: string
          module?: string
          details?: any
          ip_address?: string | null
          user_agent?: string | null
          store_id?: string | null
          created_at?: string
        }
      }
    }
  }
}
