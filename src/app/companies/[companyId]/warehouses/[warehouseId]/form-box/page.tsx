"use client"

import { useParams } from 'next/navigation'
import BoxForm from "app/components/box/BoxForm"

export default function FormBoxPage() {
  const params = useParams()
  const companyId = params.companyId as string
  const warehouseId = params.warehouseId as string

  if (!companyId || !warehouseId) {
    return <div>Error: Company ID or Warehouse ID not found</div>
  }

  return (
    <div className="container mx-auto px-4 py-2">
      <h1 className="text-2xl font-bold mb-1">Add New Box</h1>
      <BoxForm companyId={companyId} warehouseId={warehouseId} />
    </div>
  ) 
}