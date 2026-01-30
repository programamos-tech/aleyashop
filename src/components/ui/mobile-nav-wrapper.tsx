'use client'

import { usePathname } from 'next/navigation'
import { BottomNav } from '@/components/ui/bottom-nav'

export function MobileNavWrapper() {
  const pathname = usePathname()
  // Ocultar en /login, /select-store y rutas de autenticación
  const hideOnRoutes = ['/login', '/select-store']
  const shouldHide = hideOnRoutes.some((r) => pathname.startsWith(r))

  if (shouldHide) return null
  return <BottomNav />
}


