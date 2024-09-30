"use client"

import { useParams } from 'next/navigation'
import InactiveInventoryComponent from "app/components/inventory-dashboard"

export default function InventoryPage() {
  const params = useParams()
  const warehouseId = params.id as string

  return (
    <div>
      <section>
        <InactiveInventoryComponent warehouseId={warehouseId} />
      </section>
    </div>
  )
}