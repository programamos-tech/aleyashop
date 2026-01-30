'use client'

import { Store } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { 
  Plus, 
  Edit, 
  Store as StoreIcon,
  Crown,
  Circle
} from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { canAccessAllStores } from '@/lib/store-helper'

interface StoreTableProps {
  stores: Store[]
  onEdit: (store: Store) => void
  onDelete: (store: Store) => void
  onToggleStatus: (store: Store) => void
  onCreate: () => void
  onRefresh: () => void
}

interface StoreCardProps {
  store: Store
  isMainStore: boolean
  isCurrentStore: boolean
  isSuperAdmin: boolean
  onStoreClick: (e: React.MouseEvent) => void
  onEdit: () => void
  onToggleStatus: () => void
}

function StoreCard({ 
  store, 
  isMainStore, 
  isCurrentStore, 
  isSuperAdmin,
  onStoreClick,
  onEdit,
  onToggleStatus
}: StoreCardProps) {

  return (
    <Card
      onClick={onStoreClick}
      className={`bg-white dark:bg-gray-800 transition-all duration-200 overflow-visible group relative ${
        isCurrentStore 
          ? 'ring-2 ring-emerald-400 dark:ring-emerald-500 shadow-md' 
          : 'border border-gray-200 dark:border-gray-700'
      } ${
        isSuperAdmin 
          ? 'cursor-pointer hover:shadow-lg' 
          : ''
      }`}
      title={isSuperAdmin ? `Haz click para ver el dashboard de ${store.name}` : undefined}
    >
      <CardContent className="p-6">
        <div className="flex flex-col items-center text-center space-y-3">
          {/* Indicador de Tienda Actual - Sutil */}
          {isCurrentStore && (
            <div className="absolute top-2 right-2">
              <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500" />
            </div>
          )}
          
          {/* Logo - Protagonista, Circular */}
          <div className="relative">
            {store.logo ? (
              <div className={`relative w-20 h-20 rounded-full overflow-hidden transition-transform ${
                isCurrentStore ? 'ring-2 ring-emerald-400 dark:ring-emerald-500' : ''
              }`}>
                <Image
                  src={store.logo}
                  alt={store.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            ) : (
              <div className={`w-20 h-20 rounded-full bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/30 flex items-center justify-center overflow-hidden ${
                isCurrentStore ? 'ring-2 ring-emerald-400 dark:ring-emerald-500' : ''
              }`}>
                <Image
                  src="/favicon.png"
                  alt="Aleya Shop Logo"
                  width={56}
                  height={56}
                  className="object-contain"
                  unoptimized
                />
              </div>
            )}
            {/* Icono de Tienda Principal - Corona */}
            {isMainStore && (
              <div className="absolute -bottom-0.5 -right-0.5 bg-emerald-500 dark:bg-emerald-400 text-white rounded-full p-1 shadow-sm border-2 border-white dark:border-gray-800">
                <Crown className="h-2.5 w-2.5" />
              </div>
            )}
          </div>
          
          {/* Nombre de la Tienda */}
          <div className="w-full">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 leading-tight">
              {store.name}
            </h3>
          </div>

          {/* Botones de Acción - Visibles */}
          <div 
            className="w-full flex items-center justify-center gap-3 pt-2"
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
            }}
            onMouseDown={(e) => {
              e.stopPropagation()
            }}
          >
            <Button
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                onEdit()
              }}
              onMouseDown={(e) => {
                e.stopPropagation()
              }}
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
              title="Editar"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <div 
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
              }}
              onMouseDown={(e) => {
                e.stopPropagation()
              }}
              className="flex items-center gap-2"
            >
              <Switch
                checked={store.isActive}
                onCheckedChange={(checked) => {
                  onToggleStatus()
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                }}
                onMouseDown={(e) => {
                  e.stopPropagation()
                }}
                title={store.isActive ? 'Desactivar' : 'Activar'}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function StoreTable({
  stores,
  onEdit,
  onDelete,
  onToggleStatus,
  onCreate,
  onRefresh
}: StoreTableProps) {
  const router = useRouter()
  const { user, switchStore } = useAuth()
  const isSuperAdmin = user && canAccessAllStores(user)
  const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
  
  // Determinar cuál es la tienda actualmente seleccionada
  const getCurrentStoreId = (): string | undefined => {
    if (!user) return undefined
    // Si storeId es undefined o MAIN_STORE_ID, entonces está en la tienda principal
    return user.storeId || MAIN_STORE_ID
  }
  
  const currentStoreId = getCurrentStoreId()

  const handleStoreClick = (store: Store, e: React.MouseEvent) => {
    // Solo permitir click si es super admin y no se hizo click en los botones de acción
    if (!isSuperAdmin || !switchStore) return
    
    const target = e.target as HTMLElement
    const currentTarget = e.currentTarget as HTMLElement
    
    // Si se hizo click en un botón, switch, o en sus hijos, no cambiar de tienda
    if (
      target.closest('button') || 
      target.closest('[role="button"]') ||
      target.closest('[role="switch"]') ||
      target.closest('label') ||
      target.tagName === 'BUTTON' ||
      target.tagName === 'LABEL' ||
      // Verificar si el click fue en el área de botones
      (currentTarget.querySelector('.w-full.flex.items-center.justify-center.gap-3')?.contains(target))
    ) {
      return
    }

    // Prevenir propagación adicional
    e.stopPropagation()
    e.preventDefault()

    // Cambiar de tienda
    const newStoreId = store.id === MAIN_STORE_ID ? undefined : store.id
    switchStore(newStoreId)
    
    // Crear slug de la tienda para la URL
    const storeSlug = store.name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 30)
    
    // Usar setTimeout para asegurar que el estado se actualice antes de navegar
    setTimeout(() => {
      router.push(`/dashboard?store=${storeSlug}`)
    }, 0)
  }

  return (
    <Card className="bg-white dark:bg-gray-800 shadow-sm">
      <CardHeader className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <StoreIcon className="h-6 w-6 text-emerald-600" />
              Micro Tiendas
            </CardTitle>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Gestiona las micro tiendas del sistema
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={onCreate}
              className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nueva Tienda</span>
              <span className="sm:hidden">Nueva</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 md:p-6">
        {stores.length === 0 ? (
          <div className="p-8 text-center">
            <StoreIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No hay tiendas registradas</p>
            <Button
              onClick={onCreate}
              className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Crear Primera Tienda
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                {stores.map((store) => {
                  const isMainStore = store.id === MAIN_STORE_ID
                  const isCurrentStore = store.id === currentStoreId
                  
                  return (
                    <StoreCard
                      key={store.id}
                      store={store}
                      isMainStore={isMainStore}
                      isCurrentStore={isCurrentStore}
                      isSuperAdmin={isSuperAdmin || false}
                      onStoreClick={(e) => handleStoreClick(store, e)}
                      onEdit={() => onEdit(store)}
                      onToggleStatus={() => onToggleStatus(store)}
                    />
                  )
                })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
