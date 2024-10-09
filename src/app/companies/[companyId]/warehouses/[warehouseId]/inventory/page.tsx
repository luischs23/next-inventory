'use client'

import { useParams } from 'next/navigation'
import WarehouseInventoryComponent from 'app/components/warehouse/WarehouseInventory'

export default function WarehouseInventoryPage() {
  const params = useParams()
  const companyId = params?.companyId as string
  const warehouseId = params?.warehouseId as string

  if (!companyId || !warehouseId) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <WarehouseInventoryComponent companyId={companyId} warehouseId={warehouseId} />
    </div>
  )
}