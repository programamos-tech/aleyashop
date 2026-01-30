'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Receipt, Package, Users, CreditCard, ShieldCheck, Activity, Shield, UserCircle, ChevronLeft, ChevronRight, ArrowRightLeft, CheckCircle, Store } from 'lucide-react'
import { usePermissions } from '@/hooks/usePermissions'
import { useAuth } from '@/contexts/auth-context'
import { isMainStoreUser, canAccessAllStores } from '@/lib/store-helper'

const items = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, module: 'dashboard', alwaysVisible: true },
  { href: '/inventory/products', label: 'Productos', icon: Package, module: 'products' },
  { href: '/inventory/transfers', label: 'Transferencias', icon: ArrowRightLeft, module: 'transfers', requiresMainStore: true },
  { href: '/inventory/receptions', label: 'Recepciones', icon: CheckCircle, module: 'receptions' },
  { href: '/clients', label: 'Clientes', icon: Users, module: 'clients' },
  { href: '/sales', label: 'Ventas', icon: Receipt, module: 'sales' },
  { href: '/warranties', label: 'Garantías', icon: ShieldCheck, module: 'warranties' },
  { href: '/payments', label: 'Créditos', icon: CreditCard, module: 'payments' },
  { href: '/stores', label: 'Tiendas', icon: Store, module: 'roles' },
  { href: '/roles', label: 'Roles', icon: Shield, module: 'roles' },
  { href: '/logs', label: 'Actividades', icon: Activity, module: 'logs' },
  { href: '/profile', label: 'Perfil', icon: UserCircle, module: 'dashboard', alwaysVisible: true },
]

export function BottomNav() {
  const pathname = usePathname()
  const [isMounted, setIsMounted] = useState(false)
  const { canView } = usePermissions()
  const { user } = useAuth()
  const scrollContainerRef = useRef<HTMLUListElement>(null)
  const [showLeftButton, setShowLeftButton] = useState(false)
  const [showRightButton, setShowRightButton] = useState(false)

  // Marcar como montado para evitar errores de hidratación
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Durante el render inicial, usar pathname vacío para evitar mismatch
  const currentPathname = isMounted ? pathname : ''

  // Filtrar items basado en permisos, pero siempre mostrar Dashboard y Perfil si el usuario está autenticado
  const visibleItems = items
    .filter(item => {
      if (item.alwaysVisible && user) {
        return true
      }
      // Ocultar transferencias si el usuario no es de la tienda principal
      if (item.requiresMainStore && !isMainStoreUser(user)) {
        return false
      }
      // Para el módulo de Tiendas, siempre mostrarlo pero solo permitir acceso si es super admin
      if (item.href === '/stores') {
        return canView(item.module) // Mostrar siempre si tiene permisos del módulo
      }
      return canView(item.module)
    })
    .sort((a, b) => {
      // Dashboard siempre primero
      if (a.href === '/dashboard') return -1
      if (b.href === '/dashboard') return 1
      // Perfil siempre al final
      if (a.href === '/profile') return 1
      if (b.href === '/profile') return -1
      // Mantener el orden original para los demás
      return 0
    })

  // Función para verificar si hay scroll disponible
  const checkScrollButtons = () => {
    if (!scrollContainerRef.current) return
    
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current
    setShowLeftButton(scrollLeft > 0)
    setShowRightButton(scrollLeft < scrollWidth - clientWidth - 1)
  }

  // Verificar botones al montar y cuando cambian los items visibles
  useEffect(() => {
    checkScrollButtons()
    const container = scrollContainerRef.current
    if (container) {
      container.addEventListener('scroll', checkScrollButtons)
      // Verificar después de un pequeño delay para asegurar que el DOM esté renderizado
      const timeout = setTimeout(checkScrollButtons, 100)
      
      // Listener para redimensionamiento de ventana
      const handleResize = () => {
        setTimeout(checkScrollButtons, 100)
      }
      window.addEventListener('resize', handleResize)
      
      return () => {
        container.removeEventListener('scroll', checkScrollButtons)
        window.removeEventListener('resize', handleResize)
        clearTimeout(timeout)
      }
    }
  }, [visibleItems.length, isMounted])

  // Función para hacer scroll
  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return
    
    const scrollAmount = 200 // Píxeles a desplazar
    const currentScroll = scrollContainerRef.current.scrollLeft
    const newScroll = direction === 'left' 
      ? currentScroll - scrollAmount 
      : currentScroll + scrollAmount
    
    scrollContainerRef.current.scrollTo({
      left: newScroll,
      behavior: 'smooth'
    })
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 xl:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg supports-[padding:max(0px,env(safe-area-inset-bottom))]:pb-[max(0px,env(safe-area-inset-bottom))]">
      <div className="relative flex items-center">
        {/* Botón izquierdo */}
        {showLeftButton && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 z-10 h-16 md:h-20 px-3 md:px-4 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex items-center justify-center transition-colors touch-manipulation"
            aria-label="Scroll izquierda"
          >
            <ChevronLeft className="h-6 w-6 md:h-7 md:w-7 text-gray-600 dark:text-gray-400" />
          </button>
        )}

        {/* Contenedor de scroll */}
        <ul 
          ref={scrollContainerRef}
          className={`flex items-stretch h-16 md:h-20 gap-1 overflow-x-auto scrollbar-hide flex-1 ${
            showLeftButton ? 'pl-12 md:pl-14' : 'pl-2 md:pl-2.5'
          } ${
            showRightButton ? 'pr-12 md:pr-14' : 'pr-2 md:pr-2.5'
          }`}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {visibleItems.map(({ href, label, icon: Icon, module }) => {
            const isStoresModule = href === '/stores'
            const canAccessStores = isStoresModule ? canAccessAllStores(user) : true
            
            const active = currentPathname === href || 
              (href !== '/dashboard' && currentPathname?.startsWith(href)) ||
              (href === '/payments' && currentPathname?.startsWith('/payments')) ||
              (href === '/inventory/products' && currentPathname?.startsWith('/inventory/products')) ||
              (href === '/inventory/transfers' && currentPathname?.startsWith('/inventory/transfers')) ||
              (href === '/inventory/receptions' && currentPathname?.startsWith('/inventory/receptions')) ||
              (href === '/sales' && currentPathname?.startsWith('/sales')) ||
              (href === '/stores' && currentPathname?.startsWith('/stores'))
            
            // Colores por módulo para el estado activo (igual que el sidebar)
            const getActiveColor = () => {
              switch (module) {
                case 'dashboard': return 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                case 'products': return 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-400'
                case 'clients': return 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                case 'sales': return 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                case 'warranties': return 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400'
                case 'payments': return 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400'
                case 'roles': return 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400'
                case 'logs': return 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                case 'stores': return 'bg-[#fce4f0] dark:bg-[#f29fc8]/20 text-[#d06a98] dark:text-[#f29fc8]'
                default: return 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
              }
            }
            
            const getIconColor = () => {
              if (!active) return 'text-gray-500 dark:text-gray-400'
              switch (module) {
                case 'dashboard': return 'text-green-700 dark:text-green-400'
                case 'products': return 'text-cyan-700 dark:text-cyan-400'
                case 'clients': return 'text-red-700 dark:text-red-400'
                case 'sales': return 'text-green-700 dark:text-green-400'
                case 'warranties': return 'text-purple-700 dark:text-purple-400'
                case 'payments': return 'text-orange-700 dark:text-orange-400'
                case 'roles': return 'text-indigo-700 dark:text-indigo-400'
                case 'logs': return 'text-gray-700 dark:text-gray-300'
                case 'stores': return 'text-[#d06a98] dark:text-[#f29fc8]'
                default: return 'text-gray-900 dark:text-white'
              }
            }
            
            return (
              <li key={href} className="flex-shrink-0 flex-1 min-w-[70px] md:min-w-[80px] max-w-[90px] md:max-w-[100px]">
                {isStoresModule && !canAccessStores ? (
                  <div
                    className={`flex h-full flex-col items-center justify-center gap-1 md:gap-1.5 px-2 md:px-2.5 text-[9px] md:text-[10px] lg:text-[11px] transition-all duration-200 rounded-t-lg cursor-not-allowed opacity-50 ${
                      active 
                        ? `${getActiveColor()} shadow-sm font-semibold` 
                        : 'text-gray-400 dark:text-gray-500'
                    }`}
                    title="Solo disponible para Super Administradores"
                  >
                    <Icon className={`h-5 w-5 md:h-6 md:w-6 lg:h-7 lg:w-7 flex-shrink-0 transition-colors ${getIconColor()}`} />
                    <span className="leading-tight text-center truncate max-w-full px-0.5 whitespace-nowrap">{label}</span>
                  </div>
                ) : (
                <Link
                  href={href}
                  className={`flex h-full flex-col items-center justify-center gap-1 md:gap-1.5 px-2 md:px-2.5 text-[9px] md:text-[10px] lg:text-[11px] transition-all duration-200 rounded-t-lg touch-manipulation ${
                    active 
                      ? `${getActiveColor()} shadow-sm font-semibold` 
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white active:bg-gray-100 dark:active:bg-gray-700 active:scale-95'
                  }`}
                >
                  <Icon className={`h-5 w-5 md:h-6 md:w-6 lg:h-7 lg:w-7 flex-shrink-0 transition-colors ${getIconColor()}`} />
                  <span className="leading-tight text-center truncate max-w-full px-0.5 whitespace-nowrap">{label}</span>
                </Link>
                )}
              </li>
            )
          })}
        </ul>

        {/* Botón derecho */}
        {showRightButton && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 z-10 h-16 md:h-20 px-3 md:px-4 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex items-center justify-center transition-colors touch-manipulation"
            aria-label="Scroll derecha"
          >
            <ChevronRight className="h-6 w-6 md:h-7 md:w-7 text-gray-600 dark:text-gray-400" />
          </button>
        )}
      </div>
    </nav>
  )
}


