'use client'

import { useState, useEffect } from 'react'
import { useAuth } from 'app/app/context/AuthContext'
import { useRouter } from 'next/navigation'
import { db } from 'app/services/firebase/firebase.config'
import { collection, doc, getDoc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore'
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
  }
  
  export default function StorePage({ params }: { params: { id: string } }) {
    const { user } = useAuth()
    const router = useRouter()
    const [invoice, setInvoice] = useState<Product[]>([])
  
    useEffect(() => {
      if (!user) {
        router.push('/login')
      }
    }, [user, router])
  
    const handleAddToInvoice = async (product: Product) => {
      setInvoice([...invoice, product])
      
      // Update inventory
      const productRef = doc(db, 'products', product.id)
      const productDoc = await getDoc(productRef)
      if (productDoc.exists()) {
        const productData = productDoc.data() as Product
        const size = Object.keys(product.sizes)[0]
        const newQuantity = productData.sizes[size].quantity - 1
        await updateDoc(productRef, {
          [`sizes.${size}.quantity`]: newQuantity
        })
      }
  
      // Add to store inventory
      await setDoc(doc(db, `store${params.id}`, product.id), product)
    }
  
    const handleSold = async (product: Product) => {
      await deleteDoc(doc(db, `store${params.id}`, product.id))
      setInvoice(invoice.filter(p => p.id !== product.id))
    }
  
    const handleReturn = async (product: Product) => {
      // Remove from store inventory
      await deleteDoc(doc(db, `store${params.id}`, product.id))
  
      // Update main inventory
      const productRef = doc(db, 'products', product.id)
      const productDoc = await getDoc(productRef)
      if (productDoc.exists()) {
        const productData = productDoc.data() as Product
        const size = Object.keys(product.sizes)[0]
        const newQuantity = productData.sizes[size].quantity + 1
        await updateDoc(productRef, {
          [`sizes.${size}.quantity`]: newQuantity
        })
      }
  
      setInvoice(invoice.filter(p => p.id !== product.id))
    }
  
    return (
      <div className="container mx-auto p-4">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Store {params.id}</CardTitle>
          </CardHeader>
          <CardContent>
            <ProductSearch onProductFound={handleAddToInvoice} />
          </CardContent>
        </Card>
  
        <Card>
          <CardHeader>
            <CardTitle>Invoice</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {invoice.map((product) => (
                <div key={product.id} className="space-y-2">
                  <ProductCard product={product} />
                  <div className="flex space-x-2">
                    <Button onClick={() => handleSold(product)}>Sold</Button>
                    <Button onClick={() => handleReturn(product)}>Return</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }