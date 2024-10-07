'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { db, storage } from 'app/services/firebase/firebase.config'
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { Button } from "app/components/ui/button"
import { Card, CardContent } from "app/components/ui/card"
import { Input } from "app/components/ui/input"
import Link from 'next/link'
import { ArrowLeft, MoreVertical, X, Pencil } from 'lucide-react'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "app/components/ui/dropdown-menu"
import Image from 'next/image'
import { StoreCardSkeleton } from 'app/components/skeletons/StoreCardSkeleton'

interface Store {
  id: string
  name: string
  address: string
  manager: string
  phone: string
  imageUrl: string
}

export default function StoreListPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPopupOpen, setIsPopupOpen] = useState(false)
  const [editingStore, setEditingStore] = useState<Store | null>(null)
  const [newStore, setNewStore] = useState({
    name: '',
    address: '',
    manager: '',
    phone: '',
  })
  const [imageFile, setImageFile] = useState<File | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      fetchStores()
    }
  }, [status, router])

  const fetchStores = async () => {
    if (!session?.user?.companyId) return

    setLoading(true)
    setError(null)

    try {
      const storesRef = collection(db, 'companies', session.user.companyId, 'stores')
      const querySnapshot = await getDocs(storesRef)
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0])
    }
  }

  const uploadImage = async (file: File) => {
    const storageRef = ref(storage, `store-images/${file.name}`)
    await uploadBytes(storageRef, file)
    return getDownloadURL(storageRef)
  }

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session?.user?.companyId || !imageFile) return

    setLoading(true)
    setError(null)

    try {
      const imageUrl = await uploadImage(imageFile)
      const storesRef = collection(db, 'companies', session.user.companyId, 'stores')
      const newStoreData = {
        ...newStore,
        imageUrl,
        createdAt: new Date()
      }
      const docRef = await addDoc(storesRef, newStoreData)
      setStores([...stores, { id: docRef.id, ...newStoreData } as Store])
      setIsPopupOpen(false)
      setNewStore({ name: '', address: '', manager: '', phone: '' })
      setImageFile(null)
    } catch (err) {
      console.error('Error creating store:', err)
      setError('Failed to create store. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStore = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session?.user?.companyId || !editingStore) return

    setLoading(true)
    setError(null)

    try {
      const updatedData: Partial<Store> = { ...newStore }
      if (imageFile) {
        const imageUrl = await uploadImage(imageFile)
        updatedData.imageUrl = imageUrl
      }

      const storeRef = doc(db, 'companies', session.user.companyId, 'stores', editingStore.id)
      await updateDoc(storeRef, updatedData)

      setStores(stores.map(store => 
        store.id === editingStore.id ? { ...store, ...updatedData } : store
      ))

      setIsPopupOpen(false)
      setEditingStore(null)
      setNewStore({ name: '', address: '', manager: '', phone: '' })
      setImageFile(null)
    } catch (err) {
      console.error('Error updating store:', err)
      setError('Failed to update store. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteStore = async () => {
    if (!session?.user?.companyId || !editingStore) return

    setLoading(true)
    setError(null)

    try {
      await deleteDoc(doc(db, 'companies', session.user.companyId, 'stores', editingStore.id))

      if (editingStore.imageUrl) {
        const imageRef = ref(storage, editingStore.imageUrl)
        await deleteObject(imageRef)
      }

      setStores(stores.filter(store => store.id !== editingStore.id))

      setIsPopupOpen(false)
      setEditingStore(null)
      setNewStore({ name: '', address: '', manager: '', phone: '' })
      setImageFile(null)
    } catch (err) {
      console.error('Error deleting store:', err)
      setError('Failed to delete store. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const openEditPopup = (store: Store) => {
    setEditingStore(store)
    setNewStore({
      name: store.name,
      address: store.address,
      manager: store.manager,
      phone: store.phone,
    })
    setIsPopupOpen(true)
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-blue-100 flex justify-center items-center">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(2)].map((_, index) => (
            <StoreCardSkeleton key={index} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-blue-100">
      <header className="bg-teal-600 text-white p-4 flex items-center">
        <Button variant="ghost" className="text-white p-0 mr-2" onClick={() => router.back()}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-bold flex-grow">Stores</h1>
        <Button variant="secondary" onClick={() => {
          setEditingStore(null)
          setNewStore({ name: '', address: '', manager: '', phone: '' })
          setIsPopupOpen(true)
        }}>
          + Add Store
        </Button>
      </header>

      <main className="container mx-auto p-4">
        {stores.length === 0 ? (
          <p className="text-center mt-8">You dont have any stores yet. Create one to get started!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stores.map((store) => (
              <Card key={store.id} className="overflow-hidden">
                <div className="flex">
                  <div className="w-1/3">
                    <Image 
                      src={store.imageUrl} 
                      alt={store.name} 
                      width={100} 
                      height={100} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <CardContent className="w-2/3 p-4 relative">
                    <div className="absolute top-2 right-2 flex">
                      <Button variant="ghost" className="h-8 w-8 p-0 mr-1" onClick={() => openEditPopup(store)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem>
                            <Link href={`/store/${store.id}/invoices`}>Invoices</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Link href={`/store/${store.id}/exhibition-inventory`}>Exb Inventory</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Link href={`/store/${store.id}/unassigned-exhibition`}>Exb Unassign</Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <h2 className="font-bold mb-2">{store.name}</h2>
                    <p className="text-sm text-gray-600">{store.address}</p>
                    <p className="text-sm text-gray-600">Manager: {store.manager}</p>
                    <p className="text-sm text-gray-600">Phone: {store.phone}</p>
                  </CardContent>
                </div>
              </Card> 
            ))}
          </div>
        )}
        {error && <p className="text-red-500 mt-4">{error}</p>}
      </main>

      {isPopupOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-end items-start p-4">
          <Card className="w-full max-w-md bg-white">
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">{editingStore ? 'Edit Store' : 'Create New Store'}</h2>
                <Button variant="ghost" onClick={() => setIsPopupOpen(false)}>
                  <X className="h-6 w-6" />
                </Button>
              </div>
              <form onSubmit={editingStore ? handleUpdateStore : handleCreateStore} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Store Name
                  </label>
                  <Input
                    id="name"
                    value={newStore.name}
                    onChange={(e) => setNewStore({...newStore, name: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                    Address
                  </label>
                  <Input
                    id="address"
                    value={newStore.address}
                    onChange={(e) => setNewStore({...newStore, address: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="manager" className="block text-sm font-medium text-gray-700">
                    Manager
                  </label>
                  <Input
                    id="manager"
                    value={newStore.manager}
                    onChange={(e) => setNewStore({...newStore, manager: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                    Phone
                  </label>
                  <Input
                    id="phone"
                    value={newStore.phone}
                    onChange={(e) => setNewStore({...newStore, phone: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="image" className="block text-sm font-medium text-gray-700">
                    Store Image
                  </label>
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    required={!editingStore}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Processing...' : (editingStore ? 'Update Store' : 'Create Store')}
                </Button>
              </form>
              {editingStore && (
                <div className="mt-4">
                  <Button 
                    variant="destructive" 
                    className="w-full"
                    onClick={handleDeleteStore}
                  >
                    Delete Store
                  </Button>
                </div>
              )}  
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}