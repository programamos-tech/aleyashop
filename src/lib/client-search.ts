import { Client } from '@/types'

/** Coincidencia de búsqueda local para listados de clientes (nombre, email, teléfono, documento). */
export function clientMatchesQuery(client: Client, searchRaw: string): boolean {
  const q = searchRaw.trim()
  if (!q) return true
  const lower = q.toLowerCase()
  const digits = q.replace(/\D/g, '')
  const docDigits = (client.document || '').replace(/\D/g, '')
  const phoneDigits = (client.phone || '').replace(/\D/g, '')
  return (
    (client.name?.toLowerCase().includes(lower) ?? false) ||
    (client.email?.toLowerCase().includes(lower) ?? false) ||
    (client.phone?.toLowerCase().includes(lower) ?? false) ||
    (client.document?.toLowerCase().includes(lower) ?? false) ||
    (digits.length >= 3 && docDigits.includes(digits)) ||
    (digits.length >= 3 && phoneDigits.includes(digits))
  )
}
