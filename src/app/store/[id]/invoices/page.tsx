'use client'

import { useState, useEffect } from 'react'
import { useAuth } from 'app/app/context/AuthContext'
import { useRouter } from 'next/navigation'
import { db } from 'app/services/firebase/firebase.config'
import { collection, query, where, getDocs, doc, getDoc, Timestamp } from 'firebase/firestore'
import { Button } from "app/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "app/components/ui/card"
import Link from 'next/link'

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

export default function InvoiceListPage({ params }: { params: { id: string } }) {
  const { user } = useAuth()
  const router = useRouter()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [storeName, setStoreName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      router.push('/login')
    } else {
      fetchStoreAndInvoices()
    }
  }, [user, router])

  const fetchStoreAndInvoices = async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      // Fetch store name
      const storeRef = doc(db, 'stores', params.id)
      const storeDoc = await getDoc(storeRef)
      if (storeDoc.exists()) {
        const storeData = storeDoc.data() as Store
        setStoreName(storeData.name)
      }

      // Fetch invoices
      const invoicesRef = collection(db, 'stores', params.id, 'savedInvoices')
      const q = query(invoicesRef, where('userId', '==', user.uid))
      const querySnapshot = await getDocs(q)
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

  if (loading) {
    return <div className="container mx-auto p-4">Loading...</div>
  }

  if (error) {
    return <div className="container mx-auto p-4 text-red-500">{error}</div>
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Invoices for {storeName}</h1>
        <Link href={`/store/${params.id}`}>
          <Button>New Invoice</Button>
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {invoices.map((invoice) => (
          <Card key={invoice.id}>
            <CardHeader>
              <CardTitle>{invoice.customerName}</CardTitle>
              <p className="text-sm text-gray-700">{invoice.customerPhone}</p>
              <p className="text-sm text-gray-500">{formatDate(invoice.createdAt)}</p>
            </CardHeader>
            <CardContent>
              <p>Total: ${invoice.totalSold}</p>
              <Button className="mt-2" onClick={() => router.push(`/store/${params.id}/saved-invoice/${invoice.id}`)}>
                View Details
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}