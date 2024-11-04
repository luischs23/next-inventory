'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { db } from 'app/services/firebase/firebase.config'
import { collection, getDocs, doc, getDoc, Timestamp, deleteDoc } from 'firebase/firestore'
import { Button } from "app/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "app/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "app/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "app/components/ui/alert-dialog"
import Link from 'next/link'
import { Skeleton } from "app/components/ui/skeleton"
import { ArrowLeft, MoreVertical } from 'lucide-react'
import { toast } from "app/components/ui/use-toast"
import { InvoiceSkeleton } from 'app/components/skeletons/InvoiceSkeleton'
import { usePermissions } from 'app/hooks/useAuthAndPermissions'

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
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null)
  const { hasPermission } = usePermissions()

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

  const handleDelete = async () => {
    if (invoiceToDelete) {
      try {
        await deleteDoc(doc(db, `companies/${params.companyId}/stores/${params.storeId}/invoices`, invoiceToDelete.id))
        setInvoices(invoices.filter(invoice => invoice.id !== invoiceToDelete.id))
        toast({
          title: "Success",
          description: `Invoice for ${invoiceToDelete.customerName} has been deleted successfully.`,
          variant: "default",
        })
      } catch (error) {
        console.error('Error deleting invoice:', error)
        toast({
          title: "Error",
          description: `Failed to delete the invoice for ${invoiceToDelete.customerName}.`,
          variant: "destructive",
        })
      } finally {
        setInvoiceToDelete(null)
      }
    }
  }
  if (loading) {
    return (
      <div className="min-h-screen bg-blue-100">
        <header className="bg-teal-600 text-white p-4 flex items-center">
          <Skeleton className="h-6 w-6 mr-2" />
          <Skeleton className="h-8 w-48 mr-2 flex-grow" />
          <Skeleton className="h-10 w-32" />
        </header>
        <main className="container mx-auto p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, index) => (
              <InvoiceSkeleton key={index} />
            ))}
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return <div className="min-h-screen bg-blue-100 flex items-center justify-center text-red-500">{error}</div>
  }

  return (
    <div className="min-h-screen bg-blue-100">
      <header className="bg-teal-600 text-white p-3 flex items-center">
        <Button variant="ghost" className="text-white p-0 mr-2" onClick={() => router.back()}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-bold flex-grow">Invoices {storeName}</h1>
        {hasPermission('create') && (
        <Link href={`/companies/${params.companyId}/store/${params.storeId}/new-invoice`}>
          <Button variant="secondary">+ New Invoice</Button>
        </Link>
        )}
      </header>
      <main className="container mx-auto p-4 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {invoices.map((invoice, index) => (
            <div key={invoice.id} className="relative">
              <span className="absolute top-0 left-0 bg-teal-600 text-white px-2 py-1 rounded-tl-lg rounded-br-lg z-10">
                {index + 1}
              </span>
              <Card className="border-2 shadow-md p-2">
                <CardHeader className="relative">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-6 w-6 p-0 absolute top-1 right-1">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem asChild>
                        <Link href={`/companies/${params.companyId}/store/${params.storeId}/invoices/${invoice.id}`}>
                          View Details
                        </Link>
                      </DropdownMenuItem>
                      {hasPermission('delete') && (
                      <DropdownMenuItem onClick={() => setInvoiceToDelete(invoice)}>
                        Delete
                      </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <CardTitle className="text-lg font-semibold text-teal-700">{invoice.customerName}</CardTitle>
                  <p className="text-sm ">{invoice.customerPhone}</p>
                </CardHeader>
                <CardContent className='flex justify-between items-center'>
                  <p className="text-sm text-gray-500">{formatDate(invoice.createdAt)}</p>
                  <p className="text-base font-medium">Total: ${formatPrice(invoice.totalSold)}</p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </main>

      <AlertDialog open={!!invoiceToDelete} onOpenChange={() => setInvoiceToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the invoice for
              <span className="font-semibold"> {invoiceToDelete?.customerName} </span>
              with a total of ${invoiceToDelete?.totalSold}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}