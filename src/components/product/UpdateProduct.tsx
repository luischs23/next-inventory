'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { db, storage } from 'app/services/firebase/firebase.config'
import { doc, getDoc, updateDoc, collection, getDocs, query, orderBy, limit, addDoc, deleteDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { Button } from "app/components/ui/button"
import { Input } from "app/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "app/components/ui/select"
import { Card, CardContent} from "app/components/ui/card"
import { Label } from "app/components/ui/label"
import { Switch } from "app/components/ui/switch"
import Barcode from 'react-barcode'
import { PlusIcon, Trash2Icon, RotateCcwIcon, ArrowLeft, PrinterIcon, Barcode as BarcodeIcon, ChevronDown, ChevronUp } from 'lucide-react'
import { useToast } from "app/components/ui/use-toast"
import ProductImageUpload from '../ui/ProductImageUpload'
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog'

type Gender = 'Dama' | 'Hombre'
type Brand = 'Nike' | 'Adidas' | 'Puma' | 'Reebok'

interface SizeInput {
  quantity: number
  barcodes: string[]
}

interface Store {
  id: string
  name: string
}

interface ProductData {
  id: string
  brand: Brand
  reference: string
  color: string
  comments: string
  gender: Gender
  sizes: { [key: string]: SizeInput }
  imageUrl: string
  total: number
  baseprice: string
  saleprice: string
  exhibition: { [storeId: string]: { size: string, barcode: string } }
  barcode?: string
}

interface UpdateProductComponentProps {
  companyId: string
  productId: string
  warehouseId: string
  isBox: boolean
}

interface Warehouse {
  id: string
  name: string
}

const damaSizes = ['T-35', 'T-36', 'T-37', 'T-38', 'T-39', 'T-40']
const hombreSizes = ['T-40', 'T-41', 'T-42', 'T-43', 'T-44', 'T-45']

export default function UpdateProductComponent({ companyId, warehouseId, productId, isBox }: UpdateProductComponentProps) {
  const [product, setProduct] = useState<ProductData | null>(null)
  const [loading, setLoading] = useState(true)
  const [imageLoading, setImageLoading] = useState(false)
  const [newSize, setNewSize] = useState('')
  const [newQuantity, setNewQuantity] = useState(0)
  const [stores, setStores] = useState<Store[]>([])
  const [selectedStore, setSelectedStore] = useState('')
  const [exhibitionBarcode, setExhibitionBarcode] = useState('')
  const { toast } = useToast()
  const router = useRouter()
  const [, setLastBarcode] = useState('')
  const [, setBoxNumber] = useState(0)
  const [, setProductNumber] = useState(0)
  const [, setLastProductNumber] = useState(0)
  const [productBoxNumber, setProductBoxNumber] = useState(0)
  const [showSizes, setShowSizes] = useState(false)
  const [selectedWarehouse, setSelectedWarehouse] = useState<string | null>(null)
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [isRedirected, setIsRedirected] = useState(false)
  const [allSizes, setAllSizes] = useState<string[]>([])
  const [lastUsedProductNumber, setLastUsedProductNumber] = useState(0)

  const formatNumber = (value: string): string => {
    const number = value.replace(/[^\d]/g, '')
    return number.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  }

  const parseFormattedNumber = (value: string): number => {
    return parseInt(value.replace(/\./g, ''), 10)
  }

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const productDoc = await getDoc(doc(db, `companies/${companyId}/warehouses/${warehouseId}/${isBox ? 'boxes' : 'products'}`, productId))
        if (productDoc.exists()) {
          const productData = productDoc.data() as Omit<ProductData, 'id'>
          
          // Find the highest product number used
          let highestProductNumber = 0
          Object.values(productData.sizes || {}).forEach(size => {
            size.barcodes.forEach(barcode => {
              const productNumber = parseInt(barcode.slice(-2))
              highestProductNumber = Math.max(highestProductNumber, productNumber)
            })
          })
          setLastUsedProductNumber(highestProductNumber)

          setProduct({ 
            id: productDoc.id, 
            ...productData,
            sizes: productData.sizes || {},
            exhibition: productData.exhibition || {},
            baseprice: formatNumber(productData.baseprice.toString()),
            saleprice: formatNumber(productData.saleprice.toString()),
            total: productData.total || 0
          })
        } else {
          console.error('Product not found')
        }
      } catch (error) {
        console.error('Error fetching product:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()

    const fetchStores = async () => {
      const storesSnapshot = await getDocs(collection(db, `companies/${companyId}/stores`))
      const storesList = storesSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }))
      setStores(storesList)
    }

    const fetchLastBarcode = async () => {
      try {
        const productsRef = collection(db, `companies/${companyId}/warehouses/${warehouseId}/${isBox ? 'boxes' : 'products'}`)
        const q = query(productsRef, orderBy('createdAt', 'desc'), limit(1))
        const querySnapshot = await getDocs(q)
        
        if (!querySnapshot.empty) {
          const lastProduct = querySnapshot.docs[0].data()
          let lastBarcode = ''
          if (isBox) {
            lastBarcode = lastProduct.barcode
          } else {
            const sizes = lastProduct.sizes as Record<string, { barcodes: string[] }>
            lastBarcode = Object.values(sizes)
              .flatMap(size => size.barcodes)
              .sort()
              .pop() || ''
          }
          
          if (lastBarcode) {
            setLastBarcode(lastBarcode)
            const boxNum = parseInt(lastBarcode.slice(6, 12))
            const prodNum = parseInt(lastBarcode.slice(12))
            setBoxNumber(boxNum)
            setProductNumber(prodNum)
          }
        }
      } catch (error) {
        console.error('Error fetching last barcode:', error)
      }
    }

    fetchProduct()
    fetchStores()
    fetchLastBarcode()
  }, [companyId, warehouseId, productId, isBox])

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
    if (product) {
      const sizes = product.gender === 'Dama' ? damaSizes : hombreSizes
      setAllSizes(sizes)
    }
  }, [product])

  const handlePrintBarcode = useCallback(async (barcode: string, brand: string, reference: string, color: string, size: string) => {
    try {
      const labelData = {
        text1: brand,
        text2: size,
        text3: reference,
        text4: color,
        barcode: barcode
      }

      const response = await fetch('/api/printer-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(labelData),
      })

      if (!response.ok) {
        throw new Error('Failed to print barcode')
      }

      const result = await response.json()
      toast({
        title: "Barcode Printed",
        description: result.message,
        duration: 1000,
        style: {
          background: "#4CAF50",
          color: "white",
          fontWeight: "bold",
        },
      })
    } catch (error) {
      console.error('Error printing barcode:', error)
      toast({
        title: "Error",
        description: "Failed to print barcode. Please try again.",
        duration: 1000,
        variant: "destructive",
      })
    }
  }, [toast])

  const handlePrintBarcodeBox = useCallback(async (barcode: string, brand: string, reference: string, color: string, numberbox: string) => {
    try {
      const labelData = {
        date: new Date().toISOString(),
        text1: brand,
        text2: reference,
        text3: color,
        text4: numberbox,
        barcode: barcode
      }

      const response = await fetch('/api/printer-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...labelData, isBox: true }),
      })

      if (!response.ok) {
        throw new Error('Failed to print box barcode')
      }

      const result = await response.json()
      toast({
        title: "Box Barcode Printed",
        description: result.message,
        duration: 1000,
        style: {
          background: "#4CAF50",
          color: "white",
          fontWeight: "bold",
        },
      })
    } catch (error) {
      console.error('Error printing box barcode:', error)
      toast({
        title: "Error",
        description: "Failed to print box barcode. Please try again.",
        duration: 1000,
        variant: "destructive",
      })
    }
  }, [toast])

  const handlePrintAllBarcodes = useCallback(async (size: string) => {
    if (product) {
      const barcodes = product.sizes[size].barcodes
      const brand = product.brand
      const reference = product.reference
      const color = product.color
      const sizeWithoutPrefix = size.replace('T-', '')

      for (const barcode of barcodes) {
        await handlePrintBarcode(barcode, brand , reference, color, sizeWithoutPrefix)
      }

      toast({
        title: "All Barcodes Printed",
        description: `All barcodes for size ${size} have been sent to the printer.`,
        duration: 1000,
        style: {
          background: "#4CAF50",
          color: "white",
          fontWeight: "bold",
        },
      })
    }
  }, [product, handlePrintBarcode, toast])

  const handlePrintAllSizes = useCallback(async () => {
    if (product) {
      if (isBox) {
        // Print box barcode
        await handlePrintBarcodeBox(
          product.barcode || '',
          product.brand,
          product.reference,
          product.color,
          product.total.toString()
        )
      } else {
        // Print all product barcodes
        const brand = product.brand
        const reference = product.reference
        const color = product.color
        for (const [size, sizeData] of Object.entries(product.sizes)) {
          const sizeWithoutPrefix = size.replace('T-', '')
          for (const barcode of sizeData.barcodes) {
            await handlePrintBarcode(barcode, brand, reference, color, sizeWithoutPrefix)
          }
        }
      }

      toast({
        title: isBox ? "Box Barcode Printed" : "All Sizes Printed",
        description: isBox
          ? "The box barcode has been sent to the printer."
          : "All barcodes for all sizes have been sent to the printer.",
        duration: 1000,
        style: {
          background: "#4CAF50",
          color: "white",
          fontWeight: "bold",
        },
      })
    }
  }, [product, isBox, handlePrintBarcode, handlePrintBarcodeBox, toast])

  const availableSizes = useMemo(() => {
    if (!product) return []
    const allSizes = product.gender === 'Dama' ? damaSizes : hombreSizes
    return allSizes.filter(size => !product.sizes[size] || product.sizes[size].barcodes.length === 0)
  }, [product])

  const sortedSizes = useMemo(() => {
    if (!product) return []
    return Object.entries(product.sizes)
      .sort(([a], [b]) => {
        const aNum = parseInt(a.split('-')[1])
        const bNum = parseInt(b.split('-')[1])
        return aNum - bNum
      })
      .map(([size]) => size)
  }, [product])

  const availableStores = useMemo(() => {
    if (!product) return []
    return stores.filter(store => !product.exhibition[store.id])
  }, [product, stores])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    if (name === 'baseprice' || name === 'saleprice') {
      const formattedValue = formatNumber(value)
      setProduct(prev => prev ? { ...prev, [name]: formattedValue } : null)
    } else {
      setProduct(prev => prev ? { ...prev, [name]: value } : null)
    }
  }

  const handleImageChange = async (file: File | null) => {
    if (file && product) {
      setImageLoading(true)
      try {
        const imageRef = ref(storage, `companies/${companyId}/warehouses/${warehouseId}/${isBox ? 'boxes' : 'products'}/${file.name}`)
        await uploadBytes(imageRef, file)
        const imageUrl = await getDownloadURL(imageRef)
        
        await updateDoc(doc(db, `companies/${companyId}/warehouses/${warehouseId}/${isBox ? 'boxes' : 'products'}`, product.id), {
          imageUrl: imageUrl
        })

        setProduct({
          ...product,
          imageUrl: imageUrl
        })

        toast({
          title: "Image Updated",
          description: `The ${isBox ? 'box' : 'product'} image has been successfully updated.`,
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

  const generateBarcode = useCallback((localProductNumber: number) => {
    const date = new Date()
    const dateString = date.toISOString().slice(2, 10).replace(/-/g, '')
    const boxNumber = product?.barcode?.slice(6, 12) || '000000'
    const productString = localProductNumber.toString().padStart(2, '0')
    return `${dateString}${boxNumber}${productString}`
  }, [product])

  const handleAddSize = async () => {
    if (newSize && newQuantity > 0 && product) {
      const newBarcodes: string[] = []

      // Find the last used barcode across all sizes
      const lastUsedBarcode = Object.values(product.sizes)
        .flatMap(size => size.barcodes)
        .sort((a, b) => b.localeCompare(a))[0]

      // Extract the box number and product number from the last used barcode
      let currentBoxNumber = productBoxNumber
      let currentProductNumber = 0
      if (lastUsedBarcode) {
        currentBoxNumber = parseInt(lastUsedBarcode.slice(6, 12))
        currentProductNumber = parseInt(lastUsedBarcode.slice(12))
      }

      for (let i = 0; i < newQuantity; i++) {
        currentProductNumber = (currentProductNumber % 99) + 1
        if (currentProductNumber === 1) {
          currentBoxNumber++
        }
        const date = new Date()
        const dateString = date.toISOString().slice(2, 10).replace(/-/g, '')
        const boxString = currentBoxNumber.toString().padStart(6, '0')
        const productString = currentProductNumber.toString().padStart(2, '0')
        newBarcodes.push(`${dateString}${boxString}${productString}`)
      }

      const updatedProduct = {
        ...product,
        sizes: {
          ...product.sizes,
          [newSize]: { quantity: newQuantity, barcodes: newBarcodes }
        },
        total: product.total + newQuantity
      }

      try {
        await updateDoc(doc(db, `companies/${companyId}/warehouses/${warehouseId}/${isBox ? 'boxes' : 'products'}`, product.id), updatedProduct)

        setProduct(updatedProduct)
        setProductBoxNumber(currentBoxNumber)
        setLastProductNumber(currentProductNumber)
        setNewSize('')
        setNewQuantity(0)

        toast({
          title: "Size Added",
          description: `Size ${newSize} has been added to the inventory.`,
          duration: 1000,
          style: {
            background: "#4CAF50",
            color: "white",
            fontWeight: "bold",
          },
        })
      } catch (error) {
        console.error('Error adding size:', error)
        toast({
          title: "Error",
          description: "Failed to add size. Please try again.",
          duration: 1000,
          variant: "destructive",
        })
      }
    }
  }

  const handleDeleteBarcode = (size: string, barcodeToDelete: string) => {
    if (product) {
      setProduct(prev => {
        if (!prev) return null
        const updatedSizes = { ...prev.sizes }
        if (updatedSizes[size]) {
          updatedSizes[size] = {
            ...updatedSizes[size],
            quantity: updatedSizes[size].quantity - 1,
            barcodes: updatedSizes[size].barcodes.filter(barcode => barcode !== barcodeToDelete)
          }
          if (updatedSizes[size].quantity === 0) {
            delete updatedSizes[size]
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
        const updatedSizes = { ...prev.sizes }
        if (!updatedSizes[size]) {
          updatedSizes[size] = { quantity: 0, barcodes: [] }
        }
        const localProductNumber = lastUsedProductNumber + 1
        const newBarcode = generateBarcode(localProductNumber)
        updatedSizes[size] = {
          ...updatedSizes[size],
          quantity: updatedSizes[size].quantity + 1,
          barcodes: [...updatedSizes[size].barcodes, newBarcode]
        }
        setLastUsedProductNumber(localProductNumber)
        return {
          ...prev,
          sizes: updatedSizes,
          total: prev.total + 1
        }
      })
    }
  }

  const handleAddExhibition = async () => {
    if (product && selectedStore && exhibitionBarcode) {
      const size = Object.entries(product.sizes).find(([_, sizeData]) => 
        sizeData.barcodes.includes(exhibitionBarcode)
      )?.[0]
  
      if (size) {
        const updatedSizes = { ...product.sizes }
        if (updatedSizes[size]) {
          updatedSizes[size] = {
            ...updatedSizes[size],
            quantity: updatedSizes[size].quantity - 1,
            barcodes: updatedSizes[size].barcodes.filter(b => b !== exhibitionBarcode)
          }
        }
  
        const updatedProduct = {
          ...product,
          sizes: updatedSizes,
          total: product.total - 1,
          exhibition: {
            ...product.exhibition,
            [selectedStore]: { size, barcode: exhibitionBarcode }
          }
        }
  
        try {
          await updateDoc(doc(db, `companies/${companyId}/warehouses/${warehouseId}/${isBox ? 'boxes' : 'products'}`, product.id), updatedProduct)
  
          setProduct(updatedProduct)
          setSelectedStore('')
          setExhibitionBarcode('')
  
          toast({
            title: "Added to Exhibition",
            description: `Product added to exhibition in ${stores.find(s => s.id === selectedStore)?.name}.`,
            duration: 1000,
            style: {
              background: "#2196F3",
              color: "white",
              fontWeight: "bold",
            },
          })
        } catch (error) {
          console.error('Error adding to exhibition:', error)
          toast({
            title: "Error",
            description: "Failed to add product to exhibition. Please try again.",
            duration: 1000,
            variant: "destructive",
          })
        }
      } else {
        toast({
          title: "Invalid Barcode",
          description: "The entered barcode does not match any product size.",
          duration: 1000,
          variant: "destructive",
        })
      }
    }
  }

  const handleReturnFromExhibition = async (storeId: string) => {
    if (product) {
      const exhibitionItem = product.exhibition[storeId]
      if (exhibitionItem) {
        const { size, barcode } = exhibitionItem
  
        const updatedProduct = {
          ...product,
          sizes: {
            ...product.sizes,
            [size]: {
              quantity: (product.sizes[size]?.quantity || 0) + 1,
              barcodes: [...(product.sizes[size]?.barcodes || []), barcode]
            }
          },
          total: product.total + 1,
          exhibition: Object.fromEntries(
            Object.entries(product.exhibition).filter(([key]) => key !== storeId)
          )
        }

        setProduct(updatedProduct)
  
        toast({
          title: "Returned from Exhibition",
          description: "Product has been returned from exhibition. Remember to save changes.",
          duration: 1000,
          style: {
            background: "#4CAF50",
            color: "white",
            fontWeight: "bold",
          },
        })
      }
    }
  }

  const handleWarehouseChange = (value: string) => {
    setSelectedWarehouse(value)
  }

  const totalFromSizes = useMemo(() => {
    return Object.values(product?.sizes || {}).reduce((sum, size) => sum + size.quantity, 0)
  }, [product?.sizes])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!product) return

    try {
      let updatedProduct = {
        ...product,
        total: Object.values(product.sizes).reduce((sum, size) => sum + size.quantity, 0),
        baseprice: parseFormattedNumber(product.baseprice).toString(),
        saleprice: parseFormattedNumber(product.saleprice).toString(),
        isRedirected: isRedirected,
      }

      if (isBox) {
        let localProductNumber = lastUsedProductNumber
        const updatedSizes = Object.entries(updatedProduct.sizes).reduce((acc, [size, sizeData]) => {
          const existingBarcodes = sizeData.barcodes || []
          const newBarcodesCount = sizeData.quantity - existingBarcodes.length
          const newBarcodes = Array(newBarcodesCount).fill(null).map(() => {
            localProductNumber++
            return generateBarcode(localProductNumber)
          })
          acc[size] = { 
            ...sizeData, 
            barcodes: [...existingBarcodes, ...newBarcodes]
          }
          return acc
        }, {} as typeof updatedProduct.sizes)

        updatedProduct = { ...updatedProduct, sizes: updatedSizes }
        setLastUsedProductNumber(localProductNumber)
      }

      if (isBox && selectedWarehouse && selectedWarehouse !== warehouseId) {
        // Move the box to the selected warehouse
        await addDoc(collection(db, `companies/${companyId}/warehouses/${selectedWarehouse}/products`), updatedProduct)
        await deleteDoc(doc(db, `companies/${companyId}/warehouses/${warehouseId}/boxes`, product.id))
        setIsRedirected(true)
      } else {
        await updateDoc(doc(db, `companies/${companyId}/warehouses/${warehouseId}/${isBox ? 'boxes' : 'products'}`, product.id), updatedProduct)
      }

      setProduct({
        ...updatedProduct,
        baseprice: formatNumber(updatedProduct.baseprice),
        saleprice: formatNumber(updatedProduct.saleprice)
      })

      toast({
        title: `${isBox ? 'Box' : 'Product'} Updated`,
        description: `The ${isBox ? 'box' : 'product'} has been successfully updated.`,
        duration: 1000,
        style: {
          background: "#4CAF50",
          color: "white",
          fontWeight: "bold", 
        },    
      })

      router.push(`/companies/${companyId}/warehouses/${selectedWarehouse || warehouseId}/${isBox ? 'inventory' : 'pares-inventory'}`)
    } catch (error) {
      console.error(`Error updating ${isBox ? 'box' : 'product'}:`, error)
      toast({
        title: "Error",
        description: `Failed to update ${isBox ? 'box' : 'product'}. Please try again.`,
        duration: 1000,
        variant: "destructive",
      })
    }
  }

  const handleSizeChange = (size: string, newQuantity: number) => {
    if (product) {
      setProduct(prev => {
        if (!prev) return null;
        const updatedSizes = { ...prev.sizes };
        if (newQuantity > 0) {
          updatedSizes[size] = {
            ...updatedSizes[size],
            quantity: newQuantity,
            barcodes: updatedSizes[size]?.barcodes || []
          };
        } else {
          delete updatedSizes[size];
        }
        return {
          ...prev,
          sizes: updatedSizes,
        };
      });
    }
  };

  if (loading) {
    return <div>Loading...</div>
  }

  if (!product) {
    return <div>Product not found</div>
  }

  return (
    <div className="min-h-screen bg-blue-100">
      <header className="bg-teal-600 text-white p-4 flex items-center">
        <Button variant="ghost" className="text-white p-0 mr-2" onClick={() => router.back()}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-bold flex-grow">Update {isBox ? 'Box' : 'Product'}</h1>
      </header>
      <main className="container mx-auto p-4">
        <Card className="w-full max-w-4xl mx-auto">
          <CardContent className='m-2'>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="brand">Brand</Label>
                  <Select name="brand" value={product.brand} onValueChange={(value: Brand) => setProduct(prev => prev ? { ...prev, brand: value } : null)}>
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
              </div>
              
              <div className="flex items-center space-x-2">
                <Label htmlFor="gender">Gender</Label>
                <Switch
                  id="gender"
                  checked={product.gender === 'Hombre'}
                  onCheckedChange={(checked) => setProduct(prev => prev ? { ...prev, gender: checked ? 'Hombre' : 'Dama' } : null)}
                />
                <span>{product.gender}</span>
              </div>
              <div>
                <Label htmlFor="barcode">Barcode</Label>
                <Input id="barcode" name="barcode" value={product.barcode || ''} disabled />
              </div>
              
              {isBox && (
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
              )}

              {(showSizes || !isBox) && (
                <div>
                  <Label>Sizes</Label>
                  <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {allSizes.map((size) => (
                      <div key={size}>
                        <Label htmlFor={size}>{size}</Label>
                        <Input
                          id={size}
                          type="number"
                          value={product.sizes[size]?.quantity || ''}
                          onChange={(e) => handleSizeChange(size, parseInt(e.target.value) || 0)}
                        />
                        {!isBox && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" className="mt-2 w-full">Barcodes</Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="max-w-3xl">
                            <AlertDialogHeader>
                              <AlertDialogTitle>{product.brand} {product.reference} Size {size}</AlertDialogTitle>
                              <AlertDialogDescription></AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="grid grid-cols-1">
                              {(product.sizes[size]?.barcodes || []).map((barcode, index) => (
                                <div key={index} className="flex border rounded items-center justify-center space-x-2">
                                  <p className="mb-2">
                                    {size}
                                  </p>
                                  <div className="flex flex-col items-center justify-center">
                                    <Barcode value={barcode} width={1} height={30} fontSize={12} />
                                  </div>
                                  <div className="space-x-2">
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      onClick={() => handlePrintBarcode(barcode, product.brand, product.reference, product.color, size.replace('T-', ''))}
                                    >
                                      <PrinterIcon className="w-4 h-4" />
                                    </Button>
                                    <Button 
                                      variant="destructive" 
                                      size="sm" 
                                      onClick={() => handleDeleteBarcode(size, barcode)}
                                    >
                                      <Trash2Icon className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="flex justify-center space-x-2">
                              <Button onClick={() => handleAddBarcode(size)}>
                                <PlusIcon className="w-4 h-4 mr-2" /> Add Barcode
                              </Button>
                              <Button onClick={() => handlePrintAllBarcodes(size)}>
                                <PrinterIcon className="w-4 h-4 mr-2" /> Print All
                              </Button>
                            </div>
                          </AlertDialogContent>
                        </AlertDialog>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {!isBox && (
                <div className="flex flex-wrap gap-2">
                  <Select value={newSize} onValueChange={setNewSize}>
                    <SelectTrigger className="w-[150px]">
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
                    placeholder=""
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(parseInt(e.target.value))}
                    className="w-20"
                  />
                  <Button type="button" onClick={handleAddSize}>Add Size</Button>
                </div>
              )}
              {showSizes && (
                  <div className="flex-grow">
                    <Label htmlFor="totalFromSizes">Total from Sizes</Label>
                    <Input id="totalFromSizes" name="totalFromSizes" value={totalFromSizes} readOnly />
                  </div>
                )}
              <div className="flex items-center space-x-4">
                <div className="flex-grow">
                  <Label htmlFor="total">Total</Label>
                  <Input id="total" name="total" value={product.total} readOnly />
                </div>
                <Button type="button" onClick={handlePrintAllSizes} className="mt-6">
                  <PrinterIcon className="w-4 h-4 mr-2" /> Print {isBox ? 'Box Barcode' : 'All Sizes'}
                </Button>
              </div>

              {isBox && (
                  <div className="flex-grow">
                    <Label htmlFor="warehouse">Warehouse</Label>
                    <Select value={selectedWarehouse || ''} onValueChange={handleWarehouseChange}>
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
                )}

              {!isBox && (
                <div>
                  <Label>Exhibition</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Select value={selectedStore} onValueChange={setSelectedStore}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Store" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableStores.map((store) => (
                          <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Barcode"
                      value={exhibitionBarcode}
                      onChange={(e) => setExhibitionBarcode(e.target.value)}
                      className="w-32"
                    />
                    <Button type="button" onClick={handleAddExhibition}>Add to Exh</Button>
                  </div>
                  <div className="mt-2 space-y-2">
                    {Object.entries(product.exhibition).map(([storeId, exhibitionData]) => {
                      const storeName = stores.find(s => s.id === storeId)?.name || storeId
                      return (
                        <div key={storeId} className="flex items-center justify-between text-sm bg-gray-100 p-2 rounded">
                          <span>{storeName}: {exhibitionData.size} - Bc: {exhibitionData.barcode}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReturnFromExhibition(storeId)}
                          >
                            <RotateCcwIcon className="w-4 h-4 mr-2" />
                            Return
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ProductImageUpload 
                  imageUrl={product?.imageUrl || '/placeholder.svg'}
                  altText={`${product?.brand} ${product?.reference}`}
                  onImageChange={handleImageChange}
                  isLoading={imageLoading}
                />
                <div className='flex space-x-4'>
                  <div>
                    <Label htmlFor="baseprice">Base Price</Label>
                    <Input
                      id="baseprice"
                      name="baseprice"
                      type="text"
                      value={product.baseprice}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <Label htmlFor="saleprice">Sale Price</Label>
                    <Input
                      id="saleprice"
                      name="saleprice"
                      type="text"
                      value={product.saleprice}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => router.push(`/companies/${companyId}/warehouses/${warehouseId}/${isBox ? 'inventory' : 'pares-inventory'}`)}>Cancel</Button>
                <Button type="submit" disabled={isBox && showSizes && product.total !== totalFromSizes}>
                  Update {isBox ? 'Box' : 'Product'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}