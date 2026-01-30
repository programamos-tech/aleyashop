'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  Receipt, 
  CreditCard, 
  Shield,
  Activity,
  Menu,
  X,
  LogOut,
  ShieldCheck,
  UserCircle,
  Store,
  Warehouse,
  ArrowRightLeft,
  CheckCircle,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import React, { useState, useEffect, useRef } from 'react'
import { Logo } from './logo'
// ThemeToggle removed
import { usePermissions } from '@/hooks/usePermissions'
import { useAuth } from '@/contexts/auth-context'
import { canAccessAllStores, isMainStoreUser } from '@/lib/store-helper'
import { StoresService } from '@/lib/stores-service'
import type { Store } from '@/types/store'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, module: 'dashboard' },
  { name: 'Productos', href: '/inventory/products', icon: Package, module: 'products' },
  { name: 'Clientes', href: '/clients', icon: Users, module: 'clients' },
  { name: 'Ventas', href: '/sales', icon: Receipt, module: 'sales' },
  { name: 'Garantías', href: '/warranties', icon: ShieldCheck, module: 'warranties' },
  { name: 'Roles', href: '/roles', icon: Shield, module: 'roles' },
  { name: 'Actividades', href: '/logs', icon: Activity, module: 'logs' },
  { name: 'Perfil', href: '/profile', icon: UserCircle, module: 'dashboard' },
]

interface SidebarProps {
  className?: string
  onMobileMenuToggle?: (isOpen: boolean) => void
}

export function Sidebar({ className, onMobileMenuToggle }: SidebarProps) {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { canView } = usePermissions()
  const { user, logout } = useAuth()
  const sidebarRef = useRef<HTMLDivElement>(null)
  const [currentStore, setCurrentStore] = useState<Store | null>(null)
  // Inicializar con todos los menús expandidos por defecto
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set(['Inventario', 'Comercial', 'Administración']))

  // Mantener expandidos los menús cuando estamos en alguna de sus rutas
  useEffect(() => {
    if (pathname?.startsWith('/inventory')) {
      setExpandedMenus(prev => new Set([...prev, 'Inventario']))
    }
    if (pathname?.startsWith('/clients') || pathname?.startsWith('/sales') || pathname?.startsWith('/payments') || pathname?.startsWith('/warranties')) {
      setExpandedMenus(prev => new Set([...prev, 'Comercial']))
    }
    if (pathname?.startsWith('/stores') || pathname?.startsWith('/roles') || pathname?.startsWith('/logs')) {
      setExpandedMenus(prev => new Set([...prev, 'Administración']))
    }
  }, [pathname])

  // Notificar al layout cuando cambie el estado del menú móvil
  useEffect(() => {
    onMobileMenuToggle?.(isMobileMenuOpen)
  }, [isMobileMenuOpen, onMobileMenuToggle])

  // Cargar información de la tienda del usuario
  useEffect(() => {
    const loadStoreInfo = async () => {
      if (user?.storeId) {
        try {
          const store = await StoresService.getStoreById(user.storeId)
          setCurrentStore(store)
        } catch (error) {
          console.error('Error loading store info:', error)
        }
      } else {
        // Si no tiene storeId, es de la tienda principal
        try {
          const mainStore = await StoresService.getMainStore()
          setCurrentStore(mainStore)
        } catch (error) {
          console.error('Error loading main store:', error)
        }
      }
    }

    if (user) {
      loadStoreInfo()
    }
  }, [user])

  // Cerrar menú cuando se hace click fuera del sidebar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false)
      }
    }

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMobileMenuOpen])

  return (
    <>
      {/* Mobile/Tablet menu button - solo visible cuando el sidebar está cerrado */}
      {/* Hidden hamburger on mobile: usamos bottom nav */}

      {/* Mobile/Tablet overlay - removido para evitar pantalla negra */}

      {/* Sidebar */}
      <div 
        ref={sidebarRef}
        className={cn(
          "fixed inset-y-0 left-0 z-40 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 shadow-sm transform transition-all duration-300 ease-in-out xl:translate-x-0 w-56",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full",
          className
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo y Tienda */}
          <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-800">
            <Link href="/inventory/products" className="cursor-pointer hover:opacity-80 transition-opacity flex flex-col items-center">
              {currentStore?.logo ? (
                <img 
                  src={currentStore.logo} 
                  alt={currentStore.name}
                  className="h-12 w-12 rounded-lg object-cover"
                />
              ) : (
                <Logo size="lg" />
              )}
              {currentStore && (
                <p className="mt-2 text-sm font-semibold text-[#d06a98] dark:text-[#f29fc8] truncate max-w-[180px]">
                  {currentStore.name}
                </p>
              )}
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              // Solo mostrar el item si el usuario tiene permisos para verlo
              if (!canView(item.module)) return null
              
              // Para el módulo de Tiendas, siempre mostrarlo pero solo permitir acceso si es super admin
              const isStoresModule = item.href === '/stores'
              const canAccessStores = isStoresModule ? canAccessAllStores(user) : true
              
              // Si requiere acceso a todas las tiendas (y no es stores), verificar
              if (item.requiresAllStoresAccess && !isStoresModule && !canAccessAllStores(user)) return null
              
              // Verificar si tiene submenú
              const hasSubmenu = item.submenu && item.submenu.length > 0
              const isExpanded = expandedMenus.has(item.name)
              
              // Verificar si algún subitem está activo
              const isSubmenuActive = hasSubmenu && item.submenu?.some(subitem => {
                if (subitem.href === '/inventory/products' && pathname?.startsWith('/inventory/products')) return true
                if (subitem.href === '/inventory/transfers' && pathname?.startsWith('/inventory/transfers')) return true
                if (subitem.href === '/inventory/receptions' && pathname?.startsWith('/inventory/receptions')) return true
                if (subitem.href === '/clients' && pathname?.startsWith('/clients')) return true
                if (subitem.href === '/sales' && pathname?.startsWith('/sales')) return true
                if (subitem.href === '/payments' && pathname?.startsWith('/payments')) return true
                if (subitem.href === '/warranties' && pathname?.startsWith('/warranties')) return true
                if (subitem.href === '/stores' && pathname?.startsWith('/stores')) return true
                if (subitem.href === '/roles' && pathname?.startsWith('/roles')) return true
                if (subitem.href === '/logs' && pathname?.startsWith('/logs')) return true
                return pathname === subitem.href
              })
              
              // Para cada elemento, solo considerar activo si la ruta coincide exactamente o empieza con su href
              const isActive = pathname === item.href || 
                (item.href === '/payments' && pathname?.startsWith('/payments')) ||
                (item.href === '/inventory/products' && pathname?.startsWith('/inventory/products')) ||
                (item.href === '/clients' && pathname?.startsWith('/clients')) ||
                (item.href === '/sales' && pathname?.startsWith('/sales')) ||
                (item.href === '/warranties' && pathname?.startsWith('/warranties')) ||
                (item.href === '/roles' && pathname?.startsWith('/roles')) ||
                (item.href === '/logs' && pathname?.startsWith('/logs')) ||
                isSubmenuActive
              
              // Color rosa de la marca para todos los elementos activos
              const getActiveColor = () => {
                return 'bg-[#fce4f0] dark:bg-[#f29fc8]/20 text-[#d06a98] dark:text-[#f29fc8]'
              }

              const toggleSubmenu = (e: React.MouseEvent) => {
                e.preventDefault()
                e.stopPropagation()
                setExpandedMenus(prev => {
                  const newSet = new Set(prev)
                  if (newSet.has(item.name)) {
                    newSet.delete(item.name)
                  } else {
                    newSet.add(item.name)
                  }
                  return newSet
                })
              }
              
              return (
                <div key={item.name}>
                  {hasSubmenu ? (
                    <>
                      <button
                        onClick={toggleSubmenu}
                        className={cn(
                          "group w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200",
                          isActive || isSubmenuActive
                            ? getActiveColor()
                            : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200"
                        )}
                      >
                        <div className="flex items-center flex-1">
                          <item.icon className={cn(
                            "h-5 w-5 transition-all duration-200 flex-shrink-0",
                            isActive || isSubmenuActive
                              ? "mr-3" 
                              : "text-gray-400 dark:text-gray-500 mr-3 group-hover:text-gray-600 dark:group-hover:text-gray-300"
                          )} />
                          <span className="flex-1 truncate text-left">{item.name}</span>
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 flex-shrink-0" />
                        )}
                      </button>
                      {isExpanded && item.submenu && (
                        <div className="ml-4 mt-1 space-y-1">
                          {item.submenu.map((subitem) => {
                            if (!canView(subitem.module)) return null
                            
                            // Ocultar "Transferencias" para usuarios de micro tiendas
                            if (subitem.href === '/inventory/transfers' && !isMainStoreUser(user)) return null
                            
                            // Verificar si requiere acceso a todas las tiendas (para el subitem de Tiendas)
                            if (subitem.requiresAllStoresAccess && !canAccessAllStores(user)) return null
                            
                            const isSubActive = pathname === subitem.href ||
                              (subitem.href === '/inventory/products' && pathname?.startsWith('/inventory/products')) ||
                              (subitem.href === '/inventory/transfers' && pathname?.startsWith('/inventory/transfers')) ||
                              (subitem.href === '/inventory/receptions' && pathname?.startsWith('/inventory/receptions')) ||
                              (subitem.href === '/clients' && pathname?.startsWith('/clients')) ||
                              (subitem.href === '/sales' && pathname?.startsWith('/sales')) ||
                              (subitem.href === '/payments' && pathname?.startsWith('/payments')) ||
                              (subitem.href === '/warranties' && pathname?.startsWith('/warranties')) ||
                              (subitem.href === '/stores' && pathname?.startsWith('/stores')) ||
                              (subitem.href === '/roles' && pathname?.startsWith('/roles')) ||
                              (subitem.href === '/logs' && pathname?.startsWith('/logs'))
                            
                            // Color rosa de la marca para todos los subitems
                            const getSubitemColor = () => {
                              return isSubActive
                                ? 'bg-[#fce4f0] dark:bg-[#f29fc8]/30 text-[#d06a98] dark:text-[#f29fc8]'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-[#fce4f0] dark:hover:bg-[#f29fc8]/10 hover:text-[#d06a98] dark:hover:text-[#f29fc8]'
                            }
                            
                            const getSubitemIconColor = () => {
                              return isSubActive
                                ? 'text-[#f29fc8] dark:text-[#f29fc8]'
                                : 'text-gray-400 dark:text-gray-500 group-hover:text-[#f29fc8] dark:group-hover:text-[#f29fc8]'
                            }
                            
                            return (
                              <Link
                                key={subitem.name}
                                href={subitem.href}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={cn(
                                  "group flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                                  getSubitemColor()
                                )}
                              >
                                <subitem.icon className={cn(
                                  "h-4 w-4 transition-all duration-200 flex-shrink-0 mr-2",
                                  getSubitemIconColor()
                                )} />
                                <span className="flex-1 truncate">{subitem.name}</span>
                              </Link>
                            )
                          })}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {isStoresModule && !canAccessStores ? (
                        <div
                          className={cn(
                            "group flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 cursor-not-allowed opacity-50",
                            "text-gray-400 dark:text-gray-500"
                          )}
                          title="Solo disponible para Super Administradores"
                        >
                          <item.icon className="h-5 w-5 transition-all duration-200 flex-shrink-0 mr-3" />
                          <span className="flex-1 truncate">{item.name}</span>
                        </div>
                  ) : (
                    <Link
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        "group flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200",
                        isActive
                          ? getActiveColor()
                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200"
                      )}
                    >
                      <item.icon className={cn(
                        "h-5 w-5 transition-all duration-200 flex-shrink-0",
                        isActive 
                          ? "mr-3" 
                          : "text-gray-400 dark:text-gray-500 mr-3 group-hover:text-gray-600 dark:group-hover:text-gray-300"
                      )} />
                      <span className="flex-1 truncate">{item.name}</span>
                    </Link>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </nav>

          {/* User info */}
          <div className="p-4 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <div className="flex items-center flex-1 min-w-0">
                <div className="flex-shrink-0">
                  <div className="w-9 h-9 bg-gradient-to-br from-gray-400 to-gray-500 rounded-lg flex items-center justify-center shadow-sm">
                    <span className="text-xs font-semibold text-white">
                      {user?.name?.charAt(0) || 'D'}
                    </span>
                  </div>
                </div>
                <div className="ml-3 min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {user?.name || 'Diego Admin'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {user?.role === 'superadmin' ? 'Super Admin' : 
                     user?.role === 'admin' ? 'Admin' :
                     user?.role === 'vendedor' ? 'Vendedor' :
                     user?.role === 'inventario' ? 'Inventario' :
                     user?.role === 'contador' ? 'Contador' : 'Usuario'}
                  </p>
                </div>
              </div>
              <button
                onClick={logout}
                className="ml-2 p-2 rounded-md text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
                title="Cerrar sesión"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
