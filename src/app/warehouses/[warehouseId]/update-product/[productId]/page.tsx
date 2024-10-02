'use client'

import { useParams } from 'next/navigation'
import UpdateProduct from 'app/components/product/UpdateProduct'

export default function UpdateProductPage() {
  const params = useParams()
  
  const productId = params.productId as string
  const warehouseId = params.warehouseId as string

  if (!productId || !warehouseId) {
    return <div>Error: Missing product ID or warehouse ID</div>
  }

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-2xl font-bold mb-4">Update Product</h1>
      <UpdateProduct productId={productId} warehouseId={warehouseId} />
    </div>
  )
}