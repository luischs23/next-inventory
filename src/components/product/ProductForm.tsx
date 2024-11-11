'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { db, storage } from 'app/services/firebase/firebase.config'
import { ref, uploadBytes, getDownloadURL, listAll } from 'firebase/storage'
import { addDoc, collection, serverTimestamp, query, orderBy, limit, getDocs, doc, getDoc} from 'firebase/firestore'
import { Button } from "app/components/ui/button"
import { Input } from "app/components/ui/input"
import { Label } from "app/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "app/components/ui/select"
import { Switch } from "app/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "app/components/ui/card"
import { useToast } from "app/components/ui/use-toast"
import { ArrowLeft } from 'lucide-react'
import { ProductFormSkeleton } from '../skeletons/ProductFormSkeleton'
import { Skeleton } from '../ui/skeleton'

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
  total2: number
  comments: string
  image: File | null 
  imageUrl: string
  baseprice: string
  saleprice: string
  exhibition: { [store: string]: string }
  barcode: string
}

interface ProductFormComponentProps {
  companyId: string
  warehouseId: string
}

export const ProductFormComponent: React.FC<ProductFormComponentProps> = ({ companyId, warehouseId }) => {
  const router = useRouter()
  const { toast } = useToast()
  const [isBox, setIsBox] = useState(false)
  const [formData, setFormData] = useState<ProductFormData>({
    brand: 'Nike',
    reference: '',
    color: '',
    gender: 'Dama',
    sizes: {},
    total: 0,
    total2: 0,
    comments: '',
    image: null,
    imageUrl: '',
    baseprice: '',
    saleprice: '',
    exhibition: {},
    barcode:'',
  })
  const [loading, setLoading] = useState(true)
  const [imageError, setImageError] = useState('')
  const [dateString, setDateString] = useState('')
  const [boxNumber, setBoxNumber] = useState(1)
  const [sizeNumber, setSizeNumber] = useState(1)
  const [warehouseName, setWarehouseName] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [totalSizesCount, setTotalSizesCount] = useState(0)

  useEffect(() => {
    const fetchLastBarcode = async () => {
      const warehousesRef = collection(db, `companies/${companyId}/warehouses`)
      const warehousesSnapshot = await getDocs(warehousesRef)
      
      let lastGlobalBoxNumber = 0

      for (const warehouseDoc of warehousesSnapshot.docs) {
        const productsRef = collection(warehouseDoc.ref, 'products')
        const q = query(productsRef, orderBy('createdAt', 'desc'), limit(1))
        const productSnapshot = await getDocs(q)

        if (!productSnapshot.empty) {
          const lastProduct = productSnapshot.docs[0].data()
          const lastBarcode = lastProduct.barcode || ''
          
          if (lastBarcode) {
            const lastBoxNumber = parseInt(lastBarcode.slice(6, 12))
            lastGlobalBoxNumber = Math.max(lastGlobalBoxNumber, lastBoxNumber)
          }
        }
      }

      // Set the box number to the next available number
      setBoxNumber(lastGlobalBoxNumber + 1)

      updateDateString()
    }

    fetchLastBarcode()
  }, [companyId])

  useEffect(() => {
    // Simulate loading delay
    const timer = setTimeout(() => {
      setLoading(false)
    }, 1500)

    return () => clearTimeout(timer)
  }, [])

  const total = useMemo(() => {
    return Object.values(formData.sizes).reduce((sum, size) => sum + size.quantity, 0)
  }, [formData.sizes])

  const formatNumber = (value: string) => {
    const number = value.replace(/[^\d]/g, '')
    return number.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  }

  const updateDateString = useCallback(() => {
    const date = new Date()
    const year = date.getFullYear().toString().slice(-2)
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    setDateString(`${year}${month}${day}`)
  }, [])

  const incrementBoxNumber = useCallback(() => {
    setBoxNumber(prevNumber => {
      const nextNumber = prevNumber + 1
      return nextNumber > 999999 ? 1 : nextNumber
    })
  }, [])

  const fetchWarehouseDetails = useCallback(async () => {
    try {
      const warehouseDocRef = doc(db, `companies/${companyId}/warehouses`, warehouseId)
      const warehouseDocSnap = await getDoc(warehouseDocRef)
      if (warehouseDocSnap.exists()) {
        const warehouseData = warehouseDocSnap.data()
        setWarehouseName(warehouseData?.name || 'Unnamed Warehouse')
      } else {
        console.error('Warehouse document does not exist')
        setWarehouseName('Unknown Warehouse')
      }
    } catch (error) {
      console.error('Error fetching warehouse details:', error)
      setWarehouseName('Error Loading Warehouse Name')
    }
  }, [companyId, warehouseId])

  useEffect(() => {
    fetchWarehouseDetails()
  }, [fetchWarehouseDetails])


  const generateBarcode = useCallback((productNumber: number) => {
    const boxString = boxNumber.toString().padStart(6, '0')
    const productString = productNumber.toString().padStart(2, '0')
    return `${dateString}${boxString}${productString}`
  }, [dateString, boxNumber])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    if (name === 'baseprice' || name === 'saleprice') {
      const formattedValue = formatNumber(value)
      setFormData((prev) => ({ ...prev, [name]: formattedValue }))
    } else if (name === 'total2') {
      const numericValue = parseInt(value) 
      setFormData((prev) => ({ ...prev, total2: numericValue, total: numericValue }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleSizeChange = (size: string, value: string) => {
    const quantity = parseInt(value) || 0

    setFormData((prev) => {
      const newSizes = { ...prev.sizes }
      let newTotalSizesCount = totalSizesCount

      // Remove sizes that are set to 0
      if (quantity === 0) {
        if (newSizes[size]) {
          newTotalSizesCount -= newSizes[size].quantity
          delete newSizes[size]
        }
      } else {
        // Add or update sizes
        if (!newSizes[size]) {
          newSizes[size] = { quantity: 0, barcodes: [] }
        }

        // Adjust the total count
        newTotalSizesCount += quantity - (newSizes[size].quantity || 0)

        // Generate new barcodes
        newSizes[size].barcodes = Array.from({ length: quantity }, (_, index) => {
          const productNumber = newTotalSizesCount - quantity + index + 1
          return generateBarcode(productNumber)
        })

        newSizes[size].quantity = quantity
      }

      setTotalSizesCount(newTotalSizesCount)

      return { ...prev, sizes: newSizes }
    })
  }


  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setFormData((prev) => ({ ...prev, image: file }))
    setImageError('')
  }

  const getUniqueFileName = async (originalName: string) => {
    const storageRef = ref(storage, `companies/${companyId}/warehouses/${warehouseId}/products`)
    const fileList = await listAll(storageRef)
    const existingFiles = fileList.items.map(item => item.name)

    let uniqueName = originalName
    let counter = 1

    while (existingFiles.includes(uniqueName)) {
      const nameParts = originalName.split('.')
      const extension = nameParts.pop()
      const baseName = nameParts.join('.')
      uniqueName = `${baseName}${counter}.${extension}`
      counter++
    }

    return uniqueName
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return // Prevent multiple submissions
    if (!formData.image) {
      setImageError('Please upload an image for the product.')
      return
    }
    setIsSubmitting(true) // Set submitting state to true
    try {
      const uniqueFileName = await getUniqueFileName(formData.image.name)
      const imageRef = ref(storage, `companies/${companyId}/warehouses/${warehouseId}/products/${uniqueFileName}`)
      await uploadBytes(imageRef, formData.image)
      const imageUrl = await getDownloadURL(imageRef)

      const productData = {
        brand: formData.brand,
        reference: formData.reference,
        color: formData.color,
        gender: formData.gender,
        sizes: isBox ? {} : Object.fromEntries(
          Object.entries(formData.sizes).filter(([, sizeData]) => sizeData.quantity > 0)
        ),
        total: total,
        total2: formData.total2,
        comments: formData.comments,
        imageUrl,
        baseprice: parseInt(formData.baseprice.replace(/\./g, '')),
        saleprice: parseInt(formData.saleprice.replace(/\./g, '')),
        exhibition: formData.exhibition,
        createdAt: serverTimestamp(),
        warehouseId: warehouseId,
        barcode: generateBarcode(0),
        isBox: isBox,
      }

      await addDoc(collection(db, `companies/${companyId}/warehouses/${warehouseId}/products`), productData)

      incrementBoxNumber()
      setSizeNumber(1)
      updateDateString()

      toast({
        title: "Product Added",
        description: "The product has been successfully added to the inventory.",
        duration: 1000,
        style: {
          background: "#4CAF50",
          color: "white",
          fontWeight: "bold",
        },
      })

      router.push(`/companies/${companyId}/warehouses/${warehouseId}/pares-inventory`)
    } catch (error) {
      console.error('Error adding product:', error)
      toast({
        title: "Error",
        description: "Failed to add product. Please try again.",
        duration: 1000,
        variant: "destructive",
      })
    }
  }

  const sizeInputs = formData.gender === 'Dama'
    ? ['T-35', 'T-36', 'T-37', 'T-38', 'T-39', 'T-40']
    : ['T-40', 'T-41', 'T-42', 'T-43', 'T-44', 'T-45']

    if (loading) {
      return (
        <div className="min-h-screen bg-blue-100">
          <header className="bg-teal-600 text-white p-4 flex items-center">
            <Skeleton className="h-6 w-6 mr-2" />
            <Skeleton className="h-8 w-48 mr-2 flex-grow" />
            <Skeleton className="h-10 w-32" />
          </header>
          <main className="container mx-auto p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(1)].map((_, index) => (
                <ProductFormSkeleton key={index} />
              ))}
            </div>
          </main>
        </div>
      )
    }

  return (
    <div className='min-h-screen bg-blue-100'>
   
    <header className="bg-teal-600 text-white p-3 flex items-center sticky top-0 z-20">
        <Button variant="ghost" className="text-white p-0 mr-2" onClick={() =>  router.push(`/companies/${companyId}/warehouses/${warehouseId}/pares-inventory`)}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-bold flex-grow">New {warehouseName}</h1>
    </header>
    <main className="container mx-auto p-4">
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className='m-2'>
        <CardTitle className="flex items-center justify-between">
          <span>{isBox ? 'Add New Box' : 'Add New Pairs'}</span>
          <div className="flex items-center space-x-2">
            <span>Pairs</span>
            <Switch
              checked={isBox}
              onCheckedChange={setIsBox}
            />
            <span>Box</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className='m-2'>
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
          {!isBox && (
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
          )}
          {isBox && (
            <div>
              <Label htmlFor="total2">Total Pairs</Label>
              <Input
                id="total2"
                name="total2"
                type="number"
                value={formData.total2 || ''}
                onChange={handleInputChange}
              />
            </div>
          )}
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
          <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={() => router.push(`/companies/${companyId}/warehouses/${warehouseId}/pares-inventory`)}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : `Add ${isBox ? 'Box' : 'Product'}`}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
    </main>
    </div>
  )
}