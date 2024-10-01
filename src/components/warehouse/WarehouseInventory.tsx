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
import { Card, CardContent, CardHeader, CardTitle } from "app/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "app/components/ui/dropdown-menu"
import { Pencil, MoreHorizontal, ImageIcon, FileDown, Trash2, PlusIcon } from 'lucide-react'
import Image from 'next/image'
import { toast } from "app/components/ui/use-toast"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "app/components/ui/alert-dialog"
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

interface Box {
  id: string
  brand: string
  reference: string
  color: string
  gender: 'Dama' | 'Hombre'
  quantity: number
  imageUrl: string
  baseprice: number
  saleprice: number
  createdAt: number | Timestamp | FieldValue
  barcode: string
}

interface WarehouseInventoryProps {
    warehouseId: string
  }

export default function WarehouseInventoryPage({ warehouseId }: WarehouseInventoryProps) {
  const [boxes, setBoxes] = useState<Box[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ brand: '', reference: '', color: '', gender: '' })
  const [sortOrder, setSortOrder] = useState<'entry' | 'alphabetical'>('entry')
  const [boxToDelete, setBoxToDelete] = useState<Box | null>(null)
  const [warehouseName, setWarehouseName] = useState<string>('')
  const router = useRouter()
  const { user, userRole } = useAuth()

  const fetchWarehouseDetails = useCallback(async () => {
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
  }, [warehouseId])

  const fetchBoxes = useCallback(async () => {
    if (!user) {
      console.error('User not authenticated')
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const boxesQuery = collection(db, 'warehouses', warehouseId, 'boxes')
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

        return { 
          id: doc.id, 
          ...data,
          createdAt: createdAtValue,
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
  }, [warehouseId, user])

  useEffect(() => {
    fetchWarehouseDetails()
    fetchBoxes()
  }, [fetchWarehouseDetails, fetchBoxes])

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const filteredBoxes = useMemo(() => {
    return boxes.filter((box) => {
      return (
        (filters.brand === '' || box.brand.toLowerCase().includes(filters.brand.toLowerCase())) &&
        (filters.reference === '' || box.reference.toLowerCase().includes(filters.reference.toLowerCase())) &&
        (filters.color === '' || box.color.toLowerCase().includes(filters.color.toLowerCase())) &&
        (filters.gender === '' || filters.gender === 'all' || box.gender === filters.gender)
      )
    })
  }, [boxes, filters])

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
        await deleteDoc(doc(db, 'warehouses', warehouseId, 'boxes', boxToDelete.id))
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
    if (userRole !== 'admin') {
      console.error('Only admins can update boxes')
      return
    }
    router.push(`/update-box/${box.id}?warehouseId=${warehouseId}`)
  }

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new()
    
    const worksheetData = filteredBoxes.map((box, index) => ({
      'No.': index + 1,
      'Brand': box.brand,
      'Reference': box.reference,
      'Color': box.color,
      'Gender': box.gender,
      'Quantity': box.quantity,
      'Base Price': box.baseprice,
      'Sale Price': box.saleprice,
      'Barcode': box.barcode,
      'Created At': box.createdAt instanceof Timestamp 
        ? box.createdAt.toDate().toISOString()
        : typeof box.createdAt === 'number'
          ? new Date(box.createdAt).toISOString()
          : new Date().toISOString(),
    }))

    const worksheet = XLSX.utils.json_to_sheet(worksheetData)

    worksheet['!cols'] = [
      { width: 5 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 10 },
      { width: 10 }, { width: 15 }, { width: 15 }, { width: 20 }, { width: 20 }
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

    const tableColumn = ["No.", "Brand", "Reference", "Color", "Gender", "Quantity", "Base Price", "Sale Price"]
    const tableRows = sortedBoxes.map((box, index) => [
      index + 1,
      box.brand,
      box.reference,
      box.color,
      box.gender,
      box.quantity,
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
    const totalQuantity = filteredBoxes.reduce((sum, box) => sum + box.quantity, 0)
    const totalBase = filteredBoxes.reduce((sum, box) => sum + box.baseprice * box.quantity, 0)
    const totalSale = filteredBoxes.reduce((sum, box) => sum + box.saleprice * box.quantity, 0)
    return { totalBoxes, totalQuantity, totalBase, totalSale }
  }, [filteredBoxes])

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
          <h2 className="text-2xl font-bold">Warehouse Inventory ({warehouseName})</h2>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={exportToExcel} className="mb-4">
            <FileDown className="mr-2 h-4 w-4" /> Export Excel
          </Button>
          <Button onClick={exportToPDF} className="mb-4">
            Export PDF
          </Button>
        </div>
        {userRole === 'admin' && (
            <Button onClick={() => router.push(`/form-box/${warehouseId}`)}>
              <PlusIcon className="mr-2 h-4 w-4" /> Add Box
            </Button>
          )}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4">
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
                            <DropdownMenuItem onClick={() => handleUpdate(box)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              <span>Update</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setBoxToDelete(box)}>
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
                      {box.imageUrl ? (
                        <Image
                          src={box.imageUrl}
                          alt={`${box.brand} ${box.reference}`}
                          fill
                          sizes="(max-width: 64px) 100vw, 64px"
                          className="object-cover rounded-md"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-200 flex items-center justify-center rounded-md">
                          <ImageIcon className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-grow">
                      <h3 className="font-semibold">{box.brand}</h3>
                      <p className="text-sm text-gray-500">{box.reference}</p>
                      <p className="text-sm">{box.color} - {box.gender}</p>
                    </div>
                    <div className="text-right mt-5">
                      <p className="font-semibold">total: {box.quantity}</p>
                      <p className="text-sm">Sale: ${formatNumber(box.saleprice)}</p>
                    </div>
                  </div>
                  <div className="mt-2 text-sm">
                    <p>Barcode: {box.barcode}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>

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