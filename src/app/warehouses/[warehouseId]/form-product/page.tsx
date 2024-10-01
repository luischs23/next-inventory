"use client"

import { useParams } from 'next/navigation'
import { ProductForm } from "app/components/product/ProductForm"

export default function FormProductPage() {
  const params = useParams()
  const warehouseId = params.id as string

  if (!warehouseId) {
    return <div>Error: Warehouse ID not found</div>
  }

  return (
    <div>
      <ProductForm warehouseId={warehouseId} />
    </div>
  )
}