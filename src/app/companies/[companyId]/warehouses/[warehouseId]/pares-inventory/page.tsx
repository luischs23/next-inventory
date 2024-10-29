"use client"

import { useParams } from 'next/navigation'
import ParesInventory from "app/components/warehouse/ParesInventory"

export default function InventoryPage() {
  const params = useParams()
  const companyId = params?.companyId as string
  const warehouseId = params?.warehouseId as string

  if (!companyId || !warehouseId) {
    return <div>Loading...</div>
  }

  return (
    <div className='mb-14'>
      <section>
        <ParesInventory companyId={companyId} warehouseId={warehouseId} />
      </section>
    </div>
  )
}