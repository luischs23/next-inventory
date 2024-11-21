'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { db, storage } from 'app/services/firebase/firebase.config'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { Button } from "app/components/ui/button"
import { Input } from "app/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "app/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "app/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "app/components/ui/dialog"
import { Label } from "app/components/ui/label"
import Barcode from 'react-barcode'
import { PlusIcon, Trash2Icon } from 'lucide-react'

interface SizeInput {
  quantity: number
  barcodes: string[]
}

interface Product {
  id: string
  brand: string
  reference: string
  color: string
  comments: string
  gender: 'Dama' | 'Hombre'
  sizes: { [key: string]: SizeInput }
  imageUrl: string
  total: number
}

const damaSizes = ['T-35', 'T-36', 'T-37', 'T-38', 'T-39', 'T-40']
const hombreSizes = ['T-40', 'T-41', 'T-42', 'T-43', 'T-44', 'T-45']

export default function UpdateProductPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [newImage, setNewImage] = useState<File | null>(null)
  const [newSize, setNewSize] = useState('')
  const [newQuantity, setNewQuantity] = useState(0)

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

  const availableSizes = useMemo(() => {
    if (!product) return []
    const allSizes = product.gender === 'Dama' ? damaSizes : hombreSizes
    return allSizes.filter(size => !product.sizes[size] || product.sizes[size].barcodes.length === 0)
  }, [product])

  const sortedSizes = useMemo(() => {
    if (!product) return []
    return Object.entries(product.sizes)
      .filter(([_, sizeData]) => sizeData.barcodes.length > 0)
      .sort(([a], [b]) => {
        const aNum = parseInt(a.split('-')[1])
        const bNum = parseInt(b.split('-')[1])
        return aNum - bNum
      })
      .map(([size]) => size)
  }, [product])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setProduct(prev => prev ? { ...prev, [name]: value } : null)
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setNewImage(file)
  }

  const generateBarcode = () => {
    return Math.random().toString(36).substr(2, 9).toUpperCase()
  }

  const handleAddSize = () => {
    if (newSize && newQuantity > 0 && product) {
      setProduct(prev => {
        if (!prev) return null
        const newBarcodes = Array(newQuantity).fill('').map(() => generateBarcode())
        return {
          ...prev,
          sizes: {
            ...prev.sizes,
            [newSize]: { quantity: newQuantity, barcodes: newBarcodes }
          },
          total: prev.total + newQuantity
        }
      })
      setNewSize('')
      setNewQuantity(0)
    }
  }

  const handleDeleteBarcode = (size: string, barcodeToDelete: string) => {
    if (product) {
      setProduct(prev => {
        if (!prev) return null
        const updatedBarcodes = prev.sizes[size].barcodes.filter(barcode => barcode !== barcodeToDelete)
        const updatedSizes = { ...prev.sizes }
        if (updatedBarcodes.length === 0) {
          delete updatedSizes[size]
        } else {
          updatedSizes[size] = {
            ...updatedSizes[size],
            quantity: updatedBarcodes.length,
            barcodes: updatedBarcodes
          }
        }
        return {
          ...prev,
          sizes: updatedSizes,
          total: prev.total - 1
        }
      })
    }
  } 

  const handleAddBarcode = (size: string) => {
    if (product) {
      setProduct(prev => {
        if (!prev) return null
        const newBarcode = generateBarcode()
        return {
          ...prev,
          sizes: {
            ...prev.sizes,
            [size]: {
              ...prev.sizes[size],
              quantity: prev.sizes[size].quantity + 1,
              barcodes: [...prev.sizes[size].barcodes, newBarcode]
            }
          },
          total: prev.total + 1
        }
      })
    }
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
            <Label htmlFor="comments">Comments</Label>
            <Input id="comments" name="comments" value={product.comments} onChange={handleInputChange} />
          </div>
          <div>
            <Label htmlFor="gender">Gender</Label>
            <Input id="gender" name="gender" value={product.gender} readOnly />
          </div>
          <div>
            <Label>Sizes</Label>
            <div className="grid grid-cols-3 gap-4">
              {sortedSizes.map((size) => (
                <div key={size}>
                  <Label htmlFor={size}>{size}</Label>
                  <Input
                    id={size}
                    type="number"
                    value={product.sizes[size].quantity}
                    readOnly
                  />
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="mt-2 w-full">Manage Barcodes</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl text-gray-300">
                      <DialogHeader>
                        <DialogTitle>Manage Barcodes for {product.brand} - {product.reference} - Size {size}</DialogTitle>
                        <DialogDescription>Add, remove, or view barcodes for this product size.</DialogDescription>
                      </DialogHeader>
                      <div className="grid grid-cols-2 gap-4">
                        {product.sizes[size].barcodes.map((barcode, index) => (
                          <div key={index} className="text-center border p-4 rounded">
                            <p className="mb-2">
                              {product.brand} - {product.reference} - {product.color} - Size {size}
                            </p>
                            <div className="flex flex-col items-center justify-center">
                              <Barcode value={barcode} width={1} height={50} fontSize={12} />
                            </div>
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              className="mt-2"
                              onClick={() => handleDeleteBarcode(size, barcode)}
                            >
                              <Trash2Icon className="w-4 h-4 mr-2" /> Delete
                            </Button>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-center mt-4">
                        <Button onClick={() => handleAddBarcode(size)}>
                          <PlusIcon className="w-4 h-4 mr-2" /> Add Barcode
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              ))}
            </div>
          </div>
          <div className="flex space-x-2">
            <Select value={newSize} onValueChange={setNewSize}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select new size" />
              </SelectTrigger>
              <SelectContent>
                {availableSizes.map((size) => (
                  <SelectItem key={size} value={size}>{size}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              placeholder="Quantity"
              value={newQuantity}
              onChange={(e) => setNewQuantity(parseInt(e.target.value))}
            />
            <Button type="button" onClick={handleAddSize}>Add Size</Button>
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