'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { db } from 'app/services/firebase/firebase.config'
import { collection, query, where, getDocs, doc, getDoc, deleteDoc } from 'firebase/firestore'
import { Button } from "app/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "app/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "app/components/ui/card"
import { toast } from "app/components/ui/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "app/components/ui/alert-dialog"
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
  const [boxToDelete, setBoxToDelete] = useState<Box | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchWarehouseAndBoxes()
  }, [params.id])

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

  const handleDelete = async () => {
    if (boxToDelete) {
      try {
        await deleteDoc(doc(db, 'boxes', boxToDelete.id))
        toast({
          title: "Success",
          description: `Box ${boxToDelete.brand} ${boxToDelete.reference} has been deleted successfully.`,
        })
        fetchWarehouseAndBoxes() // Refresh the list
      } catch (error) {
        console.error('Error deleting box:', error)
        toast({
          title: "Error",
          description: `Failed to delete the box ${boxToDelete.brand} ${boxToDelete.reference}. Please try again.`,
          variant: "destructive",
        })
      }
      setBoxToDelete(null)
    }
  }

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
                <TableHead>Actions</TableHead>
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
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => router.push(`/update-box/${box.id}?warehouseId=${params.id}`)}
                      >
                        Update
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => setBoxToDelete(box)}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!boxToDelete} onOpenChange={() => setBoxToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the box
              <span className="font-semibold"> {boxToDelete?.brand} {boxToDelete?.reference} </span>
              with color
              <span className="font-semibold"> {boxToDelete?.color} </span>
              from the warehouse.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}