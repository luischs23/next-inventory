"use client"

import { useParams } from 'next/navigation'
import BoxForm from "app/components/box/BoxForm"

export default function FormBoxPage() {
  const params = useParams()
  const warehouseId = params.warehouseId as string

  if (!warehouseId) {
    return <div>Error: Warehouse ID not found</div>
  }

  return (
    <div>
      <BoxForm warehouseId={warehouseId} />
    </div>
  )
}