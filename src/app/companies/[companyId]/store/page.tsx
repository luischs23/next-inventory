'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams} from 'next/navigation'
import { db, storage } from 'app/services/firebase/firebase.config'
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { Button } from "app/components/ui/button"
import { Card, CardContent } from "app/components/ui/card"
import { Input } from "app/components/ui/input"
import Link from 'next/link'
import { ArrowLeft, MoreVertical, X, Pencil, Trash2 } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "app/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "app/components/ui/alert-dialog"
import Image from 'next/image'
import { usePermissions } from 'app/hooks/useAuthAndPermissions'
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
  const router = useRouter()
  const params = useParams()
  const companyId = params.companyId as string
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
  const { hasPermission } = usePermissions()


  useEffect(() => {
    fetchStores()
  }, [companyId])

  const fetchStores = async () => {
    if (!companyId) return

    setLoading(true)
    setError(null)

    try {
      const storesRef = collection(db, `companies/${companyId}/stores`)
      const querySnapshot = await getDocs(storesRef)
      const storeList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Store))
      setStores(storeList)
    } catch (err) {
      console.error('Error fetching stores:', err)
      if (err instanceof Error) {
        setError(`Failed to fetch stores: ${err.message}`)
      } else {
        setError('Failed to fetch stores. Please try again later.')
      }
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
    const storageRef = ref(storage, `companies/${companyId}/store-images/${file.name}`)
    await uploadBytes(storageRef, file)
    return getDownloadURL(storageRef)
  }

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!imageFile || !companyId) return

    setLoading(true)
    setError(null)

    try {
      const imageUrl = await uploadImage(imageFile)
      const storesRef = collection(db, `companies/${companyId}/stores`)
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
    if (!editingStore || !companyId) return

    setLoading(true)
    setError(null)

    try {
      const updatedData: Partial<Store> = { ...newStore }
      if (imageFile) {
        const imageUrl = await uploadImage(imageFile)
        updatedData.imageUrl = imageUrl
      }

      const storeRef = doc(db, `companies/${companyId}/stores`, editingStore.id)
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

  const handleDeleteStore = async (storeToDelete: Store) => {
    if (!companyId) return

    setLoading(true)
    setError(null)

    try {
      // Delete the store document from Firestore
      await deleteDoc(doc(db, `companies/${companyId}/stores`, storeToDelete.id))

      // Delete the store image from Storage
      if (storeToDelete.imageUrl) {
        const imageRef = ref(storage, storeToDelete.imageUrl)
        await deleteObject(imageRef)
      }

      // Update local state
      setStores(stores.filter(store => store.id !== storeToDelete.id))
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

  return (
    <div className="min-h-screen bg-blue-100 ">
      <header className="bg-teal-600 text-white p-3 flex items-center">
        <Button variant="ghost" className="text-white p-0 mr-2" onClick={() => router.back()}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-bold flex-grow">Stores</h1>
        {hasPermission('delete') && (
        <Button variant="secondary" onClick={() => {
          setEditingStore(null)
          setNewStore({ name: '', address: '', manager: '', phone: '' })
          setIsPopupOpen(true)
        }}>
          + Add Store
        </Button>
        )}
      </header>

      <main className="container mx-auto p-4 mb-14">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(2)].map((_, index) => (
              <StoreCardSkeleton key={index} />
            ))}
          </div>
        ) : stores.length === 0 ? (
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className='mr-2'>
                        {hasPermission('update') && (
                          <DropdownMenuItem onClick={() => openEditPopup(store)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              <span>Update</span>
                          </DropdownMenuItem>
                        )}
                         {hasPermission('delete') && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Delete</span>
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the store
                                  and remove all data associated with it.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteStore(store)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                         )}
                          <DropdownMenuItem>
                            <Link href={`/companies/${companyId}/store/${store.id}/invoices`}>Invoices</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Link href={`/companies/${companyId}/store/${store.id}/exhibition-inventory`}>Exb Inventory</Link>
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
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}