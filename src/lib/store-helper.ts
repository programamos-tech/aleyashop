import { User } from '@/types'

/**
 * Obtiene el usuario actual desde localStorage
 * @returns Usuario actual o null si no está disponible
 */
export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const userData = localStorage.getItem('aleya_user')
    if (!userData) {
      return null
    }

    return JSON.parse(userData) as User
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

/**
 * Obtiene el store_id del usuario actual desde localStorage
 * @returns store_id del usuario o null si no está disponible
 */
export function getCurrentUserStoreId(): string | null {
  const user = getCurrentUser()
  return user?.storeId || null
}

/**
 * Obtiene el store_id del usuario pasado como parámetro
 * @param user - Usuario del cual obtener el store_id
 * @returns store_id del usuario o null si no está disponible
 */
export function getUserStoreId(user: User | null): string | null {
  if (!user) {
    return null
  }
  return user.storeId || null
}

/**
 * Verifica si el usuario es de la tienda principal (Aleya Shop)
 * @param user - Usuario a verificar
 * @returns true si es de la tienda principal
 */
export function isMainStoreUser(user: User | null): boolean {
  const storeId = getUserStoreId(user)
  return storeId === '00000000-0000-0000-0000-000000000001' || !storeId
}

/**
 * Verifica si el usuario puede acceder a todas las tiendas (superadmin o admin)
 * Un superadmin puede acceder a todas las tiendas independientemente del storeId actual
 * @param user - Usuario a verificar
 * @returns true si puede acceder a todas las tiendas
 */
export function canAccessAllStores(user: User | null): boolean {
  if (!user) return false
  // Un superadmin o admin puede acceder a todas las tiendas, sin importar el storeId actual
  // Esto permite que un superadmin pueda cambiar entre tiendas y seguir teniendo acceso al módulo de Tiendas
  return user.role === 'superadmin' || user.role === 'admin' || user.role === 'Super Admin' || user.role === 'Super Administrador'
}
