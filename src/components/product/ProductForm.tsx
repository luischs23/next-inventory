'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { db, storage } from 'app/services/firebase/firebase.config'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { addDoc, collection, serverTimestamp, query, orderBy, limit, getDocs, FieldValue } from 'firebase/firestore'
import { Button } from "app/components/ui/button"
import { Input } from "app/components/ui/input"
import { Label } from "app/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "app/components/ui/select"
import { Switch } from "app/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "app/components/ui/card"
import { useToast } from "app/components/ui/use-toast"
import { ChevronDown, ChevronUp } from 'lucide-react'

type Gender = 'Dama' | 'Hombre'
type Brand = 'Nike' | 'Adidas' | 'Puma' | 'Reebok'

interface SizeInput {
  quantity: number
  barcodes: string[]
}

interface SizeInputs {
  [key: string]: SizeInput
}

interface Warehouse {
  id: string
  name: string
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
  barcode: string
}

interface ProductFormComponentProps {
  companyId: string
  warehouseId: string 
  isBox: boolean
}

interface CommonData {
  brand: Brand
  reference: string
  color: string
  gender: Gender
  comments: string
  imageUrl: string
  baseprice: number
  saleprice: number
  createdAt: FieldValue
  warehouseId: string
  sizes: SizeInputs
  total: number
  barcode:string
}

interface BoxData extends CommonData {
}

interface ProductData extends CommonData {
  exhibition: { [store: string]: string }
}

export const ProductFormComponent: React.FC<ProductFormComponentProps> = ({ companyId, warehouseId, isBox }) => {
  const router = useRouter()
  const { toast } = useToast()
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
    exhibition: {},
    barcode:'',
  })
  const [imageError, setImageError] = useState('')
  const [boxNumber, setBoxNumber] = useState(1)
  const [globalProductNumber, setGlobalProductNumber] = useState(1)
  const [showSizes, setShowSizes] = useState(false)
  const [total1, setTotal1] = useState<number | null>(null)
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [selectedWarehouse, setSelectedWarehouse] = useState<string | null>(null)

  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        const warehousesRef = collection(db, `companies/${companyId}/warehouses`)
        const warehousesSnapshot = await getDocs(warehousesRef)
        const warehousesData = warehousesSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name
        }))
        setWarehouses(warehousesData)
      } catch (error) {
        console.error("Error fetching warehouses:", error)
        toast({
          title: "Error",
          description: "Failed to fetch warehouses. Please try again.",
          duration: 3000,
          variant: "destructive",
        })
      }
    }

    fetchWarehouses()
  }, [companyId, toast])
  
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

        let lastBarcode = ''
        let lastBoxNumber = 0
        let lastProductNumber = 0

        for (const warehouseDoc of warehousesSnapshot.docs) {
          // Check products
          const productsRef = collection(warehouseDoc.ref, 'products')
          const productQuery = query(productsRef, orderBy('createdAt', 'desc'), limit(1))
          const productSnapshot = await getDocs(productQuery)

          if (!productSnapshot.empty) {
            const lastProduct = productSnapshot.docs[0].data() as ProductFormData
            const productLastBarcode = Object.values(lastProduct.sizes)
              .flatMap((size: SizeInput) => size.barcodes)
              .sort()
              .pop()

            if (productLastBarcode && productLastBarcode > lastBarcode) {
              lastBarcode = productLastBarcode
              lastBoxNumber = parseInt(lastBarcode.slice(6, 12))
              lastProductNumber = parseInt(lastBarcode.slice(12))
            }
          }

          // Check boxes
          const boxesRef = collection(warehouseDoc.ref, 'boxes')
          const boxQuery = query(boxesRef, orderBy('createdAt', 'desc'), limit(1))
          const boxSnapshot = await getDocs(boxQuery)

          if (!boxSnapshot.empty) {
            const lastBox = boxSnapshot.docs[0].data()
            if (lastBox.barcode && lastBox.barcode > lastBarcode) {
              lastBarcode = lastBox.barcode
              lastBoxNumber = parseInt(lastBarcode.slice(6, 12))
              lastProductNumber = parseInt(lastBarcode.slice(12))
            }
          }
        }

        if (lastBarcode) {
          setBoxNumber(lastBoxNumber + 1)
          setGlobalProductNumber(lastProductNumber + 1)
        }
      }
    }

    fetchLastBarcode()
  }, [companyId])

  const total = useMemo(() => {
    return Object.values(formData.sizes).reduce((sum, size) => sum + size.quantity, 0)
  }, [formData.sizes])

  const formatNumber = (value: string) => {
    const number = value.replace(/[^\d]/g, '')
    return number.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  }

  const generateBarcode = useCallback((currentProductNumber: number) => {
    const date = new Date()
    const dateString = date.toISOString().slice(2, 10).replace(/-/g, '')
    const boxString = boxNumber.toString().padStart(6, '0')
    const productString = currentProductNumber.toString().padStart(2, '0')
    
    return `${dateString}${boxString}${productString}`
  }, [boxNumber])

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
      let localProductNumber = globalProductNumber

      // First, remove barcodes for sizes that have been reduced or set to 0
      Object.keys(newSizes).forEach((sizeKey) => {
        if (sizeKey === size) {
          if (quantity < (newSizes[sizeKey]?.quantity || 0)) {
            newSizes[sizeKey].barcodes = newSizes[sizeKey].barcodes.slice(0, quantity)
          }
        }
      })

      // Then, generate new barcodes for the current size
      if (quantity > 0) {
        if (!newSizes[size]) {
          newSizes[size] = { quantity: 0, barcodes: [] }
        }
        while (newSizes[size].barcodes.length < quantity) {
          newSizes[size].barcodes.push(generateBarcode(localProductNumber))
          localProductNumber++
        } 
        newSizes[size].quantity = quantity
      } else {
        delete newSizes[size]
      }

      setGlobalProductNumber(localProductNumber)
      return { ...prev, sizes: newSizes }
    })
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setFormData((prev) => ({ ...prev, image: file }))
    setImageError('')
  }

  const handleTotal1Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value === '' ? null : parseInt(e.target.value)
    setTotal1(value)
    if (isBox) {
      setFormData(prev => ({ ...prev, total: value || 0 }))
    }
  }

  const handleWarehouseChange = (value: string) => {
    setSelectedWarehouse(value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.image) {
      setImageError('Please upload an image for the product.')
      return
    }
    try {
      const imageRef = ref(storage, `companies/${companyId}/warehouses/${warehouseId}/${isBox ? 'boxes' : 'products'}/${formData.image.name}`)
      await uploadBytes(imageRef, formData.image)
      const imageUrl = await getDownloadURL(imageRef)

      const commonData: CommonData = {
        brand: formData.brand,
        reference: formData.reference,
        color: formData.color,
        gender: formData.gender,
        comments: formData.comments,
        imageUrl,
        baseprice: parseInt(formData.baseprice.replace(/\./g, '')),
        saleprice: parseInt(formData.saleprice.replace(/\./g, '')),
        createdAt: serverTimestamp(),
        warehouseId: warehouseId,
        sizes: formData.sizes,
        total: isBox ? (showSizes ? total : (total1 || 0)) : total,
        barcode: generateBarcode(0),
      }

      let dataToSave: BoxData | ProductData

      if (isBox) {
        dataToSave = {
          ...commonData,
        }
      } else {
        dataToSave = {
          ...commonData,
          exhibition: formData.exhibition,
        }
      }

      
      let collectionPath: string
      let redirectPath: string | null = null

      if (isBox && selectedWarehouse) {
        // A warehouse is selected for a box
        collectionPath = `companies/${companyId}/warehouses/${selectedWarehouse}/products`
        redirectPath = `/companies/${companyId}/warehouses/${selectedWarehouse}/pares-inventory`
      } else {
        // No warehouse is selected, or it's not a box
        collectionPath = `companies/${companyId}/warehouses/${warehouseId}/${isBox ? 'boxes' : 'products'}`
        redirectPath = `/companies/${companyId}/warehouses/${warehouseId}/${isBox ? 'inventory' : 'pares-inventory'}`
      }

      await addDoc(collection(db, collectionPath), dataToSave)

      toast({
        title: `${isBox ? 'Box' : 'Product'} Added`,
        description: `The ${isBox ? 'box' : 'product'} has been successfully added to the inventory.`,
        duration: 1000,
        style: {
          background: "#4CAF50",
          color: "white",
          fontWeight: "bold",
        },
      })

      // Increment box number for the next product
      setBoxNumber(prevNumber => prevNumber + 1)

      if (redirectPath) {
        router.push(redirectPath)
      }
    } catch (error) {
      console.error(`Error adding ${isBox ? 'box' : 'product'}:`, error)
      toast({
        title: "Error",
        description: `Failed to add ${isBox ? 'box' : 'product'}. Please try again.`,
        duration: 1000,
        variant: "destructive",
      })
    }
  }

  const sizeInputs = formData.gender === 'Dama'
    ? ['T-35', 'T-36', 'T-37', 'T-38', 'T-39', 'T-40']
    : ['T-40', 'T-41', 'T-42', 'T-43', 'T-44', 'T-45']

    const renderSizesAndTotal = () => (
      <div className="space-y-4">
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
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <Label htmlFor="total">Total</Label>
            <Input
              id="total"
              type="number"
              value={total}
              readOnly
            />
          </div>
          {isBox && (
            <div className="flex-1">
              <Label htmlFor="warehouse">Warehouse</Label>
              <Select value={selectedWarehouse || ''} onValueChange={handleWarehouseChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select  warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>
    )
  
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Add New {isBox ? 'Box' : 'Product'}</CardTitle>
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
            {isBox ? (
              <>
                <div>
                  <Label
                    onClick={() => setShowSizes(!showSizes)}
                    className="flex items-center cursor-pointer"
                  >
                    <span>Detail box</span>
                    {showSizes ? 
                      <ChevronUp className="h-4 w-4 ml-1" /> :
                      <ChevronDown className="h-4 w-4 ml-1" />
                    }
                  </Label>
                </div>
                {showSizes ? (
                  renderSizesAndTotal()
                ) : (
                  <div>
                    <Label htmlFor="total1">Number of pairs</Label>
                    <Input
                      id="total1"
                      name="total1"
                      type="number"
                      value={total1 === null ? '' : total1}
                      onChange={handleTotal1Change}
                      placeholder="Enter number of pairs"
                    />
                  </div>
                )}
              </>
            ) : (
              renderSizesAndTotal()
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
            <Button type="submit">Add {isBox ? 'Box' : 'Product'}</Button>
          </form>
        </CardContent>
      </Card>
    )
  }