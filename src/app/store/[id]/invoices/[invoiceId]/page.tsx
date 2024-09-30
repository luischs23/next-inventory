'use client'

import { useState, useEffect } from 'react'
import { useAuth } from 'app/app/context/AuthContext'
import { useRouter } from 'next/navigation'
import { db } from 'app/services/firebase/firebase.config'
import { doc, getDoc, Timestamp } from 'firebase/firestore'
import { Card, CardContent, CardHeader, CardTitle } from "app/components/ui/card"
import { Button } from "app/components/ui/button"
import Link from 'next/link'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import Image from 'next/image'

interface InvoiceItem {
  brand: string
  reference: string
  color: string
  size: string
  barcode: string
  salePrice: number
  sold: boolean
  addedAt: Timestamp | Date
  exhibitionStore: string | null
  warehouseId: string | null
  isBox: boolean
  imageUrl: string 
}

interface Invoice {
  id: string
  storeId: string
  userId: string
  customerName: string
  customerPhone: string
  totalSold: number
  createdAt: Timestamp | Date
  items: InvoiceItem[]
}

export default function InvoicePage({ params }: { params: { id: string, invoiceId: string } }) {
  const { user } = useAuth()
  const router = useRouter()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [storeName, setStoreName] = useState<string>('')

  const formatPrice = (price: number): string => {
    return price.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  }

  useEffect(() => { 
    if (!user) {
      router.push('/login')
    } else {
      fetchInvoice()
    }
  }, [user, router])

  const fetchInvoice = async () => {
    if (!user) return

    const storeRef = doc(db, 'stores', params.id)
    const storeDoc = await getDoc(storeRef)
    if (storeDoc.exists()) {
      setStoreName(storeDoc.data().name)

      const invoiceRef = doc(storeRef, 'invoices', params.invoiceId)
      const invoiceDoc = await getDoc(invoiceRef)
      if (invoiceDoc.exists()) {
        const data = invoiceDoc.data() as Invoice
        setInvoice({
          ...data,
          id: invoiceDoc.id,
        })
      }
    }
  }

  const formatDate = (date: Timestamp | Date) => {
    if (date instanceof Timestamp) {
      date = date.toDate()
    }
    return new Date(date).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
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
    pdf.text(`Total: $${formatPrice(invoice.totalSold)}`, 20, yOffset)
    yOffset += 20

    // Add item table
    const columns = ['Brand', 'Reference', 'Color', 'Size', 'Price', 'Added At']
    const data = invoice.items.map(item => [
      item.brand,
      item.reference,
      item.color,
      item.size,
      `$${formatPrice(item.salePrice)}`,
      formatDate(item.addedAt)
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
          <CardTitle className="text-2xl font-bold">Invoice for {invoice.customerName}</CardTitle>
          <div className="text-sm text-gray-500">
            Date: {formatDate(invoice.createdAt)}
          </div>
        </CardHeader>
        <CardContent>
          <p className="mb-2">Store: {storeName}</p>
          <p className="mb-2">Customer Phone: {invoice.customerPhone}</p>
          <p className="mb-2 text-lg font-semibold">Total Sold: ${formatPrice(invoice.totalSold)}</p>
          <div className="flex space-x-4 mt-4">
            <Button onClick={exportToPDF}>Export to PDF</Button>
            <Link href={`/store/${params.id}/invoices`}>
              <Button variant="outline">Back to Invoice List</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle>Invoice Items</CardTitle>
          <span className="text-sm text-gray-500">({invoice.items.length} items)</span>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {invoice.items.map((item, index) => (
              <div key={index} className="flex items-start">
                <span className="text-sm font-semibold text-gray-500 mr-2 mt-1">{index + 1}</span>
                <Card className="w-full">
                <CardContent className="p-2 flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">{item.brand} - {item.reference}</h3>
                      <p>Color: {item.color}</p>
                      <p>Size: {item.size}</p>
                      <p>Barcode: {item.barcode}</p>
                      <p>Sale Price: ${formatPrice(item.salePrice)}</p>
                      <p className="text-sm text-gray-500">Added At: {formatDate(item.addedAt)}</p>
                    </div>
                    <div className="w-24 h-24 relative">
                      <Image
                        src={item.imageUrl || '/placeholder.svg'}
                        alt={`${item.brand} - ${item.reference}`}
                        fill
                        className="object-cover rounded-md"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}