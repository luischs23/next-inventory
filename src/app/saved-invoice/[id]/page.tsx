'use client'

import { useState, useEffect } from 'react'
import { useAuth } from 'app/app/context/AuthContext'
import { useRouter } from 'next/navigation'
import { db } from 'app/services/firebase/firebase.config'
import { doc, getDoc, Timestamp } from 'firebase/firestore'
import { Card, CardContent, CardHeader, CardTitle } from "app/components/ui/card"

interface SavedInvoiceItem {
  brand: string
  reference: string
  color: string
  size: string
  barcode: string
  salePrice: number
  sold: boolean
  addedAt: Timestamp | Date
}

interface SavedInvoice {
  id: string
  storeId: string
  userId: string
  customerName: string
  customerPhone: string
  totalSold: number
  createdAt: Timestamp | Date
  items: SavedInvoiceItem[]
}

export default function SavedInvoicePage({ params }: { params: { id: string } }) {
    const { user } = useAuth()
    const router = useRouter()
    const [invoice, setInvoice] = useState<SavedInvoice | null>(null)
  
    useEffect(() => {
      if (!user) {
        router.push('/login')
      } else {
        fetchSavedInvoice()
      }
    }, [user, router])
  
    const fetchSavedInvoice = async () => {
      if (!user) return
  
      const invoiceRef = doc(db, 'savedInvoices', params.id)
      const invoiceDoc = await getDoc(invoiceRef)
      if (invoiceDoc.exists()) {
        const data = invoiceDoc.data() as SavedInvoice
        setInvoice({
          ...data,
          id: invoiceDoc.id,
        })
      }
    }
  
    const formatDate = (date: Timestamp | Date) => {
        if (date instanceof Timestamp) {
          return date.toDate().toLocaleString()
        }
        return date.toLocaleString()
      }
    
      if (!invoice) {
        return <div>Loading...</div>
      }
    
      return (
        <div className="container mx-auto p-4">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Saved Invoice</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Store ID: {invoice.storeId}</p>
              <p>Customer Name: {invoice.customerName}</p>
              <p>Customer Phone: {invoice.customerPhone}</p>
              <p>Total Sold: ${invoice.totalSold.toFixed(2)}</p>
              <p>Created At: {formatDate(invoice.createdAt)}</p>
            </CardContent>
          </Card>
    
          <Card>
            <CardHeader>
              <CardTitle>Invoice Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {invoice.items.map((item, index) => (
                  <Card key={index} className="p-4">
                    <h3 className="text-lg font-semibold">{item.brand} - {item.reference}</h3>
                    <p>Color: {item.color}</p>
                    <p>Size: {item.size}</p>
                    <p>Barcode: {item.barcode}</p>
                    <p>Sale Price: ${item.salePrice.toFixed(2)}</p>
                    <p>Sold: {item.sold ? 'Yes' : 'No'}</p>
                    <p>Added At: {formatDate(item.addedAt)}</p>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }