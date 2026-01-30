'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Receipt, Package, Users, Activity, Shield, UserCircle } from 'lucide-react'
import { usePermissions } from '@/hooks/usePermissions'
import { useAuth } from '@/contexts/auth-context'

const items = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, module: 'dashboard', alwaysVisible: true },
  { href: '/inventory/products', label: 'Productos', icon: Package, module: 'products' },
  { href: '/clients', label: 'Clientes', icon: Users, module: 'clients' },
  { href: '/sales', label: 'Ventas', icon: Receipt, module: 'sales' },
  { href: '/roles', label: 'Roles', icon: Shield, module: 'roles' },
  { href: '/logs', label: 'Actividad', icon: Activity, module: 'logs' },
  { href: '/profile', label: 'Perfil', icon: UserCircle, module: 'dashboard', alwaysVisible: true },
]

export function BottomNav() {
  const pathname = usePathname()
  const [isMounted, setIsMounted] = useState(false)
  const { canView } = usePermissions()
  const { user } = useAuth()

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const currentPathname = isMounted ? pathname : ''

  const visibleItems = items.filter(item => {
    if (item.alwaysVisible && user) return true
    return canView(item.module)
  })

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 xl:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] supports-[padding:max(0px,env(safe-area-inset-bottom))]:pb-[max(0px,env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {visibleItems.map(({ href, label, icon: Icon }) => {
          const active = currentPathname === href || 
            (href !== '/dashboard' && currentPathname?.startsWith(href))
          
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-xl transition-all duration-200 min-w-[52px] ${
                active 
                  ? 'text-[#f29fc8]' 
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-all duration-200 ${
                active 
                  ? 'bg-[#fce4f0] dark:bg-[#f29fc8]/20' 
                  : ''
              }`}>
                <Icon className={`h-5 w-5 transition-colors ${
                  active ? 'text-[#f29fc8]' : ''
                }`} />
              </div>
              <span className={`text-[10px] font-medium leading-tight ${
                active ? 'text-[#f29fc8]' : ''
              }`}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
