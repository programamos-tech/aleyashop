'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  X, 
  Store as StoreIcon,
  Building2,
  MapPin,
  FileText,
  Upload,
  Image as ImageIcon
} from 'lucide-react'
import { Store } from '@/types'

interface StoreModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (store: Omit<Store, 'id' | 'createdAt' | 'updatedAt' | 'isActive' | 'deletedAt'>) => void
  store?: Store | null
}

export function StoreModal({ isOpen, onClose, onSave, store }: StoreModalProps) {
  const [formData, setFormData] = useState({
    name: store?.name || '',
    nit: store?.nit || '',
    logo: store?.logo || '',
    address: store?.address || '',
    city: store?.city || ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isUploading, setIsUploading] = useState(false)

  // Actualizar formulario cuando cambie la tienda
  useEffect(() => {
    if (store) {
      setFormData({
        name: store.name || '',
        nit: store.nit || '',
        logo: store.logo || '',
        address: store.address || '',
        city: store.city || ''
      })
    } else {
      setFormData({
        name: '',
        nit: '',
        logo: '',
        address: '',
        city: ''
      })
    }
    setErrors({})
  }, [store])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    // Nombre obligatorio
    if (!formData.name.trim()) {
      newErrors.name = 'El nombre de la tienda es requerido'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = () => {
    if (validateForm()) {
      const storeData: Omit<Store, 'id' | 'createdAt' | 'updatedAt' | 'isActive' | 'deletedAt'> = {
        name: formData.name.trim(),
        nit: formData.nit.trim() || undefined,
        logo: formData.logo.trim() || undefined,
        address: formData.address.trim() || undefined,
        city: formData.city.trim() || undefined
      }
      onSave(storeData)
    }
  }

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      setErrors({ ...errors, logo: 'El archivo debe ser una imagen' })
      return
    }

    // Validar tamaño (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setErrors({ ...errors, logo: 'La imagen no debe superar los 2MB' })
      return
    }

    try {
      setIsUploading(true)
      
      // Eliminar logo anterior si existe y está en Supabase Storage (opcional, no bloquea si falla)
      if (formData.logo && formData.logo.includes('store-logos')) {
        try {
          // Extraer el pathname de la URL
          let oldPath = formData.logo
          try {
            const oldUrl = new URL(formData.logo)
            oldPath = oldUrl.pathname
          } catch {
            // Si no es una URL válida, usar la ruta directamente
            oldPath = formData.logo.replace(/^.*\/store-logos\//, '/storage/v1/object/public/store-logos/store-logos/')
          }
          
          // Intentar eliminar (no bloquea si falla)
          fetch(`/api/storage/upload-store-logo?path=${encodeURIComponent(oldPath)}`, {
            method: 'DELETE'
          }).catch(() => {
            // Ignorar errores silenciosamente
          })
        } catch (deleteError) {
          // Ignorar errores al eliminar el archivo anterior
        }
      }
      
      // Subir archivo usando API route
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)

      const response = await fetch('/api/storage/upload-store-logo', {
        method: 'POST',
        body: uploadFormData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al subir la imagen')
      }

      const data = await response.json()
      
      if (data.url) {
        console.log('Logo subido exitosamente:', data.url)
        setFormData({ ...formData, logo: data.url })
        setErrors({ ...errors, logo: '' })
      } else {
        throw new Error('No se pudo obtener la URL pública del archivo')
      }
    } catch (error: any) {
      console.error('Error uploading logo:', error)
      setErrors({ ...errors, logo: error.message || 'Error al subir la imagen' })
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveLogo = async () => {
    // Eliminar logo de Supabase Storage si existe
    if (formData.logo && formData.logo.includes('store-logos')) {
      try {
        const url = new URL(formData.logo)
        const filePath = url.pathname
        const response = await fetch(`/api/storage/upload-store-logo?path=${encodeURIComponent(filePath)}`, {
          method: 'DELETE'
        })
        if (!response.ok) {
          console.warn('No se pudo eliminar el logo de storage')
        }
      } catch (error) {
        console.warn('No se pudo eliminar el logo de storage:', error)
      }
    }
    setFormData({ ...formData, logo: '' })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 xl:left-56 bg-white/70 dark:bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 xl:p-6">
      <div className="bg-white dark:bg-gray-900 rounded-none xl:rounded-2xl shadow-2xl w-full h-full xl:h-[calc(98vh-4rem)] xl:w-[calc(100vw-18rem)] xl:max-h-[calc(98vh-4rem)] xl:max-w-[calc(100vw-18rem)] overflow-hidden flex flex-col border-0 xl:border border-gray-200 dark:border-gray-700 relative z-[10000]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 bg-purple-50 dark:bg-purple-900/20 border-b border-purple-200 dark:border-purple-800 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <StoreIcon className="h-5 w-5 md:h-6 md:w-6 text-purple-600 dark:text-purple-400" />
            <div>
              <h2 className="text-lg md:text-xl font-semibold text-purple-800 dark:text-purple-200">
                {store ? 'Editar Tienda' : 'Nueva Tienda'}
              </h2>
              <p className="text-xs md:text-sm text-purple-700 dark:text-purple-300">
                {store ? `Editando ${store.name}` : 'Crea una nueva tienda en el sistema'}
              </p>
            </div>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-purple-100 dark:hover:bg-purple-800/30"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {/* Logo Preview/Upload */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Logo de la Tienda
            </Label>
            <div className="flex items-center gap-4">
              {formData.logo ? (
                <div className="relative">
                  <div className="h-20 w-20 rounded-lg border-2 border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                    <img
                      src={formData.logo}
                      alt="Logo"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        console.error('Error cargando imagen:', formData.logo)
                        // Mostrar icono de error
                        e.currentTarget.style.display = 'none'
                        const parent = e.currentTarget.parentElement
                        if (parent && !parent.querySelector('.error-icon')) {
                          const errorIcon = document.createElement('div')
                          errorIcon.className = 'error-icon text-red-500'
                          errorIcon.innerHTML = '<svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
                          parent.appendChild(errorIcon)
                        }
                      }}
                      onLoad={() => {
                        console.log('Imagen cargada exitosamente:', formData.logo)
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleRemoveLogo}
                    variant="ghost"
                    size="sm"
                    className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full bg-red-500 hover:bg-red-600 text-white z-10"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="h-20 w-20 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-gray-400" />
                </div>
              )}
              <div className="flex-1">
                <label htmlFor="logo-upload" className="cursor-pointer">
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                    disabled={isUploading}
                    onClick={(e) => {
                      e.preventDefault()
                      document.getElementById('logo-upload')?.click()
                    }}
                  >
                    <Upload className="h-4 w-4" />
                    {isUploading ? 'Subiendo...' : formData.logo ? 'Cambiar Logo' : 'Subir Logo'}
                  </Button>
                </label>
                {errors.logo && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.logo}</p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Máximo 2MB. Formatos: JPG, PNG, GIF
                </p>
              </div>
            </div>
          </div>

          {/* Nombre */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <StoreIcon className="h-4 w-4" />
              Nombre de la Tienda *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: Tienda Centro"
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-xs text-red-600 dark:text-red-400">{errors.name}</p>
            )}
          </div>

          {/* NIT */}
          <div className="space-y-2">
            <Label htmlFor="nit" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              NIT
            </Label>
            <Input
              id="nit"
              value={formData.nit}
              onChange={(e) => setFormData({ ...formData, nit: e.target.value })}
              placeholder="Ej: 900123456-7"
            />
          </div>

          {/* Ciudad */}
          <div className="space-y-2">
            <Label htmlFor="city" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Ciudad
            </Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="Ej: Bogotá"
            />
          </div>

          {/* Dirección */}
          <div className="space-y-2">
            <Label htmlFor="address" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Dirección
            </Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Ej: Calle 10 # 20-30"
              rows={3}
            />
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
            <Button
              onClick={onClose}
              variant="outline"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {store ? 'Actualizar' : 'Crear'} Tienda
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
