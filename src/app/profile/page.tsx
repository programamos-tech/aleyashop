'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'
import { LogOut, Mail, Shield, Calendar, Clock, ChevronRight } from 'lucide-react'
import { RoleProtectedRoute } from '@/components/auth/role-protected-route'

export default function ProfilePage() {
  const { user, logout } = useAuth()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  const getRoleLabel = (role: string) => {
    const roles: Record<string, string> = {
      superadmin: 'Super Admin',
      admin: 'Administrador',
      vendedor: 'Vendedor',
      inventario: 'Inventario',
      contador: 'Contador'
    }
    return roles[role] || 'Usuario'
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const formatTime = (dateString?: string) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  if (!user) {
    return (
      <RoleProtectedRoute module="dashboard" requiredAction="view">
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-gray-300 dark:border-gray-600 border-t-[#f29fc8] rounded-full animate-spin"></div>
        </div>
      </RoleProtectedRoute>
    )
  }

  return (
    <RoleProtectedRoute module="dashboard" requiredAction="view">
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
        <div className="max-w-lg mx-auto">
          
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Perfil</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Gestiona tu cuenta</p>
          </div>

          {/* Profile Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            
            {/* Avatar Section */}
            <div className="p-6 pb-4 flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-[#f29fc8] to-[#d06a98] rounded-2xl flex items-center justify-center shadow-sm">
                <span className="text-xl font-bold text-white">{getInitials(user.name)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">{user.name}</h2>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                  {getRoleLabel(user.role)}
                </span>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-gray-100 dark:bg-gray-700 mx-6"></div>

            {/* Info List */}
            <div className="p-2">
              {/* Email */}
              <div className="flex items-center gap-3 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 dark:text-gray-500">Email</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.email}</p>
                </div>
              </div>

              {/* Role */}
              <div className="flex items-center gap-3 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 dark:text-gray-500">Rol</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{getRoleLabel(user.role)}</p>
                </div>
              </div>

              {/* Last Login */}
              <div className="flex items-center gap-3 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 dark:text-gray-500">Último acceso</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatDate(user.lastLogin)} <span className="text-gray-400 dark:text-gray-500 font-normal">{formatTime(user.lastLogin)}</span>
                  </p>
                </div>
              </div>

              {/* Account Created */}
              <div className="flex items-center gap-3 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 dark:text-gray-500">Miembro desde</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatDate(user.createdAt)} <span className="text-gray-400 dark:text-gray-500 font-normal">{formatTime(user.createdAt)}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Permissions */}
            {user.permissions && user.permissions.length > 0 && (
              <>
                <div className="h-px bg-gray-100 dark:bg-gray-700 mx-6"></div>
                <div className="p-4 px-6">
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">Accesos</p>
                  <div className="flex flex-wrap gap-2">
                    {user.permissions.map((permission, index) => (
                      <span
                        key={index}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                      >
                        {permission.module}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Divider */}
            <div className="h-px bg-gray-100 dark:bg-gray-700 mx-6"></div>

            {/* Logout */}
            <div className="p-4">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/10 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 group-hover:bg-red-100 dark:group-hover:bg-red-900/20 flex items-center justify-center transition-colors">
                    <LogOut className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium">Cerrar sesión</span>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-300 dark:text-gray-600 group-hover:text-red-400" />
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-6">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              aleyashop v1.0
            </p>
          </div>
        </div>
      </div>
    </RoleProtectedRoute>
  )
}
