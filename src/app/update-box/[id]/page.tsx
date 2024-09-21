'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { db, storage } from 'app/services/firebase/firebase.config'
import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
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
  baseprice: number
  saleprice: number
  warehouseId: string
}

interface Warehouse {
  id: string
  name: string
}

export default function UpdateBoxPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [formData, setFormData] = useState<BoxFormData>({
    brand: 'Nike',
    reference: '',
    color: '',
    gender: 'Dama',
    quantity: 0,
    comments: '',
    image: null,
    imageUrl: '',
    baseprice: 0,
    saleprice: 0,
    warehouseId: searchParams.get('warehouseId') || '',
  })
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])

  useEffect(() => {
    const fetchBoxAndWarehouses = async () => {
      // Fetch box data
      const boxDoc = await getDoc(doc(db, 'boxes', params.id))
      if (boxDoc.exists()) {
        setFormData({ ...boxDoc.data() as BoxFormData, image: null })
      }

      // Fetch warehouses
      const warehousesCollection = collection(db, 'warehouses')
      const warehousesSnapshot = await getDocs(warehousesCollection)
      const warehousesList = warehousesSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
      }))
      setWarehouses(warehousesList)
    }

    fetchBoxAndWarehouses()
  }, [params.id])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setFormData((prev) => ({ ...prev, image: file }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      let imageUrl = formData.imageUrl

      if (formData.image) {
        const imageRef = ref(storage, `boxes/${formData.image.name}`)
        await uploadBytes(imageRef, formData.image)
        imageUrl = await getDownloadURL(imageRef)
      }

      const boxData = {
        brand: formData.brand,
        reference: formData.reference,
        color: formData.color,
        gender: formData.gender,
        quantity: formData.quantity,
        comments: formData.comments,
        imageUrl,
        baseprice: formData.baseprice,
        saleprice: formData.saleprice,
        warehouseId: formData.warehouseId,
      }

      await updateDoc(doc(db, 'boxes', params.id), boxData)

      toast({
        title: "Success",
        description: "Box updated successfully",
        duration: 3000,
          style: {
            background: "#4CAF50",
            color: "white",
            fontWeight: "bold",
          },
      })

      router.push(`/warehouse-inventory/${formData.warehouseId}`)
    } catch (error) {
      console.error('Error updating the box:', error)
      toast({
        title: "Error",
        description: "Failed to update the box. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Update Box</h1>
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Update Box Details</CardTitle>
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
              <Input id="image" name="image" type="file" accept="image/*" onChange={handleImageChange} />
            </div>
            <div className='flex items-center space-x-4'>
              <div>
                <Label htmlFor="baseprice">Base Price</Label>
                <Input
                  id="baseprice"
                  name="baseprice"
                  type="number"
                  value={formData.baseprice}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="saleprice">Sale Price</Label>
                <Input
                  id="saleprice"
                  name="saleprice"
                  type="number"
                  value={formData.saleprice}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="warehouseId">Warehouse</Label>
              <Select 
                name="warehouseId" 
                value={formData.warehouseId} 
                onValueChange={(value) => setFormData((prev) => ({ ...prev, warehouseId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit">Update Box</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}