'use client'

import { useParams, useSearchParams } from 'next/navigation'
import UpdateProduct from 'app/components/product/UpdateProduct'

export default function UpdateProductPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  
  const productId = params.id as string
  const warehouseId = searchParams.get('warehouseId')

  if (!productId || !warehouseId) {
    return <div>Error: Missing product ID or warehouse ID</div>
  }

  return (
    <div className="container mx-auto px-4">
      <UpdateProduct productId={productId} warehouseId={warehouseId} />
    </div>
  )
}