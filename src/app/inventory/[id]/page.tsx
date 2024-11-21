"use client"

import { useParams } from 'next/navigation'
import InventoryDashboardComponent from "app/components/inventory-dashboard"

export default function InventoryPage() {
  const params = useParams()
  const warehouseId = params.id as string

  return (
    <div>
      <section>
        <InventoryDashboardComponent warehouseId={warehouseId} />
      </section>
    </div>
  )
}