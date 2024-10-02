'use client'

import { useState, useEffect } from 'react'
import { useAuth } from 'app/app/context/AuthContext'
import { useRouter } from 'next/navigation'
import { db } from 'app/services/firebase/firebase.config'
import { doc, getDoc, getDocs, updateDoc, collection, query, where, Timestamp, arrayUnion, increment} from 'firebase/firestore'
import { Card, CardContent, CardHeader, CardTitle } from "app/components/ui/card"
import { Button } from "app/components/ui/button"
import { Input } from "app/components/ui/input"
import { Label } from "app/components/ui/label"
import Link from 'next/link'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import Image from 'next/image'
import { toast } from 'app/components/ui/use-toast'

interface InvoiceItem {
  id: string
  productId: string
  brand: string
  reference: string
  color: string
  size: string
  barcode: string
  salePrice: number
  baseprice: number
  sold: boolean
  addedAt: Timestamp | Date
  exhibitionStore: string | null
  warehouseId: string | null
  isBox: boolean
  imageUrl: string 
  quantity: number
  returned?: boolean
}

interface Invoice {
  id: string
  storeId: string
  userId: string
  customerName: string
  customerPhone: string
  totalSold: number
  totalEarn: number
  createdAt: Timestamp | Date
  items: InvoiceItem[]
}

export default function InvoicePage({ params }: { params: { id: string, invoiceId: string } }) {
  const { user } = useAuth()
  const router = useRouter()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [storeName, setStoreName] = useState<string>('')
  const [warehouses, setWarehouses] = useState<{[id: string]: string}>({})
  const [stores, setStores] = useState<{[id: string]: string}>({})
  const [returnBarcode, setReturnBarcode] = useState('')
  const [addBarcode, setAddBarcode] = useState('')
  const [newSalePrice, setNewSalePrice] = useState('')
  const [searchResult, setSearchResult] = useState<InvoiceItem | null>(null)

  const formatPrice = (price: number): string => {
    return price.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  }

  useEffect(() => { 
    if (!user) {
      router.push('/login')
    } else {
      fetchInvoice()
      fetchWarehouses()
      fetchStores()
    }
  }, [user, router])

  const fetchInvoice = async () => {
    if (!user) return

    const storeRef = doc(db, 'stores', params.id)
    const storeDoc = await getDoc(storeRef)
    if (storeDoc.exists()) {
      setStoreName(storeDoc.data().name)

      const invoiceRef = doc(storeRef, 'invoices', params.invoiceId)
      const invoiceDoc = await getDoc(invoiceRef)
      if (invoiceDoc.exists()) {
        const data = invoiceDoc.data() as Invoice
        setInvoice({
          ...data,
          id: invoiceDoc.id,
          totalEarn: data.totalEarn,
        })
      }
    }
  }

  const fetchWarehouses = async () => {
    const warehousesSnapshot = await getDocs(collection(db, 'warehouses'))
    const warehousesData = warehousesSnapshot.docs.reduce((acc, doc) => {
      acc[doc.id] = doc.data().name
      return acc
    }, {} as {[id: string]: string})
    setWarehouses(warehousesData)
  }

  const fetchStores = async () => {
    const storesSnapshot = await getDocs(collection(db, 'stores'))
    const storesData = storesSnapshot.docs.reduce((acc, doc) => {
      acc[doc.id] = doc.data().name
      return acc
    }, {} as {[id: string]: string})
    setStores(storesData)
  }

  const handleReturn = async () => {
    if (!invoice) return
  
    const itemToReturn = invoice.items.find(item => item.barcode === returnBarcode)
    if (!itemToReturn) {
      toast({
        title: "Error",
        description: "Item not found in the invoice",
        variant: "destructive",
      })
      return
    }
  
    if (!itemToReturn.productId || !itemToReturn.warehouseId) {
      toast({
        title: "Error",
        description: "Product ID or Warehouse ID not found for this item",
        variant: "destructive",
      })
      return
    }
  
    try {
      // Update the invoice
      const updatedItems = invoice.items.map(item => 
        item.barcode === returnBarcode ? {...item, returned: true} : item
      )
      const updatedTotalSold = invoice.totalSold - itemToReturn.salePrice
      const updatedTotalEarn = invoice.totalEarn - (itemToReturn.salePrice - itemToReturn.baseprice)
  
      // Update the invoice in Firestore
      const invoiceRef = doc(db, 'stores', params.id, 'invoices', params.invoiceId)
      await updateDoc(invoiceRef, {
        items: updatedItems,
        totalSold: updatedTotalSold,
        totalEarn: updatedTotalEarn
      })
  
      // Return the item to the product inventory
      const productRef = doc(db, 'warehouses', itemToReturn.warehouseId, 'products', itemToReturn.productId)
      const productDoc = await getDoc(productRef)
      if (productDoc.exists()) {
        const productData = productDoc.data()
        const updatedSizes = {...productData.sizes}
        if (!updatedSizes[itemToReturn.size]) {
          updatedSizes[itemToReturn.size] = { barcodes: [], quantity: 0 }
        }
        updatedSizes[itemToReturn.size].barcodes.push(itemToReturn.barcode)
        updatedSizes[itemToReturn.size].quantity = (updatedSizes[itemToReturn.size].quantity || 0) + 1
  
        await updateDoc(productRef, { 
          sizes: updatedSizes,
          total: increment(1)
        })
  
        // If the item was from an exhibition store, update the exhibition data
        if (itemToReturn.exhibitionStore) {
          const exhibitionUpdate = {
            [`exhibition.${itemToReturn.exhibitionStore}`]: arrayUnion(itemToReturn.barcode)
          }
          await updateDoc(productRef, exhibitionUpdate)
        }
  
        toast({
          title: "Success",
          description: "Item returned successfully",
          duration: 3000,
          style: {
            background: "#4CAF50",
            color: "white",
            fontWeight: "bold",
          },
        })
      } else {
        console.error(`Product with ID ${itemToReturn.productId} not found in warehouse ${itemToReturn.warehouseId}`)
        toast({
          title: "Error",
          description: "Product not found in the database",
          variant: "destructive",
        })
      }
  
      // Refresh the invoice data
      await fetchInvoice()
      setReturnBarcode('')
  
    } catch (error) {
      console.error("Error returning item:", error)
      toast({
        title: "Error",
        description: "Failed to return item. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleSearch = async () => {
    if (!addBarcode) {
      toast({
        title: "Error",
        description: "Please enter a barcode to search",
        variant: "destructive",
      })
      return
    }
    
    try {
      let foundProduct: InvoiceItem | null = null
  
      // Search in all warehouses
      for (const warehouseId of Object.keys(warehouses)) {
        const productsRef = collection(db, 'warehouses', warehouseId, 'products')
        const querySnapshot = await getDocs(productsRef)

        // Search in sizes
        for (const doc of querySnapshot.docs) {
          const productData = doc.data()
          for (const [size, sizeData] of Object.entries(productData.sizes)) {
            if (sizeData.barcodes.includes(addBarcode)) {
              foundProduct = {
                id: doc.id,
                productId: doc.id,
                brand: productData.brand,
                reference: productData.reference,
                color: productData.color,
                size: size,
                barcode: addBarcode,
                salePrice: productData.saleprice,
                baseprice: productData.baseprice,
                sold: false,
                addedAt: new Date(),
                exhibitionStore: null,
                warehouseId: warehouseId,
                isBox: false,
                imageUrl: productData.imageUrl,
                quantity: 1
              }
              break
            }
          }
          if (foundProduct) break
        }
        if (foundProduct) break
      }

      if (foundProduct) {
        setSearchResult(foundProduct)
      } else {
        setSearchResult(null)
        toast({
          title: "Error",
          description: "Product not found",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error searching for product:", error)
      toast({
        title: "Error",
        description: "An error occurred while searching for the product",
        variant: "destructive",
      })
    }
  }

  const handleAddToInvoice = async () => {
    if (!invoice || !searchResult) return

    const newItem: InvoiceItem = {
      ...searchResult,
      salePrice: Number(newSalePrice),
      sold: true,
      addedAt: new Date(),
      productId: searchResult.productId
    }
    
    const updatedItems = [...invoice.items, newItem]
    const updatedTotalSold = invoice.totalSold + Number(newSalePrice)
    const updatedTotalEarn = invoice.totalEarn + (Number(newSalePrice) - searchResult.baseprice)

    // Update the invoice in Firestore
    const invoiceRef = doc(db, 'stores', params.id, 'invoices', params.invoiceId)
    await updateDoc(invoiceRef, {
      items: updatedItems,
      totalSold: updatedTotalSold,
      totalEarn: updatedTotalEarn
    })

    // Remove the barcode from the product's inventory
    if (searchResult.warehouseId) {
      const productRef = doc(db, 'warehouses', searchResult.warehouseId, 'products', searchResult.productId)
      const productDoc = await getDoc(productRef)
      if (productDoc.exists()) {
        const productData = productDoc.data()
        const updatedSizes = {...productData.sizes}
        if (updatedSizes[searchResult.size]) {
          const barcodeIndex = updatedSizes[searchResult.size].barcodes.indexOf(searchResult.barcode)
          if (barcodeIndex > -1) {
            updatedSizes[searchResult.size].barcodes.splice(barcodeIndex, 1)
            updatedSizes[searchResult.size].quantity = (updatedSizes[searchResult.size].quantity || 0) - 1
          }
          await updateDoc(productRef, { 
            sizes: updatedSizes,
            total: increment(-1)
          })
        } else {
          console.error(`Size ${searchResult.size} not found in product ${searchResult.productId}`)
        }
      } else {
        console.error(`Product ${searchResult.productId} not found`)
      }
    }

    // Refresh the invoice data 
    await fetchInvoice()
    setAddBarcode('')
    setNewSalePrice('')
    setSearchResult(null)

    toast({
      title: "Success",
      description: "Item added to invoice successfully",
      duration: 3000,
      style: {
        background: "#4CAF50",
        color: "white",
        fontWeight: "bold",
      },
    })
  }

  const formatDate = (date: Timestamp | Date) => {
    if (date instanceof Timestamp) {
      date = date.toDate()
    }
    return new Date(date).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  }

  const exportToPDF = () => {
    if (!invoice) return

    const pdf = new jsPDF()
    let yOffset = 20

    // Add invoice header
    pdf.setFontSize(20)
    pdf.text(`Invoice for ${invoice.customerName}`, 20, yOffset)
    yOffset += 10

    pdf.setFontSize(12)
    pdf.text(`Date: ${formatDate(invoice.createdAt)}`, 20, yOffset)
    yOffset += 10
    pdf.text(`Phone: ${invoice.customerPhone}`, 20, yOffset)
    yOffset += 10
    pdf.text(`Total: $${formatPrice(invoice.totalSold)}`, 20, yOffset)
    yOffset += 10
    pdf.text(`Total Earn: $${formatPrice(invoice.totalEarn)}`, 20, yOffset)
    yOffset += 20

    // Add item table
    const columns = ['Brand', 'Reference', 'Color', 'Size', 'Price', 'Earn', 'Location', 'Added At']
    const data = invoice.items.map(item => [
      item.brand,
      item.reference,
      item.color,
      item.size,
      `$${formatPrice(item.salePrice)}`,
      `$${formatPrice(item.salePrice - item.baseprice)}`,
      item.exhibitionStore ? `Exhibition: ${stores[item.exhibitionStore]}` : `Warehouse: ${warehouses[item.warehouseId || '']}`,
      formatDate(item.addedAt)
    ])

    pdf.autoTable({
      head: [columns],
      body: data,
      startY: yOffset,
      theme: 'grid'
    })

    // Save the PDF
    pdf.save(`Invoice_${invoice.customerName}_${formatDate(invoice.createdAt)}.pdf`)
  }

  if (!invoice) {
    return <div>Loading...</div>
  }

  return (
    <div className="container mx-auto p-4">
      <Card className="mb-2">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Invoice for {invoice?.customerName}</CardTitle>
          <div className="text-sm text-gray-500">
            Date: {invoice && formatDate(invoice.createdAt)}
          </div>
        </CardHeader>
        <CardContent> 
          <p className="mb-2">Store: {storeName}</p>
          <p className="mb-2">Customer Phone: {invoice.customerPhone}</p>
          <p className="mb-2 text-lg font-semibold">Total Sold: ${invoice && formatPrice(invoice.totalSold)}</p>
          <p className="mb-2 text-lg font-semibold">Total Earn: ${invoice &&formatPrice(invoice.totalEarn)}</p>
          <div className="flex space-x-4 mt-4">
            <Button onClick={exportToPDF}>Export to PDF</Button>
            <Link href={`/store/${params.id}/invoices`}>
              <Button variant="outline">Invoice List</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 mb-4">
            <div>
              <Label htmlFor="returnBarcode">Return</Label>
              <div className="flex">
                <Input
                  id="returnBarcode"
                  value={returnBarcode}
                  onChange={(e) => setReturnBarcode(e.target.value)}
                  placeholder="Enter barcode to return"
                  className="mr-2"
                />
                <Button onClick={handleReturn}>Return</Button>
              </div>
            </div>
            
            <div>
              <Label htmlFor="addBarcode">Add to Invoice</Label>
              <div className="flex">
                <Input
                  id="addBarcode"
                  value={addBarcode}
                  onChange={(e) => setAddBarcode(e.target.value)}
                  placeholder="Enter barcode to add"
                  className="mr-2"
                />
                <Button onClick={handleSearch}>Search</Button>
              </div>
            </div>
          </div>
          
          {searchResult && (
            <Card className="mb-4">
              <CardContent className="p-4">
                <h3 className="font-semibold">{searchResult.brand} - {searchResult.reference}</h3>
                <p>Color: {searchResult.color}</p>
                <p>Size: {searchResult.size}</p>
                <p>Barcode: {searchResult.barcode}</p>
                <div className="flex mt-2">
                  <Input
                    value={newSalePrice}
                    onChange={(e) => setNewSalePrice(e.target.value)}
                    placeholder="Enter sale price"
                    className="mr-2"
                  />
                  <Button onClick={handleAddToInvoice}>Add to Invoice</Button>
                </div>
              </CardContent>
            </Card>
          )}
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle>Invoice Items</CardTitle>
          <span className="text-sm text-gray-500">({invoice.items.length} items)</span>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {invoice.items.map((item, index) => (
              <div key={index} className="flex items-start">
                <span className="text-sm font-semibold text-gray-500 mr-2 mt-1">{index + 1}</span>
                <Card className={`w-full ${item.returned ? 'opacity-50 bg-gray-100' : ''}`}>
                <CardContent className="p-2 flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">{item.brand} - {item.reference}</h3>
                      <p>Color: {item.color}</p>
                      {item.isBox ? (
                        <p>Box: {item.quantity}</p>
                      ) : (
                        <p>Size: {item.size}</p>
                      )}
                      <p>Barcode: {item.barcode}</p>
                      <p>Sale Price: ${formatPrice(item.salePrice)}</p>
                      <p className="text-sm text-gray-500">Added At: {formatDate(item.addedAt)}</p>
                      <div className='flex space-x-4'>
                        {item.exhibitionStore ? (
                          <p className="text-sm text-gray-500">Exb: {stores[item.exhibitionStore]}</p>
                        ) : (
                          <p className="text-sm text-gray-500">WH: {warehouses[item.warehouseId || '']}</p>
                        )}
                        <p className="text-sm text-gray-500"> |Earn: ${formatPrice((item.salePrice - item.baseprice) * item.quantity)}</p>
                      </div>
                    </div>
                    <div className="w-24 h-24 relative">
                      <Image
                        src={item.imageUrl || '/placeholder.svg'}
                        alt={`${item.brand} - ${item.reference}`}
                        fill
                        className="object-cover rounded-md"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}