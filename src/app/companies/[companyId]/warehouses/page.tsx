'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { db, storage } from 'app/services/firebase/firebase.config'
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage'
import { Button } from "app/components/ui/button"
import { Card, CardContent } from "app/components/ui/card"
import { Input } from "app/components/ui/input"
import { Label } from "app/components/ui/label"
import { usePermissions } from 'app/hooks/usePermissions'
import { ArrowLeft, MoreVertical, X, Pencil, Trash2 } from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from 'app/components/ui/alert-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "app/components/ui/dropdown-menu"
import Image from 'next/image'
import { WarehouseCardSkeleton } from 'app/components/skeletons/WarehouseCardSkeleton'
import { useToast } from "app/components/ui/use-toast"
import imageCompression from 'browser-image-compression'

interface Warehouse {
  id: string
  name: string
  address: string
  manager: string
  phone: string
  imageUrl: string
}

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [isPopupOpen, setIsPopupOpen] = useState(false)
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null)
  const [newWarehouse, setNewWarehouse] = useState({ name: '', address: '', manager: '', phone: '' })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeWarehouseId, setActiveWarehouseId] = useState<string | null>(null)
  const [, setError] = useState<string | null>(null)
  const router = useRouter()
  const params = useParams()
  const companyId = params.companyId as string
  const popupRef = useRef<HTMLDivElement>(null)
  const { hasPermission } = usePermissions()
  const { toast } = useToast()
  
  useEffect(() => {
    const fetchWarehouses = async () => {
      setLoading(true)
      try {
        const warehousesCollection = collection(db, `companies/${companyId}/warehouses`)
        const warehousesSnapshot = await getDocs(warehousesCollection)
        const warehousesList = warehousesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Warehouse[]
        
        // Simulate a delay to ensure the loading state is visible
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        setWarehouses(warehousesList)
      } catch (err) {
        console.error('Error fetching warehouses:', err)
        setError('Failed to load warehouses. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchWarehouses()
  }, [companyId])

  useEffect(() => {
    if (isPopupOpen && popupRef.current) {
      popupRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [isPopupOpen])

  useEffect(() => {
    // Cleanup function to revoke object URL when component unmounts
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview)
      }
    }
  }, [])

  const getUniqueFileName = async (originalName: string) => {
    const storageRef = ref(storage, `companies/${companyId}/warehouse-images`)
    const fileList = await listAll(storageRef)
    const existingFiles = fileList.items.map(item => item.name)

    let uniqueName = originalName
    let counter = 1

    while (existingFiles.includes(uniqueName)) {
      const nameParts = originalName.split('.')
      const extension = nameParts.pop()
      const baseName = nameParts.join('.')
      uniqueName = `${baseName}${counter}.${extension}`
      counter++
    }

    return uniqueName
  }

  const uploadImage = async (file: File) => {
    const uniqueFileName = await getUniqueFileName(file.name)
    const storageRef = ref(storage, `companies/${companyId}/warehouse-images/${uniqueFileName}`)
    await uploadBytes(storageRef, file)
    return getDownloadURL(storageRef)
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      try {
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true
        }
        const compressedFile = await imageCompression(file, options)
        setImageFile(compressedFile)
        
        // Create a preview URL for the compressed image
        const previewUrl = URL.createObjectURL(compressedFile)
        setImagePreview(previewUrl)
      } catch (error) {
        console.error('Error compressing image:', error)
        toast({
          title: "Error",
          description: "Failed to compress image. Please try again.",
          duration: 3000,
          variant: "destructive",
        })
      }
    }
  }

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!imageFile) return

    setLoading(true)
    setError(null)

    try {
      const imageUrl = await uploadImage(imageFile)
      const warehousesCollection = collection(db, `companies/${companyId}/warehouses`)
      const newWarehouseData = {
        ...newWarehouse,
        imageUrl,
        createdAt: new Date()
      }
      const docRef = await addDoc(warehousesCollection, newWarehouseData)
      setWarehouses(prevWarehouses => [...prevWarehouses, { id: docRef.id, ...newWarehouseData }])
      setIsPopupOpen(false)
      setNewWarehouse({ name: '', address: '', manager: '', phone: '' })
      setImageFile(null)
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview)
        setImagePreview(null)
      }
      toast({
        title: "Warehouse Created",
        description: "The new warehouse has been successfully created.",
        duration: 3000,
        style: {
          background: "#4CAF50",
          color: "white",
          fontWeight: "bold",
        },
      })
    } catch (err) {
      console.error('Error creating warehouse:', err)
      setError('Failed to create warehouse. Please try again.')
      toast({
        title: "Error",
        description: "Failed to create warehouse. Please try again.",
        duration: 3000,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingWarehouse) return

    setLoading(true)
    setError(null)

    try {
      const updatedData: Partial<Warehouse> = { ...newWarehouse }
      if (imageFile) {
        // Delete the old image if it exists
        if (editingWarehouse.imageUrl) {
          const oldImageRef = ref(storage, editingWarehouse.imageUrl)
          try {
            await deleteObject(oldImageRef)
          } catch (deleteError) {
            console.error('Error deleting old image:', deleteError)
            // Continue with the update even if delete fails
          }
        }

        // Upload the new image with a unique filename
        const imageUrl = await uploadImage(imageFile)
        updatedData.imageUrl = imageUrl
      }

      const warehouseRef = doc(db, `companies/${companyId}/warehouses`, editingWarehouse.id)
      await updateDoc(warehouseRef, updatedData)

      setWarehouses(warehouses.map(warehouse => 
        warehouse.id === editingWarehouse.id ? { ...warehouse, ...updatedData } : warehouse
      ))

      setIsPopupOpen(false)
      setEditingWarehouse(null)
      setNewWarehouse({ name: '', address: '', manager: '', phone: '' })
      setImageFile(null)
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview)
        setImagePreview(null)
      }
      toast({
        title: "Warehouse Updated",
        description: "The warehouse has been successfully updated.",
        duration: 3000,
        style: {
          background: "#4CAF50",
          color: "white",
          fontWeight: "bold",
        },
      })
    } catch (err) {
      console.error('Error updating warehouse:', err)
      setError('Failed to update warehouse. Please try again.')
      toast({
        title: "Error",
        description: "Failed to update warehouse. Please try again.",
        duration: 3000,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteWarehouse = async (warehouse: Warehouse) => {
    setLoading(true)
    setError(null)

    try {
      await deleteDoc(doc(db, `companies/${companyId}/warehouses`, warehouse.id))

      if (warehouse.imageUrl) {
        const imageRef = ref(storage, warehouse.imageUrl)
        await deleteObject(imageRef)
      }
      setWarehouses(warehouses.filter(w => w.id !== warehouse.id))
      setIsPopupOpen(false)
      setEditingWarehouse(null)
      setNewWarehouse({ name: '', address: '', manager: '', phone: '' })
      setImageFile(null)
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview)
        setImagePreview(null)
      }
      toast({
        title: "Warehouse Deleted",
        description: "The warehouse has been successfully deleted.",
        duration: 3000,
        style: {
          background: "#4CAF50",
          color: "white",
          fontWeight: "bold",
        },
      })
    } catch (err) {
      console.error('Error deleting warehouse:', err)
      setError('Failed to delete warehouse. Please try again.')
      toast({
        title: "Error",
        description: "Failed to delete warehouse. Please try again.",
        duration: 3000,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const openEditPopup = (warehouse: Warehouse) => {
    setEditingWarehouse(warehouse)
    setNewWarehouse({
      name: warehouse.name,
      address: warehouse.address,
      manager: warehouse.manager,
      phone: warehouse.phone,
    })
    setIsPopupOpen(true)
  }

  const handleCardClick = (warehouseId: string) => {
    setActiveWarehouseId(activeWarehouseId === warehouseId ? null : warehouseId)
  }

  const handleParesInventoryClick = (warehouseId: string) => {
    router.push(`/companies/${companyId}/warehouses/${warehouseId}/pares-inventory`)
  }

  return (
    <div className="min-h-screen bg-blue-100 dark:bg-gray-800">
      <header className="bg-teal-600 text-white p-3 flex items-center">
        <Button variant="ghost" className="text-white p-0 mr-2" onClick={() => router.back()}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-bold flex-grow">Warehouses</h1>
        {hasPermission('delete') && (
        <Button variant="secondary" onClick={() => setIsPopupOpen(true)}>
          + Add Warehouse
        </Button>
        )}
      </header> 

      <main className="container mx-auto p-4 mb-16">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(2)].map((_, index) => (
              <WarehouseCardSkeleton key={index} />
            ))}
          </div>
        ) : warehouses.length === 0 ? (
          <p className="text-center mt-8">You dont have any warehouses yet. Create one to get started!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {warehouses.map((warehouse) => (
              <Card 
                key={warehouse.id} 
                className="overflow-hidden"
                onClick={() => handleCardClick(warehouse.id)}>
                <div className="flex">
                  <div className="w-1/3 relative pb-[33.33%]">
                    <Image
                      src={warehouse.imageUrl} 
                      alt={warehouse.name} 
                      fill 
                      className="absolute object-cover"
                    />
                  </div>
                  <CardContent className="w-2/3 p-4 relative">
                  
                    <div className="absolute top-2 right-2 flex">
                    <DropdownMenu>
                    {activeWarehouseId === warehouse.id && (
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                           )}
                          <DropdownMenuContent className='mr-2'>
                          {hasPermission('update') && (
                            <DropdownMenuItem onClick={() => openEditPopup(warehouse)}>
                              <Pencil className="h-4 w-4 mr-2" />Update
                            </DropdownMenuItem>
                          )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                        {hasPermission('delete') && (
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <Trash2 className="h-4 w-4 mr-2" />Delete
                          </DropdownMenuItem>
                        )}
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the warehouse
                              <span className="font-semibold"> {warehouse.name} </span>
                              and remove the associated image from storage.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteWarehouse(warehouse)} className="bg-red-600 dark:text-gray-200">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <DropdownMenuItem onClick={() => handleParesInventoryClick(warehouse.id)}>
                        Inventory
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                    </div>
                    <h2 className="font-bold mb-2">{warehouse.name}</h2>
                    <p className="text-sm text-gray-600 dark:text-slate-200">{warehouse.address}</p>
                    <p className="text-sm text-gray-600 dark:text-slate-200">Manager: {warehouse.manager}</p>
                    <p className="text-sm text-gray-600 dark:text-slate-200">Phone: {warehouse.phone}</p>
                    
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {isPopupOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start overflow-y-auto p-4">
          <div ref={popupRef} className="w-full max-w-md bg-white rounded-lg shadow-xl mt-20 mb-20">
          <Card className="max-h-[80vh] overflow-y-auto">
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">{editingWarehouse ? 'Edit Warehouse' : 'Create New Warehouse'}</h2>
                <Button variant="ghost" onClick={() => {
                  setIsPopupOpen(false)
                  setEditingWarehouse(null)
                  setNewWarehouse({ name: '', address: '', manager: '', phone: '' })
                  setImageFile(null)
                  if (imagePreview) {
                    URL.revokeObjectURL(imagePreview)
                    setImagePreview(null)
                  }
                }}>
                  <X className="h-6 w-6" />
                </Button>
              </div>
              <form onSubmit={editingWarehouse ? handleUpdateWarehouse : handleCreateWarehouse} className="space-y-4">
                <div>
                  <Label htmlFor="name">Warehouse Name</Label>
                  <Input
                    id="name"
                    value={newWarehouse.name}
                    onChange={(e) => setNewWarehouse({...newWarehouse, name: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={newWarehouse.address}
                    onChange={(e) => setNewWarehouse({...newWarehouse, address: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="manager">Manager</Label>
                  <Input
                    id="manager"
                    value={newWarehouse.manager}
                    onChange={(e) => setNewWarehouse({...newWarehouse, manager: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={newWarehouse.phone}
                    onChange={(e) => setNewWarehouse({...newWarehouse, phone: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="image">Warehouse Image</Label>
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    required={!editingWarehouse}
                  />
                  {imagePreview && (
                    <div className="mt-2">
                      <Image
                        src={imagePreview}
                        alt="Warehouse preview"
                        width={100}
                        height={100}
                        className="rounded-md"
                      />
                    </div>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Processing...' : (editingWarehouse ? 'Update Warehouse' : 'Create Warehouse')}
                </Button>
              </form>
            </CardContent>
          </Card>
          </div>
        </div>
      )}
    </div>
  )
}