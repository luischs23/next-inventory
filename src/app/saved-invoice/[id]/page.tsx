'use client'

import { useState, useEffect } from 'react'
import { useAuth } from 'app/app/context/AuthContext'
import { useRouter } from 'next/navigation'
import { db } from 'app/services/firebase/firebase.config'
import { doc, getDoc, Timestamp } from 'firebase/firestore'
import { Card, CardContent, CardHeader, CardTitle } from "app/components/ui/card"
import { Button } from "app/components/ui/button"
import jsPDF from 'jspdf'
import 'jspdf-autotable'

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
    const [storeName, setStoreName] = useState<string>('')
  
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
      // Fetch store name
      const storeRef = doc(db, 'stores', data.storeId)
      const storeDoc = await getDoc(storeRef)
      if (storeDoc.exists()) {
        setStoreName(storeDoc.data().name)
      }
      }
    }
  
    const formatDate = (date: Timestamp | Date) => {
      if (date instanceof Timestamp) {
        return date.toDate().toLocaleDateString()
      }
      return new Date(date).toLocaleDateString()
    }
  
    const exportToPDF = () => {
      if (!invoice) return
  
      const pdf = new jsPDF()
      let yOffset = 20
  
      // Add invoice header
      pdf.setFontSize(20)
      pdf.text(`Invoice for ${invoice.customerName}`, 20, yOffset)
      yOffset += 10
  
      pdf.setFontSize(12)
      pdf.text(`Date: ${formatDate(invoice.createdAt)}`, 20, yOffset)
      yOffset += 10
      pdf.text(`Phone: ${invoice.customerPhone}`, 20, yOffset)
      yOffset += 10
      pdf.text(`Total: $${invoice.totalSold.toFixed(2)}`, 20, yOffset)
      yOffset += 20
  
      // Add item table
      const columns = ['Brand', 'Reference', 'Color', 'Size', 'Price']
      const data = invoice.items.map(item => [
        item.brand,
        item.reference,
        item.color,
        item.size,
        `$${item.salePrice.toFixed(2)}`
      ])
  
      pdf.autoTable({
        head: [columns],
        body: data,
        startY: yOffset,
        theme: 'grid'
      })
  
      // Save the PDF
      pdf.save(`Invoice_${invoice.customerName}_${formatDate(invoice.createdAt)}.pdf`)
    }
  
    if (!invoice) {
      return <div>Loading...</div>
    }
  
    return (
      <div className="container mx-auto p-4">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Invoice for {invoice.customerName}</CardTitle>
            <div className="text-sm text-gray-500">
              Date: {formatDate(invoice.createdAt)}
            </div>
          </CardHeader>
          <CardContent>
            <p>Store: {storeName}</p>
            <p>Customer Phone: {invoice.customerPhone}</p>
            <p>Total Sold: ${invoice.totalSold.toFixed(2)}</p>
            <Button className="mt-4" onClick={exportToPDF}>Export to PDF</Button>
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