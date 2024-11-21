'use client'

import { useState, useEffect } from 'react'
import { useAuth } from 'app/app/context/AuthContext'
import { useRouter } from 'next/navigation'
import { db } from 'app/services/firebase/firebase.config'
import { doc, getDoc } from 'firebase/firestore'
import { Card, CardContent, CardHeader, CardTitle } from "app/components/ui/card"

interface SavedInvoice {
  id: string
  customerName: string
  customerPhone: string
  totalSold: number
  createdAt: {
    toDate: () => Date
  }
  items: Array<{
    brand: string
    reference: string
    color: string
    size: string
    barcode: string
    salePrice: number
    sold: boolean
  }>
}

export default function SavedInvoicePage({ params }: { params: { storeId: string, id: string } }) {
  const { user } = useAuth()
  const router = useRouter()
  const [invoice, setInvoice] = useState<SavedInvoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      router.push('/login')
    } else {
      fetchInvoice()
    }
  }, [user, router])

  const fetchInvoice = async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      const invoiceRef = doc(db, 'stores', params.storeId, 'savedInvoices', params.id)
      const invoiceDoc = await getDoc(invoiceRef)
      if (invoiceDoc.exists()) {
        setInvoice({ id: invoiceDoc.id, ...invoiceDoc.data() } as SavedInvoice)
      } else {
        setError('Invoice not found')
      }
    } catch (err) {
      console.error('Error fetching invoice:', err)
      setError('Failed to fetch invoice. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="container mx-auto p-4">Loading...</div>
  }

  if (error || !invoice) {
    return <div className="container mx-auto p-4 text-red-500">{error || 'Invoice not found'}</div>
  }

  return (
    <div className="container mx-auto p-4">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Customer: {invoice.customerName}</p>
          <p>Phone: {invoice.customerPhone}</p>
          <p>Date: {invoice.createdAt.toDate().toLocaleString()}</p>
          <p>Total Sold: ${invoice.totalSold.toFixed(2)}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {invoice.items.map((item, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <p><strong>Brand:</strong> {item.brand}</p>
                  <p><strong>Reference:</strong> {item.reference}</p>
                  <p><strong>Color:</strong> {item.color}</p>
                  <p><strong>Size:</strong> {item.size}</p>
                  <p><strong>Barcode:</strong> {item.barcode}</p>
                  <p><strong>Sale Price:</strong> ${item.salePrice.toFixed(2)}</p>
                  <p><strong>Status:</strong> {item.sold ? 'Sold' : 'Not Sold'}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}