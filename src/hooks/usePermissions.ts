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
    if (!user) return false

    // Grant all permissions to developers
    if (user.isDeveloper) {
      return true
    }

    // Check permissions based on user role
    if (user.role) {
      const permissions = rolePermissions[user.role as keyof typeof rolePermissions]
      return permissions ? permissions.includes(action) : false
    }

    return false
  }

  return { hasPermission }
}