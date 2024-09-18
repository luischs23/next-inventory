'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Button } from "app/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "app/components/ui/card"
import { Input } from "app/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "app/components/ui/dropdown-menu"
import { useRouter } from 'next/navigation'
import { MoreVertical, Trash } from 'lucide-react'

interface Store {
  id: string;
  name: string;
}

export default function HomePage() {
  const { user, userRole } = useAuth()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [stores, setStores] = useState<Store[]>([])
  const [newStoreName, setNewStoreName] = useState('')

  useEffect(() => {
    if (user === null && !isLoading) {
      router.push('/login')
    }
    setIsLoading(false)
    // In a real application, you would fetch the stores from your backend here
    setStores([
      { id: '1', name: 'Store 1' },
      { id: '2', name: 'Store 2' },
    ])
  }, [user, isLoading, router])

  const handleAddStore = () => {
    if (newStoreName.trim()) {
      const newStore = {
        id: Date.now().toString(), // This is a simple way to generate a unique ID. In a real app, you'd use a more robust method.
        name: newStoreName.trim()
      }
      setStores([...stores, newStore])
      setNewStoreName('')
    }
  }

  const handleDeleteStore = (storeId: string) => {
    setStores(stores.filter(store => store.id !== storeId))
  }

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
          <CardTitle className="text-2xl font-bold text-center">Welcome, {user.email}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button className="w-full" onClick={() => router.push('/inventory')}>
            Inventory
          </Button>
          {stores.map(store => (
            <div key={store.id} className="flex items-center justify-between">
              <Button className="w-full mr-2" onClick={() => router.push(`/store/${store.id}`)}>
                {store.name}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleDeleteStore(store.id)}>
                    <Trash className="mr-2 h-4 w-4" />
                    <span>Delete</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
          <div className="flex space-x-2">
            <Input
              type="text"
              placeholder="New store name"
              value={newStoreName}
              onChange={(e) => setNewStoreName(e.target.value)}
            />
            <Button onClick={handleAddStore}>Add Store</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}