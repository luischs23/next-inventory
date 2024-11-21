'use client'

import { useState } from 'react'
import { useAuth } from 'app/app/context/AuthContext'
import { useRouter } from 'next/navigation'
import { db } from 'app/services/firebase/firebase.config'
import { collection, addDoc } from 'firebase/firestore'
import { Button } from "app/components/ui/button"
import { Input } from "app/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "app/components/ui/card"

export default function CreateStorePage() {
  const { user } = useAuth()
  const router = useRouter()
  const [storeName, setStoreName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      const storesRef = collection(db, 'stores')
      const newStore = {
        name: storeName,
        userId: user.uid,
        createdAt: new Date()
      }
      const docRef = await addDoc(storesRef, newStore)
      router.push(`/store/${docRef.id}/invoices`)
    } catch (err) {
      console.error('Error creating store:', err)
      setError('Failed to create store. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    router.push('/login')
    return null
  }

  return (
    <div className="container mx-auto p-4">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Create New Store</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateStore} className="space-y-4">
            <div>
              <label htmlFor="storeName" className="block text-sm font-medium text-gray-700">
                Store Name
              </label>
              <Input
                id="storeName"
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                required
                className="mt-1"
              />
            </div>
            {error && <p className="text-red-500">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Creating...' : 'Create Store'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}