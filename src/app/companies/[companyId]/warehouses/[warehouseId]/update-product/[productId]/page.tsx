'use client'

import { useParams } from 'next/navigation'
import UpdateProduct from 'app/components/product/UpdateProduct'

export default function UpdateProductPage() {
  const params = useParams()
  const companyId = params.companyId as string
  const productId = params.productId as string
  const warehouseId = params.warehouseId as string

  if (!companyId || !warehouseId) {
    return <div>Error: Missing product ID or warehouse ID</div>
  }

  return (
    <div className="container mx-auto pb-16">
      <UpdateProduct companyId={companyId} productId={productId} warehouseId={warehouseId} />
    </div>
  )
}