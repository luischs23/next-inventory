'use client'

import { useState } from 'react'
import { useAuth } from 'app/app/context/AuthContext'
import { useRouter } from 'next/navigation'
import { db } from 'app/services/firebase/firebase.config'
import { collection, getDocs, Timestamp } from 'firebase/firestore'
import { Button } from "app/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "app/components/ui/card"
import { Input } from "app/components/ui/input"
import Link from 'next/link'
import { toast } from "app/components/ui/use-toast"

interface InvoiceItem {
    productId: string
    brand: string
    reference: string
    color: string
    size: string
    barcode: string
    salePrice: number
    baseprice: number
    earn: number
    sold: boolean
    addedAt: Timestamp
    exhibitionStore: string | null
    warehouseId: string | null
    imageUrl: string
    isBox: boolean
    quantity: number
  }
  
  interface Invoice {
    id: string
    storeId: string
    customerName: string
    customerPhone: string
    createdAt: Timestamp
    totalSold: number
    totalEarn: number
    items: InvoiceItem[]
  }

export default function ChangesPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [searchBarcode, setSearchBarcode] = useState('')
  const [searchedInvoice, setSearchedInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSearch = async () => {
    if (!user || !searchBarcode) return

    setLoading(true)
    setSearchedInvoice(null)

    try {
      const storesRef = collection(db, 'stores')
      const storesSnapshot = await getDocs(storesRef)

      for (const storeDoc of storesSnapshot.docs) {
        const storeId = storeDoc.id
        const invoicesRef = collection(db, 'stores', storeId, 'invoices')
        const invoicesSnapshot = await getDocs(invoicesRef)

        for (const invoiceDoc of invoicesSnapshot.docs) {
          const invoiceData = invoiceDoc.data() as Invoice
          const matchingItem = invoiceData.items.find(item => item.barcode === searchBarcode)

          if (matchingItem) {
            setSearchedInvoice({
              ...invoiceData,
              id: invoiceDoc.id,
              storeId: storeId
            })
            setLoading(false)
            return
          }
        }
      }

      toast({
        title: "Not Found",
        description: "No invoice found with the given barcode.",
        variant: "destructive",
      })
    } catch (err) {
      console.error('Error searching for invoice:', err)
      toast({
        title: "Error",
        description: "Failed to search for invoice. Please try again later.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (timestamp: Timestamp) => {
    const date = timestamp.toDate()
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  }

  const formatPrice = (price: number) => {
    return price.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Search Invoice by Barcode</h1>
      <div className="flex mb-4">
        <Input
          type="text"
          value={searchBarcode}
          onChange={(e) => setSearchBarcode(e.target.value)}
          placeholder="Enter barcode"
          className="mr-2"
        />
        <Button onClick={handleSearch} disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </Button>
      </div>

      {searchedInvoice && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>{searchedInvoice.customerName}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700">Phone: {searchedInvoice.customerPhone}</p>
            <p className="text-sm text-gray-500">Date: {formatDate(searchedInvoice.createdAt)}</p>
            <p className="mt-2">Total: ${formatPrice(searchedInvoice.totalSold)}</p>
            <p className="mt-2">Total Earn: ${formatPrice(searchedInvoice.totalEarn)}</p>
            <Link href={`/store/${searchedInvoice.storeId}/invoices/${searchedInvoice.id}`}>
              <Button className="mt-4">Update Invoice</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}