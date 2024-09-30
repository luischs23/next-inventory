"use client"

import { useParams } from 'next/navigation'
import InventoryDashboard from "app/components/inventory-dashboard"

export default function InventoryPage() {
  const params = useParams()
  const id = params?.id as string

  if (!id) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <section>
        <InventoryDashboard params={{ id }} />
      </section>
    </div>
  )
}