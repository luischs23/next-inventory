'use client'

import React from 'react'
import { Button } from "app/components/ui/button"
import { Card, CardContent } from "app/components/ui/card"
import { Skeleton } from "app/components/ui/skeleton"
import { ArrowLeft, Menu } from 'lucide-react'

export default function ParesInventorySkeleton() {
  return (
    <div className="min-h-screen bg-blue-100 flex flex-col">
      <header className="bg-teal-600 text-white p-3 flex items-center sticky top-0 z-20">
        <Button variant="ghost" className="text-white p-0 mr-2">
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <Skeleton className="h-6 w-48 bg-white/20" />
        <div className="flex-grow" />
        <Button variant="ghost" className="text-white">
          <Menu className="h-6 w-6" />
        </Button>
      </header>

      <div className="bg-white sticky top-16 z-10 p-4 shadow-md">
        <div className='flex items-center space-x-3 mb-4'>
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="flex items-center space-x-2 mb-2">
          <Skeleton className="h-10 flex-grow" />
        </div>
      </div>

      <main className="container mx-auto p-4 flex-grow">
        <div className='mb-2'>
          <Skeleton className="h-8 w-40" />
        </div>
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="flex items-start">
              <Skeleton className="h-6 w-6 mr-1 mt-2" />
              <Card className="flex-grow">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    <Skeleton className="w-16 h-16 rounded-md" />
                    <div className="flex-grow space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </div>
                  <div className="mt-2 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <div className="grid grid-cols-3 gap-1">
                      {[...Array(6)].map((_, i) => (
                        <Skeleton key={i} className="h-6 w-full" />
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}