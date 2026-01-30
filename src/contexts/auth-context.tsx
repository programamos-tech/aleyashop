'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User } from '@/types'
import { AuthService } from '@/lib/auth-service'

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  isLoading: boolean
  createUser: (userData: any) => Promise<boolean>
  getAllUsers: () => Promise<User[]>
  updateUser: (id: string, updates: Partial<User>) => Promise<boolean>
  deleteUser: (id: string) => Promise<boolean>
  switchStore: (storeId: string | undefined) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Verificar sesión al cargar
  useEffect(() => {
    const checkAuth = async () => {
      if (typeof window !== 'undefined') {
        const savedUser = localStorage.getItem('aleya_user')
        if (savedUser) {
          const userData = JSON.parse(savedUser)
          // Preservar el storeId del localStorage (puede haber sido cambiado por switchStore)
          const savedStoreId = userData.storeId
          
          // Obtener el usuario actualizado (que incluye sincronización de permisos del rol)
          const currentUser = await AuthService.getCurrentUser()
          if (currentUser) {
            // Preservar el storeId si estaba guardado en localStorage (incluso si es null para tienda principal)
            // Esto permite mantener la tienda seleccionada al recargar
            if (savedStoreId !== undefined) {
              currentUser.storeId = savedStoreId === null ? undefined : savedStoreId
            }
            
            setUser(currentUser)
            // Actualizar localStorage con el usuario actualizado (incluye permisos sincronizados y storeId preservado)
            // Convertir undefined a null para que se guarde correctamente en JSON
            const userToSave = {
              ...currentUser,
              storeId: currentUser.storeId === undefined ? null : currentUser.storeId
            }
            localStorage.setItem('aleya_user', JSON.stringify(userToSave))
          } else {
            localStorage.removeItem('aleya_user')
          }
        }
      }
      setIsLoading(false)
    }

    checkAuth()
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {

    setIsLoading(true)
    
    try {

      const userData = await AuthService.login(email, password)

      if (userData) {

        setUser(userData)
        if (typeof window !== 'undefined') {
          localStorage.setItem('aleya_user', JSON.stringify(userData))
          document.cookie = `aleya_user=${JSON.stringify(userData)}; path=/; max-age=86400`

        }
        setIsLoading(false)

        return true
      }

      setIsLoading(false)
      return false
    } catch (error) {
      // Error silencioso en producción
      setIsLoading(false)
      return false
    }
  }

  const createUser = async (userData: any): Promise<boolean> => {
    try {
      const newUser = await AuthService.createUser(userData, user?.id)
      return newUser !== null
    } catch (error) {
      // Error silencioso en producción
      return false
    }
  }

  const getAllUsers = async (): Promise<User[]> => {
    try {
      return await AuthService.getAllUsers()
    } catch (error) {
      // Error silencioso en producción
      return []
    }
  }

  const updateUser = async (id: string, updates: Partial<User>): Promise<boolean> => {
    try {

      const success = await AuthService.updateUser(id, updates, user?.id)

      if (success && user?.id === id) {
        // Actualizar usuario actual si es el mismo
        const updatedUser = await AuthService.getUserById(id)
        if (updatedUser) {
          setUser(updatedUser)
          if (typeof window !== 'undefined') {
            localStorage.setItem('aleya_user', JSON.stringify(updatedUser))
          }
        }
      }
      return success
    } catch (error) {
      // Error silencioso en producción
      return false
    }
  }

  const deleteUser = async (id: string): Promise<boolean> => {
    try {
      return await AuthService.deleteUser(id, user?.id)
    } catch (error) {
      // Error silencioso en producción
      return false
    }
  }

  const logout = () => {
    setUser(null)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('aleya_user')
      document.cookie = 'aleya_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    }
  }

  const switchStore = (storeId: string | undefined) => {
    if (!user) return
    
    const updatedUser = {
      ...user,
      storeId: storeId
    }
    
    setUser(updatedUser)
    if (typeof window !== 'undefined') {
      // Guardar con storeId explícito (incluso si es undefined) para que se preserve
      const userToSave = {
        ...updatedUser,
        storeId: storeId === undefined ? null : storeId // Convertir undefined a null para que se guarde en JSON
      }
      localStorage.setItem('aleya_user', JSON.stringify(userToSave))
    }
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      isLoading, 
      createUser, 
      getAllUsers, 
      updateUser, 
      deleteUser,
      switchStore
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
