'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { db } from 'app/services/firebase/firebase.config'
import { collection, getDocs, addDoc } from 'firebase/firestore'
import { Button } from "app/components/ui/button"
import { Card, CardContent } from "app/components/ui/card"
import { Input } from "app/components/ui/input"
import { Label } from "app/components/ui/label"

interface Warehouse {
  id: string
  name: string
}

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [newWarehouseName, setNewWarehouseName] = useState('')
  const router = useRouter()

  useEffect(() => {
    const fetchWarehouses = async () => {
      const warehousesCollection = collection(db, 'warehouses')
      const warehousesSnapshot = await getDocs(warehousesCollection)
      const warehousesList = warehousesSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
      }))
      setWarehouses(warehousesList)
    }

    fetchWarehouses()
  }, [])

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newWarehouseName.trim()) {
      const warehousesCollection = collection(db, 'warehouses')
      await addDoc(warehousesCollection, { name: newWarehouseName.trim() })
      setNewWarehouseName('')
      router.refresh()
    }
  }

  const handleBodegaInventoryClick = (warehouseId: string) => {
    router.push(`/warehouse/${warehouseId}/warehouse-inventory`)
  }

  const handleParesInventoryClick = (warehouseId: string) => {
    router.push(`/warehouse/${warehouseId}/inventory`)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Manage Warehouses</h1>
      <Card className="mb-8">
        <CardContent className="p-4">
          <form onSubmit={handleCreateWarehouse} className="space-y-4">
            <div>
              <Label htmlFor="newWarehouseName">New Warehouse Name</Label>
              <Input
                id="newWarehouseName"
                value={newWarehouseName}
                onChange={(e) => setNewWarehouseName(e.target.value)}
                placeholder="Enter warehouse name"
              />
            </div>
            <Button type="submit">Create New Warehouse</Button>
          </form>
        </CardContent>
      </Card>

      <h2 className="text-xl font-semibold mb-4">Your Warehouses</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {warehouses.map((warehouse) => (
          <Card key={warehouse.id}>
            <CardContent className="p-4">
              <h3 className="text-lg font-semibold mb-2">{warehouse.name}</h3>
              <Button 
                onClick={() => handleBodegaInventoryClick(warehouse.id)}
                className="w-full"
              >
                Bodega Inventory 
              </Button>
              <Button 
                onClick={() => handleParesInventoryClick(warehouse.id)}
                className="w-full"
                variant="outline"
              >
                Pares Inventory
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}