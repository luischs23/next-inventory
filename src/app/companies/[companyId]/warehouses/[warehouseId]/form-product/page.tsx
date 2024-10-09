"use client"

import { useParams } from 'next/navigation'
import  {ProductFormComponent}  from "app/components/product/ProductForm"

export default function FormProductPage() {
  const params = useParams()
  const warehouseId = params.warehouseId as string

  if (!warehouseId) {
    return <div>Error: Warehouse ID not found</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Add New Product</h1>
      <ProductFormComponent warehouseId={warehouseId} />
    </div>
  )
}