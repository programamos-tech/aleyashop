'use client'

import { UserManagement } from '@/components/roles/user-management'
import { RoleProtectedRoute } from '@/components/auth/role-protected-route'

export default function RolesPage() {
  return (
    <RoleProtectedRoute module="roles" requiredAction="view">
      <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
        <UserManagement />
      </div>
    </RoleProtectedRoute>
  )
}