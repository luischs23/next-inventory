'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { db, storage } from 'app/services/firebase/firebase.config'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { Button } from "app/components/ui/button"
import { Input } from "app/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "app/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "app/components/ui/card"
import { Label } from "app/components/ui/label"
import Barcode from 'react-barcode'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "app/components/ui/dialog"

interface SizeInput {
  quantity: number
  barcodes: string[]
}

interface Product {
  id: string
  brand: string
  reference: string
  color: string
  gender: 'Dama' | 'Hombre'
  sizes: { [key: string]: SizeInput }
  imageUrl: string
  total: number
}

export default function UpdateProductPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [newImage, setNewImage] = useState<File | null>(null)

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const productDoc = await getDoc(doc(db, 'products', params.id))
        if (productDoc.exists()) {
          const productData = productDoc.data() as Omit<Product, 'id'>
          setProduct({ 
            id: productDoc.id, 
            ...productData,
            sizes: productData.sizes || {}
          })
        } else {
          console.error('Product not found')
          router.push('/inventory')
        }
      } catch (error) {
        console.error('Error fetching product:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [params.id, router])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setProduct(prev => prev ? { ...prev, [name]: value } : null)
  }

  const handleSizeChange = (size: string, value: string) => {
    const quantity = parseInt(value) || 0
    setProduct(prev => {
      if (!prev) return null
      const currentBarcodes = prev.sizes[size]?.barcodes || []
      const newBarcodes = Array(quantity).fill('').map((_, index) => 
        currentBarcodes[index] || Math.random().toString(36).substr(2, 9).toUpperCase()
      )
      return {
        ...prev,
        sizes: {
          ...prev.sizes,
          [size]: { quantity, barcodes: newBarcodes }
        },
        total: Object.values(prev.sizes).reduce((sum, s) => sum + s.quantity, 0) - prev.sizes[size].quantity + quantity
      }
    })
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setNewImage(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!product) return

    try {
      let imageUrl = product.imageUrl

      if (newImage) {
        const imageRef = ref(storage, `products/${newImage.name}`)
        await uploadBytes(imageRef, newImage)
        imageUrl = await getDownloadURL(imageRef)
      }

      await updateDoc(doc(db, 'products', product.id), {
        ...product,
        imageUrl
      })

      router.push('/inventory')
    } catch (error) {
      console.error('Error updating product:', error)
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  if (!product) {
    return <div>Product not found</div>
  }
  const sizeInputs = product.gender === 'Dama'
    ? ['T-35', 'T-36', 'T-37', 'T-38', 'T-39', 'T-40']
    : ['T-40', 'T-41', 'T-42', 'T-43', 'T-44', 'T-45']

  return (
    <Card className="w-full max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>Update Product</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="brand">Brand</Label>
            <Input id="brand" name="brand" value={product.brand} onChange={handleInputChange} />
          </div>
          <div>
            <Label htmlFor="reference">Reference</Label>
            <Input id="reference" name="reference" value={product.reference} onChange={handleInputChange} />
          </div>
          <div>
            <Label htmlFor="color">Color</Label>
            <Input id="color" name="color" value={product.color} onChange={handleInputChange} />
          </div>
          <div>
            <Label htmlFor="gender">Gender</Label>
            <Select name="gender" value={product.gender} onValueChange={(value) => setProduct(prev => prev ? { ...prev, gender: value as 'Dama' | 'Hombre' } : null)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Dama">Dama</SelectItem>
                <SelectItem value="Hombre">Hombre</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Sizes</Label>
            <div className="grid grid-cols-3 gap-4">
              {sizeInputs.map((size) => (
                <div key={size}>
                  <Label htmlFor={size}>{size}</Label>
                  <Input
                    id={size}
                    type="number"
                    value={product.sizes[size]?.quantity || ''}
                    onChange={(e) => handleSizeChange(size, e.target.value)}
                  />
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="mt-2 w-full">View Barcodes</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl">
                      <DialogHeader>
                        <DialogTitle>Barcodes for {product.brand} - {product.reference} - Size {size}</DialogTitle>
                      </DialogHeader>
                      <div className="grid grid-cols-3 gap-4">
                        {product.sizes[size]?.barcodes.map((barcode, index) => (
                          <div key={index} className="text-center">
                            <Barcode value={barcode} width={1} height={50} fontSize={12} />
                            <p className="mt-1 text-sm">{barcode}</p>
                          </div>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="total">Total</Label>
            <Input id="total" name="total" value={product.total} readOnly />
          </div>
          <div>
            <Label htmlFor="image">Image</Label>
            <Input id="image" name="image" type="file" onChange={handleImageChange} />
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => router.push('/inventory')}>Cancel</Button>
            <Button type="submit">Update Product</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}