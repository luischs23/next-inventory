'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { db } from 'app/services/firebase/firebase.config'
import { collection, getDocs, doc, getDoc, Timestamp, deleteDoc, addDoc, serverTimestamp, query, orderBy} from 'firebase/firestore'
import { Button } from "app/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "app/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "app/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "app/components/ui/alert-dialog"
import { Input } from "app/components/ui/input"
import { Label } from "app/components/ui/label"
import Link from 'next/link'
import { Skeleton } from "app/components/ui/skeleton"
import { ArrowLeft, Calendar, MoreVertical, Plus } from 'lucide-react'
import { toast } from "app/components/ui/use-toast"
import { InvoiceSkeleton } from 'app/components/skeletons/InvoiceSkeleton'
import { usePermissions } from 'app/hooks/usePermissions'
import { InvoiceCalendar } from 'app/components/InvoiceCalendar'

interface Invoice {
  id: string
  customerName: string
  createdAt: Timestamp
  totalSold: number
  customerPhone: string
  status: 'open' | 'closed'
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
  const [isNewInvoiceDialogOpen, setIsNewInvoiceDialogOpen] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([])
  const [isCalendarDialogOpen, setIsCalendarDialogOpen] = useState(false)
  const { hasPermission } = usePermissions()

  useEffect(() => {
    fetchStoreAndInvoices()
  }, [params.companyId, params.storeId])

  const fetchStoreAndInvoices = async () => {
    setLoading(true)
    setError(null)

    try {
      const storeRef = doc(db, `companies/${params.companyId}/stores`, params.storeId)
      const storeDoc = await getDoc(storeRef)
      if (storeDoc.exists()) {
        const storeData = storeDoc.data() as Store
        setStoreName(storeData.name)
      }

      const invoicesRef = collection(db, `companies/${params.companyId}/stores/${params.storeId}/invoices`)
      const q = query(invoicesRef, orderBy('createdAt', 'desc'))
      const querySnapshot = await getDocs(q)
      const invoiceList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt as Timestamp
      } as Invoice))
      setInvoices(invoiceList)
      setFilteredInvoices(invoiceList)
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

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const filtered = invoices.filter(invoice => 
        invoice.createdAt.toDate().toDateString() === date.toDateString()
      )
      setFilteredInvoices(filtered)
    } else {
      setFilteredInvoices(invoices)
    }
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

  const handleCreateNewInvoice = async () => {
    try {
      const newInvoiceRef = await addDoc(collection(db, `companies/${params.companyId}/stores/${params.storeId}/invoices`), {
        customerName: newCustomerName,
        customerPhone: newCustomerPhone,
        createdAt: serverTimestamp(),
        totalSold: 0,
        status: 'open'
      })

      const newInvoice: Invoice = {
        id: newInvoiceRef.id,
        customerName: newCustomerName,
        customerPhone: newCustomerPhone,
        createdAt: Timestamp.now(),
        totalSold: 0,
        status: 'open'
      }

      setInvoices([newInvoice, ...invoices])
      setFilteredInvoices([newInvoice, ...filteredInvoices])
      setIsNewInvoiceDialogOpen(false)
      setNewCustomerName('')
      setNewCustomerPhone('')

      toast({
        title: "Success",
        description: "New invoice created successfully.",
        variant: "default",
      })
    } catch (error) {
      console.error('Error creating new invoice:', error)
      toast({
        title: "Error",
        description: "Failed to create new invoice. Please try again.",
        variant: "destructive",
      })
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
        <AlertDialog open={isCalendarDialogOpen} onOpenChange={setIsCalendarDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" className="text-white p-2 mr-2">
              <Calendar className="h-6 w-6" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Select Date</AlertDialogTitle>
              <AlertDialogDescription>
                Choose a date to filter invoices.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <InvoiceCalendar 
              invoices={invoices.map(invoice => ({
                id: invoice.id,
                createdAt: invoice.createdAt.toDate()
              }))}
              onSelectDate={handleDateSelect}
            />
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {hasPermission('create') && (
          <Button variant="secondary" onClick={() => setIsNewInvoiceDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Invoice
          </Button>
        )}
      </header>
      <main className="container mx-auto p-4 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredInvoices.map((invoice, index) => (
            <div key={invoice.id} className="relative">
              <span className="absolute top-0 left-0 bg-teal-600 text-white px-2 py-1 rounded-tl-lg rounded-br-lg z-10">
                {index + 1}
              </span>
              <Card className={`border-2 shadow-md p-2 ${invoice.status === 'open' ? 'border-yellow-500' : 'border-green-500'}`}>
                <CardHeader className="relative">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-6 w-6 p-0 absolute top-1 right-1">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {invoice.status === 'open' ? (
                        <>
                          <DropdownMenuItem asChild>
                            <Link href={`/companies/${params.companyId}/store/${params.storeId}/invoices/${invoice.id}`}>
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/companies/${params.companyId}/store/${params.storeId}/invoices/${invoice.id}/edit`}>
                              Edit Invoice
                            </Link>
                          </DropdownMenuItem>
                        </>
                      ) : (
                        <>
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
                        </>
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
                <CardContent>
                  <p className={`text-sm font-medium ${invoice.status === 'open' ? 'text-yellow-600' : 'text-green-600'}`}>
                    Status: {invoice.status === 'open' ? 'Open' : 'Closed'}
                  </p>
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

      <AlertDialog open={isNewInvoiceDialogOpen} onOpenChange={setIsNewInvoiceDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create New Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Enter customer details to create a new invoice.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">
                Phone
              </Label>
              <Input
                id="phone"
                value={newCustomerPhone}
                onChange={(e) => setNewCustomerPhone(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <Button onClick={handleCreateNewInvoice}>Create Invoice</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}