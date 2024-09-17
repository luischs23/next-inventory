'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { PlusIcon } from 'lucide-react'
import ProductCard from './product-card'
import { db, storage } from '../services/firebase/firebase.config'
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore'
import { ref, deleteObject } from 'firebase/storage'

interface SizeInput {
  quantity: number
  barcodes: string[]
}
  
interface Product {
  id: string
  brand: string
  reference: string
  color: string
  gender: 'Dama' | 'Hombre'
  sizes: { [key: string]: SizeInput }
  imageUrl: string
  total: number
}

export function InventoryDashboardComponent() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [filters, setFilters] = useState({ brand: '', reference: '', color: '', gender: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const productsCollection = collection(db, 'products')
        const productsSnapshot = await getDocs(productsCollection)
        const productsList = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product))
        setProducts(productsList)
      } catch (error) {
        console.error('Error fetching products:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const filteredProducts = products.filter((product) => {
    return (
      (filters.brand === '' || product.brand.toLowerCase().includes(filters.brand.toLowerCase())) &&
      (filters.reference === '' || product.reference.toLowerCase().includes(filters.reference.toLowerCase())) &&
      (filters.color === '' || product.color.toLowerCase().includes(filters.color.toLowerCase())) &&
      (filters.gender === '' || filters.gender === 'all' || product.gender === filters.gender)
    )
  })

  const handleDelete = async (id: string, imageUrl: string) => {
    try {
      // Delete the document from Firestore
      await deleteDoc(doc(db, 'products', id))
      
      // Delete the image from Storage
      const imageRef = ref(storage, imageUrl)
      await deleteObject(imageRef)

      // Update the local state
      setProducts((prev) => prev.filter((product) => product.id !== id))
    } catch (error) {
      console.error('Error deleting product:', error)
    }
  }

  const handleUpdate = (id: string) => {
    router.push(`/update-product/${id}`)
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="flex flex-col md:flex-row gap-6 p-6">
      <Card className="w-full md:w-1/4">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="brand" className="text-sm font-medium">Brand</label>
            <Input
              id="brand"
              placeholder="Filter by brand"
              value={filters.brand}
              onChange={(e) => handleFilterChange('brand', e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="reference" className="text-sm font-medium">Reference</label>
            <Input
              id="reference"
              placeholder="Filter by reference"
              value={filters.reference}
              onChange={(e) => handleFilterChange('reference', e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="color" className="text-sm font-medium">Color</label>
            <Input
              id="color"
              placeholder="Filter by color"
              value={filters.color}
              onChange={(e) => handleFilterChange('color', e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="gender" className="text-sm font-medium">Gender</label>
            <Select onValueChange={(value) => handleFilterChange('gender', value)}>
              <SelectTrigger id="gender">
                <SelectValue placeholder="Filter by gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Dama">Dama</SelectItem>
                <SelectItem value="Hombre">Hombre</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      <div className="w-full md:w-3/4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Inventory Dashboard</h2>
          <Button onClick={() => router.push('/')}>
            <PlusIcon className="mr-2 h-4 w-4" /> Add New Product
          </Button> 
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onDelete={() => handleDelete(product.id,product.imageUrl)}
              onUpdate={() => handleUpdate(product.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}