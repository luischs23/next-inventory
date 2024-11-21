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
  total: number
  imageUrl: string
  saleprice: number
}

interface ProductWithBarcode extends Product {
  size: string
  barcode: string
}

interface ProductSearchProps {
  onAddProduct: (product: ProductWithBarcode) => void
}

export default function ProductSearch({ onAddProduct }: ProductSearchProps) {
  const [barcode, setBarcode] = useState('')
  const [product, setProduct] = useState<ProductWithBarcode | null>(null)
  const [error, setError] = useState('')

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setProduct(null)

    try {
      const productsRef = collection(db, 'products')
      const querySnapshot = await getDocs(productsRef)

      let foundProduct: ProductWithBarcode | null = null

      for (const doc of querySnapshot.docs) {
        const productData = doc.data() as Product
        for (const [size, sizeData] of Object.entries(productData.sizes)) {
          const barcodeIndex = sizeData.barcodes.indexOf(barcode)
          if (barcodeIndex !== -1) {
            foundProduct = {
              ...productData,
              id: doc.id,
              size,
              barcode,
              sizes: { [size]: { ...sizeData, quantity: 1, barcodes: [barcode] } }
            }
            break
          }
        }
        if (foundProduct) break
      }

      if (foundProduct) {
        setProduct(foundProduct)
      } else {
        setError('No product found with this barcode')
      }
    } catch (error) {
      console.error('Error searching for product:', error)
      setError('An error occurred while searching for the product')
    }
  }

  const handleAdd = () => {
    if (product) {
      onAddProduct(product)
      setBarcode('')
      setProduct(null)
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
        {product && (
          <div className="mt-4 flex items-center justify-between">
            <ProductCard product={product} />
            <Button onClick={handleAdd}>Add</Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}