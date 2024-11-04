import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from 'app/app/context/AuthContext'
import { usePermissions } from 'app/hooks/useAuthAndPermissions'

export function useRouteProtection(requiredPermission?: string) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, loading } = useAuth()
  const { hasPermission, canAccessRoute } = usePermissions()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (requiredPermission && !hasPermission(requiredPermission)) {
        router.push('/unauthorized');
      } else if (pathname && !canAccessRoute(pathname)) {
        router.push('/unauthorized');
      }
    }
  }, [user, loading, requiredPermission, hasPermission, canAccessRoute, router, pathname]);

  return { 
    isAuthorized: !loading && !!user && (!requiredPermission || hasPermission(requiredPermission)),
    isLoading: loading
  };
}