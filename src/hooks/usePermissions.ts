import { useAuth } from 'app/app/context/AuthContext'

// Define permissions for each role
const rolePermissions = {
  developer: ['create', 'read', 'update', 'delete'],
  general_manager: ['create', 'read', 'update', 'delete'],
  warehouse_manager: ['create', 'read', 'update'],
  skater: ['read'],
  warehouse_salesperson: ['read'],
  pos_salesperson: ['read'],
  customer: ['read'],
}

export function usePermissions() {
  const { user } = useAuth()

  const hasPermission = (action: string) => {
    if (!user || !user.role) return false
    return rolePermissions[user.role as keyof typeof rolePermissions]?.includes(action) || false
  }

  return { hasPermission }
}