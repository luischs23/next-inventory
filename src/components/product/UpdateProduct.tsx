'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { db, storage } from 'app/services/firebase/firebase.config'
import { doc, getDoc, updateDoc, collection, getDocs} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { Button } from "app/components/ui/button"
import { Input } from "app/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "app/components/ui/select"
import { Card, CardContent} from "app/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "app/components/ui/dialog"
import { Label } from "app/components/ui/label"
import Barcode from 'react-barcode'
import { PlusIcon, Trash2Icon, RotateCcwIcon, ArrowLeft} from 'lucide-react'
import { useToast } from "app/components/ui/use-toast"
import ProductImageUpload from '../ui/ProductImageUpload'

interface SizeInput {
  quantity: number
  barcodes: string[]
}

interface Store {
  id: string
  name: string
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
  baseprice: string
  saleprice: string
  exhibition: { [storeId: string]: { size: string, barcode: string } }
}

interface UpdateProductProps {
    companyId: string
    productId: string
    warehouseId: string
  }

const damaSizes = ['T-35', 'T-36', 'T-37', 'T-38', 'T-39', 'T-40']
const hombreSizes = ['T-40', 'T-41', 'T-42', 'T-43', 'T-44', 'T-45']

export default function UpdateProduct({ companyId, warehouseId, productId }: UpdateProductProps) {
  const [product,   setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [imageLoading, setImageLoading] = useState(false)
  const [newSize, setNewSize] = useState('')
  const [newQuantity, setNewQuantity] = useState(0)
  const [stores, setStores] = useState<Store[]>([])
  const [selectedStore, setSelectedStore] = useState('')
  const [exhibitionBarcode, setExhibitionBarcode] = useState('')
  const { toast } = useToast()
  const router = useRouter()

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
        const productDoc = await getDoc(doc(db, `companies/${companyId}/warehouses/${warehouseId}/products`, productId))
        if (productDoc.exists()) {
          const productData = productDoc.data() as Omit<Product, 'id'>
          setProduct({ 
            id: productDoc.id, 
            ...productData,
            sizes: productData.sizes || {},
            exhibition: productData.exhibition || {},
            baseprice: formatNumber(productData.baseprice.toString()),
            saleprice: formatNumber(productData.saleprice.toString())
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

    const fetchStores = async () => {
      const storesSnapshot = await getDocs(collection(db, `companies/${companyId}/stores`))
      const storesList = storesSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }))
      setStores(storesList)
    }

    fetchProduct()
    fetchStores()
  }, [companyId, warehouseId, productId])

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
        const imageRef = ref(storage, `companies/${companyId}/warehouses/${warehouseId}/products/${file.name}`)
        await uploadBytes(imageRef, file)
        const imageUrl = await getDownloadURL(imageRef)
        
        await updateDoc(doc(db, `companies/${companyId}/warehouses/${warehouseId}/products`, product.id), {
          imageUrl: imageUrl
        })

        setProduct({
          ...product,
          imageUrl: imageUrl
        })

        toast({
          title: "Image Updated",
          description: "The product image has been successfully updated.",
          duration: 3000,
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
          duration: 3000,
          variant: "destructive",
        })
      } finally {
        setImageLoading(false)
      }
    }
  }

  const generateBarcode = () => {
    return Math.random().toString(36).substr(2, 9).toUpperCase()
  }

  const handleAddSize = async () => {
    if (newSize && newQuantity > 0 && product) {
      const newBarcodes = Array(newQuantity).fill('').map(() => generateBarcode())
      const updatedProduct = {
        ...product,
        sizes: {
          ...product.sizes,
          [newSize]: { quantity: newQuantity, barcodes: newBarcodes }
        },
        total: product.total + newQuantity
      }

      try {
        // Update Firestore
        await updateDoc(doc(db, `companies/${companyId}/warehouses/${warehouseId}/products`, product.id), updatedProduct)

        // Update local state
        setProduct(updatedProduct)
        setNewSize('')
        setNewQuantity(0) 

        toast({
          title: "Size Added",
          description: `Size ${newSize} has been added to the inventory.`,
          duration: 3000,
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
          duration: 3000,
          variant: "destructive",
        })
      }
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
          total: Object.values(updatedSizes).reduce((sum, size) => sum + size.quantity, 0)
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

  const handleAddExhibition = async () => {
    if (product && selectedStore && exhibitionBarcode) {
      const size = Object.entries(product.sizes).find(([_, sizeData]) => 
        sizeData.barcodes.includes(exhibitionBarcode)
      )?.[0]
  
      if (size) {
        const updatedSizes = { ...product.sizes }
        updatedSizes[size] = {
          ...updatedSizes[size],
          quantity: updatedSizes[size].quantity - 1,
          barcodes: updatedSizes[size].barcodes.filter(b => b !== exhibitionBarcode)
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
          // Update the product in the warehouses/products subcollection
          await updateDoc(doc(db, `companies/${companyId}/warehouses/${warehouseId}/products`, product.id), updatedProduct)
  
          setProduct(updatedProduct)
          setSelectedStore('')
          setExhibitionBarcode('')
  
          toast({
            title: "Added to Exhibition",
            description: `Product added to exhibition in ${stores.find(s => s.id === selectedStore)?.name}.`,
            duration: 3000,
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
            duration: 3000,
            variant: "destructive",
          })
        }
      } else {
        toast({
          title: "Invalid Barcode",
          description: "The entered barcode does not match any product size.",
          duration: 3000,
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

          // Update local state
          setProduct(updatedProduct)
  
          toast({
            title: "Returned from Exhibition",
            description: "Product has been returned from exhibition. Remember to save changes.",
            duration: 3000,
            style: {
              background: "#4CAF50",
              color: "white",
              fontWeight: "bold",
            },
          })
        }
      }
    }

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      if (!product) return
  
      try {
        const updatedSizes = Object.fromEntries(
          Object.entries(product.sizes).filter(([_, sizeData]) => sizeData.quantity > 0)
        )
  
        const updatedProduct = {
          ...product,
          sizes: updatedSizes,
          total: Object.values(updatedSizes).reduce((sum, size) => sum + size.quantity, 0),
          baseprice: parseFormattedNumber(product.baseprice),
          saleprice: parseFormattedNumber(product.saleprice)
        }
  
        await updateDoc(doc(db, `companies/${companyId}/warehouses/${warehouseId}/products`, product.id), updatedProduct)
  
        setProduct({
          ...updatedProduct,
          baseprice: formatNumber(updatedProduct.baseprice.toString()),
          saleprice: formatNumber(updatedProduct.saleprice.toString())
        })
  
        toast({
          title: "Product Updated",
          description: "The product has been successfully updated.",
          duration: 3000,
          style: {
            background: "#4CAF50",
            color: "white",
            fontWeight: "bold", 
          },    
        })
  
        router.push(`/companies/${companyId}/warehouses/${warehouseId}/pares-inventory`)
      } catch (error) {
        console.error('Error updating product:', error)
        toast({
          title: "Error",
          description: "Failed to update product. Please try again.",
          duration: 3000,
          variant: "destructive",
        })
      }
    }

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
        <h1 className="text-xl font-bold flex-grow">Update Product</h1>
      </header>
      <main className="container mx-auto p-4">
    <Card className="w-full max-w-4xl mx-auto">
      <CardContent className='m-2'>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>
          
          {/* Sizes */}
          <div>
            <Label>Sizes</Label>
            <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
                      <Button variant="outline" className="mt-2 w-full">Barcodes</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl text-gray-300">
                      <DialogHeader>
                        <DialogTitle>Barcodes - {product.brand} {product.reference} Size {size}</DialogTitle>
                        <DialogDescription className='text-slate-200'>Add, remove, or view barcodes for this product size.</DialogDescription>
                      </DialogHeader>
                      <div className="grid grid-cols-2 gap-4">
                        {product.sizes[size].barcodes.map((barcode, index) => (
                          <div key={index} className="text-center border p-4 rounded">
                            <p className="mb-2">
                              {product.brand} {product.reference} {product.color} Size {size}
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
          
          {/* Add new size */}
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
              placeholder="Quantity"
              value={newQuantity}
              onChange={(e) => setNewQuantity(parseInt(e.target.value))}
              className="w-10"
            />
            <Button type="button" onClick={handleAddSize}>Add Size</Button>
          </div>
          <div>
            <Label htmlFor="total">Total</Label>
            <Input id="total" name="total" value={product.total} readOnly />
          </div>
          
          {/* Exhibition */}
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
                 {product && product.exhibition && Object.entries(product.exhibition).map(([storeId, exhibitionData]) => {
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
          
          {/* Image and Pricing */}
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
          <Button type="button" variant="outline" onClick={() => router.push(`/companies/${companyId}/warehouses/${warehouseId}/pares-inventory`)}>Cancel</Button>
          <Button type="submit">Update Product</Button>
          </div>
        </form>
      </CardContent>
    </Card>
    </main>
    </div>
  )
}
