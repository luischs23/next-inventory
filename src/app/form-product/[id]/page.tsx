"use client"

import { useParams } from 'next/navigation'
import { ProductFormComponent } from "app/components/product-form"

export default function FormProductPage() {
  const params = useParams()
  const warehouseId = params.id as string

  if (!warehouseId) {
    return <div>Error: Warehouse ID not found</div>
  }

  return (
    <div>
      <ProductFormComponent warehouseId={warehouseId} />
    </div>
  )
}