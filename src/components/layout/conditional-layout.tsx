'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/ui/sidebar'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { BetaBanner } from '@/components/ui/beta-banner'
import { MobileNavWrapper } from '@/components/ui/mobile-nav-wrapper'
import { useState } from 'react'
import { useStoreUrl } from '@/hooks/use-store-url'

interface ConditionalLayoutProps {
  children: React.ReactNode
}

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  
  // Actualizar URL con el identificador de la tienda
  useStoreUrl()
  
  // Si es la página de login o select-store, no mostrar sidebar ni protección
  if (pathname === '/login' || pathname === '/select-store') {
    return <>{children}</>
  }
  
  // Para todas las demás páginas, mostrar el layout completo con sidebar
  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-white dark:bg-gray-900">
        <Sidebar onMobileMenuToggle={setIsMobileMenuOpen} />
        <main className={`flex-1 xl:ml-56 relative z-10 bg-white dark:bg-gray-900 transition-all duration-300 flex flex-col ${
          isMobileMenuOpen ? 'blur-sm' : ''
        }`}>
          <BetaBanner />
          <div className="flex-1 overflow-auto bg-white dark:bg-gray-900 pb-20 xl:pb-0">
            {children}
          </div>
        </main>
        <MobileNavWrapper />
      </div>
    </ProtectedRoute>
  )
}
