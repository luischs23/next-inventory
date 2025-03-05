import { useState, useEffect } from 'react';

export function usePermissions(actions: string | string[]) {
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const res = await fetch('/api/permissions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Para incluir cookies en la petición
          body: JSON.stringify({ actions }),
        });

        const data = await res.json();
        setHasPermission(data.hasPermission);
      } catch (error) {
        console.error('Error checking permissions:', error);
      }
    };

    checkPermissions();
  }, [actions]);

  return { hasPermission };
}
