'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Eye, EyeOff, Loader2, Mail, Lock } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

const loginSchema = z.object({
  email: z.string().email('Email inválido').min(1, 'Email es requerido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres')
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const { login, isLoading } = useAuth()
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema)
  })

  const onSubmit = async (data: LoginFormData) => {
    setError('')
    const success = await login(data.email, data.password)
    
    if (success) {
      router.push('/inventory/products')
    } else {
      setError('Credenciales inválidas. Verifica tu email y contraseña.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#fce4f0] via-white to-[#fef0f5] dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <div className="w-full max-w-md">
        {/* Logo y Título */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <img 
                src="/logo.jpeg" 
                alt="Aleya Shop Logo"
                className="w-20 h-20 rounded-xl shadow-lg object-cover"
              />
              <div className="absolute -top-2 -right-2 h-6 w-6 bg-[#f29fc8] rounded-full flex items-center justify-center">
                <div className="h-2 w-2 bg-white rounded-full"></div>
              </div>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Aleya Shop
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Sistema de Gestión de Inventario y Ventas
          </p>
        </div>

        {/* Formulario de Login */}
        <Card className="border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-xl">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
              Iniciar Sesión
            </CardTitle>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Ingresa tus credenciales para acceder al sistema
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Email */}
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="usuario@aleyashop.com"
                    className="pl-10 border-gray-300 dark:border-gray-600 focus:border-[#f29fc8] focus:ring-[#f29fc8]"
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Contraseña */}
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="pl-10 pr-10 border-gray-300 dark:border-gray-600 focus:border-[#f29fc8] focus:ring-[#f29fc8]"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
                  <AlertDescription className="text-red-800 dark:text-red-200">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {/* Botón de Login */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#f29fc8] hover:bg-[#e07ab0] text-white font-semibold py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Iniciando sesión...
                  </>
                ) : (
                  'Iniciar Sesión'
                )}
              </Button>
            </form>

            {/* Información de Demo - Oculto en producción */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-6 p-4 bg-[#fce4f0] dark:bg-[#f29fc8]/20 rounded-lg border border-[#f29fc8]/30 dark:border-[#f29fc8]/50">
                <h3 className="text-sm font-semibold text-[#d06a98] dark:text-[#f29fc8] mb-2">
                  Credenciales de Demo
                </h3>
                <div className="text-xs text-[#c45a88] dark:text-[#f29fc8]/80 space-y-1">
                  <p><strong>Email:</strong> admin@aleyashop.com</p>
                  <p><strong>Contraseña:</strong> admin123</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500 dark:text-gray-400">
          <p>© 2026 Aleya Shop. Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  )
}
