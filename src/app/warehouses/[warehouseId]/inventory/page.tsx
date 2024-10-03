'use client'

import { useParams } from 'next/navigation'
import WarehouseInventoryComponent from 'app/components/warehouse/WarehouseInventory'

export default function WarehouseInventoryPage() {
  const params = useParams()
  const warehouseId = params?.warehouseId as string

  if (!warehouseId) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <WarehouseInventoryComponent warehouseId={warehouseId} />
    </div>
  )
}