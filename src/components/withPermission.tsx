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
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
      if (!loading && user) {
        fetch('/api/permissions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: user.token,
            permissions: requiredPermissions,
          }),
        })
          .then(res => {
            if (!res.ok) {
              throw new Error(`Error ${res.status}: ${res.statusText}`);
            }
            return res.json();
          })
          .then(data => {
            if (data.authorized) {
              // Usar los permisos reales del usuario devueltos por el backend
              const userPermissions = data.permissions || [];
              setHasPermission(() => (action: string) => userPermissions.includes(action));
              setIsAuthorized(true);
            } else {
              router.push("/unauthorized");
            }
          })
          .catch(error => {
            console.error('Error verificando permisos:', error);
            router.push("/unauthorized");
          });
      } else if (!loading && !user) {
        router.push("/login");
      }
    }, [user, loading, router]);

    if (loading || !user) {
      return <div>Loading...</div>;
    }

    if (!isAuthorized) {
      return null;
    }

    return <WrappedComponent {...props} hasPermission={hasPermission} />;
  };
}