'use client'

import { useParams, useSearchParams } from 'next/navigation'
import { ProductFormComponent } from 'app/components/product/ProductForm'

export default function FormProductPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const companyId = params?.companyId as string
  const warehouseId = params?.warehouseId as string
  const isBox = searchParams.get('isBox') === 'true'

  if (!companyId || !warehouseId) {
    return <div>Loading...</div>
  }

  return (
    <div className='container mx-auto px-4 mt-4 mb-20'>
      <ProductFormComponent companyId={companyId} warehouseId={warehouseId} isBox={isBox} />
    </div>
  )
}