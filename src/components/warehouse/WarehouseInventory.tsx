'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from 'app/app/context/AuthContext'
import { db, storage } from 'app/services/firebase/firebase.config'
import { collection, getDocs, doc, deleteDoc, Timestamp, FieldValue, getDoc } from 'firebase/firestore'
import { ref, deleteObject } from 'firebase/storage'
import { Button } from "app/components/ui/button"
import { Input } from "app/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "app/components/ui/select"
import { Card, CardContent} from "app/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "app/components/ui/dropdown-menu"
import { Pencil, MoreHorizontal, FileDown, Trash2, PlusIcon, Filter, ArrowLeft, SortDesc  } from 'lucide-react'
import Image from 'next/image'
import { toast } from "app/components/ui/use-toast"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "app/components/ui/alert-dialog"
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

interface SizeInput {
  quantity: number
  barcodes: string[]
}

interface Box {
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
  barcode: string
}

interface WarehouseInventoryProps {
  companyId: string
  warehouseId: string
}

export default function WarehouseInventoryComponent({ companyId, warehouseId }: WarehouseInventoryProps) {
  const [boxes, setBoxes] = useState<Box[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [genderFilter, setGenderFilter] = useState<'all' | 'Dama' | 'Hombre'>('all')
  const [sortOrder, setSortOrder] = useState<'entry' | 'alphabetical'>('entry')
  const [boxToDelete, setBoxToDelete] = useState<Box | null>(null)
  const [warehouseName, setWarehouseName] = useState<string>('')
  const router = useRouter()
  const { user, userRole } = useAuth()

  const fetchWarehouseDetails = useCallback(async () => {
    try {
      const warehouseDoc = await getDoc(doc(db, `companies/${companyId}/warehouses`, warehouseId))
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
  }, [companyId, warehouseId])

  const fetchBoxes = useCallback(async () => {
    setLoading(true)
    try {
      const boxesQuery = collection(db, `companies/${companyId}/warehouses/${warehouseId}/boxes`)
      const boxesSnapshot = await getDocs(boxesQuery)
      const boxesList = boxesSnapshot.docs.map(doc => {
        const data = doc.data()
        let createdAtValue: number | Timestamp | FieldValue = data.createdAt

        if (createdAtValue instanceof Timestamp) {
          createdAtValue = createdAtValue.toMillis()
        } else if (typeof createdAtValue === 'number') {
          createdAtValue = createdAtValue
        } else {
          createdAtValue = Timestamp.now().toMillis()
        }

        // Safely calculate the total quantity
        const total = data.sizes && typeof data.sizes === 'object'
          ? Object.values(data.sizes as { [key: string]: SizeInput }).reduce((sum, size) => sum + (size?.quantity || 0), 0)
          : 0

        return { 
          id: doc.id, 
          ...data,
          createdAt: createdAtValue,
          total,
          sizes: data.sizes || {}  // Ensure sizes is always an object
        } as Box
      })
      setBoxes(boxesList)
    } catch (error) {
      console.error('Error fetching boxes:', error)
      toast({
        title: "Error",
        description: "Failed to fetch boxes. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [companyId, warehouseId])

  useEffect(() => {
    fetchWarehouseDetails()
    fetchBoxes()
  }, [fetchWarehouseDetails, fetchBoxes])

  const filteredBoxes = useMemo(() => {
    return boxes.filter((box) => {
      const matchesSearch = 
        box.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        box.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        box.color.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesGender = genderFilter === 'all' || box.gender === genderFilter
      return matchesSearch && matchesGender
    })
  }, [boxes, searchTerm, genderFilter])

  const sortedBoxes = useMemo(() => {
    return [...filteredBoxes].sort((a, b) => {
      if (sortOrder === 'alphabetical') {
        return a.brand.localeCompare(b.brand)
      }
      const aCreatedAt = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : 
                         typeof a.createdAt === 'number' ? a.createdAt : Date.now()
      const bCreatedAt = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : 
                         typeof b.createdAt === 'number' ? b.createdAt : Date.now()
      return (bCreatedAt as number) - (aCreatedAt as number)
    })
  }, [filteredBoxes, sortOrder])

  const handleDelete = async () => {
    if (boxToDelete) {
      try {
        await deleteDoc(doc(db, `companies/${companyId}/warehouses/${warehouseId}/boxes`, boxToDelete.id))
        if (boxToDelete.imageUrl) {
          const imageRef = ref(storage, boxToDelete.imageUrl)
          await deleteObject(imageRef)
        }
        toast({
          title: "Success",
          description: `Box ${boxToDelete.brand} ${boxToDelete.reference} has been deleted successfully.`,
          style: { background: "#4CAF50", color: "white", fontWeight: "bold" },
        })
        await fetchBoxes()
      } catch (error) {
        console.error('Error deleting box:', error)
        toast({
          title: "Error",
          description: `Failed to delete the box ${boxToDelete.brand} ${boxToDelete.reference}.`,
          variant: "destructive",
        })
      } finally {
        setBoxToDelete(null)
      }
    }
  }

  const handleUpdate = (box: Box) => {
    router.push(`/companies/${companyId}/warehouses/${warehouseId}/update-product/${box.id}?isBox=true`)
  }

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new()
    
    const worksheetData = filteredBoxes.map((box, index) => ({
      'No.': index + 1,
      'Brand': box.brand,
      'Reference': box.reference,
      'Color': box.color,
      'Gender': box.gender,
      'Sizes': JSON.stringify(box.sizes),
      'Total Quantity': box.total,
      'Base Price': box.baseprice,
      'Sale Price': box.saleprice,
      'Created At': box.createdAt instanceof Timestamp 
        ? box.createdAt.toDate().toISOString()
        : typeof box.createdAt === 'number'
          ? new Date(box.createdAt).toISOString()
          : new Date().toISOString(),
    }))

    const worksheet = XLSX.utils.json_to_sheet(worksheetData)

    worksheet['!cols'] = [
      { width: 5 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 10 },
      { width: 30 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 20 }
    ]

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Warehouse Inventory')

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    
    saveAs(data, `${warehouseName.replace(/\s+/g, '_')}_inventory.xlsx`)
  }

  const exportToPDF = () => {
    const doc = new jsPDF()

    doc.setFontSize(18)
    doc.text(`Warehouse Inventory (${warehouseName})`, 14, 22)

    doc.setFontSize(12)
    doc.text(`Total Boxes: ${formatNumber(summaryInfo.totalBoxes)}`, 14, 32)
    doc.text(`Total Quantity: ${formatNumber(summaryInfo.totalQuantity)}`, 14, 40)
    doc.text(`Total Base: $${formatNumber(summaryInfo.totalBase)}`, 14, 48)
    doc.text(`Total Sale: $${formatNumber(summaryInfo.totalSale)}`, 14, 56)

    const tableColumn = ["No.", "Brand", "Reference", "Color", "Gender", "Total", "Base Price", "Sale Price"]
    const tableRows = sortedBoxes.map((box, index) => [
      index + 1,
      box.brand,
      box.reference,
      box.color,
      box.gender,
      box.total,
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

    doc.save(`${warehouseName.replace(/\s+/g, '_')}_inventory.pdf`)
  }

  const summaryInfo = useMemo(() => {
    const totalBoxes = filteredBoxes.length
    const totalQuantity = filteredBoxes.reduce((sum, box) => sum + box.total, 0)
    const totalBase = filteredBoxes.reduce((sum, box) => sum + box.baseprice * box.total, 0)
    const totalSale = filteredBoxes.reduce((sum, box) => sum + box.saleprice * box.total, 0)
    return { totalBoxes, totalQuantity, totalBase, totalSale }
  }, [filteredBoxes])

  const formatNumber = (num: number) => {
    return num.toLocaleString('es-ES')
  }

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

  if (loading) {
    return <div>Loading...</div>
  }

  if (!user) {
    return <div>Please log in to view this page.</div>
  }

  return (
    <div className="min-h-screen bg-blue-100">
      <header className="bg-teal-600 text-white p-4 flex items-center">
        <Button variant="ghost" className="text-white p-0 mr-2" onClick={() => router.push(`/companies/${companyId}/warehouses`)}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-bold flex-grow">Inventory WH</h1>
        <div className="flex space-x-2">
          <Button onClick={() => router.push(`/companies/${companyId}/warehouses/${warehouseId}/form-product?isBox=true`)}>
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
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>Total Boxes: {formatNumber(summaryInfo.totalBoxes)}</div>
              <div>Total Quantity: {formatNumber(summaryInfo.totalQuantity)}</div>
              <div>Total Base: ${formatNumber(summaryInfo.totalBase)}</div>
              <div>Total Sale: ${formatNumber(summaryInfo.totalSale)}</div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {sortedBoxes.map((box, index) => (
            <div key={box.id} className="flex items-start">
              <div className="text-sm font-semibold mr-1 mt-2">{index + 1}</div>
              <Card className="flex-grow relative">
                <CardContent className="p-4">
                  <div className="absolute top-2 right-2 flex items-center">
                    <Button
                      variant="ghost"
                      className="h-8 w-8 p-0 mr-1"
                      onClick={() => handleUpdate(box)}
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
                        <DropdownMenuItem onClick={() => setBoxToDelete(box)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>Delete</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="relative w-16 h-16 flex-shrink-0">
                      <Image
                        src={box.imageUrl}
                        alt={`${box.brand} ${box.reference}`}
                        fill
                        sizes="(max-width: 64px) 150vw, 64px"
                        className="object-cover rounded-md"
                      />
                    </div>
                    <div className="flex-grow">
                      <h3 className="font-semibold">{box.brand}</h3>
                      <p className="text-sm text-gray-500">{box.reference}</p>
                      <p className="text-sm">{box.color} - {box.gender}</p>
                      <p className="text-sm">Sale: ${formatNumber(box.saleprice)}</p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="font-medium text-sm">Barcode Box: {box.barcode}</span>
                    <div className="grid grid-cols-3 gap-1 mt-1">
                      {Object.keys(box.sizes).length > 0 ? (
                        sortSizes(box.sizes).map(([size, { quantity }]) => (
                          <div key={size} className="text-xs bg-gray-100 p-1 rounded">
                            {size}: {quantity}
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-red-500">No sizes available</div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </main>

      <AlertDialog open={!!boxToDelete} onOpenChange={() => setBoxToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the box
              <span className="font-semibold"> {boxToDelete?.brand} {boxToDelete?.reference} </span>
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