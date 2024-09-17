'use client'

import { useState, useEffect } from 'react'
import { useAuth } from 'app/app/context/AuthContext'
import { useRouter } from 'next/navigation'
import { db } from 'app/services/firebase/firebase.config'
import { collection, doc, getDoc, updateDoc, setDoc, deleteDoc, getDocs } from 'firebase/firestore'
import { Button } from "app/components/ui/button"
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
  }
  
  interface ProductWithBarcode extends Product {
    size: string
    barcode: string
  }
  
  interface InvoiceItem extends ProductWithBarcode {
    invoiceId: string
  }
  
  export default function StorePage({ params }: { params: { id: string } }) {
    const { user } = useAuth()
    const router = useRouter()
    const [invoice, setInvoice] = useState<InvoiceItem[]>([])
  
    useEffect(() => {
      if (!user) {
        router.push('/login')
      } else {
        fetchInvoiceItems()
      }
    }, [user, router])
  
    const fetchInvoiceItems = async () => {
        if (!user) return
    
        const storeInvoiceRef = collection(db, 'stores', params.id, 'invoices', user.uid, 'items')
        const invoiceSnapshot = await getDocs(storeInvoiceRef)
        const invoiceItems = invoiceSnapshot.docs.map(doc => ({ ...doc.data(), invoiceId: doc.id } as InvoiceItem))
        setInvoice(invoiceItems)
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
        // Remove the size if it's empty
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

    // Add to store-specific invoice
    const storeInvoiceRef = doc(collection(db, 'stores', params.id, 'invoices', user.uid, 'items'))
    await setDoc(storeInvoiceRef, {
      id: product.id,
      brand: product.brand,
      reference: product.reference,
      color: product.color,
      size: product.size,
      barcode: product.barcode,
      imageUrl: product.imageUrl,
      sizes: {
        [product.size]: {
          quantity: 1,
          barcodes: [product.barcode]
        }
      }
    })

    // Refresh invoice items
    fetchInvoiceItems()
  }

  const handleReturn = async (item: InvoiceItem) => {
    if (!user) return

    // Remove from store-specific invoice
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

    // Refresh invoice items
    fetchInvoiceItems()
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
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {invoice.map((item) => (
              <div key={item.invoiceId} className="space-y-2">
                <ProductCard product={item} />
                <Button onClick={() => handleReturn(item)}>Return</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}