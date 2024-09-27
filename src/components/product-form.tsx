'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { db, storage } from '../services/firebase/firebase.config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { addDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore';
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select"
import { Switch } from "../components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { useToast } from "app/components/ui/use-toast"
import { useProducts } from 'app/app/context/ProductContext'

type Gender = 'Dama' | 'Hombre'
type Brand = 'Nike' | 'Adidas' | 'Puma' | 'Reebok'

interface SizeInput {
  quantity: number
  barcodes: string[]
}

interface SizeInputs {
  [key: string]: SizeInput
}

interface ProductFormData {
  brand: Brand
  reference: string
  color: string
  gender: Gender
  sizes: SizeInputs
  total: number
  comments: string
  image: File | null 
  imageUrl: string
  baseprice: string
  saleprice: string
  exhibition: { [store: string]: string }
}

interface ProductFormComponentProps {
  warehouseId: string
}

export const ProductFormComponent: React.FC<ProductFormComponentProps> = ({ warehouseId }) => {
  const router = useRouter()
  const { toast } = useToast()
  const { addNewProduct } = useProducts()
  const [formData, setFormData] = useState<ProductFormData>({
    brand: 'Nike',
    reference: '',
    color: '',
    gender: 'Dama',
    sizes: {},
    total: 0,
    comments: '',
    image: null,
    imageUrl: '',
    baseprice: '',
    saleprice: '',
    exhibition: {}
  })

  const [imageError, setImageError] = useState('')
  const [stores, setStores] = useState<string[]>([])

  useEffect(() => {
    const fetchStores = async () => {
      const storesSnapshot = await getDocs(collection(db, 'stores'))
      const storesList = storesSnapshot.docs.map(doc => doc.id)
      setStores(storesList)
    }
    fetchStores()
  }, [])

  const total = useMemo(() => {
    return Object.values(formData.sizes).reduce((sum, size) => sum + size.quantity, 0)
  }, [formData.sizes])

  const formatNumber = (value: string) => {
    const number = value.replace(/[^\d]/g, '')
    return number.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    if (name === 'baseprice' || name === 'saleprice') {
      const formattedValue = formatNumber(value)
      setFormData((prev) => ({ ...prev, [name]: formattedValue }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleSizeChange = (size: string, value: string) => {
    const quantity = parseInt(value) || 0
    setFormData((prev) => {
      const newSizes = { ...prev.sizes }
      if (quantity > 0) {
        newSizes[size] = { 
          quantity, 
          barcodes: Array(quantity).fill('').map(() => generateBarcode())
        }
      } else {
        delete newSizes[size]
      }
      return { ...prev, sizes: newSizes }
    })
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setFormData((prev) => ({ ...prev, image: file }))
    setImageError('')  // Clear any previous error when a new image is selected
  }

  const generateBarcode = () => {
    return Math.random().toString(36).substr(2, 9).toUpperCase()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.image) {
      setImageError('Please upload an image for the product.')
      return
    }
    try {
      const imageRef = ref(storage, `products/${formData.image.name}`)
      await uploadBytes(imageRef, formData.image)
      const imageUrl = await getDownloadURL(imageRef)

      const productData = {
        brand: formData.brand,
        reference: formData.reference,
        color: formData.color,
        gender: formData.gender,
        sizes: Object.fromEntries(
        Object.entries(formData.sizes).filter(([_, sizeData]) => sizeData.quantity > 0)
        ),
        total,
        comments: formData.comments,
        imageUrl,
        baseprice: parseInt(formData.baseprice.replace(/\./g, '')),
        saleprice: parseInt(formData.saleprice.replace(/\./g, '')),
        exhibition: formData.exhibition,
        createdAt: serverTimestamp(),
      }

      const docRef = await addDoc(collection(db, `warehouses/${warehouseId}/products`), productData)

      // Add the new product to the local state
      addNewProduct({ id: docRef.id, ...productData, warehouseId })

      setFormData({
        brand: 'Nike',
        reference: '',
        color: '',
        gender: 'Dama',
        sizes: {},
        total: 0,
        comments: '',
        image: null,
        imageUrl: '',
        baseprice: '',
        saleprice: '',
        exhibition: {}
      })

      toast({
        title: "Product Added",
        description: "The product has been successfully added to the inventory.",
        duration: 3000,
        style: {
          background: "#4CAF50",
          color: "white",
          fontWeight: "bold",
        },
      })

      router.push(`/inventory/${warehouseId}`)
    } catch (error) {
      console.error('Error adding product:', error)
      toast({
        title: "Error",
        description: "Failed to add product. Please try again.",
        duration: 3000,
        variant: "destructive",
      })
    }
  }

  const sizeInputs = formData.gender === 'Dama'
    ? ['T-35', 'T-36', 'T-37', 'T-38', 'T-39', 'T-40']
    : ['T-40', 'T-41', 'T-42', 'T-43', 'T-44', 'T-45']

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Add New Product</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="brand">Brand</Label>
            <Select name="brand" onValueChange={(value: Brand) => setFormData((prev) => ({ ...prev, brand: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select brand" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Nike">Nike</SelectItem>
                <SelectItem value="Adidas">Adidas</SelectItem>
                <SelectItem value="Puma">Puma</SelectItem>
                <SelectItem value="Reebok">Reebok</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="reference">Reference</Label>
            <Input id="reference" name="reference" value={formData.reference} onChange={handleInputChange} />
          </div>
          <div>
            <Label htmlFor="color">Color</Label>
            <Input id="color" name="color" value={formData.color} onChange={handleInputChange} />
          </div>
          <div>
            <Label htmlFor="comments">Comments</Label>
            <Input id="comments" name="comments" value={formData.comments} onChange={handleInputChange} />
          </div>
          <div className="flex items-center space-x-2">
            <Label htmlFor="gender">Gender</Label>
            <Switch
              id="gender"
              checked={formData.gender === 'Hombre'}
              onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, gender: checked ? 'Hombre' : 'Dama' }))}
            />
            <span>{formData.gender}</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {sizeInputs.map((size) => (
              <div key={size}>
                <Label htmlFor={size}>{size}</Label>
                <Input
                  id={size}
                  type="number"
                  value={formData.sizes[size]?.quantity || ''}
                  onChange={(e) => handleSizeChange(size, e.target.value)}
                />
              </div>
            ))}
            <div>
              <Label htmlFor="total">Total</Label>
              <Input
                id="total"
                type="number"
                value={total}
                readOnly
              />
            </div>
          </div>
          <div>
            <Label htmlFor="image">Image</Label>
            <Input 
              id="image" 
              name="image" 
              type="file" 
              accept="image/*" 
              onChange={handleImageChange} 
              required
              />
              {imageError && <p className="text-red-500 text-sm mt-1">{imageError}</p>}
          </div>
          <div className='flex items-center space-x-4'>
            <div>
              <Label htmlFor="baseprice">Base Price</Label>
              <Input
                id="baseprice"
                name="baseprice"
                type="text"
                value={formData.baseprice}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <Label htmlFor="saleprice">Sale Price</Label>
              <Input
                id="saleprice"
                name="saleprice"
                type="text"
                value={formData.saleprice}
                onChange={handleInputChange}
              />
            </div>
          </div>
          <Button type="submit">Save Product</Button>
        </form>
      </CardContent>
    </Card>
  )
}