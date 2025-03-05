"use client";

import type React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "app/app/context/AuthContext";
import { useEffect, useState } from "react";

type WithPermissionProps = {
  hasPermission: (action: string) => boolean;
};

export function withPermission<P extends object>(
  WrappedComponent: React.ComponentType<P & WithPermissionProps>,
  requiredPermissions: string[],
) {
  return function PermissionWrapper(props: P) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [hasPermission, setHasPermission] = useState<(action: string) => boolean>(() => () => false);

    useEffect(() => {
      if (!loading) {
        if (!user) {
          router.push("/login");
        } else {
          // Obtener permisos del usuario
          const userPermissions = user?.role ? getPermissions(user.role) : [];
          const isAuthorized = (action: string) => userPermissions.includes(action);
          setHasPermission(() => isAuthorized);

          if (!requiredPermissions.some(isAuthorized)) {
            router.push("/unauthorized");
          }
        }
      }
    }, [user, loading, router, requiredPermissions]);

    if (loading) {
      return <div>Loading...</div>;
    }

    if (!user || !requiredPermissions.some((perm) => hasPermission(perm))) {
      return null;
    }

    return <WrappedComponent {...props} hasPermission={hasPermission} />;
  };
}

// Mapeo de permisos en el frontend
const rolePermissions: Record<string, string[]> = {
  developer: ["create", "read", "update", "delete", "ska", "companies"],
  general_manager: ["create", "read", "update", "delete", "ska"],
  warehouse_manager: ["create", "read", "update", "ska"],
  warehouse_salesperson: ["warehouse_salesperson", "read", "ska"],
  pos_salesperson: ["pos_salesperson", "read", "ska"],
  skater: ["skater", "read"],
  customer: ["customer"],
};

function getPermissions(role: string): string[] {
  return rolePermissions[role] || [];
}