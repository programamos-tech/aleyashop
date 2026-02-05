'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { canAccessAllStores } from '@/lib/store-helper'
import { Logo } from '@/components/ui/logo'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading, switchStore } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isMounted, setIsMounted] = useState(false)
  const [showSkipLink, setShowSkipLink] = useState(false)

  // Marcar como montado para evitar errores de hidratación
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Si lleva mucho tiempo cargando, mostrar enlace a login
  useEffect(() => {
    if (!isMounted || !isLoading) return
    const t = setTimeout(() => setShowSkipLink(true), 1500)
    return () => clearTimeout(t)
  }, [isMounted, isLoading])

  useEffect(() => {
    if (isMounted && !isLoading) {
      // Si no hay usuario, redirigir a login
      if (!user) {
        router.push('/login')
        return
      }

      // Si es super admin, automáticamente asignar tienda principal si no tiene una seleccionada
      if (canAccessAllStores(user)) {
        const savedUser = typeof window !== 'undefined' ? localStorage.getItem('aleya_user') : null
        let hasSelectedStore = false
        
        if (savedUser) {
          try {
            const userData = JSON.parse(savedUser)
            hasSelectedStore = 'storeId' in userData
          } catch (e) {
            hasSelectedStore = false
          }
        }
        
        if (user.storeId !== undefined && user.storeId !== null && user.storeId !== '') {
          hasSelectedStore = true
        }
        
        // Si no tiene tienda seleccionada, automáticamente asignar la tienda principal
        if (!hasSelectedStore && switchStore) {
          // undefined significa tienda principal
          switchStore(undefined)
        }
      }
    }
  }, [user, isLoading, router, isMounted, pathname, switchStore])

  // Durante el render inicial en el servidor, no mostrar nada
  if (!isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center">
          {/* Logo con animación simple */}
          <div className="relative">
            <div className="animate-pulse scale-150">
              <Logo size="lg" showText={false} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center">
          <div className="relative">
            <div className="animate-pulse scale-150">
              <Logo size="lg" showText={false} />
            </div>
          </div>
          {showSkipLink && (
            <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
              ¿Tarda mucho?{' '}
              <Link
                href="/login"
                className="text-[#f29fc8] font-medium underline hover:opacity-80"
                onClick={() => {
                  if (typeof window !== 'undefined') window.localStorage.removeItem('aleya_user')
                }}
              >
                Ir a login
              </Link>
            </p>
          )}
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return <>{children}</>
}
