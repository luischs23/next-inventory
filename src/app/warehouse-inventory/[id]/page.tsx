  'use client'

  import React, { useState, useEffect, useMemo, useCallback } from 'react'
  import { useRouter, useParams } from 'next/navigation'
  import { db, storage } from 'app/services/firebase/firebase.config'
  import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore'
  import { ref, deleteObject } from 'firebase/storage'
  import { Button } from "app/components/ui/button"
  import { Input } from "app/components/ui/input"
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "app/components/ui/select"
  import { Card, CardContent, CardHeader, CardTitle } from "app/components/ui/card"
  import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "app/components/ui/dropdown-menu"
  import { Pencil, MoreHorizontal, ImageIcon, FileDown, Trash2, Plus } from 'lucide-react'
  import Image from 'next/image'
  import { toast } from "app/components/ui/use-toast"
  import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
  } from "app/components/ui/alert-dialog"
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
    createdAt: number
  }

  export default function InventoryPage() {
    const [boxes, setBoxes] = useState<Box[]>([])
    const [loading, setLoading] = useState(true)
    const [filters, setFilters] = useState({ brand: '', reference: '', color: '', gender: '' })
    const [sortOrder, setSortOrder] = useState<'entry' | 'alphabetical'>('entry')
    const [boxToDelete, setBoxToDelete] = useState<Box | null>(null)
    const router = useRouter()
    const params = useParams()
    const warehouseId = params.id as string

    const fetchBoxes = useCallback(async () => {
      setLoading(true)
      try {
        const boxesSnapshot = await getDocs(collection(db, `warehouses/${warehouseId}/boxes`))
        const boxesList = boxesSnapshot.docs.map(doc => {
          const data = doc.data()
          let createdAtTimestamp = 0
  
          if (data.createdAt) {
            if (typeof data.createdAt.toMillis === 'function') {
              createdAtTimestamp = data.createdAt.toMillis()
            } else if (data.createdAt.seconds) {
              createdAtTimestamp = data.createdAt.seconds * 1000
            } else if (typeof data.createdAt === 'number') {
              createdAtTimestamp = data.createdAt > 100000000000 ? data.createdAt : data.createdAt * 1000
            }
          }
  
          return {
            id: doc.id,
            ...data,
            createdAt: createdAtTimestamp,
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
    }, [warehouseId])

    useEffect(() => {
      fetchBoxes()
    }, [fetchBoxes])

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
        // Si los timestamps son iguales, se ordena alfabéticamente
        const alphabeticalSort = a.brand.localeCompare(b.brand)
        if (a.createdAt === b.createdAt) {
          return alphabeticalSort
        }
        // Si los timestamps son diferentes, se prioriza por createdAt
        return a.createdAt > b.createdAt ? -1 : 1
      }
      // Si el tipo de ordenación es por "Entry Order", simplemente ordena por createdAt
      return b.createdAt - a.createdAt
    })
  }, [filteredBoxes, sortOrder])

    const handleDelete = async () => {
      if (boxToDelete) {
        try {
          // Delete the document from Firestore
          await deleteDoc(doc(db, `warehouses/${warehouseId}/boxes`, boxToDelete.id))
          console.log(`Document with ID ${boxToDelete.id} deleted successfully`)

          // Delete the image from Storage
          if (boxToDelete.imageUrl) {
            const imageRef = ref(storage, boxToDelete.imageUrl)
            await deleteObject(imageRef)
            console.log(`Image at ${boxToDelete.imageUrl} deleted successfully`)
          }

          toast({
            title: "Success",
            style: {
            background: "#4CAF50",
            color: "white",
            fontWeight: "bold",},
            description: `Box ${boxToDelete.brand} ${boxToDelete.reference} has been deleted successfully.`,
          })

          // Refresh the boxes list
          await fetchBoxes()
        } catch (error) {
          console.error('Error deleting box:', error)
          let errorMessage = 'An unknown error occurred'
          if (error instanceof Error) {
            errorMessage = error.message
          }
          toast({
            title: "Error",
            description: `Failed to delete the box ${boxToDelete.brand} ${boxToDelete.reference}. ${errorMessage}`,
            variant: "destructive",
          })
        } finally {
          setBoxToDelete(null)
        }
      }
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
      }))

      const worksheet = XLSX.utils.json_to_sheet(worksheetData)

      XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory')

      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      
      saveAs(data, 'inventory_report.xlsx')
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
  
      // Save the PDF
      doc.save('inventory_report.pdf')
    } 

    const summaryInfo = useMemo(() => {
      const totalItems = filteredBoxes.length
      const totalPares = filteredBoxes.reduce((sum, box) => sum + Number(box.quantity || 0), 0) // Convertir quantity a número
      const totalBase = filteredBoxes.reduce((sum, box) => sum + Number((box.baseprice || 0) * (box.quantity || 0)), 0) // Convertir baseprice y quantity a números
      const totalSale = filteredBoxes.reduce((sum, box) => sum + Number((box.saleprice || 0) * (box.quantity || 0)), 0) // Convertir saleprice y quantity a números
      return { totalItems, totalPares, totalBase, totalSale }
    }, [filteredBoxes])
    
    const formatNumber = (num: number) => {
      return num.toLocaleString('es-ES')
    }

    if (loading) {
      return <div className="container mx-auto px-4 py-8">Loading...</div>
    }

    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
        <h1 className="text-2xl font-bold">Inventory Dashboard</h1>
        <div className="flex justify-between items-center mb-6">
          <div className="space-x-2">
            <Button onClick={exportToExcel}>
              <FileDown className="mr-2 h-4 w-4" /> Export Excel
            </Button>
            <Button onClick={exportToPDF}>
              Export PDF
            </Button>
            <Button onClick={() => router.push(`/form-box?warehouseId=${warehouseId}`)}>
              <Plus className="mr-2 h-4 w-4" /> Add
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
          {sortedBoxes.map((box, index) => (
            <div key={box.id} className="flex items-start">
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
                        <DropdownMenuItem onClick={() => router.push(`/update-box/${box.id}?warehouseId=${warehouseId}`)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          <span>Update</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setBoxToDelete(box)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>Delete</span>
                        </DropdownMenuItem>
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
                    <div className="text-right">
                      <p className="font-semibold mt-5">Total: {box.quantity}</p>
                      <p className="text-sm">Sale: ${box.saleprice.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
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
              <AlertDialogAction onClick={handleDelete} className="bg-red-600 ">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    )
  }