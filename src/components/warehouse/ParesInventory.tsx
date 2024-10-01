'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "app/components/ui/button"
import { Input } from "app/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "app/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "app/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "app/components/ui/dropdown-menu"
import { Switch } from "app/components/ui/switch"
import { PlusIcon, Pencil, Trash2, MoreHorizontal, FileDown } from 'lucide-react'
import { db, storage } from 'app/services/firebase/firebase.config'
import { collection, getDocs, deleteDoc, doc, getDoc, query, Timestamp, FieldValue } from 'firebase/firestore'
import { ref, deleteObject } from 'firebase/storage'
import Image from 'next/image'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import { useAuth } from 'app/app/context/AuthContext'
import { toast } from 'app/components/ui/use-toast'

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
}

interface ParesInventoryProps {
  params: {
    id: string
  }
}

export default function ParesInventory({ params }: ParesInventoryProps) {
  const router = useRouter()
  const warehouseId = params.id
  const [products, setProducts] = useState<Product[]>([])
  const [filters, setFilters] = useState({ brand: '', reference: '', color: '', gender: '' })
  const [sortOrder, setSortOrder] = useState<'entry' | 'alphabetical'>('entry')
  const [showInactive, setShowInactive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [warehouseName, setWarehouseName] = useState<string>('')
  const { user, userRole } = useAuth()

  useEffect(() => {
    const fetchWarehouseDetails = async () => {
      try {
        const warehouseDoc = await getDoc(doc(db, 'warehouses', warehouseId))
        if (warehouseDoc.exists()) {
          setWarehouseName(warehouseDoc.data().name || 'Unnamed Warehouse')
        } else {
          console.error('Warehouse not found')
          setWarehouseName('Unknown Warehouse')
        }
      } catch (error) {
        console.error('Error fetching warehouse details:', error)
        setWarehouseName('Error Loading Warehouse Name')
      }
    }
    
    const fetchProducts = async () => {
      if (!user) {
        console.error('User not authenticated')
        setLoading(false)
        return
      }
      try {
        const productsQuery = query(
          collection(db, 'warehouses', warehouseId, 'products')
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
            warehouseId
          } as Product
        })
        setProducts(productsList)
      } catch (error) {
        console.error('Error fetching products:', error)
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchWarehouseDetails()
      fetchProducts()
    } else {
      setLoading(false)
    }
  }, [warehouseId, user])

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const isInactive = product.total === 0 || Object.keys(product.sizes).length === 0
      const matchesFilters = (
        (filters.brand === '' || product.brand.toLowerCase().includes(filters.brand.toLowerCase())) &&
        (filters.reference === '' || product.reference.toLowerCase().includes(filters.reference.toLowerCase())) &&
        (filters.color === '' || product.color.toLowerCase().includes(filters.color.toLowerCase())) &&
        (filters.gender === '' || filters.gender === 'all' || product.gender === filters.gender)
      )
      return matchesFilters && (showInactive ? isInactive : !isInactive)
    })
  }, [products, filters, showInactive])

  const handleDelete = async (product: Product) => {
    if (userRole !== 'admin') {
      console.error('Only admins can delete products')
      return
    }
    
    if (window.confirm(`Are you sure you want to delete ${product.brand} ${product.reference}?`)) {
      try {
        await deleteDoc(doc(db, 'warehouses', product.warehouseId, 'products', product.id))
        const imageRef = ref(storage, product.imageUrl)
        await deleteObject(imageRef)
        
        setProducts(prevProducts => prevProducts.filter(p => p.id !== product.id))
        toast({
          title: "Success",
          description: "Product deleted successfully",
          duration: 3000,
          style: {
            background: "#4CAF50",
            color: "white",
            fontWeight: "bold",
          },
        })
      } catch (error) {
        console.error('Error deleting product:', error)
        toast({
          title: "Error",
          description: "Failed to delete the product. Please try again.",
          variant: "destructive",
        })
      }
    }
  }

  const handleUpdate = (product: Product) => {
    if (userRole !== 'admin') {
      console.error('Only admins can update products')
      return
    }
    router.push(`/warehouses/${warehouseId}/update-product/${product.id}`)
  }

  const sortSizes = (sizes: { [key: string]: SizeInput }) => {
    return Object.entries(sizes).sort((a, b) => {
      const sizeA = a[0].toLowerCase().replace('t-', '')
      const sizeB = b[0].toLowerCase().replace('t-', '')
      
      if (!isNaN(Number(sizeA)) && !isNaN(Number(sizeB))) {
        return Number(sizeA) - Number(sizeB)
      }
      
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
      const aCreatedAt = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : 
                         typeof a.createdAt === 'number' ? a.createdAt : Date.now()
      const bCreatedAt = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : 
                         typeof b.createdAt === 'number' ? b.createdAt : Date.now()
      return (bCreatedAt as number) - (aCreatedAt as number)
    })
  }, [filteredProducts, sortOrder])

  const summaryInfo = useMemo(() => {
    const totalItems = filteredProducts.length
    const totalPares = filteredProducts.reduce((sum, product) => sum + product.total, 0)
    const totalBase = filteredProducts.reduce((sum, product) => sum + product.baseprice * product.total, 0)
    const totalSale = filteredProducts.reduce((sum, product) => sum + product.saleprice * product.total, 0)
    return { totalItems, totalPares, totalBase, totalSale }
  }, [filteredProducts])

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new()
    
    const worksheetData = filteredProducts.map(product => ({
      'Brand': product.brand,
      'Reference': product.reference,
      'Color': product.color,
      'Gender': product.gender,
      'Sizes': JSON.stringify(product.sizes),
      'Total Quantity': product.total,
      'Comments': product.comments,
      'Base Price': product.baseprice,
      'Sale Price': product.saleprice,
      'Exhibition': JSON.stringify(product.exhibition),
      'Created At': product.createdAt instanceof Timestamp 
        ? product.createdAt.toDate().toISOString()
        : typeof product.createdAt === 'number'
          ? new Date(product.createdAt).toISOString()
          : new Date().toISOString(),
      'Image URL': product.imageUrl
    }))

    const worksheet = XLSX.utils.json_to_sheet(worksheetData)

    worksheet['!cols'] = [
      { width: 15 }, { width: 15 }, { width: 15 }, { width: 10 },
      { width: 30 }, { width: 15 }, { width: 20 }, { width: 15 },
      { width: 15 }, { width: 30 }, { width: 20 }, { width: 30 }
    ]

    XLSX.utils.book_append_sheet(workbook, worksheet, showInactive ? 'Inactive Inventory' : 'Active Inventory')

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    
    saveAs(data, `${warehouseName.replace(/\s+/g, '_')}_${showInactive ? 'inactive' : 'active'}_inventory.xlsx`)
  }

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
          <h2 className="text-2xl font-bold">Pares Inventory Dashboard ({warehouseName})</h2>
          <div className="flex items-center space-x-4">
              <Switch
                id="show-inactive"
                checked={showInactive}
                onCheckedChange={setShowInactive}
              />
              <label htmlFor="show-inactive" className="text-sm font-medium">
                {showInactive ? 'Showing Inactive' : 'Showing Active'}
              </label>
          </div>
        </div>
        <div className="flex items-center space-x-2">
        <Button onClick={exportToExcel} className="mb-4">
          <FileDown className="mr-2 h-4 w-4" /> Export Excel
        </Button>
        {userRole === 'admin' && (
              <Button onClick={() => router.push(`/warehouses/${warehouseId}/form-product`)}>
                <PlusIcon className="mr-2 h-4 w-4" /> Add
              </Button>
            )}
        </div>
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>Items: {formatNumber(summaryInfo.totalItems)}</div>
              <div>Total pares: {formatNumber(summaryInfo.totalPares)}</div>
              <div>Total base: ${formatNumber(summaryInfo.totalBase)}</div>
              <div>Total sale: ${formatNumber(summaryInfo.totalSale)}</div>
            </div>
          </CardContent>
        </Card>

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
                      {Object.keys(product.sizes).length > 0 ? (
                        sortSizes(product.sizes).map(([size, { quantity }]) => (
                          <div key={size} className="text-xs bg-gray-100 p-1 rounded">
                            {size}: {quantity}
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-red-500">No sizes available</div>
                      )}
                    </div>
                  </div>
                  {product.total === 0 && (
                    <div className="mt-2 text-sm text-red-500">
                      This product is out of stock.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}