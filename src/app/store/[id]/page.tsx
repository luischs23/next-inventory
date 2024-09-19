'use client'

import { useState, useEffect } from 'react'
import { useAuth } from 'app/app/context/AuthContext'
import { useRouter } from 'next/navigation'
import { db } from 'app/services/firebase/firebase.config'
import { collection, doc, getDoc, updateDoc, setDoc, deleteDoc, getDocs, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore'
import { Button } from "app/components/ui/button"
import { Input } from "app/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "app/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "app/components/ui/dropdown-menu"
import ProductSearch from 'app/components/product-search'
import ProductCard from 'app/components/product-card-store'
import { MoreVertical, Save } from 'lucide-react'

interface Size {
    quantity: number
    barcodes: string[]
  }
  
  interface Product {
    id: string
    brand: string
    reference: string
    color: string
    sizes: { [size: string]: Size }
    total: number
    imageUrl: string
    saleprice: number
  }
  
  interface ProductWithBarcode extends Product {
    size: string
    barcode: string
  }
  interface InvoiceItem extends ProductWithBarcode {
    invoiceId: string
    salePrice: number
    sold: boolean
    addedAt: Timestamp | Date
  }

  interface Store {
    name: string
  }
  
  export default function StorePage({ params }: { params: { id: string } }) {
    const { user } = useAuth()
    const router = useRouter()
    const [invoice, setInvoice] = useState<InvoiceItem[]>([])
    const [totalSold, setTotalSold] = useState(0)
    const [customerName, setCustomerName] = useState('')
    const [customerPhone, setCustomerPhone] = useState('')
    const [storeName, setStoreName] = useState<string>('')
  
    useEffect(() => {
      if (!user) {
        router.push('/login')
      } else {
        fetchStoreAndInvoiceItems()
      }
    }, [user, router])
  
    const fetchStoreAndInvoiceItems = async () => {
      if (!user) return
  
      // Fetch store name
      const storeRef = doc(db, 'stores', params.id)
      const storeDoc = await getDoc(storeRef)
      if (storeDoc.exists()) {
        const storeData = storeDoc.data() as Store
        setStoreName(storeData.name)
      }
  
      // Fetch invoice items
      const invoiceRef = collection(db, 'stores', params.id, 'invoices', user.uid, 'items')
      const invoiceSnapshot = await getDocs(invoiceRef)
      const invoiceItems = invoiceSnapshot.docs.map(doc => {
        const data = doc.data() as InvoiceItem
        return {
          ...data,
          invoiceId: doc.id,
          salePrice: data.salePrice || 0,
          sold: data.sold || false,
          addedAt: data.addedAt instanceof Timestamp ? data.addedAt.toDate() : data.addedAt || new Date()
        }
      })
      setInvoice(invoiceItems)
      calculateTotalSold(invoiceItems)
    }
  
    const calculateTotalSold = (items: InvoiceItem[]) => {
      const total = items.reduce((sum, item) => sum + (item.sold ? item.salePrice : 0), 0)
      setTotalSold(total)
    }
  
    const handleAddToInvoice = async (product: ProductWithBarcode) => {
      if (!user) return
  
      // Update inventory
      const productRef = doc(db, 'products', product.id)
      const productDoc = await getDoc(productRef)
      if (productDoc.exists()) {
        const productData = productDoc.data() as Product
        const newBarcodes = productData.sizes[product.size].barcodes.filter(b => b !== product.barcode)
        const newQuantity = productData.sizes[product.size].quantity - 1
        const newTotal = productData.total - 1
  
        let updatedSizes = { ...productData.sizes }
        if (newQuantity === 0 && newBarcodes.length === 0) {
          delete updatedSizes[product.size]
        } else {
          updatedSizes[product.size] = {
            quantity: newQuantity,
            barcodes: newBarcodes
          }
        }
  
        await updateDoc(productRef, {
          sizes: updatedSizes,
          total: newTotal
        })
      }
  
      // Add to invoice
      const invoiceRef = doc(collection(db, 'stores', params.id, 'invoices', user.uid, 'items'))
      const newInvoiceItem: InvoiceItem = {
        ...product,
        invoiceId: invoiceRef.id,
        salePrice: 0,
        sold: false,
        addedAt: serverTimestamp() as Timestamp
      }
      await setDoc(invoiceRef, newInvoiceItem)
  
      // Update local state
      setInvoice(prevInvoice => [...prevInvoice, {...newInvoiceItem, addedAt: new Date()}])
    }
  
    const handleReturn = async (item: InvoiceItem) => {
      if (!user) return
  
      // Remove from invoice
      await deleteDoc(doc(db, 'stores', params.id, 'invoices', user.uid, 'items', item.invoiceId))
  
      // Update main inventory
      const productRef = doc(db, 'products', item.id)
      const productDoc = await getDoc(productRef)
      if (productDoc.exists()) {
        const productData = productDoc.data() as Product
        const updatedSizes = { ...productData.sizes }
        if (updatedSizes[item.size]) {
          updatedSizes[item.size] = {
            quantity: (updatedSizes[item.size].quantity || 0) + 1,
            barcodes: [...(updatedSizes[item.size].barcodes || []), item.barcode]
          }
        } else {
          updatedSizes[item.size] = {
            quantity: 1,
            barcodes: [item.barcode]
          }
        }
        const newTotal = (productData.total || 0) + 1
        await updateDoc(productRef, {
          sizes: updatedSizes,
          total: newTotal
        })
      }
  
      // Update invoice and total sold
      setInvoice(prevInvoice => prevInvoice.filter(i => i.invoiceId !== item.invoiceId))
      if (item.sold) {
        setTotalSold(prevTotal => prevTotal - item.salePrice)
      }
    }
  
    const handleSalePriceChange = (invoiceId: string, price: number) => {
      setInvoice(prevInvoice => 
        prevInvoice.map(item => 
          item.invoiceId === invoiceId ? { ...item, salePrice: price } : item
        )
      )
    }
  
    const handleSold = async (item: InvoiceItem) => {
      if (!user) return
  
      const updatedItem = { ...item, sold: true }
      await updateDoc(doc(db, 'stores', params.id, 'invoices', user.uid, 'items', item.invoiceId), updatedItem)
  
      setInvoice(prevInvoice => 
        prevInvoice.map(i => 
          i.invoiceId === item.invoiceId ? updatedItem : i
        )
      )
  
      setTotalSold(prevTotal => prevTotal + item.salePrice)
    }
  
    const handleSaveInvoice = async () => {
      if (!user) return
  
      const savedInvoiceRef = collection(db, 'savedInvoices')
      const savedInvoiceDoc = await addDoc(savedInvoiceRef, {
        storeId: params.id,
        userId: user.uid,
        customerName,
        customerPhone,
        totalSold,
        createdAt: serverTimestamp(),
        items: invoice.map(item => ({
          brand: item.brand,
          reference: item.reference,
          color: item.color,
          size: item.size,
          barcode: item.barcode,
          salePrice: item.salePrice,
          sold: item.sold,
          addedAt: item.addedAt
        }))
      })
  
      // Clear the invoice items after saving
      setInvoice([])
      setTotalSold(0)
      setCustomerName('')
      setCustomerPhone('')
  
      // Clear the items from the Firestore collection
      const invoiceRef = collection(db, 'stores', params.id, 'invoices', user.uid, 'items')
      const invoiceSnapshot = await getDocs(invoiceRef)
      const deletePromises = invoiceSnapshot.docs.map(doc => deleteDoc(doc.ref))
      await Promise.all(deletePromises)
  
      router.push(`/saved-invoice/${savedInvoiceDoc.id}`)
    }
  
    return (
      <div className="container mx-auto p-4">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{storeName}</CardTitle>
          </CardHeader>
          <CardContent>
            <ProductSearch onAddProduct={handleAddToInvoice} />
          </CardContent>
        </Card>
  
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="flex space-x-4">
            <Input
              placeholder="Name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
            <Input
              placeholder="Phone"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline"><MoreVertical className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleSaveInvoice}>
                  <Save className="mr-2 h-4 w-4" />
                  <span>Save Invoice</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardContent>
        </Card>
  
        <Card>
          <CardHeader>
            <CardTitle>Invoice</CardTitle>
            <div className="text-sm text-gray-500">
              Items: {invoice.length} | Total Sold: ${totalSold.toFixed(2)} | Date: {new Date().toLocaleString()}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {invoice.map((item) => (
                <div key={item.invoiceId} className="space-y-2">
                  <ProductCard product={item} />
                  <div className="flex items-center space-x-2">
                    <Button onClick={() => handleReturn(item)}>Return</Button>
                    <Input
                      type="number"
                      value={item.salePrice}
                      onChange={(e) => handleSalePriceChange(item.invoiceId, parseFloat(e.target.value))}
                      disabled={item.sold}
                      className="w-24"
                    />
                    <Button onClick={() => handleSold(item)} disabled={item.sold}>Sold</Button>
                    <span className="ml-auto">${item.salePrice.toFixed(0)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }