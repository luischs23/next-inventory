'use client'

import { useState, useEffect } from 'react'
import { useAuth } from 'app/app/context/AuthContext'
import { useRouter } from 'next/navigation'
import { db } from 'app/services/firebase/firebase.config'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { Button } from "app/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "app/components/ui/card"
import Link from 'next/link'

interface Store {
  id: string
  name: string
  userId: string
}

export default function HomePage() {
  const { user } = useAuth()
  const router = useRouter()
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      router.push('/login')
    } else {
      fetchStores()
    }
  }, [user, router])

  const fetchStores = async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      const storesRef = collection(db, 'stores')
      const q = query(storesRef, where('userId', '==', user.uid))
      const querySnapshot = await getDocs(q)
      const storeList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Store))
      setStores(storeList)
    } catch (err) {
      console.error('Error fetching stores:', err)
      setError('Failed to fetch stores. Please try again later.')
    } finally {
      setLoading(false)
    }
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
        <h1 className="text-2xl font-bold">Your Stores</h1>
      </div>
      {stores.length === 0 ? (
        <p>You dont have any stores yet. Create one to get started!</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stores.map((store) => (
            <Card key={store.id}>
              <CardHeader>
                <CardTitle>{store.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <Link href={`/store/${store.id}/invoices`}>
                  <Button className="w-full">View Invoices</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Button className="mt-6" onClick={() => router.push('/create-store')}>Create New Store</Button>
    </div>
  )
}