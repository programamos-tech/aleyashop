'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { 
  X, 
  User, 
  Phone,
  MapPin,
  Mail,
  FileText,
  Navigation
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
    document: client?.document || '',
    address: client?.address || '',
    referencePoint: client?.referencePoint || '',
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
        document: client.document || '',
        address: client.address || '',
        referencePoint: client.referencePoint || '',
        status: client.status || 'active'
      })
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        document: '',
        address: '',
        referencePoint: '',
        status: 'active'
      })
    }
    setErrors({})
  }, [client])

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
      const emailValue = formData.email.trim()
      const processedEmail = emailValue && emailValue.toLowerCase() !== 'n/a' ? emailValue : ''

      const clientData: Omit<Client, 'id'> = {
        name: formData.name.trim(),
        email: processedEmail,
        phone: formData.phone.trim(),
        whatsapp: formData.phone.trim(),
        document: formData.document.trim(),
        address: formData.address.trim(),
        referencePoint: formData.referencePoint.trim(),
        city: '',
        state: '',
        type: 'cliente',
        status: formData.status,
        creditLimit: 0,
        currentDebt: 0,
        points: 0,
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
      document: '',
      address: '',
      referencePoint: '',
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

  const isEdit = !!client

  return (
    <div className="fixed inset-0 xl:left-56 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-[#fce4f0] dark:bg-[#f29fc8]/20">
          <div className="flex items-center space-x-3">
            <User className="h-5 w-5 text-[#f29fc8]" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {isEdit ? 'Editar Cliente' : 'Nuevo Cliente'}
            </h2>
          </div>
          <Button
            onClick={handleClose}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-white/50"
          >
            <X className="h-5 w-5 text-gray-600" />
          </Button>
        </div>

        {/* Form */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* Nombre */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              <User className="h-4 w-4 mr-2 text-[#f29fc8]" />
              Nombre del Cliente *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-[#f29fc8] focus:border-[#f29fc8] text-gray-900 dark:text-white bg-white dark:bg-gray-800 ${
                errors.name ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Nombre completo"
            />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
          </div>

          {/* Cédula/NIT */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              <FileText className="h-4 w-4 mr-2 text-[#f29fc8]" />
              Cédula/NIT *
            </label>
            <input
              type="text"
              value={formData.document}
              onChange={(e) => handleInputChange('document', e.target.value)}
              className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-[#f29fc8] focus:border-[#f29fc8] text-gray-900 dark:text-white bg-white dark:bg-gray-800 ${
                errors.document ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="12345678"
            />
            {errors.document && <p className="mt-1 text-xs text-red-500">{errors.document}</p>}
          </div>

          {/* WhatsApp */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              <Phone className="h-4 w-4 mr-2 text-[#f29fc8]" />
              WhatsApp
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#f29fc8] focus:border-[#f29fc8] text-gray-900 dark:text-white bg-white dark:bg-gray-800"
              placeholder="+57 300 123 4567"
            />
          </div>

          {/* Email */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              <Mail className="h-4 w-4 mr-2 text-[#f29fc8]" />
              Email <span className="text-gray-400 text-xs ml-1">(opcional)</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-[#f29fc8] focus:border-[#f29fc8] text-gray-900 dark:text-white bg-white dark:bg-gray-800 ${
                errors.email ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="cliente@email.com"
            />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
          </div>

          {/* Dirección */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              <MapPin className="h-4 w-4 mr-2 text-[#f29fc8]" />
              Dirección
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#f29fc8] focus:border-[#f29fc8] text-gray-900 dark:text-white bg-white dark:bg-gray-800"
              placeholder="Calle 30 #25-15, Barrio La Palma"
            />
          </div>

          {/* Punto de Referencia */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              <Navigation className="h-4 w-4 mr-2 text-[#f29fc8]" />
              Punto de Referencia <span className="text-gray-400 text-xs ml-1">(para domicilios)</span>
            </label>
            <input
              type="text"
              value={formData.referencePoint}
              onChange={(e) => handleInputChange('referencePoint', e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#f29fc8] focus:border-[#f29fc8] text-gray-900 dark:text-white bg-white dark:bg-gray-800"
              placeholder="Ej: Casa esquinera blanca, frente al parque"
            />
          </div>

          {/* Estado */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Estado del cliente</span>
            <div className="flex items-center space-x-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="active"
                  checked={formData.status === 'active'}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="h-4 w-4 text-[#f29fc8] focus:ring-[#f29fc8] border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Activo</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="inactive"
                  checked={formData.status === 'inactive'}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="h-4 w-4 text-[#f29fc8] focus:ring-[#f29fc8] border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Inactivo</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <Button
            onClick={handleClose}
            variant="outline"
            className="border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            className="bg-[#f29fc8] hover:bg-[#e07ab0] text-white font-medium px-6"
          >
            {isEdit ? 'Guardar' : 'Crear Cliente'}
          </Button>
        </div>
      </div>
    </div>
  )
}
