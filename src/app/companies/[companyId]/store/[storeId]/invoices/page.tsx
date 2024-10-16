'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { db } from 'app/services/firebase/firebase.config'
import { collection, getDocs, doc, getDoc, Timestamp } from 'firebase/firestore'
import { Button } from "app/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "app/components/ui/card"
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface Invoice {
  id: string
  customerName: string
  createdAt: Timestamp
  totalSold: number
  customerPhone: string
}

interface Store { 
  name: string
}

export default function InvoiceListPage({ params }: { params: { companyId: string, storeId: string } }) {
  const router = useRouter()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [storeName, setStoreName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStoreAndInvoices()
  }, [params.companyId, params.storeId])

  const fetchStoreAndInvoices = async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch store name
      const storeRef = doc(db, `companies/${params.companyId}/stores`, params.storeId)
      const storeDoc = await getDoc(storeRef)
      if (storeDoc.exists()) {
        const storeData = storeDoc.data() as Store
        setStoreName(storeData.name)
      }

      // Fetch invoices
      const invoicesRef = collection(db, `companies/${params.companyId}/stores/${params.storeId}/invoices`)
      const querySnapshot = await getDocs(invoicesRef)
      const invoiceList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Invoice))
      setInvoices(invoiceList)
    } catch (err) {
      console.error('Error fetching store and invoices:', err)
      setError('Failed to fetch store and invoices. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (timestamp: Timestamp) => {
    const date = timestamp.toDate()
    return date.toLocaleDateString()
  }

  const formatPrice = (price: number): string => {
    return price.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  }

  if (loading) {
    return <div className="min-h-screen bg-blue-100 flex items-center justify-center">Loading...</div>
  }

  if (error) {
    return <div className="min-h-screen bg-blue-100 flex items-center justify-center text-red-500">{error}</div>
  }

  return (
    <div className="min-h-screen bg-blue-100">
      <header className="bg-teal-600 text-white p-4 flex items-center">
        <Button variant="ghost" className="text-white p-0 mr-2" onClick={() => router.back()}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-bold flex-grow">Invoices for {storeName}</h1>
        <Link href={`/companies/${params.companyId}/store/${params.storeId}/new-invoice`}>
          <Button variant="secondary">+ New Invoice</Button>
        </Link>
      </header>
      <main className="container mx-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {invoices.map((invoice, index) => (
            <div key={invoice.id} className="relative">
              <span className="absolute top-0 left-0 -mt-2 -ml-2 bg-teal-600 text-white rounded-full w-8 h-8 flex items-center justify-center z-10">
                {index + 1}
              </span>
              <Card className="border-2 border-teal-600">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-teal-700">{invoice.customerName}</CardTitle>
                  <p className="text-sm text-gray-600">{invoice.customerPhone}</p>
                  <p className="text-sm text-gray-500">{formatDate(invoice.createdAt)}</p>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-bold text-teal-800">Total: ${formatPrice(invoice.totalSold)}</p>
                  <Link href={`/companies/${params.companyId}/store/${params.storeId}/invoices/${invoice.id}`}>
                    <Button className="mt-2 w-full bg-teal-600 hover:bg-teal-700">View Details</Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}