'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams} from 'next/navigation'
import { db, storage } from 'app/services/firebase/firebase.config'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { addDoc, collection, getDocs } from 'firebase/firestore'
import { Button } from "app/components/ui/button"
import { Input } from "app/components/ui/input"
import { Label } from "app/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "app/components/ui/select"
import { Switch } from "app/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "app/components/ui/card"
import { toast } from "app/components/ui/use-toast"

type Gender = 'Dama' | 'Hombre'
type Brand = 'Nike' | 'Adidas' | 'Puma' | 'Reebok'

interface BoxFormData {
  brand: Brand
  reference: string
  color: string
  gender: Gender
  quantity: number
  comments: string
  image: File | null
  imageUrl: string
  baseprice: string
  saleprice: string
  barcode: string
}

interface Warehouse {
  id: string
  name: string 
}

export default function FormBoxPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const warehouseId = searchParams.get('warehouseId')
  const [formData, setFormData] = useState<BoxFormData>({
    brand: 'Nike',
    reference: '',
    color: '',
    gender: 'Dama',
    quantity: 0,
    comments: '',
    image: null,
    imageUrl: '',
    baseprice: '',
    saleprice: '',
    barcode: ''
  })
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [imageError, setImageError] = useState('')

  useEffect(() => {
    const fetchWarehouses = async () => {
      const warehousesCollection = collection(db, 'warehouses')
      const warehousesSnapshot = await getDocs(warehousesCollection)
      const warehousesList = warehousesSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
      }))
      setWarehouses(warehousesList)
    }

    fetchWarehouses()
  }, [])

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    // Remove non-digit characters and parse as number
    const numericValue = parseInt(value.replace(/\D/g, ''), 10)
    // Format with commas for display
    const formattedValue = isNaN(numericValue) ? '' : numericValue.toLocaleString()
    setFormData(prev => ({ ...prev, [name]: formattedValue }))
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setFormData((prev) => ({ ...prev, image: file }))
    setImageError('')
  }

  const generateBarcode = () => {
    return Math.random().toString(36).substr(2, 9).toUpperCase()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      let imageUrl = ''

      if (formData.image) {
        const imageRef = ref(storage, `boxes/${formData.image.name}`)
        await uploadBytes(imageRef, formData.image)
        imageUrl = await getDownloadURL(imageRef)
      }

      const barcode = generateBarcode()

      const boxData = {
        brand: formData.brand,
        reference: formData.reference,
        color: formData.color,
        gender: formData.gender,
        quantity: formData.quantity,
        comments: formData.comments,
        imageUrl,
        baseprice: parseInt(formData.baseprice.replace(/\D/g, ''), 10),
        saleprice: parseInt(formData.saleprice.replace(/\D/g, ''), 10),
        warehouseId: warehouseId,
        barcode
      }

      await addDoc(collection(db, `warehouses/${warehouseId}/boxes`), boxData)

      toast({
        title: "Success",
        description: "Box saved successfully",
        duration: 3000,
          style: {
            background: "#4CAF50",
            color: "white",
            fontWeight: "bold",
          },
      })

      // Redirect back to the specific warehouse inventory page
      router.push(`/warehouse-inventory/${warehouseId}`)
    } catch (error) {
      console.error('Error saving the box:', error)
      toast({
        title: "Error",
        description: "Failed to save the box. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Add New Box</CardTitle>
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
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                value={formData.quantity}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <Label htmlFor="image">Image</Label>
              <Input id="image" name="image" type="file" accept="image/*" onChange={handleImageChange} required />
              {imageError && <p className="text-red-500 text-sm mt-1">{imageError}</p>}
            </div>
            <div className='flex items-center space-x-4'>
              <div>
                <Label htmlFor="baseprice">Base Price</Label>
                <Input
                  id="baseprice"
                  name="baseprice"
                  value={formData.baseprice}
                  onChange={handlePriceChange}
                />
              </div>
              <div>
                <Label htmlFor="saleprice">Sale Price</Label>
                <Input
                  id="saleprice"
                  name="saleprice"
                  value={formData.saleprice}
                  onChange={handlePriceChange}
                />
              </div>
            </div>
            <Button type="submit">Save Box</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}