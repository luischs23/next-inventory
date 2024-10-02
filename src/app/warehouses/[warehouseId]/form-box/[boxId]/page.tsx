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
    <div className="container mx-auto px-4 py-2">
      <h1 className="text-2xl font-bold mb-1">Add New Box</h1>
      <BoxForm warehouseId={warehouseId} />
    </div>
  )
}