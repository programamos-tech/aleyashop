'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  X, 
  User, 
  Building2,
  Mail,
  Phone,
  MapPin,
  Users
} from 'lucide-react'
import { Client } from '@/types'

interface ClientModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (client: Omit<Client, 'id'>) => void
  client?: Client | null
}

export function ClientModal({ isOpen, onClose, onSave, client }: ClientModalProps) {
  const [formData, setFormData] = useState({
    name: client?.name || '',
    email: client?.email || '',
    phone: client?.phone || '',
    whatsapp: client?.whatsapp || '',
    document: client?.document || '',
    address: client?.address || '',
    referencePoint: client?.referencePoint || '',
    city: client?.city || '',
    state: client?.state || '',
    type: 'cliente' as const,
    status: client?.status || 'active'
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Actualizar formulario cuando cambie el cliente
  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name || '',
        email: client.email || '',
        phone: client.phone || '',
        whatsapp: client.whatsapp || '',
        document: client.document || '',
        address: client.address || '',
        referencePoint: client.referencePoint || '',
        city: client.city || '',
        state: client.state || '',
        type: 'cliente',
        status: client.status || 'active'
      })
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        whatsapp: '',
        document: '',
        address: '',
        referencePoint: '',
        city: '',
        state: '',
        type: 'cliente',
        status: 'active'
      })
    }
    setErrors({})
  }, [client])

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'mayorista':
        return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-600'
      case 'minorista':
        return 'bg-[#fce4f0] text-[#d06a98] border-[#f29fc8] dark:bg-[#f29fc8]/30 dark:text-[#f29fc8] dark:border-[#f29fc8]'
      case 'consumidor_final':
        return 'bg-[#fce4f0] text-[#d06a98] border-[#f29fc8] dark:bg-[#f29fc8]/30 dark:text-[#f29fc8] dark:border-[#f29fc8]'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'mayorista':
        return 'Mayorista'
      case 'minorista':
        return 'Minorista'
      case 'consumidor_final':
        return 'Cliente Final'
      default:
        return type
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'mayorista':
        return Building2
      case 'minorista':
        return Building2
      case 'consumidor_final':
        return User
      default:
        return User
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    // Nombre obligatorio
    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido'
    }

    // Cédula/NIT obligatorio
    if (!formData.document.trim()) {
      newErrors.document = 'La cédula/NIT es obligatoria'
    }

    // Validar email solo si se proporciona y no es 'N/A'
    const emailValue = formData.email.trim()
    if (emailValue && emailValue.toLowerCase() !== 'n/a' && !/\S+@\S+\.\S+/.test(emailValue)) {
      newErrors.email = 'El email no es válido'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = () => {
    if (validateForm()) {
      // Manejar email vacío o 'N/A' - convertir a string vacío para que el servicio lo maneje
      const emailValue = formData.email.trim()
      const processedEmail = emailValue && emailValue.toLowerCase() !== 'n/a' ? emailValue : ''

      const clientData: Omit<Client, 'id'> = {
        name: formData.name.trim(),
        email: processedEmail,
        phone: formData.whatsapp.trim(), // WhatsApp es el teléfono principal
        whatsapp: formData.whatsapp.trim(),
        document: formData.document.trim(),
        address: formData.address.trim(),
        referencePoint: formData.referencePoint.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        type: 'cliente',
        status: formData.status,
        creditLimit: 0, // Se maneja en el módulo de pagos
        currentDebt: 0, // Se maneja en el módulo de pagos
        points: 0, // Se calcula automáticamente
        createdAt: new Date().toISOString()
      }

      onSave(clientData)
      handleClose()
    }
  }

  const handleClose = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      whatsapp: '',
      document: '',
      address: '',
      referencePoint: '',
      city: '',
      state: '',
      type: 'cliente',
      status: 'active'
    })
    setErrors({})
    onClose()
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  if (!isOpen) return null

  const TypeIcon = getTypeIcon(formData.type)
  const isEdit = !!client

  return (
    <div className="fixed inset-0 xl:left-56 bg-white/70 dark:bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-none xl:rounded-2xl shadow-2xl w-full h-full xl:h-[calc(98vh-4rem)] xl:w-[calc(100vw-18rem)] xl:max-h-[calc(98vh-4rem)] xl:max-w-[calc(100vw-18rem)] overflow-hidden flex flex-col border-0 xl:border border-gray-200 dark:border-gray-700 relative z-[10000]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 bg-[#fce4f0] dark:bg-[#f29fc8]/20">
          <div className="flex items-center space-x-3">
            <Users className="h-5 w-5 md:h-6 md:w-6 text-[#f29fc8]" />
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                {isEdit ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h2>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300">
                {isEdit ? 'Modifica la información del cliente' : 'Agrega un nuevo cliente al sistema'}
              </p>
            </div>
          </div>
          <Button
            onClick={handleClose}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white" />
          </Button>
        </div>

        <div className="p-4 md:p-6 overflow-y-auto flex-1 bg-white dark:bg-gray-900 min-h-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {/* Información Básica */}
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-gray-900 dark:text-white flex items-center">
                  <User className="h-5 w-5 mr-2 text-[#f29fc8]" />
                  Información Básica
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nombre del Cliente *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-[#fce4f0]0 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 ${
                      errors.name ? 'border-[#f29fc8]' : 'border-gray-600'
                    }`}
                    placeholder="Ingresa el nombre del cliente"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-[#f29fc8]">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tipo de Cliente
                  </label>
                  <div className="flex space-x-3">
                            {[
                              { value: 'mayorista', label: 'Mayorista' },
                              { value: 'minorista', label: 'Minorista' },
                              { value: 'consumidor_final', label: 'Consumidor Final' }
                            ].map((type) => {
                              const Icon = getTypeIcon(type.value)
                              return (
                                <button
                                  key={type.value}
                                  onClick={() => handleInputChange('type', type.value)}
                                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-all ${
                                    formData.type === type.value
                                      ? 'border-[#fce4f0]0 bg-[#f29fc8] text-white'
                                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                                  }`}
                                >
                                  <Icon className={`h-4 w-4 ${
                                    formData.type === type.value ? 'text-white' : 'text-gray-500 dark:text-gray-400'
                                  }`} />
                                  <span className="text-sm font-medium">{type.label}</span>
                                </button>
                              )
                            })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Información de Contacto */}
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-gray-900 dark:text-white flex items-center">
                  <Mail className="h-5 w-5 mr-2 text-[#f29fc8]" />
                  Información de Contacto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Cédula/NIT *
                  </label>
                  <input
                    type="text"
                    value={formData.document}
                    onChange={(e) => handleInputChange('document', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-[#fce4f0]0 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 ${
                      errors.document ? 'border-[#f29fc8]' : 'border-gray-600'
                    }`}
                    placeholder="12345678-9 o 900123456-7"
                  />
                  {errors.document && (
                    <p className="mt-1 text-sm text-[#f29fc8]">{errors.document}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={formData.whatsapp}
                    onChange={(e) => handleInputChange('whatsapp', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-[#fce4f0]0 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400"
                    placeholder="+57 300 123 4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email <span className="text-gray-500 text-xs">(opcional)</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-[#fce4f0]0 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 ${
                      errors.email ? 'border-[#f29fc8]' : 'border-gray-600'
                    }`}
                    placeholder="cliente@ejemplo.com o déjalo vacío"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-[#f29fc8]">{errors.email}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Si no tienes email, déjalo vacío o escribe "N/A"
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Información de Ubicación */}
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-gray-900 dark:text-white flex items-center">
                  <MapPin className="h-5 w-5 mr-2 text-[#f29fc8]" />
                  Información de Ubicación
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Dirección
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-[#fce4f0]0 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 ${
                      errors.address ? 'border-[#f29fc8]' : 'border-gray-600'
                    }`}
                    placeholder="Calle 30 #25-15, Barrio La Palma"
                  />
                  {errors.address && (
                    <p className="mt-1 text-sm text-[#f29fc8]">{errors.address}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Punto de Referencia <span className="text-gray-500 text-xs">(para domicilios)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.referencePoint}
                    onChange={(e) => handleInputChange('referencePoint', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-[#fce4f0]0 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400"
                    placeholder="Ej: Casa esquinera blanca, frente al parque"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Ciudad
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-[#fce4f0]0 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 ${
                        errors.city ? 'border-[#f29fc8]' : 'border-gray-600'
                      }`}
                      placeholder="Sincelejo"
                    />
                    {errors.city && (
                      <p className="mt-1 text-sm text-[#f29fc8]">{errors.city}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Estado
                    </label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-[#fce4f0]0 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 ${
                        errors.state ? 'border-[#f29fc8]' : 'border-gray-600'
                      }`}
                      placeholder="Sucre"
                    />
                    {errors.state && (
                      <p className="mt-1 text-sm text-[#f29fc8]">{errors.state}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Estado */}
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-gray-900 dark:text-white flex items-center">
                  <Phone className="h-5 w-5 mr-2 text-[#f29fc8]" />
                  Estado del Cliente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="status"
                      value="active"
                      checked={formData.status === 'active'}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      className="h-4 w-4 text-[#f29fc8] focus:ring-[#fce4f0]0 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">Activo</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="status"
                      value="inactive"
                      checked={formData.status === 'inactive'}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      className="h-4 w-4 text-[#f29fc8] focus:ring-[#fce4f0]0 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">Inactivo</span>
                  </label>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-4 p-4 md:p-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 sticky bottom-0 z-10 flex-shrink-0" style={{ paddingBottom: `calc(max(56px, env(safe-area-inset-bottom)) + 1rem)` }}>
          <Button
            onClick={handleClose}
            variant="outline"
            className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            className="bg-[#f29fc8] hover:bg-[#e07ab0] text-white font-medium px-6 py-2 shadow-md"
          >
            {isEdit ? 'Actualizar Cliente' : 'Crear Cliente'}
          </Button>
        </div>
      </div>
    </div>
  )
}
