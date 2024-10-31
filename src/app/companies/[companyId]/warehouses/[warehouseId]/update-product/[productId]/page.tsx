'use client'

import { useParams } from 'next/navigation'
import UpdateProduct from 'app/components/product/UpdateProduct'

export default function UpdateProductPage() {
  const params = useParams()  
  const companyId = params.companyId as string
  const productId = params.productId as string
  const warehouseId = params.warehouseId as string


  if (!companyId || !warehouseId || !productId) {
    return (
      <div className="container mx-auto mt-8 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
        <h2 className="text-lg font-semibold mb-2">Error</h2>
        <p>Missing company ID, warehouse ID, or product ID. Please check the URL and try again.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto pb-16">
      <UpdateProduct 
        companyId={companyId} 
        productId={productId} 
        warehouseId={warehouseId} 
      />
    </div>
  )
}