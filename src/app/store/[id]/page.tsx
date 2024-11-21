'use client'

import { useState, useEffect } from 'react'
import { useAuth } from 'app/app/context/AuthContext'
import { useRouter } from 'next/navigation'
import { db } from 'app/services/firebase/firebase.config'
import { collection, doc, getDoc, updateDoc, setDoc, deleteDoc, getDocs, addDoc, serverTimestamp, Timestamp, query, where } from 'firebase/firestore'
import { Button } from "app/components/ui/button"
import { Input } from "app/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "app/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "app/components/ui/dropdown-menu"
import ProductCard from 'app/components/product-card-store'
import { MoreVertical, Save, Search } from 'lucide-react'
import { useToast } from "app/components/ui/use-toast"

interface Size {
  quantity: number
  barcodes: string[]
}

interface Product {
  id: string
  brand: string
  reference: string
  color: string
  sizes: { [size: string]: Size }
  total: number
  imageUrl: string
  saleprice: number
  exhibition?: { [storeId: string]: { size: string, barcode: string } }
}

interface ProductWithBarcode extends Product {
  size: string
  barcode: string
  exhibitionStore?: string
  warehouseId: string
  quantity: number
  isBox?: boolean
  comments?: string
  gender?: string
  baseprice?: number
}

interface InvoiceItem extends ProductWithBarcode {
  invoiceId: string
  salePrice: number
  sold: boolean
  addedAt: Timestamp | Date
}

interface BoxItem extends Omit<InvoiceItem, 'size'> {
  comments: string
  gender: string
  baseprice: number
  size: string
}

interface Store {
  name: string
}

export default function StorePage({ params }: { params: { id: string } }) {
  const { toast } = useToast()
  const { user } = useAuth()
  const router = useRouter()
  const [invoice, setInvoice] = useState<(InvoiceItem | BoxItem)[]>([])
  const [totalSold, setTotalSold] = useState(0)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [storeName, setStoreName] = useState<string>('')
  const [searchBarcode, setSearchBarcode] = useState('')
  const [searchedProduct, setSearchedProduct] = useState<ProductWithBarcode | null>(null)
  const [stores, setStores] = useState<{[id: string]: string}>({})
  const [warehouses, setWarehouses] = useState<{[id: string]: string}>({})

  useEffect(() => {
    if (!user) {
      router.push('/login')
    } else {
      fetchStoreAndInvoiceItems()
      fetchStores()
      fetchWarehouses()
    }
  }, [user, router])

  const fetchStores = async () => {
    const storesSnapshot = await getDocs(collection(db, 'stores'))
    const storesData = storesSnapshot.docs.reduce((acc, doc) => {
      acc[doc.id] = doc.data().name
      return acc
    }, {} as {[id: string]: string})
    setStores(storesData)
  }

  const fetchWarehouses = async () => {
    const warehousesSnapshot = await getDocs(collection(db, 'warehouses'))
    const warehousesData = warehousesSnapshot.docs.reduce((acc, doc) => {
      acc[doc.id] = doc.data().name
      return acc
    }, {} as {[id: string]: string})
    setWarehouses(warehousesData)
  }

  const fetchStoreAndInvoiceItems = async () => {
    if (!user) return

    const storeRef = doc(db, 'stores', params.id)
    const storeDoc = await getDoc(storeRef)
    if (storeDoc.exists()) {
      const storeData = storeDoc.data() as Store
      setStoreName(storeData.name)
    }

    const invoiceRef = collection(db, 'stores', params.id, 'invoices', user.uid, 'items')
    const invoiceSnapshot = await getDocs(invoiceRef)
    const invoiceItems = invoiceSnapshot.docs.map(doc => {
      const data = doc.data()
      if ('comments' in data && 'gender' in data && 'baseprice' in data) {
        return {
          ...data,
          invoiceId: doc.id,
          salePrice: Number(data.salePrice) || 0,
          sold: data.sold || false,
          addedAt: data.addedAt instanceof Timestamp ? data.addedAt.toDate() : data.addedAt || new Date(),
          baseprice: Number(data.baseprice)
        } as BoxItem
      } else {
        return {
          ...data,
          invoiceId: doc.id,
          salePrice: Number(data.salePrice) || 0,
          sold: data.sold || false,
          addedAt: data.addedAt instanceof Timestamp ? data.addedAt.toDate() : data.addedAt || new Date()
        } as InvoiceItem
      }
    })
    setInvoice(invoiceItems)
    calculateTotalSold(invoiceItems)
  }

  const calculateTotalSold = (items: (InvoiceItem | BoxItem)[]) => {
    const total = items.reduce((sum, item) => sum + (item.sold ? Number(item.salePrice) : 0), 0)
    setTotalSold(total)
  }

  const handleSearch = async () => {
    if (!searchBarcode) return

    let foundProduct: ProductWithBarcode | null = null

    // Search in all warehouses
    for (const warehouseId of Object.keys(warehouses)) {
      const productsRef = collection(db, 'warehouses', warehouseId, 'products')
      const querySnapshot = await getDocs(productsRef)

      for (const doc of querySnapshot.docs) {
        const productData = doc.data() as Product
        for (const [size, sizeData] of Object.entries(productData.sizes)) {
          if (sizeData.barcodes.includes(searchBarcode)) {
            foundProduct = {
              ...productData,
              id: doc.id,
              size,
              barcode: searchBarcode,
              quantity: sizeData.quantity,
              warehouseId,
              isBox: false
            }
            break
          }
        }
        if (foundProduct) break
      }
      if (foundProduct) break
    }

    // If not found in regular inventory, search in boxes
    if (!foundProduct) {
      for (const warehouseId of Object.keys(warehouses)) {
        const boxesRef = collection(db, `warehouses/${warehouseId}/boxes`)
        const boxesQuery = query(boxesRef, where('barcode', '==', searchBarcode))
        const boxesSnapshot = await getDocs(boxesQuery)

        if (!boxesSnapshot.empty) {
          const boxDoc = boxesSnapshot.docs[0]
          const boxData = boxDoc.data()
          foundProduct = {
            ...boxData,
            id: boxDoc.id,
            barcode: boxData.barcode,
            warehouseId: warehouseId,
            quantity: boxData.quantity || 0,
            isBox: true
          } as ProductWithBarcode
          break
        }
      }
    }

    setSearchedProduct(foundProduct)
  }

  const handleAddToInvoice = async (product: ProductWithBarcode) => {
    if (!user) return

    if (product.exhibitionStore) {
      await deleteDoc(doc(db, 'exhibition', product.exhibitionStore, 'products', product.id))

      const productRef = doc(db, 'products', product.id)
      const productDoc = await getDoc(productRef)
      if (productDoc.exists()) {
        const productData = productDoc.data() as Product
        const updatedExhibition = { ...productData.exhibition }
        delete updatedExhibition[product.exhibitionStore]
        await updateDoc(productRef, { exhibition: updatedExhibition })
      }
    } else if (product.warehouseId) {
      const boxRef = doc(db, `warehouses/${product.warehouseId}/boxes`, product.id)
      await deleteDoc(boxRef)
    } else {
      const productRef = doc(db, 'products', product.id)
      const productDoc = await getDoc(productRef)
      if (productDoc.exists()) {
        const productData = productDoc.data() as Product
        const newBarcodes = productData.sizes[product.size].barcodes.filter(b => b !== product.barcode)
        const newQuantity = productData.sizes[product.size].quantity - 1
        const newTotal = productData.total - 1

        const updatedSizes = { ...productData.sizes }
        if (newQuantity === 0 && newBarcodes.length === 0) {
          delete updatedSizes[product.size]
        } else {
          updatedSizes[product.size] = {
            quantity: newQuantity,
            barcodes: newBarcodes
          }
        }

        await updateDoc(productRef, {
          sizes: updatedSizes,
          total: newTotal
        })
      }
    }

    const invoiceRef = doc(collection(db, 'stores', params.id, 'invoices', user.uid, 'items'))
    const newInvoiceItem: InvoiceItem | BoxItem = product.isBox
        ? {
            ...product,
            invoiceId: invoiceRef.id,
            salePrice: Number(product.saleprice),
            sold: false,
            addedAt: serverTimestamp() as Timestamp,
            comments: product.comments || '',
            gender: product.gender || '',
            baseprice: product.baseprice || 0
          }
        : {
            ...product,
            invoiceId: invoiceRef.id,
            salePrice: Number(product.saleprice),
            sold: false,
            addedAt: serverTimestamp() as Timestamp
          }
    await setDoc(invoiceRef, newInvoiceItem)

    setInvoice(prevInvoice => [...prevInvoice, {...newInvoiceItem, addedAt: new Date()}])
    setSearchedProduct(null)
    setSearchBarcode('')

    toast({
      title: "Product Added",
      description: "The product has been added to the invoice.",
      duration: 3000,
      style: {
        background: "#4CAF50",
        color: "white",
        fontWeight: "bold",
      },
    })
  }

  const handleReturn = async (item: InvoiceItem | BoxItem) => {
    if (!user) return

    await deleteDoc(doc(db, 'stores', params.id, 'invoices', user.uid, 'items', item.invoiceId))

    if (item.exhibitionStore) {
      const exhibitionRef = doc(collection(db, 'exhibition', item.exhibitionStore, 'products'))
      await setDoc(exhibitionRef, {
        ...item,
        exhibitionSize: item.size,
        exhibitionBarcode: item.barcode
      })

      const productRef = doc(db, 'products', item.id)
      const productDoc = await getDoc(productRef)
      if (productDoc.exists()) {
        const productData = productDoc.data() as Product
        const updatedExhibition = { 
          ...productData.exhibition,
          [item.exhibitionStore]: { size: item.size, barcode: item.barcode }
        }
        await updateDoc(productRef, { exhibition: updatedExhibition })
      }
    } else if (item.warehouseId) {
      const boxRef = doc(db, `warehouses/${item.warehouseId}/boxes`, item.id)
      const boxData: Partial<BoxItem> = {
        brand: item.brand,
        reference: item.reference,
        color: item.color,
        barcode: item.barcode,
        quantity: item.quantity,
        imageUrl: item.imageUrl,
        saleprice: item.saleprice,
        warehouseId: item.warehouseId,
      }
      // Include BoxItem-specific properties if they exist
      if ('comments' in item) boxData.comments = item.comments
      if ('gender' in item) boxData.gender = item.gender
      if ('baseprice' in item) boxData.baseprice = item.baseprice

      await setDoc(boxRef, boxData)
    } else {
      const productRef = doc(db, 'products', item.id)
      const productDoc = await getDoc(productRef)
      if (productDoc.exists()) {
        const productData = productDoc.data() as Product
        const updatedSizes = { ...productData.sizes }
        if (updatedSizes[item.size]) {
          updatedSizes[item.size] = {
            quantity: (updatedSizes[item.size].quantity || 0) + 1,
            barcodes: [...(updatedSizes[item.size].barcodes || []), item.barcode]
          }
        } else {
          updatedSizes[item.size] = {
            quantity: 1,
            barcodes: [item.barcode]
          }
        }
        const newTotal = (productData.total || 0) + 1
        await updateDoc(productRef, {
          sizes: updatedSizes,
          total: newTotal
        })
      }
    }

    setInvoice(prevInvoice => prevInvoice.filter(i => i.invoiceId !== item.invoiceId))
    if (item.sold) {
      setTotalSold(prevTotal => prevTotal - Number(item.salePrice))
    }

    toast({
      title: "Product Returned",
      description: "The product has been returned to inventory.",
      duration: 3000,
      style: {
        background: "#2196F3",
        color: "white",
        fontWeight: "bold",
      },
    })
  }

  const handleSalePriceChange = (invoiceId: string, price: number) => {
    setInvoice(prevInvoice => 
      prevInvoice.map(item => 
        item.invoiceId === invoiceId ? { ...item, salePrice: Number(price) } : item
      )
    )
  }

  const handleSold = async (item: InvoiceItem | BoxItem) => {
    if (!user) return

    const updatedItem = { ...item, sold: true }
    await updateDoc(doc(db, 'stores', params.id, 'invoices', user.uid, 'items', item.invoiceId), updatedItem)

    const productRef = doc(db, 'products', item.id)
    const productDoc = await getDoc(productRef)
    if (productDoc.exists()) {
      const productData = productDoc.data() as Product
      const updatedExhibition = { ...productData.exhibition }
      if (item.exhibitionStore) {
        delete updatedExhibition[item.exhibitionStore]
      }

      await updateDoc(productRef, {
        exhibition: updatedExhibition,
        total: productData.total - 1
      })
    }

    setInvoice(prevInvoice => 
      prevInvoice.map(i => 
        i.invoiceId === item.invoiceId ? updatedItem : i
      )
    )

    setTotalSold(prevTotal => prevTotal + Number(item.salePrice))

    toast({
      title: "Product Sold",
      description: "The product has been marked as sold.",
    })
  }

  const handleSaveInvoice = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "User not authenticated. Please log in and try again.",
        variant: "destructive",
      })
      return
    }

    if (invoice.length === 0) {
      toast({
        title: "Error",
        description: "Cannot save an empty invoice. Please add items before saving.",
        variant: "destructive",
      })
      return
    }

    try {
      const savedInvoiceRef = collection(db, 'savedInvoices')
      const savedInvoiceDoc = await addDoc(savedInvoiceRef, {
        storeId: params.id,
        userId: user.uid,
        customerName: customerName || "Unknown",
        customerPhone: customerPhone || "N/A",
        totalSold: totalSold || 0,
        createdAt: serverTimestamp(),
        items: invoice.map(item => ({
          brand: item.brand || "Unknown",
          reference: item.reference || "N/A",
          color: item.color || "N/A",
          size: item.size || "N/A",
          barcode: item.barcode || "N/A",
          salePrice: Number(item.salePrice) || 0,
          sold: item.sold || false,
          addedAt: item.addedAt || serverTimestamp(),
          exhibitionStore: item.exhibitionStore || null,
          warehouseId: item.warehouseId || null,
          isBox: 'comments' in item
        }))
      })

      setInvoice([])
      setTotalSold(0)
      setCustomerName('')
      setCustomerPhone('')

      const invoiceRef = collection(db, 'stores', params.id, 'invoices', user.uid, 'items')
      const invoiceSnapshot = await getDocs(invoiceRef)
      const deletePromises = invoiceSnapshot.docs.map(doc => deleteDoc(doc.ref))
      await Promise.all(deletePromises)

      toast({
        title: "Success",
        description: "Invoice saved successfully.",
      })

      router.push(`/saved-invoice/${savedInvoiceDoc.id}`)
    } catch (error) {
      console.error("Error saving invoice:", error)
      toast({
        title: "Error",
        description: "Failed to save invoice. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="container mx-auto p-4">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>{storeName}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <Input
              placeholder="Enter barcode"
              value={searchBarcode}
              onChange={(e) => setSearchBarcode(e.target.value)}
            />
            <Button onClick={handleSearch}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
          {searchedProduct && (
            <div className="mt-4">
              <ProductCard product={searchedProduct} />
              <Button onClick={() => handleAddToInvoice(searchedProduct)} className="mt-2">
                Add to Invoice
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Customer Information</CardTitle>
        </CardHeader>
        <CardContent className="flex space-x-4">
          <Input
            placeholder="Name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
          <Input
            placeholder="Phone"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline"><MoreVertical className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={handleSaveInvoice}>
                <Save className="mr-2 h-4 w-4" />
                <span>Save Invoice</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoice</CardTitle>
          <div className="text-sm text-gray-500">
            Items: {invoice.length} | Total Sold: ${totalSold.toFixed(2)} | Date: {new Date().toLocaleString()}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {invoice.map((item) => (
              <div key={item.invoiceId} className="space-y-2">
                <ProductCard product={item} />
                <div className="flex items-center space-x-2">
                  <Button onClick={() => handleReturn(item)}>Return</Button>
                  <Input
                    type="number"
                    value={item.salePrice}
                    onChange={(e) => handleSalePriceChange(item.invoiceId, parseFloat(e.target.value))}
                    disabled={item.sold}
                    className="w-24"
                  />
                  <Button onClick={() => handleSold(item)} disabled={item.sold}>Sold</Button>
                  <span className="ml-auto">${Number(item.salePrice).toFixed(2)}</span>
                </div>
                {item.exhibitionStore && (
                  <div className="text-sm text-gray-500">
                    Exhibition: {stores[item.exhibitionStore]}
                  </div>
                )}
                {item.warehouseId && (
                  <div className="text-sm text-gray-500">
                    Warehouse: {warehouses[item.warehouseId]}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}