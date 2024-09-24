'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { db } from 'app/services/firebase/firebase.config'
import { collection, getDocs, doc, getDoc } from 'firebase/firestore'
import { Button } from "app/components/ui/button"
import { Input } from "app/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "app/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "app/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "app/components/ui/dropdown-menu"
import { Pencil, MoreHorizontal, FileDown, ImageIcon } from 'lucide-react'
import Image from 'next/image'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

interface ExhibitionProduct {
  id: string
  brand: string
  reference: string
  color: string
  gender: 'Dama' | 'Hombre'
  exhibitionSize: string
  exhibitionBarcode: string
  imageUrl: string
  baseprice: number
  saleprice: number
}

export default function InventoryExbPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [products, setProducts] = useState<ExhibitionProduct[]>([])
  const [storeName, setStoreName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ brand: '', reference: '', color: '', gender: '' })
  const [sortOrder, setSortOrder] = useState<'entry' | 'alphabetical'>('entry')

  useEffect(() => {
    const fetchStoreAndProducts = async () => {
      setLoading(true)
      try {
        const storeDoc = await getDoc(doc(db, 'stores', params.id))
        if (storeDoc.exists()) {
          setStoreName(storeDoc.data().name)
        }

        const productsSnapshot = await getDocs(collection(db, 'exhibition', params.id, 'products'))
        const productsData = productsSnapshot.docs.map(doc => {
          const data = doc.data()
          return {
            id: doc.id,
            ...data,
            baseprice: Number(data.baseprice),
            saleprice: Number(data.saleprice)
          } as ExhibitionProduct
        })
        setProducts(productsData)
      } catch (error) {
        console.error('Error fetching store and products:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchStoreAndProducts()
  }, [params.id])

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      return (
        (filters.brand === '' || product.brand.toLowerCase().includes(filters.brand.toLowerCase())) &&
        (filters.reference === '' || product.reference.toLowerCase().includes(filters.reference.toLowerCase())) &&
        (filters.color === '' || product.color.toLowerCase().includes(filters.color.toLowerCase())) &&
        (filters.gender === '' || filters.gender === 'all' || product.gender === filters.gender)
      )
    })
  }, [products, filters])

  const ImageWithFallback = ({ src, alt, ...props }) => {
    const [error, setError] = useState(false)

    const handleError = () => {
      setError(true)
    }

    if (error) {
      return (
        <div className="flex items-center justify-center bg-gray-200 rounded-md" {...props}>
          <ImageIcon className="text-gray-400" />
        </div>
      )
    }

    return (
      <Image
        src={src}
        alt={alt}
        {...props}
        onError={handleError}
      />
    )
  }

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
    const totalPares = filteredProducts.length
    const totalBase = filteredProducts.reduce((sum, product) => sum + product.baseprice, 0)
    const totalSale = filteredProducts.reduce((sum, product) => sum + product.saleprice, 0)
    return { totalItems, totalPares, totalBase, totalSale }
  }, [filteredProducts])

  const formatNumber = (value: number) => {
    return value.toLocaleString('es-ES')
  }

  const formatSize = (size: string) => {
    const match = size.match(/^T-?(\d+)$/)
    return match ? `T-${match[1]}` : size
  }

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new()
    
    const worksheetData = products.map(product => ({
      'Brand': product.brand,
      'Reference': product.reference,
      'Color': product.color,
      'Gender': product.gender,
      'Exhibition Size': formatSize(product.exhibitionSize),
      'Exhibition Barcode': product.exhibitionBarcode,
      'Base Price': product.baseprice,
      'Sale Price': product.saleprice,
    }))

    const worksheet = XLSX.utils.json_to_sheet(worksheetData)

    // Set column widths
    worksheet['!cols'] = [
      { width: 15 }, // Brand
      { width: 15 }, // Reference
      { width: 15 }, // Color
      { width: 10 }, // Gender
      { width: 15 }, // Exhibition Size
      { width: 20 }, // Exhibition Barcode
      { width: 15 }, // Base Price
      { width: 15 }, // Sale Price
    ]

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Exhibition Inventory')

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    
    // Save the file
    saveAs(data, `${storeName}_exhibition_inventory.xlsx`)
  }

  const exportToPDF = () => {
    const doc = new jsPDF()

    // Add title
    doc.setFontSize(18)
    doc.text('Inventory Report', 14, 22)

    // Add summary information
    doc.setFontSize(12)
    doc.text(`Total Items: ${formatNumber(summaryInfo.totalItems)}`, 14, 32)
    doc.text(`Total Pares: ${formatNumber(summaryInfo.totalPares)}`, 14, 40)
    doc.text(`Total Base: $${formatNumber(summaryInfo.totalBase)}`, 14, 48)
    doc.text(`Total Sale: $${formatNumber(summaryInfo.totalSale)}`, 14, 56)

    // Add table
    const tableColumn = ["No.", "Brand", "Reference", "Color", "Gender", "Base Price", "Sale Price"]
    const tableRows = sortedProducts.map((box, index) => [
      index + 1,
      box.brand,
      box.reference,
      box.color,
      box.gender,
      formatNumber(box.baseprice),
      formatNumber(box.saleprice)
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

    // Save the PDF
    doc.save('inventory_report.pdf')
  }

  if (loading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>
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
      <h2 className="text-2xl font-bold">{storeName} Exhibition Inventory</h2>
        <div className="flex justify-between items-center mb-4 space-x-4">
          <div className="flex space-x-2">
            <Button onClick={exportToExcel}>
              <FileDown className="mr-2 h-4 w-4" /> Export Excel
            </Button>
            <Button onClick={exportToPDF}>
              Export PDF
            </Button>
          </div>
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
                        <DropdownMenuItem onClick={() => router.push(`/update-product/${product.id}`)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          <span>Update</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="relative w-16 h-16 flex-shrink-0">
                       <ImageWithFallback
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
                      <span className="font-medium">Size:</span> {formatSize(product.exhibitionSize)}
                      <span className="font-medium">Sale:</span> ${formatNumber(product.saleprice)}
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="font-medium text-sm">Barcode:</span> {product.exhibitionBarcode}
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