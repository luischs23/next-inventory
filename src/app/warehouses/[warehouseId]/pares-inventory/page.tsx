"use client"

import { useParams } from 'next/navigation'
import ParesInventory from "app/components/warehouse/ParesInventory"

export default function InventoryPage() {
  const params = useParams()
  const warehouseId = params?.warehouseId as string

  if (!warehouseId) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <section>
        <ParesInventory params={{ id: warehouseId }} />
      </section>
    </div>
  )
}