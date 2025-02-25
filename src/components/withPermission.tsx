"use client"

import type React from "react"

import { useRouter } from "next/navigation"
import { usePermissions } from "app/hooks/usePermissions"
import { useAuth } from "app/app/context/AuthContext"
import { useEffect } from "react"

export function withPermission<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  requiredPermissions: string[],
) {
  return function PermissionWrapper(props: P) {
    const { hasPermission } = usePermissions()
    const { user, loading } = useAuth()
    const router = useRouter()

    useEffect(() => {
      if (!loading) {
        if (!user) {
          router.push("/login")
        } else if (!hasPermission(requiredPermissions)) {
          router.push("/unauthorized")
        }
      }
    }, [user, loading, hasPermission, router, requiredPermissions])

    if (loading) {
      return <div>Loading...</div>
    }

    if (!user || !hasPermission(requiredPermissions)) {
      return null
    }

    return <WrappedComponent {...props} />
  }
}
