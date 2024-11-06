'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { db } from 'app/services/firebase/firebase.config'
import { collection, getDocs, Timestamp, doc, getDoc} from 'firebase/firestore'
import { Button } from "app/components/ui/button"
import { Card, CardContent } from "app/components/ui/card"
import { Input } from "app/components/ui/input"
import Link from 'next/link'
import { toast } from "app/components/ui/use-toast"
import { ArrowLeft, ChevronDown, MoreHorizontal, Pencil } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "app/components/ui/dropdown-menu"
import InvoicesPageSkeleton from 'app/components/skeletons/InvoicesPageSkeleton'

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
  storeName: string
  customerName: string
  customerPhone: string
  createdAt: Timestamp
  totalSold: number
  totalEarn: number
  items: InvoiceItem[]
  companyId: string
}

interface Store {
  id: string
  name: string
}

export default function InvoicesPage({ params }: { params: { companyId: string, storeId: string } }) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(false)
  const [stores, setStores] = useState<Store[]>([])
  const [selectedStore, setSelectedStore] = useState<string>('all')
  const [sortOrder, setSortOrder] = useState<'date' | 'name'>('date')
  const [, setCompanyName] = useState<string>('')

  useEffect(() => {
    const fetchCompanyAndStoresAndInvoices = async () => {
      setLoading(true)
      try {
        if (!params.companyId) {
          throw new Error('Company ID is undefined')
        }

        // Fetch company name
        const companyRef = doc(db, 'companies', params.companyId)
        const companyDoc = await getDoc(companyRef)
        if (companyDoc.exists()) {
          setCompanyName(companyDoc.data().name)
        } else {
          throw new Error('Company not found')
        }

        // Fetch stores
        const storesRef = collection(db, `companies/${params.companyId}/stores`)
        const storesSnapshot = await getDocs(storesRef)
        const storesData = storesSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }))
        setStores(storesData)

        // Fetch invoices from all stores
        let allInvoices: Invoice[] = []
        for (const store of storesData) {
          const invoicesRef = collection(db, `companies/${params.companyId}/stores/${store.id}/invoices`)
          const invoicesSnapshot = await getDocs(invoicesRef)
          const storeInvoices = invoicesSnapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
            storeId: store.id,
            storeName: store.name,
            companyId: params.companyId
          } as Invoice))
          allInvoices = [...allInvoices, ...storeInvoices]
        }
        setInvoices(allInvoices)
        setFilteredInvoices(allInvoices)
      } catch (err) {
        console.error('Error fetching company, stores and invoices:', err)
        toast({
          title: "Error",
          description: "Failed to fetch invoices. Please try again later.",
          variant: "destructive",
        })
        router.push('/companies') // Redirect to companies page on error
      } finally {
        setLoading(false)
      }
    }
    fetchCompanyAndStoresAndInvoices()
  }, [params.companyId, router])


  useEffect(() => {
    filterAndSortInvoices()
  }, [selectedStore, sortOrder, searchTerm, invoices])

  const filterAndSortInvoices = () => {
    let filtered = invoices

    // Filter by store
    if (selectedStore !== 'all') {
      filtered = filtered.filter(invoice => invoice.storeId === selectedStore)
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(invoice => 
        invoice.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.items.some(item => 
          item.barcode.includes(searchTerm) ||
          item.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.reference.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    }

    // Sort
    if (sortOrder === 'date') {
      filtered.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds)
    } else {
      filtered.sort((a, b) => a.customerName.localeCompare(b.customerName))
    }

    setFilteredInvoices(filtered)
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
 
  const calculateTotalProductItems = (invoices: Invoice[]) => {
    return invoices.reduce((sum, invoice) => {
      if (Array.isArray(invoice.items)) {
        return sum + invoice.items.reduce((itemSum, item) => {
          const quantity = typeof item.quantity === 'number' ? item.quantity : 0
          return itemSum + quantity
        }, 0)
      }
      return sum
    }, 0)
  }

  const totalInvoices = filteredInvoices.length
  const totalProductItems = calculateTotalProductItems(filteredInvoices)
  const totalSold = filteredInvoices.reduce((sum, invoice) => sum + (invoice.totalSold || 0), 0)
  const totalEarn = filteredInvoices.reduce((sum, invoice) => sum + (invoice.totalEarn || 0), 0)

  return (
    <div className="min-h-screen bg-blue-100 pb-16">
      <header className="bg-teal-600 text-white p-4 flex items-center sticky top-0 z-50">
        <Button variant="ghost" className="text-white p-0 mr-2" onClick={() => router.back()}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-bold flex-grow">Invoices</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" className="mr-2">
              {selectedStore === 'all' ? 'All Stores' : stores.find(s => s.id === selectedStore)?.name}
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setSelectedStore('all')}>All Stores</DropdownMenuItem>
            {stores.map(store => (
              <DropdownMenuItem key={store.id} onClick={() => setSelectedStore(store.id)}>
                {store.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary">
              Sort
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setSortOrder('date')}>By Date</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortOrder('name')}>By Name</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <main className="container mx-auto p-4 relative z-0">
        <div className="mb-4">
          <Input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, barcode, brand, or reference"
            className="w-full"
          />
        </div>

        <div className="bg-white rounded-lg p-4 mb-2 shadow text-slate-900">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <h3 className="text-sm font-semibold">Total Items</h3>
              <p className="text-lg">{totalInvoices}</p>
            </div>
            {/* <div>
              <h3 className="text-sm font-semibold">Total Products</h3>
              <p className="text-lg">{totalProductItems}</p>
            </div> */}
            <div>
              <h3 className="text-sm font-semibold">Total Sold</h3>
              <p className="text-lg">${formatPrice(totalSold)}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold">Total Earn</h3>
              <p className="text-lg">${formatPrice(totalEarn)}</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(2)].map((_, index) => (
              <InvoicesPageSkeleton key={index} />
            ))}
          </div>
        ) : stores.length === 0 ? (
          <p className="text-center mt-8">You dont have any inovices yet. Create one to get started!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {filteredInvoices.map((invoice, index) => (
              <div key={invoice.id} className="relative">
                <div className="absolute top-0 left-0 bg-teal-600 text-white px-2 py-1 rounded-tl-lg rounded-br-lg z-10">
                  {index + 1}
                </div>
                <Card className="mt-4 overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-sm text-gray-500 mt-1">{formatDate(invoice.createdAt)}</p>
                        <h3 className="font-semibold">{invoice.customerName}</h3>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem>
                            <Link href={`/companies/${invoice.companyId}/store/${invoice.storeId}/invoices/${invoice.id}`} className="flex items-center">
                              <Pencil className="mr-2 h-4 w-4" />
                              Update
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className='flex justify-between w-full'>
                      <div className="text-sm">
                        <p className="text-gray-700">Phone: {invoice.customerPhone}</p>
                        <p className="text-gray-500">Store: {invoice.storeName}</p>
                      </div>
                      <div className="text-right">
                        <div className='flex flex-col items-end'>
                          <div className='flex justify-end'>
                            <p className="text-sm font-semibold mr-2">Total:</p>
                            <p className="text-sm">${formatPrice(invoice.totalSold)}</p>
                          </div>
                          <div className='flex justify-end'>
                            <p className="text-sm font-semibold mr-2">Earn:</p>
                            <p className="text-sm">${formatPrice(invoice.totalEarn)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        {/* Add your navigation items here */}
      </nav>
    </div>
  )
}