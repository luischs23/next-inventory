import { useAuth } from 'app/app/context/AuthContext'
import { useRouter, usePathname } from 'next/navigation'
import { ReactNode, useCallback, useEffect } from 'react'

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

// Define allowed routes for each role
const roleRoutes = {
  developer: ['/home', '/users', '/settings', '/pares-inventory', '/store', '/companies'],
  general_manager: ['/home', '/users', '/settings', '/pares-inventory', '/store', '/companies'],
  warehouse_manager: ['/home', '/pares-inventory', '/companies'],
  skater: ['/home', '/pares-inventory', '/companies'],
  warehouse_salesperson: ['/home', '/pares-inventory', '/companies'],
  pos_salesperson: ['/home', '/store', '/companies'],
  customer: ['/home'],
}

export function usePermissions() {
  const { user, loading } = useAuth();

  const hasPermission = useCallback((action: string) => {
    if (loading || !user || !user.role) return false;
    return rolePermissions[user.role as keyof typeof rolePermissions]?.includes(action) || false;
  }, [user, loading]);

  const canAccessRoute = useCallback((route: string) => {
    if (!user || !user.role) return false;
    const allowedRoutes = roleRoutes[user.role as keyof typeof roleRoutes] || [];
    return allowedRoutes.some(allowedRoute => route.startsWith(allowedRoute));
  }, [user]);

  return { hasPermission, canAccessRoute }
}

export function useAuthGuard(requiredPermission?: string) {
  const { user } = useAuth()
  const { hasPermission } = usePermissions()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!user) {
      router.push('/login')
    } else if (requiredPermission && !hasPermission(requiredPermission)) {
      router.push('/unauthorized')
    }
  }, [user, requiredPermission, hasPermission, router, pathname])

  return { user, isAuthenticated: !!user }
}

interface ProtectedRouteProps {
  children: ReactNode
  requiredPermission?: string
}

export function ProtectedRoute({ children, requiredPermission }: ProtectedRouteProps) {
  const { user, isAuthenticated } = useAuthGuard(requiredPermission)
  const { canAccessRoute } = usePermissions()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (isAuthenticated && pathname && !canAccessRoute(pathname)) {
      router.push('/unauthorized')
    }
  }, [isAuthenticated, canAccessRoute, pathname, router])

  if (!isAuthenticated) {
    return null // or a loading spinner
  }

  return <>{children}</>
} 

export function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  requiredPermission?: string
) {
  return function WithAuthComponent(props: P) {
    return (
      <ProtectedRoute requiredPermission={requiredPermission}>
        <WrappedComponent {...props} />
      </ProtectedRoute>
    )
  }
}