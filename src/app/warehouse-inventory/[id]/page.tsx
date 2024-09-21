'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { db } from 'app/services/firebase/firebase.config'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'
import { Button } from "app/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "app/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "app/components/ui/card"
import Image from 'next/image'

interface Box {
  id: string
  brand: string
  reference: string
  color: string
  quantity: number
  imageUrl: string
}

interface Warehouse {
  id: string
  name: string
}

export default function WarehouseInventoryPage({ params }: { params: { id: string } }) {
  const [boxes, setBoxes] = useState<Box[]>([])
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null)
  const router = useRouter()

  useEffect(() => {
    const fetchWarehouseAndBoxes = async () => {
      // Fetch warehouse data
      const warehouseDoc = await getDoc(doc(db, 'warehouses', params.id))
      if (warehouseDoc.exists()) {
        setWarehouse({ id: warehouseDoc.id, name: warehouseDoc.data().name })
      }

      // Fetch boxes for this warehouse
      const boxesQuery = query(collection(db, 'boxes'), where('warehouseId', '==', params.id))
      const boxesSnapshot = await getDocs(boxesQuery)
      const boxesList = boxesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Box))
      setBoxes(boxesList)
    }

    fetchWarehouseAndBoxes()
  }, [params.id])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Box Inventory ({warehouse?.name})</h1>
        <Button onClick={() => router.push(`/form-box?warehouseId=${params.id}`)}>
          Add Box
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Boxes in this Warehouse</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Color</TableHead>
                <TableHead>Quantity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {boxes.map((box) => (
                <TableRow key={box.id}>
                  <TableCell>
                    {box.imageUrl && (
                      <Image
                        src={box.imageUrl}
                        alt={`${box.brand} ${box.reference}`}
                        width={50}
                        height={50}
                        className="object-cover rounded"
                      />
                    )}
                  </TableCell>
                  <TableCell>{box.brand}</TableCell>
                  <TableCell>{box.reference}</TableCell>
                  <TableCell>{box.color}</TableCell>
                  <TableCell>{box.quantity}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}