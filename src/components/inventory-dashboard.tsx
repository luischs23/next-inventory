'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { PlusIcon, Pencil, Trash2 } from 'lucide-react'
import { db, storage } from '../services/firebase/firebase.config'
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore'
import { ref, deleteObject } from 'firebase/storage'
import Image from 'next/image'

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
  baseprice: number
  saleprice: number
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
      await deleteDoc(doc(db, 'products', id))
      const imageRef = ref(storage, imageUrl)
      await deleteObject(imageRef)
      setProducts((prev) => prev.filter((product) => product.id !== id))
    } catch (error) {
      console.error('Error deleting product:', error)
    }
  }

  const handleUpdate = (id: string) => {
    router.push(`/update-product/${id}`)
  }

  const sortSizes = (sizes: { [key: string]: SizeInput }) => {
    return Object.entries(sizes).sort((a, b) => {
      const sizeA = a[0].toLowerCase().replace('t-', '')
      const sizeB = b[0].toLowerCase().replace('t-', '')
      
      // Check if both sizes are numeric
      if (!isNaN(Number(sizeA)) && !isNaN(Number(sizeB))) {
        return Number(sizeA) - Number(sizeB)
      }
      
      // If one or both are not numeric, sort alphabetically
      return sizeA.localeCompare(sizeB)
    })
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
          </div>|
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
          <Button onClick={() => router.push('/form-product')}>
            <PlusIcon className="mr-2 h-4 w-4" /> Add New Product
          </Button> 
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="flex flex-col">
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <div className="relative w-16 h-16 flex-shrink-0">
                    <Image
                      src={product.imageUrl}
                      alt={product.reference}
                      fill
                      sizes="(max-width: 64px) 100vw, 64px"
                      className="object-cover rounded-md"
                    />
                  </div>
                  <div className="flex-grow">
                    <h3 className="font-semibold">{product.brand}</h3>
                    <p className="text-sm text-gray-500">{product.reference}</p>
                    <p className="text-sm">{product.color} - {product.gender}</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div className='flex space-x-9'>
                    <span className="font-medium">Total:</span> {product.total}
                    <span className="font-medium">Sale:</span> ${product.saleprice}
                  </div>
                </div>
                <div className="mt-2">
                  <span className="font-medium text-sm">Sizes:</span>
                  <div className="grid grid-cols-3 gap-1 mt-1">
                    {sortSizes(product.sizes).map(([size, { quantity }]) => (
                      <div key={size} className="text-xs bg-gray-100 p-1 rounded">
                        {size}: {quantity}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-4 flex justify-end space-x-2">
                  <Button size="sm" variant="outline" onClick={() => handleUpdate(product.id)}>
                    <Pencil className="h-4 w-4 mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(product.id, product.imageUrl)}>
                    <Trash2 className="h-4 w-4 mr-1" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}