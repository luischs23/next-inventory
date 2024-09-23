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
import { Pencil, MoreHorizontal, ImageIcon, FileDown } from 'lucide-react'
import Image from 'next/image'
import { ImageProps } from 'next/image'
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from '@react-pdf/renderer'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

interface UnassignedProduct {
    id: string
    brand: string
    reference: string
    color: string
    gender: 'Dama' | 'Hombre'
    imageUrl: string
    exhibition?: {
      [storeId: string]: {
        size: string
        barcode: string
      }
    }
  }
  
  interface ImageWithFallbackProps extends Omit<ImageProps, 'src' | 'alt'> {
    src: string
    alt: string
  }
  const styles = StyleSheet.create({
    page: { padding: 30 },
    title: { fontSize: 24, marginBottom: 20 },
    table: { display: 'table', width: 'auto', borderStyle: 'solid', borderWidth: 1, borderRightWidth: 0, borderBottomWidth: 0 },
    tableRow: { margin: 'auto', flexDirection: 'row' },
    tableCol: { width: '25%', borderStyle: 'solid', borderWidth: 1, borderLeftWidth: 0, borderTopWidth: 0 },
    tableCell: { margin: 'auto', marginTop: 5, fontSize: 10 },
  })
  
  const PDFDocument = ({ products, storeName }: { products: UnassignedProduct[], storeName: string }) => (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{storeName} Unassigned Exhibition Products</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <View style={styles.tableCol}><Text style={styles.tableCell}>Brand</Text></View>
            <View style={styles.tableCol}><Text style={styles.tableCell}>Reference</Text></View>
            <View style={styles.tableCol}><Text style={styles.tableCell}>Color</Text></View>
            <View style={styles.tableCol}><Text style={styles.tableCell}>Gender</Text></View>
          </View>
          {products.map((product) => (
            <View style={styles.tableRow} key={product.id}>
              <View style={styles.tableCol}><Text style={styles.tableCell}>{product.brand}</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCell}>{product.reference}</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCell}>{product.color}</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCell}>{product.gender}</Text></View>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  )

export default function UnassignedExhibitionPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [products, setProducts] = useState<UnassignedProduct[]>([])
  const [storeName, setStoreName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ brand: '', reference: '', gender: '' })

  useEffect(() => {
    const fetchStoreAndProducts = async () => {
      setLoading(true)
      try {
        const storeDoc = await getDoc(doc(db, 'stores', params.id))
        if (storeDoc.exists()) {
          setStoreName(storeDoc.data().name)
        }

        const productsSnapshot = await getDocs(collection(db, 'products'))
        const unassignedProducts = productsSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as UnassignedProduct))
          .filter(product => !product.exhibition || !product.exhibition[params.id])
        setProducts(unassignedProducts)
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
        (filters.gender === '' || filters.gender === 'all' || product.gender === filters.gender)
      )
    })
  }, [products, filters])

  const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({ src, alt, ...props }) => {
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

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new()
    
    const worksheetData = filteredProducts.map((product, index) => ({
      'No.': index + 1,
      'Brand': product.brand,
      'Reference': product.reference,
      'Color': product.color,
      'Gender': product.gender,
    }))

    const worksheet = XLSX.utils.json_to_sheet(worksheetData)

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Unassigned Products')

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    
    saveAs(data, `${storeName}_unassigned_exhibition_products.xlsx`)
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
      <h2 className="text-2xl font-bold">{storeName} Unassigned Exhibition Products</h2>
        <div className="flex justify-between items-center mb-4">
          <div className="space-x-2">
            <PDFDownloadLink
              document={<PDFDocument products={filteredProducts} storeName={storeName} />}
              fileName={`${storeName}_unassigned_exhibition_products.pdf`}
            >
              {({  loading }) => 
                <Button disabled={loading}>
                  {loading ? 'Generating PDF...' : 'Export PDF'}
                </Button>
              }
            </PDFDownloadLink>
            <Button onClick={exportToExcel}>
              <FileDown className="mr-2 h-4 w-4" /> Export Excel
            </Button>
          </div>
        </div>
        <div className="mb-4 p-4 bg-gray-100 rounded-lg">
          <div>Items: {filteredProducts.length}</div>
        </div>
        <div className="space-y-4">
          {filteredProducts.map((product, index) => (
            <div key={product.id} className="flex items-start">
              <div className="text-sm font-semibold mr-2 mt-2">{index + 1}</div>
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
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}