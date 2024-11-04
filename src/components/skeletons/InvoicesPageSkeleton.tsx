'use client'

import { useRouter } from 'next/navigation'
import { Button } from "app/components/ui/button"
import { Card, CardContent } from "app/components/ui/card"
import { Input } from "app/components/ui/input"
import { Skeleton } from "app/components/ui/skeleton"
import { ArrowLeft, ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "app/components/ui/dropdown-menu"

export default function InvoicesPageSkeleton() {
  const router = useRouter()

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
              All Stores
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>All Stores</DropdownMenuItem>
            <DropdownMenuItem>Loading...</DropdownMenuItem>
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
            <DropdownMenuItem>By Date</DropdownMenuItem>
            <DropdownMenuItem>By Name</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <main className="container mx-auto p-4 relative z-0">
        <div className="mb-4">
          <Input
            type="text"
            placeholder="Search by name, barcode, brand, or reference"
            className="w-full"
            disabled
          />
        </div>

        <div className="bg-white rounded-lg p-4 mb-4 shadow">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['Total Invoices', 'Total Product Items', 'Total Sold', 'Total Earn'].map((title) => (
              <div key={title}>
                <h3 className="text-sm font-semibold">{title}</h3>
                <Skeleton className="h-6 w-20 mt-1" />
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="relative">
              <div className="absolute top-0 left-0 bg-teal-600 text-white px-2 py-1 rounded-tl-lg rounded-br-lg z-10">
                {index + 1}
              </div>
              <Card className="mt-4 overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <Skeleton className="h-4 w-24 mb-1" />
                      <Skeleton className="h-5 w-32" />
                    </div>
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </div>
                  <div className='flex justify-between w-full'>
                    <div className="text-sm">
                      <Skeleton className="h-4 w-36 mb-1" />
                      <Skeleton className="h-4 w-28" />
                    </div>
                    <div className="text-right">
                      <div className='flex flex-col items-end'>
                        <Skeleton className="h-4 w-20 mb-1" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-2 z-50">
        <div className="flex justify-around">
          {['Home', 'Stores', 'Bodegas', 'Invoices'].map((item) => (
            <div key={item} className="flex flex-col items-center">
              <Skeleton className="h-6 w-6 rounded-full mb-1" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </nav>
    </div>
  )
}