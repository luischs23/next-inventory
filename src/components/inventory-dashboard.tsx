'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { PlusIcon } from 'lucide-react'
import ProductCard from './product-card'
import { db } from '../services/firebase/firebase.config'
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore'

interface Product {
  id: string
  brand: string
  reference: string
  color: string
  gender: 'Dama' | 'Hombre'
  sizes: { [key: string]: number }
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
      (filters.gender === '' || product.gender === filters.gender)
    )
  })

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'products', id))
      setProducts((prev) => prev.filter((product) => product.id !== id))
    } catch (error) {
      console.error('Error deleting product:', error)
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Inventory Dashboard</CardTitle>
        <Button onClick={() => router.push('/add-product')}>
          <PlusIcon className="mr-2 h-4 w-4" /> Add New Product
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <Input
            placeholder="Filter by brand"
            value={filters.brand}
            onChange={(e) => handleFilterChange('brand', e.target.value)}
          />
          <Input
            placeholder="Filter by reference"
            value={filters.reference}
            onChange={(e) => handleFilterChange('reference', e.target.value)}
          />
          <Input
            placeholder="Filter by color"
            value={filters.color}
            onChange={(e) => handleFilterChange('color', e.target.value)}
          />
          <Select onValueChange={(value) => handleFilterChange('gender', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="Dama">Dama</SelectItem>
              <SelectItem value="Hombre">Hombre</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onDelete={() => handleDelete(product.id)}
              onUpdate={() => router.push(`/update-product/${product.id}`)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}