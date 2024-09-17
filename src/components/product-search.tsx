'use client'

import { useState } from 'react'
import { db } from 'app/services/firebase/firebase.config'
import { collection, getDocs } from 'firebase/firestore'
import { Button } from "app/components/ui/button"
import { Input } from "app/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "app/components/ui/card"
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
  
  interface ProductSearchProps {
    onProductFound: (product: Product) => void
  }
  
  export default function ProductSearch({ onProductFound }: ProductSearchProps) {
    const [barcode, setBarcode] = useState('')
    const [product, setProduct] = useState<Product | null>(null)
    const [error, setError] = useState('')
  
    const handleSearch = async (e: React.FormEvent) => {
      e.preventDefault()
      setError('')
      setProduct(null)
  
      try {
        const productsRef = collection(db, 'products')
        const querySnapshot = await getDocs(productsRef)
  
        let foundProduct: Product | null = null
  
        querySnapshot.forEach((doc) => {
          const productData = doc.data() as Product
          productData.id = doc.id
  
          for (const [size, sizeData] of Object.entries(productData.sizes)) {
            if (sizeData.barcodes.includes(barcode)) {
              foundProduct = {
                ...productData,
                sizes: { [size]: sizeData } // Only include the relevant size
              }
              break
            }
          }
  
          if (foundProduct) return
        })
  
        if (foundProduct) {
          setProduct(foundProduct)
          onProductFound(foundProduct)
        } else {
          setError('No product found with this barcode')
        }
      } catch (error) {
        console.error('Error searching for product:', error)
        setError('An error occurred while searching for the product')
      }
    }
  
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Product Search</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <Input
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="Enter barcode"
            />
            <Button type="submit">Search</Button>
          </form>
          {error && <p className="text-red-500 mt-2">{error}</p>}
          {product && <ProductCard product={product} />}
        </CardContent>
      </Card>
    )
  }