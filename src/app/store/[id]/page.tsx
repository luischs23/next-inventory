'use client'

import { useState, useEffect } from 'react'
import { useAuth } from 'app/app/context/AuthContext'
import { useRouter } from 'next/navigation'
import { db } from 'app/services/firebase/firebase.config'
import { collection, doc, getDoc, updateDoc, setDoc, deleteDoc, getDocs } from 'firebase/firestore'
import { Button } from "app/components/ui/button"
import { Input } from "app/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "app/components/ui/card"
import ProductSearch from 'app/components/product-search'
import ProductCard from 'app/components/product-card-store'

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
  }
  
  export default function StorePage({ params }: { params: { id: string } }) {
    const { user } = useAuth()
    const router = useRouter()
    const [invoice, setInvoice] = useState<InvoiceItem[]>([])
    const [totalSold, setTotalSold] = useState(0)
  
    useEffect(() => {
      if (!user) {
        router.push('/login')
      } else {
        fetchInvoiceItems()
      }
    }, [user, router])
  
    const fetchInvoiceItems = async () => {
      if (!user) return
  
      const invoiceRef = collection(db, 'stores', params.id, 'invoices', user.uid, 'items')
      const invoiceSnapshot = await getDocs(invoiceRef)
      const invoiceItems = invoiceSnapshot.docs.map(doc => {
        const data = doc.data() as InvoiceItem
        return {
          ...data,
          invoiceId: doc.id,
          salePrice: data.salePrice || 0,
          sold: data.sold || false
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
        sold: false
      }
      await setDoc(invoiceRef, newInvoiceItem)
  
      // Update local state
      setInvoice(prevInvoice => [...prevInvoice, newInvoiceItem])
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
  
    return (
      <div className="container mx-auto p-4">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Store {params.id}</CardTitle>
          </CardHeader>
          <CardContent>
            <ProductSearch onAddProduct={handleAddToInvoice} />
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
                    <span className="ml-auto">${item.salePrice.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }