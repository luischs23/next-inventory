'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { db } from 'app/services/firebase/firebase.config'
import { collection, doc, getDoc, updateDoc, setDoc, deleteDoc, getDocs, serverTimestamp, Timestamp, query, where, orderBy, limit} from 'firebase/firestore'
import { Button } from "app/components/ui/button"
import { Input } from "app/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "app/components/ui/card"
import ProductCard from 'app/components/product-card-store'
import { Save, Search, Lock, Unlock , ArrowLeft, X, Loader2} from 'lucide-react'
import { useToast } from "app/components/ui/use-toast"
import { format } from 'date-fns'
import NewInvoiceSkeleton from 'app/components/skeletons/NewInvoiceSkeleton'
import { usePermissions } from 'app/hooks/usePermissions'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from 'app/components/ui/alert-dialog'
import { RadioGroup, RadioGroupItem } from "app/components/ui/radio-group"

interface Size {
  quantity: number
  barcodes: string[]
}

interface Product {
  id: string
  productId: string;
  brand: string
  reference: string
  color: string
  sizes: { [size: string]: Size }
  total: number
  imageUrl: string
  saleprice: number
  exhibition?: { [storeId: string]: { size: string, barcode: string } }
  baseprice: number
  comments: string
  gender: string
  createdAt: Timestamp 
  barcode: string
  total2: number
}

interface ProductWithBarcode extends Product {
  size: string
  barcode: string
  exhibitionStore?: string
  warehouseId: string
  isBox?: boolean
  quantity: number
}

interface InvoiceItem extends ProductWithBarcode {
  invoiceId: string
  salePrice: number
  sold: boolean
  addedAt: Timestamp | Date
  assignedUser?: string
  assignedUserName?: string
}

interface BoxItem extends Omit<InvoiceItem, 'size'> {
  comments: string
  gender: string
  baseprice: number
  size: string
  total: number
  assignedUser?: string
  assignedUserName?: string
}

export default function EditInvoicePage({
  params,
}: { params: { companyId: string; storeId: string; invoiceId: string } }) {
  const { toast } = useToast()
  const router = useRouter()
  const [invoice, setInvoice] = useState<(InvoiceItem | BoxItem)[]>([])
  const [totalSold, setTotalSold] = useState(0)
  const [, setStoreName] = useState<string>("")
  const [searchBarcode, setSearchBarcode] = useState("")
  const [searchedProduct, setSearchedProduct] = useState<ProductWithBarcode | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState("")
  const [stores, setStores] = useState<{ [id: string]: string }>({})
  const [warehouses, setWarehouses] = useState<{ [id: string]: string }>({})
  const [salePrices, setSalePrices] = useState<{ [key: string]: string }>({})
  const [enabledItems, setEnabledItems] = useState<{ [key: string]: boolean }>({})
  const [, setPreviousSalePrices] = useState<{ [key: string]: number }>({})
  const [storeIdentifier, setStoreIdentifier] = useState<string>("")
  const [lastInvoiceNumber, setLastInvoiceNumber] = useState<number>(0)
  const [invoiceCustomerName, setInvoiceCustomerName] = useState<string>("")
  const [totalEarn, setTotalEarn] = useState(0)
  const [loading, setLoading] = useState(true)
  const { hasPermission } = usePermissions()
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false)
  const [, setSelectedUser] = useState<string | null>(null)
  const [itemToAddToInvoice, setItemToAddToInvoice] = useState<ProductWithBarcode | null>(null)
  const [users, setUsers] = useState<{ [id: string]: { name: string; role: string } }>({})
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  const fetchInvoiceData = useCallback(async () => {
    const invoiceRef = collection(db, `companies/${params.companyId}/stores/${params.storeId}/invoices/temp/items`)
    const invoiceSnapshot = await getDocs(invoiceRef)
    const invoiceItems = invoiceSnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        ...data,
        invoiceId: doc.id,
        salePrice: Number(data.salePrice) || 0,
        sold: data.sold || false,
        addedAt: data.addedAt instanceof Timestamp ? data.addedAt.toDate() : data.addedAt || new Date(),
      } as InvoiceItem | BoxItem
    })

    // Sort the invoice items by addedAt in descending order
    const sortedInvoiceItems = invoiceItems.sort((a, b) => {
      const dateA = a.addedAt instanceof Date ? a.addedAt : a.addedAt.toDate()
      const dateB = b.addedAt instanceof Date ? b.addedAt : b.addedAt.toDate()
      return dateB.getTime() - dateA.getTime()
    })

    setInvoice(sortedInvoiceItems)
    calculateTotals(sortedInvoiceItems)
    initializeItemStates(sortedInvoiceItems)
  }, [params.companyId, params.storeId, toast])

  const fetchStoreIdentifier = useCallback(async () => {
    const storesRef = collection(db, `companies/${params.companyId}/stores`)
    const storesSnapshot = await getDocs(storesRef)
    const sortedStores = storesSnapshot.docs.sort((a, b) => a.id.localeCompare(b.id))
    const storeIndex = sortedStores.findIndex((doc) => doc.id === params.storeId)
    if (storeIndex !== -1) {
      setStoreIdentifier(String.fromCharCode(65 + storeIndex)) // A = 65, B = 66, etc.
    } else {
      setStoreIdentifier("A") // Default to 'A' if store not found
    }
  }, [params.companyId, params.storeId])

  const fetchLastInvoiceNumber = useCallback(async () => {
    const invoicesRef = collection(db, `companies/${params.companyId}/stores/${params.storeId}/invoices`)
    const q = query(invoicesRef, orderBy("invoiceNumber", "desc"), limit(1))
    const querySnapshot = await getDocs(q)
    if (!querySnapshot.empty) {
      const lastInvoice = querySnapshot.docs[0].data()
      setLastInvoiceNumber(lastInvoice.invoiceNumber || 0)
    }
  }, [params.companyId, params.storeId])

  const fetchUsers = useCallback(async () => {
    try {
      const usersRef = collection(db, `companies/${params.companyId}/users`)
      const usersSnapshot = await getDocs(usersRef)
      const usersData: { [id: string]: { name: string; role: string } } = {}

      usersSnapshot.forEach((doc) => {
        const userData = doc.data()
        usersData[doc.id] = { name: userData.name, role: userData.role }
      })

      setUsers(usersData)
    } catch (error) {
      console.error("Error fetching users:", error)
      toast({
        title: "Error",
        description: "Failed to fetch users. Please try again.",
        variant: "destructive",
      })
    }
  }, [params.companyId, toast])

  const calculateTotals = useCallback((items: (InvoiceItem | BoxItem)[]) => {
    const totalSold = items.reduce((sum, item) => {
      if (item.sold) {
        const quantity = item.isBox ? item.total2 : 1
        return sum + Number(item.salePrice) * quantity
      }
      return sum
    }, 0)

    const totalEarn = items.reduce((sum, item) => {
      if (item.sold) {
        const quantity = item.isBox ? item.total2 : 1
        return sum + (Number(item.salePrice) - Number(item.baseprice)) * quantity
      }
      return sum
    }, 0)

    setTotalSold(totalSold)
    setTotalEarn(totalEarn)
  }, [])

  const initializeItemStates = useCallback((items: (InvoiceItem | BoxItem)[]) => {
    const newSalePrices: { [key: string]: string } = {}
    const newEnabledItems: { [key: string]: boolean } = {}
    const newPreviousSalePrices: { [key: string]: number } = {}

    items.forEach((item) => {
      newSalePrices[item.invoiceId] = formatPrice(item.salePrice)
      newEnabledItems[item.invoiceId] = !item.sold
      newPreviousSalePrices[item.invoiceId] = item.salePrice
    })

    setSalePrices(newSalePrices)
    setEnabledItems(newEnabledItems)
    setPreviousSalePrices(newPreviousSalePrices)
  }, [])

  useEffect(() => {
    const initializePage = async () => {
      setLoading(true)
      try {
        await Promise.all([
          fetchInvoiceData(),
          fetchStores(),
          fetchWarehouses(),
          fetchStoreName(),
          fetchStoreIdentifier(),
          fetchLastInvoiceNumber(),
          fetchUsers(), // Add this line
        ])
      } catch (error) {
        console.error("Error initializing page:", error)
        toast({
          title: "Error",
          description: "Failed to load page data. Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    initializePage()
  }, [
    fetchInvoiceData,
    fetchStoreIdentifier,
    fetchLastInvoiceNumber,
    fetchUsers,
    params.companyId,
    params.storeId,
    toast,
  ])

  useEffect(() => {
    const fetchInvoiceDetails = async () => {
      try {
        const invoiceRef = doc(db, `companies/${params.companyId}/stores/${params.storeId}/invoices`, params.invoiceId)
        const invoiceDoc = await getDoc(invoiceRef)
        if (invoiceDoc.exists()) {
          const invoiceData = invoiceDoc.data()
          setInvoiceCustomerName(invoiceData.customerName || "Unknown Customer")
        }
      } catch (error) {
        console.error("Error fetching invoice details:", error)
        toast({
          title: "Error",
          description: "Failed to fetch invoice details. Please try again.",
          variant: "destructive",
        })
      }
    }

    fetchInvoiceDetails()
  }, [params.companyId, params.storeId, params.invoiceId, toast])

  const fetchStoreName = async () => {
    try {
      const storeRef = doc(db, `companies/${params.companyId}/stores`, params.storeId)
      const storeDoc = await getDoc(storeRef)
      if (storeDoc.exists()) {
        setStoreName(storeDoc.data().name)
      }
    } catch (error) {
      console.error("Error fetching store name:", error)
      toast({
        title: "Error",
        description: "Failed to fetch store name. Please try again.",
        variant: "destructive",
      })
    }
  }

  const generateInvoiceNumber = () => {
    const now = new Date()
    const year = now.getFullYear().toString().slice(-2)
    const month = (now.getMonth() + 1).toString().padStart(2, "0")
    const day = now.getDate().toString().padStart(2, "0")
    const nextNumber = lastInvoiceNumber === 999 ? "000" : (lastInvoiceNumber + 1).toString().padStart(3, "0")
    return `${year}${month}${day}${storeIdentifier}${nextNumber}`
  }

  const formatCustomerName = (name: string | undefined) => {
    if (!name) return ""
    const nameParts = name.split(" ")
    if (nameParts.length === 1) return nameParts[0]
    return `${nameParts[0]} ${nameParts[1].charAt(0)}`
  }

  const toggleItemEnabled = (invoiceId: string) => {
    setEnabledItems((prev) => ({
      ...prev,
      [invoiceId]: !prev[invoiceId],
    }))
  }

  const formatPrice = (price: number): string => {
    return price === 0 ? "" : price.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  }

  const parsePrice = (price: string): number => {
    return price === "" ? 0 : Number.parseInt(price.replace(/\./g, ""), 10)
  }

  const fetchStores = async () => {
    try {
      const storesSnapshot = await getDocs(collection(db, `companies/${params.companyId}/stores`))
      const storesData = storesSnapshot.docs.reduce(
        (acc, doc) => {
          acc[doc.id] = doc.data().name
          return acc
        },
        {} as { [id: string]: string },
      )
      setStores(storesData)
    } catch (error) {
      console.error("Error fetching stores:", error)
      toast({
        title: "Error",
        description: "Failed to fetch stores. Please try again.",
        variant: "destructive",
      })
    }
  }

  const fetchWarehouses = async () => {
    try {
      const warehousesSnapshot = await getDocs(collection(db, `companies/${params.companyId}/warehouses`))
      const warehousesData = warehousesSnapshot.docs.reduce(
        (acc, doc) => {
          acc[doc.id] = doc.data().name
          return acc
        },
        {} as { [id: string]: string },
      )
      setWarehouses(warehousesData)
    } catch (error) {
      console.error("Error fetching warehouses:", error)
      toast({
        title: "Error",
        description: "Failed to fetch warehouses. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleSearch = async () => {
    if (!searchBarcode) return

    setIsSearching(true)
    setSearchError("")
    let foundProduct: ProductWithBarcode | null = null

    try {
      // Search in all warehouses
      for (const warehouseId of Object.keys(warehouses)) {
        const productsRef = collection(db, `companies/${params.companyId}/warehouses/${warehouseId}/products`)
        const querySnapshot = await getDocs(productsRef)

        // Search in sizes
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
                isBox: false,
              }
              break
            }
          }
          // If not found in sizes, search in exhibition
          if (!foundProduct && productData.exhibition) {
            for (const [storeId, exhibitionData] of Object.entries(productData.exhibition)) {
              if (exhibitionData.barcode === searchBarcode) {
                foundProduct = {
                  ...productData,
                  id: doc.id,
                  size: exhibitionData.size,
                  barcode: exhibitionData.barcode,
                  quantity: 1, // Assuming exhibition items have a quantity of 1
                  warehouseId,
                  exhibitionStore: storeId,
                  isBox: false,
                }
                break
              }
            }
          }

          // If not found in regular inventory, search in boxes
          if (!foundProduct) {
            for (const warehouseId of Object.keys(warehouses)) {
              const boxesRef = collection(db, `companies/${params.companyId}/warehouses/${warehouseId}/products`)
              const boxesQuery = query(boxesRef, where("barcode", "==", searchBarcode))
              const boxesSnapshot = await getDocs(boxesQuery)

              if (!boxesSnapshot.empty) {
                const boxDoc = boxesSnapshot.docs[0]
                const boxData = boxDoc.data()
                foundProduct = {
                  ...boxData,
                  id: boxDoc.id,
                  barcode: boxData.barcode,
                  warehouseId: warehouseId,
                  total2: boxData.total2 || 0,
                  isBox: true,
                } as ProductWithBarcode
                break
              }
            }
          }
          if (foundProduct) break
        }
        if (foundProduct) break
      }
      if (foundProduct) {
        setSearchedProduct(foundProduct)
        setSearchError("")
      } else {
        setSearchedProduct(null)
        setSearchError("Non-existent product.")
      }
    } catch (error) {
      console.error("Error searching for product:", error)
      toast({
        title: "Error",
        description: "Failed to search for the product. Please try again.",
        variant: "destructive",
      })
      setSearchError("Error searching for product.")
    } finally {
      setIsSearching(false)
    }
  }

  const handleClean = () => {
    setSearchBarcode("")
    setSearchedProduct(null)
    setSearchError("")
  }

  const handleAddToInvoice = async (product: ProductWithBarcode) => {
    if (!selectedUserId) {
      toast({
        title: "Error",
        description: "Please select a user before adding to invoice.",
        variant: "destructive",
      })
      return
    }

    try {
      if (product.exhibitionStore) {
        // Handle exhibition item
        const productRef = doc(
          db,
          `companies/${params.companyId}/warehouses/${product.warehouseId}/products`,
          product.id,
        )
        const productDoc = await getDoc(productRef)
        if (productDoc.exists()) {
          const productData = productDoc.data() as Product
          const updatedExhibition = { ...productData.exhibition }
          delete updatedExhibition[product.exhibitionStore]
          await updateDoc(productRef, { exhibition: updatedExhibition })
        }
      } else if (product.isBox) {
        // Handle box item
        const boxRef = doc(db, `companies/${params.companyId}/warehouses/${product.warehouseId}/products`, product.id)
        const boxDoc = await getDoc(boxRef)
        if (boxDoc.exists()) {
          // Set total2 to zero
          await updateDoc(boxRef, { total2: 0 })
        } else {
          console.error("Box document does not exist:", product.id)
        }
      } else {
        // Handle regular inventory item
        const productRef = doc(
          db,
          `companies/${params.companyId}/warehouses/${product.warehouseId}/products`,
          product.id,
        )
        const productDoc = await getDoc(productRef)
        if (productDoc.exists()) {
          const productData = productDoc.data() as Product
          const updatedSizes = { ...productData.sizes }

          if (updatedSizes[product.size]) {
            updatedSizes[product.size] = {
              quantity: (updatedSizes[product.size].quantity || 1) - 1,
              barcodes: (updatedSizes[product.size].barcodes || []).filter((b) => b !== product.barcode),
            }

            // Remove the size if quantity becomes 0
            if (updatedSizes[product.size].quantity === 0) {
              delete updatedSizes[product.size]
            }
          }

          const newTotal = (productData.total || 0) - 1

          await updateDoc(productRef, {
            sizes: updatedSizes,
            total: newTotal,
          })
        }
      }

      const invoiceRef = doc(
        collection(db, `companies/${params.companyId}/stores/${params.storeId}/invoices/temp/items`),
      )

      const newInvoiceItem: InvoiceItem | BoxItem = {
        id: product.id,
        productId: product.productId || product.id,
        invoiceId: invoiceRef.id,
        brand: product.brand,
        reference: product.reference,
        color: product.color,
        size: product.isBox ? "N/A" : product.size,
        sizes: product.isBox ? {} : { [product.size]: { quantity: 1, barcodes: [product.barcode] } },
        total: product.isBox ? product.total : 1,
        barcode: product.barcode,
        imageUrl: product.imageUrl,
        saleprice: product.saleprice,
        salePrice: Number(product.saleprice),
        baseprice: Number(product.baseprice),
        comments: product.comments || "",
        gender: product.gender || "",
        createdAt: product.createdAt || serverTimestamp(),
        total2: product.isBox ? product.total2 : 1,
        sold: false,
        addedAt: serverTimestamp() as Timestamp,
        warehouseId: product.warehouseId,
        isBox: product.isBox || false,
        quantity: product.isBox ? product.total2 : 1,
        ...(product.exhibitionStore && { exhibitionStore: product.exhibitionStore }),
        ...(product.exhibition && { exhibition: product.exhibition }),
        assignedUser: selectedUserId,
        assignedUserName: users[selectedUserId]?.name || "Unknown User", // Added line
      }

      await setDoc(invoiceRef, newInvoiceItem)

      // Re-fetch invoice data to ensure all totals and states are up-to-date
      await fetchInvoiceData()

      setSearchedProduct(null)
      setSearchBarcode("")
      setSelectedUser(null)
      setSelectedUserId(null)
      setIsUserDialogOpen(false)

      toast({
        title: "Product Added",
        description: product.isBox
          ? "The box has been added to the invoice."
          : product.exhibitionStore
            ? "The exhibition product has been added to the invoice."
            : "The product has been added to the invoice.",
        duration: 1500,
        style: {
          background: "#4CAF50",
          color: "white",
          fontWeight: "bold",
        },
      })
    } catch (error) {
      console.error("Error adding product to invoice:", error)
      toast({
        title: "Error",
        description: "Failed to add product to invoice. Please try again.",
        duration: 1000,
        variant: "destructive",
      })
    }
  }

  const handleReturn = async (item: InvoiceItem | BoxItem) => {
    try {
      // Remove the item from the invoice
      await deleteDoc(
        doc(db, `companies/${params.companyId}/stores/${params.storeId}/invoices/temp/items`, item.invoiceId),
      )

      if (item.exhibitionStore) {
        // Handle returning exhibition item
        const productRef = doc(db, `companies/${params.companyId}/warehouses/${item.warehouseId}/products`, item.id)
        const productDoc = await getDoc(productRef)
        if (productDoc.exists()) {
          const productData = productDoc.data() as Product
          const updatedExhibition = {
            ...productData.exhibition,
            [item.exhibitionStore]: { size: item.size, barcode: item.barcode },
          }
          await updateDoc(productRef, { exhibition: updatedExhibition })
        }
      } else if (item.isBox) {
        // Handle returning box item
        const boxRef = doc(db, `companies/${params.companyId}/warehouses/${item.warehouseId}/products`, item.id)
        const boxData: Partial<BoxItem> = {
          brand: item.brand,
          reference: item.reference,
          color: item.color,
          barcode: item.barcode,
          total2: item.total2,
          imageUrl: item.imageUrl,
          saleprice: item.saleprice,
          warehouseId: item.warehouseId,
          comments: (item as BoxItem).comments,
          gender: (item as BoxItem).gender,
          baseprice: (item as BoxItem).baseprice,
          total: (item as BoxItem).total,
          sizes: item.sizes,
          isBox: item.isBox,
          exhibition: item.exhibition,
          createdAt: item.createdAt,
        }
        await setDoc(boxRef, boxData)
      } else {
        // Handle returning regular inventory item
        const productRef = doc(db, `companies/${params.companyId}/warehouses/${item.warehouseId}/products`, item.id)
        const productDoc = await getDoc(productRef)
        if (productDoc.exists()) {
          const productData = productDoc.data() as Product
          const updatedSizes = { ...productData.sizes }

          if (updatedSizes[item.size]) {
            updatedSizes[item.size] = {
              quantity: (updatedSizes[item.size].quantity || 0) + 1,
              barcodes: [...(updatedSizes[item.size].barcodes || []), item.barcode],
            }
          } else {
            updatedSizes[item.size] = {
              quantity: 1,
              barcodes: [item.barcode],
            }
          }

          const newTotal = (productData.total || 0) + 1

          await updateDoc(productRef, {
            sizes: updatedSizes,
            total: newTotal,
          })
        } else {
          console.error("Product not found:", item.id)
        }
      }

      // Update the local state
      setInvoice((prevInvoice) => {
        const updatedInvoice = prevInvoice.filter((i) => i.invoiceId !== item.invoiceId)
        return updatedInvoice
      })

      if (item.sold) {
        setTotalSold((prevTotal) => prevTotal - Number(item.salePrice))
      }

      toast({
        title: "Product Returned",
        description: item.exhibitionStore
          ? "The exhibition product has been returned to inventory."
          : "The product has been returned to inventory.",
        duration: 1500,
        style: {
          background: "#2196F3",
          color: "white",
          fontWeight: "bold",
        },
      })
    } catch (error) {
      console.error("Error returning product:", error)
      toast({
        title: "Error",
        description: "Failed to return the product. Please try again.",
        duration: 1000,
        variant: "destructive",
      })
    }
  }

  const handleSalePriceChange = (invoiceId: string, value: string) => {
    if (enabledItems[invoiceId]) {
      const numericValue = value.replace(/\D/g, "")
      const formattedValue = numericValue === "" ? "" : formatPrice(Number.parseInt(numericValue, 10))
      setSalePrices((prev) => ({ ...prev, [invoiceId]: formattedValue }))
    }
  }

  const handleSold = async (item: InvoiceItem | BoxItem) => {
    const newSalePrice = parsePrice(salePrices[item.invoiceId] || String(item.salePrice))
    if (isNaN(newSalePrice)) {
      toast({
        title: "Invalid Price",
        duration: 1000,
        description: "Please enter a valid price before marking as sold.",
        variant: "destructive",
      })
      return
    }
    try {
      const itemRef = doc(
        db,
        `companies/${params.companyId}/stores/${params.storeId}/invoices/temp/items`,
        item.invoiceId,
      )
      await updateDoc(itemRef, {
        sold: true,
        salePrice: newSalePrice,
        soldAt: serverTimestamp(),
      })

      await fetchInvoiceData()
      // Update local state
      setInvoice((prevInvoice) =>
        prevInvoice.map((i) => (i.invoiceId === item.invoiceId ? { ...i, sold: true, salePrice: newSalePrice } : i)),
      )

      // Recalculate totals
      calculateTotals(
        invoice.map((i) => (i.invoiceId === item.invoiceId ? { ...i, sold: true, salePrice: newSalePrice } : i)),
      )

      toast({
        title: "Success",
        description: "Item marked as sold successfully.",
        duration: 1500,
        style: {
          background: "#4CAF50",
          color: "white",
          fontWeight: "bold",
        },
      })
    } catch (error) {
      console.error("Error marking item as sold:", error)
      toast({
        title: "Error",
        description: "Failed to mark item as sold. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleSaveInvoice = async () => {
    if (invoice.length === 0) {
      toast({
        title: "Error",
        description: "Cannot save an empty invoice. Please add items before saving.",
        variant: "destructive",
      })
      return
    }

    // Check if all items are marked as sold
    const unsoldItems = invoice.filter((item) => !item.sold)
    if (unsoldItems.length > 0) {
      toast({
        title: "Error",
        description: "All products must be marked as sold before saving the invoice.",
        variant: "destructive",
      })
      return
    }

    try {
      const invoiceRef = doc(db, `companies/${params.companyId}/stores/${params.storeId}/invoices`, params.invoiceId)
      const invoiceNumber = generateInvoiceNumber()
      await updateDoc(invoiceRef, {
        invoiceNumber: lastInvoiceNumber + 1,
        invoiceId: invoiceNumber,
        totalSold: totalSold || 0,
        totalEarn: totalEarn || 0,
        updatedAt: serverTimestamp(),
        status: "closed",
        items: invoice.map((item) => {
          const quantity = item.isBox ? item.total2 : 1
          const earn = (Number(item.salePrice) - Number(item.baseprice)) * quantity
          return {
            productId: item.productId || item.id,
            brand: item.brand || "Unknown",
            reference: item.reference || "N/A",
            color: item.color || "N/A",
            size: item.size || "N/A",
            barcode: item.barcode || "N/A",
            salePrice: Number(item.salePrice) || 0,
            baseprice: Number(item.baseprice) || 0,
            earn: earn,
            sold: item.sold || false,
            addedAt: item.addedAt || serverTimestamp(),
            exhibitionStore: item.exhibitionStore || null,
            warehouseId: item.warehouseId || null,
            imageUrl: item.imageUrl || "",
            isBox: item.isBox || false,
            quantity: quantity,
            assignedUser: item.assignedUser || null,
            assignedUserName: item.assignedUser ? users[item.assignedUser]?.name || "Unknown User" : null, // Updated line
            ...(item.isBox
              ? {
                  comments: (item as BoxItem).comments || "",
                  gender: (item as BoxItem).gender || "",
                }
              : {}),
          }
        }),
      })

      // Delete the temporary invoice items
      const tempInvoiceRef = collection(
        db,
        `companies/${params.companyId}/stores/${params.storeId}/invoices/temp/items`,
      )
      const tempInvoiceSnapshot = await getDocs(tempInvoiceRef)
      const deletePromises = tempInvoiceSnapshot.docs.map((doc) => deleteDoc(doc.ref))
      await Promise.all(deletePromises)

      toast({
        title: "Success",
        description: `Invoice updated successfully.`,
        duration: 1000,
        style: {
          background: "#4CAF50",
          color: "white",
          fontWeight: "bold",
        },
      })
      // Navigate back to the invoice list
      router.push(`/companies/${params.companyId}/store/${params.storeId}/invoices`)
    } catch (error) {
      console.error("Error updating invoice:", error)
      toast({
        title: "Error",
        description: "Failed to update invoice. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleSendToUser = (product: ProductWithBarcode) => {
    setItemToAddToInvoice(product)
    setIsUserDialogOpen(true)
  }

  if (loading) {
    return <NewInvoiceSkeleton />
  }

  return (
    <div className="min-h-screen bg-blue-100">
      <header className="bg-teal-600 text-white p-3 flex items-center">
        <Button variant="ghost" className="text-white p-0 mr-2" onClick={() => router.back()}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-bold flex-grow">Invoice {formatCustomerName(invoiceCustomerName)}</h1>
        {hasPermission("ska") && (
        <Button onClick={handleSaveInvoice}>
          <Save className="h-4 w-4 mr-2" />
          Save
        </Button>
        )}
      </header>
      <main className="container mx-auto p-4 mb-16">
      {hasPermission("create") && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Search Product</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-2 mb-2">
              <div className="flex-grow">
                <Input
                  placeholder="Enter barcode"
                  value={searchBarcode}
                  onChange={(e) => setSearchBarcode(e.target.value)}
                  className={searchError ? "border-red-500" : ""}
                />
                {searchError && <p className="text-red-500 text-sm mt-1">{searchError}</p>}
              </div><Button onClick={handleSearch} disabled={isSearching}>
                {isSearching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4w-4 mr2" />}
                {isSearching ? "Searching..." : "Search"}
              </Button>
              <Button onClick={handleClean} variant="outline">
                <X className="h-4 w-4 mr-2" />
                Clean
              </Button>
            </div>
            {searchedProduct && (
              <div className="mt-4">
                <ProductCard product={searchedProduct} />
                <div className="flex space-x-2 mt-2">
                  <Button onClick={() => handleSendToUser(searchedProduct)}>Send</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        )}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Invoice</CardTitle>
            <div className="text-sm flex text-gray-500">
              <p>Items: {invoice.length}</p>{hasPermission("ska") && (<><p> | Total Sold: ${formatPrice(totalSold)}</p></>)}{hasPermission("create") && (<><p> | Earn Total: ${formatPrice(totalEarn)}</p></>)}<p> |
              Date: {format(new Date(), "dd-MM-yyyy")}</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {invoice.map((item, index) => (
                <div key={item.invoiceId} className="space-y-2">
                  <div className="flex">
                    <span className="text-sm font-normal text-gray-600 pt-1 pr-1">{invoice.length - index}</span>
                    <ProductCard product={item} />
                  </div>
                  <div className="flex space-x-1 pl-3">
                    {item.exhibitionStore && (
                      <div className="text-sm text-gray-500">Exb: {stores[item.exhibitionStore]}</div>
                    )}
                    {!item.exhibitionStore && item.warehouseId && (
                      <div className="text-sm text-gray-500">WH: {warehouses[item.warehouseId]}</div>
                    )}
                    {hasPermission("create") && (
                    <div className="text-sm text-gray-500">
                      | Earn unit: ${formatPrice(Number(item.salePrice) - Number(item.baseprice))}
                    </div>
                    )}
                    <div className="text-sm text-gray-500">
                    | Assigned to:{" "}
                            {item.assignedUserName
                              ? `${item.assignedUserName.split(" ")[0]} ${item.assignedUserName.split(" ")[1]?.charAt(0) || ""}`
                              : "Not assigned"}
                  </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {hasPermission("create") && (
                    <Button onClick={() => handleReturn(item)}>Return</Button>)}
                    {hasPermission("ska") && (<>
                    <Input
                      value={salePrices[item.invoiceId] ?? formatPrice(item.salePrice)}
                      onChange={(e) => handleSalePriceChange(item.invoiceId, e.target.value)}
                      disabled={!enabledItems[item.invoiceId]}
                      className="w-24"
                    />
                    <Button onClick={() => toggleItemEnabled(item.invoiceId)} variant="outline" size="icon">
                      {!enabledItems[item.invoiceId] ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                    </Button>
                    <Button onClick={() => handleSold(item)} disabled={!enabledItems[item.invoiceId]}>
                      Sold
                    </Button>
                    </>)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
      <AlertDialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Select User</AlertDialogTitle>
            <AlertDialogDescription>Choose a user to assign this product to:</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
          <RadioGroup value={selectedUserId || ""} onValueChange={setSelectedUserId}>
              {Object.entries(users)
                .filter(([, userData]) => userData.role !== "customer")
                .map(([userId, userData]) => (
                  <div key={userId} className="flex items-center space-x-2 mb-2">
                    <RadioGroupItem value={userId} id={userId} />
                    <label htmlFor={userId}>
                      {userData.name} ({userData.role})
                    </label>
                  </div>
                ))}
            </RadioGroup>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsUserDialogOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => itemToAddToInvoice && handleAddToInvoice(itemToAddToInvoice)}
              disabled={!selectedUserId}
            >
              Add to Invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}