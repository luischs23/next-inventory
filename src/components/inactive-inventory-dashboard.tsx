'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "app/components/ui/dropdown-menu"
import { Pencil, Trash2, MoreHorizontal } from 'lucide-react'
import { db, storage } from '../services/firebase/firebase.config'
import { collection, getDocs, deleteDoc, doc , query, Timestamp, FieldValue} from 'firebase/firestore'
import { ref, deleteObject } from 'firebase/storage'
import Image from 'next/image'
import { useProducts } from 'app/app/context/ProductContext'
import { useAuth } from 'app/app/context/AuthContext'

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
  createdAt: number | Timestamp | FieldValue
  comments: string 
  exhibition: { [store: string]: string } 
  warehouseId: string
  isActive: boolean
}

interface InventoryDashboardComponentProps {
    params: { id: string }
  }

export default function InactiveInventoryComponent({ params }: InventoryDashboardComponentProps) {
    const router = useRouter()
    const { products, addNewProduct, removeProduct } = useProducts()
    const [filters, setFilters] = useState({ brand: '', reference: '', color: '', gender: '' })
    const [sortOrder, setSortOrder] = useState<'entry' | 'alphabetical'>('entry')
    const [loading, setLoading] = useState(true)
    const { user, userRole } = useAuth()
  
    useEffect(() => {
      const fetchInactiveProducts = async () => {
        if (!user) {
          console.error('User not authenticated')
          setLoading(false)
          return
        }
        try {
            const productsQuery = query(
                collection(db, 'warehouses', params.id, 'products')
              )
          const productsSnapshot = await getDocs(productsQuery)
          const productsList = productsSnapshot.docs.map(doc => {
            const data = doc.data()
            let createdAtValue: number | Timestamp | FieldValue = data.createdAt
  
            if (createdAtValue instanceof Timestamp) {
              createdAtValue = createdAtValue.toMillis()
            } else if (typeof createdAtValue === 'number') {
              createdAtValue = createdAtValue
            } else {
              createdAtValue = Timestamp.now().toMillis()
            }
  
            return { 
                id: doc.id, 
                ...data,
                createdAt: createdAtValue,
                comments: data.comments || '',
                exhibition: data.exhibition || {},
                warehouseId: params.id
              } as Product
          })
          productsList.forEach(product => addNewProduct(product))
        } catch (error) {
          console.error('Error fetching inactive products:', error)
        } finally {
          setLoading(false)
        }
      }
      if (user) {
        fetchInactiveProducts()
      } else {
        setLoading(false)
      }
    }, [addNewProduct, params.id, user])

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

  const handleDelete = async (product: Product) => {
    if (userRole !== 'admin') {
      console.error('Only admins can delete products')
      return
    }
    try {
      await deleteDoc(doc(db, 'warehouses', product.warehouseId, 'products', product.id))
      const imageRef = ref(storage, product.imageUrl)
      await deleteObject(imageRef)
      
      // Use the removeProduct function from the context to update the state
      removeProduct(product.id)
    } catch (error) {
      console.error('Error deleting product:', error)
    }
  }

  const handleUpdate = (product: Product) => {
    if (userRole !== 'admin') {
      console.error('Only admins can update products')
      return
    }
    router.push(`/update-product/${product.id}?warehouseId=${product.warehouseId}`)
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
  const formatNumber = (value: number) => {
    return value.toLocaleString('es-ES')
  }

  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      if (sortOrder === 'alphabetical') {
        return a.brand.localeCompare(b.brand)
      }
      // Sort by entry order (newest first)
      const aCreatedAt = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : 
                         typeof a.createdAt === 'number' ? a.createdAt : Date.now()
      const bCreatedAt = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : 
                         typeof b.createdAt === 'number' ? b.createdAt : Date.now()
      return (bCreatedAt as number) - (aCreatedAt as number)
    })
  }, [filteredProducts, sortOrder])

  if (loading) {
    return <div>Loading...</div>
  }

  if (!user) {
    return <div>Please log in to view this page.</div>
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
          <div>
            <label htmlFor="sortOrder" className="text-sm font-medium">Sort Order</label>
            <Select onValueChange={(value: 'entry' | 'alphabetical') => setSortOrder(value)}>
              <SelectTrigger id="sortOrder">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entry">Entry Order</SelectItem>
                <SelectItem value="alphabetical">Alphabetical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      <div className="w-full md:w-3/4">
        <div className="flex justify-between items-center mb-4 space-x-4">
          <h2 className="text-2xl font-bold">Inactive Inventory</h2>
          <Button onClick={() => router.push(`/inventory/${params.id}`)}>
            View Active Inventory
          </Button>
        </div>

        <div className="space-y-4">
          {sortedProducts.map((product, index) => (
            <div key={product.id} className="flex items-start">
              <div className="text-sm font-semibold mr-1 mt-2">{index + 1}</div>
              <Card className="flex-grow relative">
              <CardContent className="p-4">
                <div className="absolute top-2 right-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                    {userRole === 'admin' && (
                    <>
                      <DropdownMenuItem onClick={() => handleUpdate(product)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        <span>Update</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(product)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>Delete</span>
                      </DropdownMenuItem>
                      </>
                    )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
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
                    <span className="font-medium">Sale:</span> ${formatNumber(product.saleprice)}
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
              </CardContent>
            </Card>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}