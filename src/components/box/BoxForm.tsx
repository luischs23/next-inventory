'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { db, storage } from 'app/services/firebase/firebase.config'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { addDoc, collection, serverTimestamp, query, orderBy, limit, getDocs } from 'firebase/firestore'
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
  barcode?: string
}

interface BoxFormProps {
  warehouseId: string
  companyId: string
}

export default function BoxForm({ companyId, warehouseId }: BoxFormProps) {
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

  const [nextBoxNumber, setNextBoxNumber] = useState(1)

  useEffect(() => {
    const fetchLastBarcode = async () => {
      const companiesRef = collection(db, 'companies')
      const companyQuery = query(companiesRef, limit(1))
      const companySnapshot = await getDocs(companyQuery)
      
      if (!companySnapshot.empty) {
        const companyDoc = companySnapshot.docs[0]
        const warehousesRef = collection(companyDoc.ref, 'warehouses')
        const warehousesQuery = query(warehousesRef)
        const warehousesSnapshot = await getDocs(warehousesQuery)

        let lastBoxNumber = 0

        for (const warehouseDoc of warehousesSnapshot.docs) {
          // Check products
          const productsRef = collection(warehouseDoc.ref, 'products')
          const productQuery = query(productsRef, orderBy('createdAt', 'desc'), limit(1))
          const productSnapshot = await getDocs(productQuery)

          if (!productSnapshot.empty) {
            const lastProduct = productSnapshot.docs[0].data()
            if (lastProduct.barcode) {
              const productBoxNumber = parseInt(lastProduct.barcode.slice(-12, -6))
              if (productBoxNumber > lastBoxNumber) {
                lastBoxNumber = productBoxNumber
              }
            }
          }

          // Check boxes
          const boxesRef = collection(warehouseDoc.ref, 'boxes')
          const boxQuery = query(boxesRef, orderBy('createdAt', 'desc'), limit(1))
          const boxSnapshot = await getDocs(boxQuery)

          if (!boxSnapshot.empty) {
            const lastBox = boxSnapshot.docs[0].data() as BoxFormData
            if (lastBox.barcode) {
              const boxLastNumber = parseInt(lastBox.barcode.slice(-12, -6))
              if (boxLastNumber > lastBoxNumber) {
                lastBoxNumber = boxLastNumber
              }
            }
          }
        }

        setNextBoxNumber(lastBoxNumber + 1)
      }
    }

    fetchLastBarcode()
  }, [companyId])

  const generateBoxBarcode = useCallback(() => {
    const date = new Date()
    const dateString = date.toISOString().slice(2, 10).replace(/-/g, '')
    const boxString = nextBoxNumber.toString().padStart(6, '0')
    const productString = '000000' // For boxes, always use 000000

    setNextBoxNumber(prevNumber => prevNumber + 1)

    return `${dateString}${boxString}${productString}`
  }, [nextBoxNumber])
  
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
      const imageRef = ref(storage, `companies/${companyId}/warehouses/${warehouseId}/boxes/${formData.image.name}`)
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
        barcode: generateBoxBarcode(),
        createdAt: serverTimestamp(),
      }

      await addDoc(collection(db, `companies/${companyId}/warehouses/${warehouseId}/boxes`), boxData)

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

      router.push(`/companies/${companyId}/warehouses/${warehouseId}/inventory`)
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