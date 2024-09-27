'use client'

import { useParams, useSearchParams } from 'next/navigation'
import UpdateProductComponent from 'app/components/update-product-component'

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
      <UpdateProductComponent productId={productId} warehouseId={warehouseId} />
    </div>
  )
}