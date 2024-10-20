"use client"

import { useParams } from 'next/navigation'
import  {ProductFormComponent}  from "app/components/product/ProductForm"

export default function FormProductPage() {
  const params = useParams()
  const warehouseId = params.warehouseId as string
  const companyId = params.companyId as string

  if (!warehouseId) {
    return <div>Error: Warehouse ID not found</div>
  }

  return (
    <div className="container mx-auto px-4 mt-4 mb-20">
      <ProductFormComponent warehouseId={warehouseId} companyId={companyId} />
    </div>
  )
}