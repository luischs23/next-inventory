'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { db, storage } from 'app/services/firebase/firebase.config'
import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { Button } from "app/components/ui/button"
import { Input } from "app/components/ui/input"
import { Label } from "app/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "app/components/ui/select"
import { Switch } from "app/components/ui/switch"
import { Card, CardContent} from "app/components/ui/card"
import { useToast } from "app/components/ui/use-toast"
import { Barcode, ArrowLeft } from 'lucide-react'
import ProductImageUpload from '../ui/ProductImageUpload'

type Gender = 'Dama' | 'Hombre'
type Brand = 'Nike' | 'Adidas' | 'Puma' | 'Reebok'

interface BoxFormData {
  brand: Brand
  reference: string
  color: string
  gender: Gender
  quantity: number
  comments: string
  imageUrl: string
  baseprice: string
  saleprice: string
  warehouseId: string
  barcode: string
}

interface Warehouse {
  id: string
  name: string
}

interface UpdateBoxFormProps {
  companyId: string
  boxId: string
  warehouseId: string
}

const formatNumber = (value: string): string => {
  const number = value.replace(/[^\d]/g, '')
  return number.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

const parseFormattedNumber = (value: string): number => {
  return parseInt(value.replace(/\./g, ''), 10)
}

export default function UpdateBoxForm({ companyId, boxId, warehouseId }: UpdateBoxFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState<BoxFormData>({
    brand: 'Nike',
    reference: '',
    color: '',
    gender: 'Dama',
    quantity: 0,
    comments: '',
    imageUrl: '',
    baseprice: '',
    saleprice: '',
    warehouseId: warehouseId,
    barcode: ''
  })
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(true)
  const [imageLoading, setImageLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const fetchBoxAndWarehouses = async () => {
      setLoading(true)
      try {
        const warehousesCollection = collection(db, `companies/${companyId}/warehouses`)
        const warehousesSnapshot = await getDocs(warehousesCollection)
        const warehousesList = warehousesSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
        }))
        setWarehouses(warehousesList)

        const boxDoc = await getDoc(doc(db, `companies/${companyId}/warehouses/${warehouseId}/boxes`, boxId))
        if (boxDoc.exists()) {
          const boxData = boxDoc.data() as BoxFormData
          setFormData({ 
            ...boxData, 
            warehouseId,
            baseprice: formatNumber(boxData.baseprice.toString()),
            saleprice: formatNumber(boxData.saleprice.toString()),
            barcode: boxData.barcode || ''
          })
        } else {
          throw new Error('Box not found')
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        toast({
          title: "Error",
          description: "Failed to fetch box data. Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }
    fetchBoxAndWarehouses()
  }, [boxId, warehouseId, companyId, toast])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    if (name === 'baseprice' || name === 'saleprice') {
      const formattedValue = formatNumber(value)
      setFormData(prev => ({ ...prev, [name]: formattedValue }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleImageChange = async (file: File | null) => {
    if (file) {
      setImageLoading(true)
      try {
        const imageRef = ref(storage, `companies/${companyId}/warehouses/${warehouseId}/boxes/${file.name}`)
        await uploadBytes(imageRef, file)
        const imageUrl = await getDownloadURL(imageRef)
        
        await updateDoc(doc(db, `companies/${companyId}/warehouses/${warehouseId}/boxes`, boxId), {
          imageUrl: imageUrl
        })

        setFormData(prev => ({
          ...prev,
          imageUrl: imageUrl
        }))

        toast({
          title: "Image Updated",
          description: "The box image has been successfully updated.",
          duration: 1000,
          style: {
            background: "#4CAF50",
            color: "white",
            fontWeight: "bold", 
          },    
        })
      } catch (error) {
        console.error('Error updating image:', error)
        toast({
          title: "Error",
          description: "Failed to update image. Please try again.",
          duration: 1000,
          variant: "destructive",
        })
      } finally {
        setImageLoading(false)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const boxData = {
        ...formData,
        baseprice: parseFormattedNumber(formData.baseprice),
        saleprice: parseFormattedNumber(formData.saleprice),
      }

      await updateDoc(doc(db, `companies/${companyId}/warehouses/${formData.warehouseId}/boxes`, boxId), boxData)

      toast({
        title: "Success",
        description: "Box updated successfully",
        duration: 1000,
        style: {
          background: "#4CAF50",
          color: "white",
          fontWeight: "bold",
        },
      })

      router.push(`/companies/${companyId}/warehouses/${formData.warehouseId}/inventory`)
    } catch (error) {
      console.error('Error updating the box:', error)
      toast({   
        title: "Error",
        description: "Failed to update the box. Please try again.",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="min-h-screen bg-blue-100">
      <header className="bg-teal-600 text-white p-4 flex items-center">
        <Button variant="ghost" className="text-white p-0 mr-2" onClick={() => router.back()}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-bold flex-grow">Update Box</h1>
      </header>
      <main className="container mx-auto p-4">
        <Card className="w-full max-w-4xl mx-auto">
          <CardContent className='m-2'>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <Label htmlFor="barcode">Barcode</Label>
                <div className="flex items-center space-x-2">
                  <Input 
                    id="barcode" 
                    name="barcode" 
                    value={formData.barcode} 
                    onChange={handleInputChange}
                    disabled
                  />
                  <Barcode className="h-5 w-5 text-gray-500" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ProductImageUpload 
                  imageUrl={formData.imageUrl || '/placeholder.svg'}
                  altText={`${formData.brand} ${formData.reference}`}
                  onImageChange={handleImageChange}
                  isLoading={imageLoading}
                />
                <div className='flex space-x-4'>
                  <div>
                    <Label htmlFor="baseprice">Base Price</Label>
                    <Input
                      id="baseprice"
                      name="baseprice"
                      value={formData.baseprice}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <Label htmlFor="saleprice">Sale Price</Label>
                    <Input
                      id="saleprice"
                      name="saleprice"
                      value={formData.saleprice}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => router.push(`/companies/${companyId}/warehouses/${warehouseId}/inventory`)}>Cancel</Button>
                <Button type="submit">Update Box</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}