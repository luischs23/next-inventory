"use client"

import { useParams } from 'next/navigation'
import ParesInventoryComponent from "app/components/warehouse/ParesInventory"

export default function InventoryPage() {
  const params = useParams()
  const companyId = params?.companyId as string
  const warehouseId = params?.warehouseId as string

  // Convertir hasPermission a booleano
  const hasPermissionParam = params?.hasPermission
  const hasPermissionBoolean = hasPermissionParam === "true"

  // Crear la función de permisos
  const hasPermission = () => hasPermissionBoolean

  if (!companyId || !warehouseId) {
    return <div>Loading...</div>
  }

  return (
    <div className='mb-14'>
      <section>
        <ParesInventoryComponent companyId={companyId} warehouseId={warehouseId} hasPermission={hasPermission} />
      </section>
    </div>
  )
}