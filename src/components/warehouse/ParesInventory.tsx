'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from 'app/app/context/AuthContext'
import { db, storage } from 'app/services/firebase/firebase.config'
import { collection, getDocs, doc, deleteDoc, Timestamp, FieldValue, getDoc, query } from 'firebase/firestore'
import { ref, deleteObject } from 'firebase/storage'
import { Button } from "app/components/ui/button"
import { Input } from "app/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "app/components/ui/select"
import { Card, CardContent } from "app/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "app/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "app/components/ui/alert-dialog"
import { Pencil, MoreHorizontal, FileDown, Trash2, PlusIcon, ArrowLeft, Filter, SortDesc } from 'lucide-react'
import Image from 'next/image'
import { toast } from "app/components/ui/use-toast"
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { Switch } from "app/components/ui/switch"

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
  total2: number
  baseprice: number
  saleprice: number
  createdAt: number | Timestamp | FieldValue
  comments: string
  exhibition: { [store: string]: string }
  warehouseId: string
  isBox: boolean
}

interface ParesInventoryProps {
  companyId: string
  warehouseId: string
}

export default function ParesInventoryComponent({ companyId, warehouseId }: ParesInventoryProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [genderFilter, setGenderFilter] = useState<'all' | 'Dama' | 'Hombre'>('all')
  const [sortOrder, setSortOrder] = useState<'entry' | 'alphabetical'>('entry')
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)
  const [warehouseName, setWarehouseName] = useState<string>('')
  const [showBox, setshowBox] = useState(false)
  const router = useRouter()
  const { user, userRole } = useAuth()
  const [showInactive, setShowInactive] = useState(false)

  const sortSizes = (sizes: { [key: string]: SizeInput }): [string, SizeInput][] => {
    return Object.entries(sizes).sort((a, b) => {
      const sizeA = a[0].toLowerCase().replace('t-', '')
      const sizeB = b[0].toLowerCase().replace('t-', '')
      
      if (!isNaN(Number(sizeA)) && !isNaN(Number(sizeB))) {
        return Number(sizeA) - Number(sizeB)
      }
      
      return sizeA.localeCompare(sizeB)
    })
  }  
  
  const fetchWarehouseDetails = useCallback(async () => {
    try {
      const warehouseDocRef = doc(db, `companies/${companyId}/warehouses`, warehouseId)
      const warehouseDocSnap = await getDoc(warehouseDocRef)
      if (warehouseDocSnap.exists()) {
        const warehouseData = warehouseDocSnap.data()
        setWarehouseName(warehouseData?.name || 'Unnamed Warehouse')
      } else {
        console.error('Warehouse document does not exist')
        setWarehouseName('Unknown Warehouse')
      }
    } catch (error) {
      console.error('Error fetching warehouse details:', error)
      setWarehouseName('Error Loading Warehouse Name')
    }
  }, [companyId, warehouseId])

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const productsQuery = query(
        collection(db, `companies/${companyId}/warehouses/${warehouseId}/products`)
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
      toast({
        title: "Error",
        description: "Failed to fetch products. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [companyId, warehouseId])

  useEffect(() => {
    fetchWarehouseDetails()
    fetchProducts()
  }, [fetchWarehouseDetails, fetchProducts])

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const isInactive = product.total === 0
      const matchesSearch = 
        product.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.color.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesGender = genderFilter === 'all' || product.gender === genderFilter
      // Updated logic for boxes and inactive products
      const matchesBoxFilter = showBox === product.isBox
      const matchesInactiveFilter = product.isBox 
        ? (showInactive ? !isInactive : isInactive)  // Reversed logic for boxes
        : (showInactive ? isInactive : !isInactive)  // Original logic for pairs

      return matchesSearch && matchesGender && matchesBoxFilter && matchesInactiveFilter
    })
  }, [products, searchTerm, genderFilter, showBox, showInactive])

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

  const handleDelete = async () => {
    if (productToDelete) {
      try {
        // Get the product document
        const productDoc = await getDoc(doc(db, `companies/${companyId}/warehouses/${warehouseId}/products`, productToDelete.id))
        const productData = productDoc.data()

        // Check if the product is a copy from a box
        const isBoxCopy = productData && 'originalBoxId' in productData

        // Delete the product document
        await deleteDoc(doc(db, `companies/${companyId}/warehouses/${warehouseId}/products`, productToDelete.id))

        // Only delete the image if it's not a copy from a box
        if (!isBoxCopy && productToDelete.imageUrl) {
          const imageRef = ref(storage, productToDelete.imageUrl)
          await deleteObject(imageRef)
        }

        setProducts(products.filter(p => p.id !== productToDelete.id))
        toast({
          title: "Success",
          description: `Product ${productToDelete.brand} ${productToDelete.reference} has been deleted successfully.`,
          style: { background: "#4CAF50", color: "white", fontWeight: "bold" },
        })
      } catch (error) {
        console.error('Error deleting product:', error)
        toast({
          title: "Error",
          description: `Failed to delete the product ${productToDelete.brand} ${productToDelete.reference}.`,
          variant: "destructive",
        })
      } finally {
        setProductToDelete(null)
      }
    }
  }

  const handleUpdate = (product: Product) => {
    router.push(`/companies/${companyId}/warehouses/${warehouseId}/update-product/${product.id}`)
  }

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new()
    
    const worksheetData = filteredProducts.map((product, index) => ({
      'No.': index + 1,
      'Brand': product.brand,
      'Reference': product.reference,
      'Color': product.color,
      'Gender': product.gender,
      'Sizes': JSON.stringify(product.sizes),
      'Total Quantity': product.total,
      'Base Price': product.baseprice,
      'Sale Price': product.saleprice,
      'Barcode': Object.values(product.sizes).flatMap(size => size.barcodes).join(', '),
      'Created At': product.createdAt instanceof Timestamp 
        ? product.createdAt.toDate().toISOString()
        : typeof product.createdAt === 'number'
          ? new Date(product.createdAt).toISOString()
          : new Date().toISOString(),
    }))

    const worksheet = XLSX.utils.json_to_sheet(worksheetData)

    worksheet['!cols'] = [
      { width: 5 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 10 },
      { width: 30 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 30 }, { width: 20 }
    ]

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory')

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    
    saveAs(data, `${warehouseName.replace(/\s+/g, '_')}_pares_inventory.xlsx`)
  }

  const exportToPDF = () => {
    const doc = new jsPDF()

    doc.setFontSize(18)
    doc.text(`Inventory (${warehouseName})`, 14, 22)

    doc.setFontSize(12)
    doc.text(`Total Products: ${formatNumber(summaryInfo.totalItems)}`, 14, 32)
    doc.text(`Total Pares: ${formatNumber(summaryInfo.totalPares)}`, 14, 40)
    doc.text(`Total Base: $${formatNumber(summaryInfo.totalBase)}`, 14, 48)
    doc.text(`Total Sale: $${formatNumber(summaryInfo.totalSale)}`, 14, 56)

    const tableColumn = ["No.", "Brand", "Reference", "Color", "Gender", "Total", "Base Price", "Sale Price"]
    const tableRows = sortedProducts.map((product, index) => [
      index + 1,
      product.brand,
      product.reference,
      product.color,
      product.gender,
      product.total,
      formatNumber(product.baseprice),
      formatNumber(product.saleprice)
    ])

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 65,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      alternateRowStyles: { fillColor: [224, 224, 224] }
    })

    doc.save(`${warehouseName.replace(/\s+/g, '_')}_pares_inventory.pdf`)
  }

  const summaryInfo = useMemo(() => {
    const totalItems = filteredProducts.length
    const totalPares = filteredProducts.reduce((sum, product) => sum + product.total, 0)
    const totalBase = filteredProducts.reduce((sum, product) => sum + product.baseprice * product.total, 0)
    const totalSale = filteredProducts.reduce((sum, product) => sum + product.saleprice * product.total, 0)
    return { totalItems, totalPares, totalBase, totalSale }
  }, [filteredProducts])

  const formatNumber = (num: number) => {
    return num.toLocaleString('es-ES')
  }

  if (loading) {
    return <div>Loading...</div>
  }

  if (!user) {
    return <div>Please log in to view this page.</div>
  }

  return (
    <div className="min-h-screen bg-blue-100">
      <header className="bg-teal-600 text-white p-4 flex items-center">
        <Button variant="ghost" className="text-white p-0 mr-2" onClick={() =>  router.push(`/companies/${companyId}/warehouses`)}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-bold flex-grow">Inventory</h1>
        <div className="flex space-x-2">
          <Button onClick={() => router.push(`/companies/${companyId}/warehouses/${warehouseId}/form-product`)}>
            <PlusIcon className="h-4 w-4" />
          </Button>
          <Button onClick={exportToPDF} className="bg-red-500 hover:bg-red-600">
            <FileDown className="h-4 w-4" />
          </Button>
          <Button onClick={exportToExcel} className="bg-green-500 hover:bg-green-600">
            <FileDown className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="container mx-auto p-4">
        <div className="flex items-center space-x-2 mb-6">
          <Input
            placeholder="Search by brand, reference, or color"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-grow"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setGenderFilter('all')}>All</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setGenderFilter('Dama')}>Dama</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setGenderFilter('Hombre')}>Hombre</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Select onValueChange={(value: 'entry' | 'alphabetical') => setSortOrder(value)}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="entry">
                <span className="flex items-center">
                  <SortDesc className="mr-2 h-4 w-4" />
                </span>
              </SelectItem>
              <SelectItem value="alphabetical">A-Z</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center space-x-2">
            <Switch
              id="show-inactive"
              checked={showBox}
              
              onCheckedChange={setshowBox}
            />
            <label htmlFor="show-inactive" className="text-sm font-medium">
              {showBox ? 'Cajas' : 'Pares'}
            </label>
          </div>
         
        </div>
        <div className="flex ">
            <Switch
              id="show-inactive"
              checked={showInactive}
              onCheckedChange={setShowInactive}
            />
            <label htmlFor="show-inactive" className="text-sm font-medium">
              {showInactive ? 'Inactive' : 'Active'}
            </label>
          </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>Total Products: {formatNumber(summaryInfo.totalItems)}</div>
              <div>Total Pares: {formatNumber(summaryInfo.totalPares)}</div>
              <div>Total Base: ${formatNumber(summaryInfo.totalBase)}</div>
              <div>Total Sale: ${formatNumber(summaryInfo.totalSale)}</div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
        {sortedProducts.map((product, index) => (
            <div key={product.id} className="flex items-start">
              <div className="text-sm font-semibold mr-1 mt-2">{index + 1}</div>
              <Card className="flex-grow relative">
                <CardContent className="p-4">
                  <div className="absolute top-2 right-2 flex items-center">
                      <Button
                        variant="ghost"
                        className="h-8 w-8 p-0 mr-1"
                        onClick={() => handleUpdate(product)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setProductToDelete(product)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Delete</span>
                          </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="relative w-16 h-16 flex-shrink-0">
                      <Image
                        src={product.imageUrl}
                        alt={product.reference}
                        fill
                        sizes="(max-width: 64px) 150vw, 64px"
                        className="object-cover rounded-md"
                      />
                    </div>
                    <div className="flex-grow">
                      <h3 className="font-semibold">{product.brand}</h3>
                      <p className="text-sm text-gray-500">{product.reference}</p>
                      <p className="text-sm">{product.color} - {product.gender}</p>
                      <p className="text-sm">Sale: ${formatNumber(product.saleprice)}</p> 
                    </div>
                  </div>
                  <div className="mt-2">
                  <span className="font-medium text-sm">
                    {product.isBox ? 'Box Total:' : 'Sizes Total:'} {product.isBox ? product.total2 : product.total}
                  </span>
                  <div className="grid grid-cols-3 gap-1 mt-1">
                      {Object.keys(product.sizes).length > 0 ? (
                        sortSizes(product.sizes).map(([size, { quantity }]) => (
                          <div key={size} className="text-xs bg-gray-100 p-1 rounded">
                            {size}: {quantity}
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-red-500"></div>
                      )}
                    </div>
                </div>
                {(product.isBox ? product.total2 : product.total) === 0 && (
                  <div className="mt-2 text-sm text-red-500">
                    This {product.isBox ? 'box' : 'product'} is out of stock.
                  </div>
                )}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </main>

      <AlertDialog open={!!productToDelete} onOpenChange={() => setProductToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the product
              <span className="font-semibold"> {productToDelete?.brand} {productToDelete?.reference} </span>
              and remove the associated image from storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}