'use client'

import { useParams } from 'next/navigation'
import UpdateBoxForm from 'app/components/box/UpdateBox'

export default function UpdateBoxPage() {
  const params = useParams()
  const warehouseId = params.warehouseId as string
  const boxId = params.boxId as string

  if (!warehouseId || !boxId) {
    return <div>Error: Warehouse ID or Box ID not found</div>
  }

  return (
    <div className="container mx-auto px-4 py-2">
      <UpdateBoxForm boxId={boxId} warehouseId={warehouseId} />
    </div>
  )
}