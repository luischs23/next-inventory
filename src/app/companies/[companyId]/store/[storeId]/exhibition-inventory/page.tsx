'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { db } from 'app/services/firebase/firebase.config'
import { collection, getDocs, doc, getDoc} from 'firebase/firestore'
import { Button } from "app/components/ui/button"
import { Input } from "app/components/ui/input"
import { Card, CardContent} from "app/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "app/components/ui/dropdown-menu"
import { Pencil, MoreHorizontal, FileDown, ArrowLeft, Filter, SortDesc } from 'lucide-react'
import { Switch } from "app/components/ui/switch"
import Image from 'next/image'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

interface Product {
  id: string
  brand: string
  reference: string
  color: string
  gender: 'Dama' | 'Hombre'
  imageUrl: string
  baseprice: number
  saleprice: number
  warehouseId: string
  sizes: { [key: string]: { quantity: number, barcodes: string[] } }
  total: number
  exhibition?: {
    [storeId: string]: {
      size: string
      barcode: string
    }
  }
}

export default function InventoryExbPage({ params }: { params: { companyId: string, storeId: string } }) {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [storeName, setStoreName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [gender, setGender] = useState<'all' | 'Dama' | 'Hombre'>('all')
  const [sortOrder, setSortOrder] = useState<'entry' | 'alphabetical'>('entry')
  const [showUnassigned, setShowUnassigned] = useState(false)

  useEffect(() => {
    const fetchStoreAndProducts = async () => {
      setLoading(true)
      try {
        const storeDoc = await getDoc(doc(db, `companies/${params.companyId}/stores`, params.storeId))
        if (storeDoc.exists()) {
          setStoreName(storeDoc.data().name)
        }

        const warehousesSnapshot = await getDocs(collection(db, `companies/${params.companyId}/warehouses`))
        const allProducts: Product[] = []

        for (const warehouseDoc of warehousesSnapshot.docs) {
          const warehouseId = warehouseDoc.id
          const productsSnapshot = await getDocs(collection(db, `companies/${params.companyId}/warehouses/${warehouseId}/products`))

          productsSnapshot.forEach(doc => {
            const data = doc.data() as Omit<Product, 'id' | 'warehouseId'>
            allProducts.push({
              ...data,
              id: doc.id,
              warehouseId
            })
          })
        }

        setProducts(allProducts)
      } catch (error) {
        console.error('Error fetching store and products:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchStoreAndProducts()
  }, [params.companyId, params.storeId])

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesFilter = filter === '' || 
        product.brand.toLowerCase().includes(filter.toLowerCase()) ||
        product.reference.toLowerCase().includes(filter.toLowerCase()) ||
        product.color.toLowerCase().includes(filter.toLowerCase())
      const matchesGender = gender === 'all' || product.gender === gender
      const matchesAssignment = showUnassigned
        ? (!product.exhibition || !product.exhibition[params.storeId]) &&
          product.total > 0 &&
          Object.values(product.sizes).some(size => size.quantity > 0)
        : product.exhibition && product.exhibition[params.storeId]
      return matchesFilter && matchesGender && matchesAssignment
    })
  }, [products, filter, gender, showUnassigned, params.storeId])

  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      if (sortOrder === 'alphabetical') {
        return a.brand.localeCompare(b.brand)
      }
      // Sort by entry order (assuming id is used for ordering)
      return a.id.localeCompare(b.id)
    })
  }, [filteredProducts, sortOrder])

  const summaryInfo = useMemo(() => {
    const totalItems = filteredProducts.length
    const totalPares = filteredProducts.reduce((sum, product) => {
      if (showUnassigned) {
        return sum + Object.values(product.sizes).reduce((sizeSum, size) => sizeSum + size.quantity, 0)
      }
      return sum + 1 // For assigned products, each product represents one pair
    }, 0)
    const totalBase = filteredProducts.reduce((sum, product) => sum + product.baseprice, 0)
    const totalSale = filteredProducts.reduce((sum, product) => sum + product.saleprice, 0)
    return { totalItems, totalPares, totalBase, totalSale }
  }, [filteredProducts, showUnassigned])

  const formatNumber = (value: number) => {
    return value.toLocaleString('es-ES')
  }

  const formatSize = (size: string) => {
    const match = size.match(/^T-?(\d+)$/)
    return match ? `T-${match[1]}` : size
  }

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new()
    
    const worksheetData = sortedProducts.map(product => ({
      'Brand': product.brand,
      'Reference': product.reference,
      'Color': product.color,
      'Gender': product.gender,
      'Size': showUnassigned ? Object.keys(product.sizes).join(', ') : product.exhibition?.[params.storeId]?.size,
      'Barcode': showUnassigned ? '' : product.exhibition?.[params.storeId]?.barcode,
      'Base Price': product.baseprice,
      'Sale Price': product.saleprice,
    }))

    const worksheet = XLSX.utils.json_to_sheet(worksheetData)

    worksheet['!cols'] = [
      { width: 15 }, { width: 15 }, { width: 15 }, { width: 10 },
      { width: 15 }, { width: 20 }, { width: 15 }, { width: 15 },
    ]

    XLSX.utils.book_append_sheet(workbook, worksheet, showUnassigned ? 'Unassigned Products' : 'Exhibition Inventory')

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    
    saveAs(data, `${storeName}_${showUnassigned ? 'unassigned' : 'exhibition'}_inventory.xlsx`)
  }

  const exportToPDF = () => {
    const doc = new jsPDF()

    doc.setFontSize(18)
    doc.text(showUnassigned ? 'Unassigned Products Report' : 'Exhibition Inventory Report', 14, 22)

    doc.setFontSize(12)
    doc.text(`Total Items: ${formatNumber(summaryInfo.totalItems)}`, 14, 32)
    doc.text(`Total Pares: ${formatNumber(summaryInfo.totalPares)}`, 14, 40)
    doc.text(`Total Base: $${formatNumber(summaryInfo.totalBase)}`, 14, 48)
    doc.text(`Total Sale: $${formatNumber(summaryInfo.totalSale)}`, 14, 56)

    const tableColumn = ["No.", "Brand", "Reference", "Color", "Gender", "Size", "Base Price", "Sale Price"]
    const tableRows = sortedProducts.map((product, index) => [
      index + 1,
      product.brand,
      product.reference,
      product.color,
      product.gender,
      showUnassigned ? Object.keys(product.sizes).join(', ') : product.exhibition?.[params.storeId]?.size,
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

    doc.save(`${storeName}_${showUnassigned ? 'unassigned' : 'exhibition'}_inventory.pdf`)
  }

  if (loading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-blue-100">
      <header className="bg-teal-600 text-white p-3 flex items-center">
        <Button variant="ghost" onClick={() => router.back()} className="text-white p-0 mr-2">
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-bold flex-grow">
          {showUnassigned ? 'Sin Exb' : 'Exb'} {storeName}
        </h1>
        <div className="flex space-x-2 ml-4">
          <Button onClick={exportToPDF} className="bg-red-500 hover:bg-red-600">
            <FileDown className="h-4 w-4" />
          </Button>
          <Button onClick={exportToExcel} className="bg-green-500 hover:bg-green-600">
            <FileDown className="h-4 w-4" />
          </Button>
        </div>
      </header>
      <div className="flex items-center space-x-2 pl-6 pt-4">
      <div >
          <Switch
            checked={showUnassigned}
            onCheckedChange={setShowUnassigned}
          />
          <span>{showUnassigned ? '   Unassigned' : '   Assigned'}</span>
      </div>  
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              {gender === 'all' ? 'All' : gender}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setGender('all')}>All</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setGender('Dama')}>Dama</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setGender('Hombre')}>Hombre</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <SortDesc className="mr-2 h-4 w-4" />
              {sortOrder === 'entry' ? 'Entry' : 'A-Z'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setSortOrder('entry')}>Entry</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortOrder('alphabetical')}>A-Z</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>   
        <div className="flex items-center space-x-2 mb-4 m-4">
        <Input
          placeholder="Search by brand, reference, or color"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-grow"
        />
      </div>

      <Card className="m-4">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>Items: {formatNumber(summaryInfo.totalItems)}</div>
            <div>Total pares: {formatNumber(summaryInfo.totalPares)}</div>
            <div>Total base: ${formatNumber(summaryInfo.totalBase)}</div>
            <div>Total sale: ${formatNumber(summaryInfo.totalSale)}</div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4 m-4">
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
                    <DropdownMenuItem onClick={() => router.push(`/companies/${params.companyId}/warehouses/${product.warehouseId}/update-product/${product.id}`)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        <span>Update</span>
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
                      sizes="(max-width: 64px) 100vw, 64px"
                      className="object-cover rounded-md"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.svg"
                      }}
                    />
                  </div>
                  <div className="flex-grow">
                    <h3 className="font-semibold">{product.brand}</h3>
                    <p className="text-sm text-gray-500">{product.reference}</p>
                    <p className="text-sm">{product.color} - {product.gender}</p>
                  </div>
                </div>
                <div className="mt-4 flex text-sm space-x-3">
                  <div className="font-medium">
                    
                    {showUnassigned ? 'Sizes:' : 'Size:'}
                  </div>
                  {showUnassigned
                    ? Object.entries(product.sizes)
                        .filter(([_, sizeData]) => sizeData.quantity > 0)
                        .map(([size]) => `${formatSize(size)} `)
                        .join(', ')
                    : formatSize(product.exhibition?.[params.storeId]?.size || '')}
                  <span className="font-medium">Sale:</span> ${formatNumber(product.saleprice)}
                </div>
                {!showUnassigned && (
                  <div className="mt-2">
                    <span className="font-medium text-sm">Barcode:</span> {product.exhibition?.[params.storeId]?.barcode}
                  </div>
                )}
                {showUnassigned && (
                  <div className="mt-2">
                    <span className="font-medium text-sm">Total:</span> {product.total}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  )
}