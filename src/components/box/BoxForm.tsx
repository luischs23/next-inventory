'use client'

import { useState} from 'react'
import { useRouter } from 'next/navigation'
import { db, storage } from 'app/services/firebase/firebase.config'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { addDoc, collection} from 'firebase/firestore'
import { Button } from "app/components/ui/button"
import { Input } from "app/components/ui/input"
import { Label } from "app/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "app/components/ui/select"
import { Switch } from "app/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "app/components/ui/card"
import { useToast } from "app/components/ui/use-toast"

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
  baseprice: string
  saleprice: string
}

interface BoxFormProps {
  warehouseId: string
}

export default function BoxForm({ warehouseId }: BoxFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [formData, setFormData] = useState<BoxFormData>({
    brand: 'Nike',
    reference: '',
    color: '',
    gender: 'Dama',
    quantity: 0,
    comments: '',
    image: null,
    baseprice: '',
    saleprice: '',
  })

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    const numericValue = parseInt(value.replace(/\D/g, ''), 10)
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
  }

  const generateBarcode = () => {
    return Math.random().toString(36).substr(2, 9).toUpperCase()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.image) {
      toast({
        title: "Error",
        description: "Please upload an image for the box.",
        variant: "destructive",
      })
      return
    }

    try {
      const imageRef = ref(storage, `boxes/${formData.image.name}`)
      await uploadBytes(imageRef, formData.image)
      const imageUrl = await getDownloadURL(imageRef)

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
        warehouseId,
        barcode: generateBarcode(),
      }

      await addDoc(collection(db, `warehouses/${warehouseId}/boxes`), boxData)

      toast({
        title: "Success",
        description: "Box added successfully",
        duration: 3000,
        style: {
          background: "#4CAF50",
          color: "white",
          fontWeight: "bold",
        },
      })

      router.push(`/warehouses/${warehouseId}/inventory`)
    } catch (error) {
      console.error('Error adding the box:', error)
      toast({
        title: "Error",
        description: "Failed to add the box. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Add New Box</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="brand">Brand</Label>
            <Select name="brand" value={formData.brand} onValueChange={(value: Brand) => setFormData((prev) => ({ ...prev, brand: value }))}>
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
          <Button type="submit">Add Box</Button>
        </form>
      </CardContent>
    </Card>
  )
}