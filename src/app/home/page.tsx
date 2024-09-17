'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Button } from "app/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "app/components/ui/card"
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const { user, userRole } = useAuth()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (user === null && !isLoading) {
      router.push('/login')
    }
    setIsLoading(false)
  }, [user, isLoading, router])

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Welcome, {user.displayName || user.email}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button className="w-full" onClick={() => router.push('/inventory')}>
            Inventory
          </Button>
          <Button className="w-full" onClick={() => router.push('/store/1')}>
            Store 1
          </Button>
          <Button className="w-full" onClick={() => router.push('/store/2')}>
            Store 2
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}