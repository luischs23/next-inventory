'use client'

import { useParams } from 'next/navigation'
import UpdateBoxForm from 'app/components/box/UpdateBox'

export default function UpdateBoxPage() {
  const params = useParams()
  const warehouseId = params.warehouseId as string
  const boxId = params.boxId as string
  const companyId = params.companyId as string

  if (!warehouseId || !boxId) {
    return <div>Error: Warehouse ID or Box ID not found</div>
  }

  return (
    <div className='mb-12'>
      <UpdateBoxForm companyId={companyId} boxId={boxId} warehouseId={warehouseId} />
    </div>
  )
}