import { useAuth } from 'app/app/context/AuthContext'

// Define permissions for each role
const rolePermissions = {
  developer: ['create', 'read', 'update', 'delete', 'ska'],
  general_manager: ['create', 'read', 'update', 'delete', 'ska'],
  warehouse_manager: ['create', 'read', 'update', 'ska'],
  warehouse_salesperson: ['warehouse_salesperson', 'read', 'ska'],
  pos_salesperson: ['pos_salesperson', 'read', 'ska'],
  skater: ['skater', 'read'],
  customer: ['customer'],
} 

type Action = 'create' | 'read' | 'update' | 'delete' | 'skater' | 'ska' | 'warehouse_salesperson' | 'pos_salesperson' | 'customer'

export function usePermissions() {
  const { user } = useAuth()

  const hasPermission = (actions: Action | Action[] | string | string[]): boolean => {
    if (!user) return false

    // Grant all permissions to developers
    if (user.isDeveloper) {
      return true
    }

    // Check permissions based on user role
    if (user.role) {
      const permissions = rolePermissions[user.role as keyof typeof rolePermissions]
      if (permissions) {
        if (Array.isArray(actions)) {
          return actions.some(action => permissions.includes(action))
        }
        return permissions.includes(actions)
      }
    }

    return false
  }

  return { hasPermission }
}