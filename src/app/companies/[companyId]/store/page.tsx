"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { db, storage, auth } from "app/services/firebase/firebase.config"
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, getDoc, query, where } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from "firebase/storage"
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth"
import { Button } from "app/components/ui/button"
import { Card, CardContent } from "app/components/ui/card"
import { Input } from "app/components/ui/input"
import Link from "next/link"
import { ArrowLeft, MoreVertical, X, Pencil, Trash2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "app/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "app/components/ui/alert-dialog"
import Image from "next/image"
import { usePermissions } from "app/hooks/usePermissions"
import { StoreCardSkeleton } from "app/components/skeletons/StoreCardSkeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "app/components/ui/select"
import { useToast } from "app/components/ui/use-toast"
import imageCompression from "browser-image-compression"

interface Store {
  id: string
  name: string
  address: string
  manager: string
  phone: string
  imageUrl: string
}

interface UserProfile {
  id: string
  name: string
  surname: string
  email: string
  phone: string
  cc: string
  location: string
  role: string
  companyId: string
  photo: string
  uid: string
  isDeveloper?: boolean
}

export default function StoreListPage() {
  const router = useRouter()
  const params = useParams()
  const companyId = params.companyId as string
  const [stores, setStores] = useState<Store[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPopupOpen, setIsPopupOpen] = useState(false)
  const [editingStore, setEditingStore] = useState<Store | null>(null)
  const { toast } = useToast()
  const [newStore, setNewStore] = useState({
    name: "",
    address: "",
    manager: "",
    phone: "",
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [, setUser] = useState<FirebaseUser | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const { hasPermission } = usePermissions()
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null)
  const [storeToDelete, setStoreToDelete] = useState<Store | null>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        fetchUserData(firebaseUser.uid)
      } else {
        setLoading(false)
        router.push("/login")
      }
    })

    return () => unsubscribe()
  }, [router])

  useEffect(() => {
    if (userProfile) {
      fetchStoresAndUsers()
    }
  }, [userProfile]) // Removed unnecessary companyId dependency

  const fetchUserData = async (uid: string) => {
    try {
      // First, check if the user is a developer (outside of companies)
      const developerUserRef = doc(db, "users", uid)
      const developerUserSnap = await getDoc(developerUserRef)

      if (developerUserSnap.exists()) {
        const developerData = developerUserSnap.data()
        setUserProfile({
          id: developerUserSnap.id,
          name: developerData.name || "Developer",
          surname: developerData.surname || "",
          photo: developerData.photo || "",
          role: developerData.role || "Developer",
          isDeveloper: true,
          email: developerData.email || "",
          phone: developerData.phone || "",
          cc: developerData.cc || "",
          location: developerData.location || "",
          companyId: "",
          uid: uid,
        })
      } else {
        // If not a developer, search in companies
        await fetchRegularUserData(uid)
      }
    } catch (error) {
      console.error("Error fetching user data:", error)
      setLoading(false)
    }
  }

  const fetchRegularUserData = async (uid: string) => {
    const userQuery = query(collection(db, `companies/${companyId}/users`), where("uid", "==", uid))
    const userQuerySnapshot = await getDocs(userQuery)

    if (!userQuerySnapshot.empty) {
      const userData = userQuerySnapshot.docs[0].data() as UserProfile
      setUserProfile({
        ...userData,
        id: userQuerySnapshot.docs[0].id,
        isDeveloper: false,
      })
    } else {
      console.error("User not found in the company")
      toast({
        title: "Error",
        description: "User not found in the company",
        variant: "destructive",
      })
    }
    setLoading(false)
  }

  const fetchStoresAndUsers = async () => {
    if (!companyId) return

    setLoading(true)
    setError(null)

    try {
      // Fetch stores
      const storesRef = collection(db, `companies/${companyId}/stores`)
      const storesSnapshot = await getDocs(storesRef)
      const storeList = storesSnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as Store,
      )
      setStores(storeList)

      // Fetch all users
      const usersRef = collection(db, `companies/${companyId}/users`)
      const usersSnapshot = await getDocs(usersRef)
      const userList = usersSnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as UserProfile,
      )
      setUsers(userList)
    } catch (err) {
      console.error("Error fetching data:", err)
      setError("Failed to fetch data. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  const getAvailableManagers = () => {
    const assignedManagers = stores.map((store) => store.manager)
    return users.filter(
      (user) =>
        (user.role === "pos_salesperson" || user.role === "warehouse_salesperson") &&
        (!assignedManagers.includes(user.id) || user.id === newStore.manager),
    )
  }

  const getManagerFullName = (managerId: string) => {
    const manager = users.find((user) => user.id === managerId)
    return manager ? `${manager.name} ${manager.surname}` : "Not assigned"
  }

  const canSeeInvoices = (store: Store) => {
    if (!userProfile) return false

    const adminRoles = ["developer", "general_manager", "warehouse_manager"]
    if (adminRoles.includes(userProfile.role) || userProfile.isDeveloper) {
      return true
    }

    if (userProfile.role === "warehouse_salesperson" || userProfile.role === "pos_salesperson") {
      return store.manager === userProfile.id
    }

    return false
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      try {
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        }
        const compressedFile = await imageCompression(file, options)
        setImageFile(compressedFile)

        // Create a preview URL for the compressed image
        const previewUrl = URL.createObjectURL(compressedFile)
        setImagePreview(previewUrl)
      } catch (error) {
        console.error("Error compressing image:", error)
        toast({
          title: "Error",
          description: "Failed to compress image. Please try again.",
          duration: 3000,
          variant: "destructive",
        })
      }
    }
  }

  const getUniqueFileName = async (originalName: string) => {
    const storageRef = ref(storage, `companies/${companyId}/store-images`)
    const fileList = await listAll(storageRef)
    const existingFiles = fileList.items.map((item) => item.name)

    let uniqueName = originalName
    let counter = 1

    while (existingFiles.includes(uniqueName)) {
      const nameParts = originalName.split(".")
      const extension = nameParts.pop()
      const baseName = nameParts.join(".")
      uniqueName = `${baseName}${counter}.${extension}`
      counter++
    }

    return uniqueName
  }

  const uploadImage = async (file: File) => {
    const uniqueFileName = await getUniqueFileName(file.name)
    const storageRef = ref(storage, `companies/${companyId}/store-images/${uniqueFileName}`)
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
        createdAt: new Date(),
      }
      const docRef = await addDoc(storesRef, newStoreData)
      setStores([...stores, { id: docRef.id, ...newStoreData } as Store])
      setIsPopupOpen(false)
      setNewStore({ name: "", address: "", manager: "", phone: "" })
      setImageFile(null)
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview)
        setImagePreview(null)
      }

      toast({
        title: "Store Created",
        description: "The new store has been successfully created.",
        duration: 3000,
        style: {
          background: "#4CAF50",
          color: "white",
          fontWeight: "bold",
        },
      })
    } catch (err) {
      console.error("Error creating store:", err)
      setError("Failed to create store. Please try again.")
      toast({
        title: "Error",
        description: "Failed to create store. Please try again.",
        duration: 3000,
        variant: "destructive",
      })
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
      const storeRef = doc(db, `companies/${companyId}/stores`, editingStore.id)

      if (imageFile) {
        // Delete the old image if it exists
        if (editingStore.imageUrl) {
          const oldImageRef = ref(storage, editingStore.imageUrl)
          try {
            await deleteObject(oldImageRef)
          } catch (deleteError) {
            console.error("Error deleting old image:", deleteError)
            // Continue with the update even if delete fails
          }
        }

        // Upload the new image with a unique filename
        const imageUrl = await uploadImage(imageFile)
        updatedData.imageUrl = imageUrl
      }

      // Update the store document
      await updateDoc(storeRef, updatedData)

      // Fetch the updated store data
      const updatedStoreDoc = await getDoc(storeRef)
      const updatedStore = { id: updatedStoreDoc.id, ...updatedStoreDoc.data() } as Store

      // Update the stores state
      setStores(stores.map((store) => (store.id === editingStore.id ? updatedStore : store)))

      setIsPopupOpen(false)
      setEditingStore(null)
      setNewStore({ name: "", address: "", manager: "", phone: "" })
      setImageFile(null)
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview)
        setImagePreview(null)
      }

      toast({
        title: "Store Updated",
        description: "The store has been successfully updated.",
        duration: 3000,
        style: {
          background: "#4CAF50",
          color: "white",
          fontWeight: "bold",
        },
      })
    } catch (err) {
      console.error("Error updating store:", err)
      setError("Failed to update store. Please try again.")
      toast({
        title: "Error",
        description: "Failed to update store. Please try again.",
        duration: 3000,
        variant: "destructive",
      })
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
      setStores(stores.filter((store) => store.id !== storeToDelete.id))

      toast({
        title: "Store Deleted",
        description: "The store has been successfully deleted.",
        duration: 3000,
        style: {
          background: "#4CAF50",
          color: "white",
          fontWeight: "bold",
        },
      })
    } catch (err) {
      console.error("Error deleting store:", err)
      setError("Failed to delete store. Please try again.")
      toast({
        title: "Error",
        description: "Failed to delete store. Please try again.",
        duration: 3000,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setStoreToDelete(null)
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

  const handleCardClick = (storeId: string) => {
    setActiveStoreId(activeStoreId === storeId ? null : storeId)
  }

  useEffect(() => {
    // Cleanup function to revoke object URL when component unmounts
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview)
      }
    }
  }, [imagePreview])

  return (
    <div className="min-h-screen bg-blue-100 ">
      <header className="bg-teal-600 text-white p-3 flex items-center">
        <Button variant="ghost" className="text-white p-0 mr-2" onClick={() => router.back()}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-bold flex-grow">Stores</h1>
        {hasPermission("delete") && (
          <Button
            variant="secondary"
            onClick={() => {
              setEditingStore(null)
              setNewStore({ name: "", address: "", manager: "", phone: "" })
              setIsPopupOpen(true)
            }}
          >
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
              <Card key={store.id} className="overflow-hidden cursor-pointer" onClick={() => handleCardClick(store.id)}>
                <div className="flex">
                  <div className="w-1/3 relative pb-[33.33%]">
                    <Image
                      src={store.imageUrl || "/placeholder.svg"}
                      alt={store.name}
                      fill
                      className="absolute object-cover"
                    />
                  </div>
                  <CardContent className="w-2/3 p-4 relative">
                    {activeStoreId === store.id && (
                      <div className="absolute top-2 right-2 flex">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="mr-2">
                            {hasPermission("delete") && (
                              <DropdownMenuItem onClick={() => openEditPopup(store)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                <span>Update</span>
                              </DropdownMenuItem>
                            )}
                            {hasPermission("delete") && (
                              <DropdownMenuItem onSelect={() => setStoreToDelete(store)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Delete</span>
                              </DropdownMenuItem>
                            )}
                            {canSeeInvoices(store) && (
                              <DropdownMenuItem>
                                <Link href={`/companies/${companyId}/store/${store.id}/invoices`}>Invoices</Link>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem>
                              <Link href={`/companies/${companyId}/store/${store.id}/exhibition-inventory`}>
                                Exb Inventory
                              </Link>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                    <h2 className="font-bold mb-2">{store.name}</h2>
                    <p className="text-sm text-gray-600">{store.address}</p>
                    <p className="text-sm text-gray-600">Manager: {getManagerFullName(store.manager)}</p>
                    <p className="text-sm text-gray-600">Phone: {store.phone}</p>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        )}
        {error && <p className="text-red-500 mt-4">{error}</p>}
      </main>

      <AlertDialog open={!!storeToDelete} onOpenChange={() => setStoreToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the store
              <span className="font-semibold"> {storeToDelete?.name} </span>
              and remove all data associated with it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => storeToDelete && handleDeleteStore(storeToDelete)} className="bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isPopupOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 overflow-y-auto">
          <Card className="w-full max-w-md bg-white max-h-[90vh] flex flex-col">
            <CardContent className="p-4 overflow-y-auto flex-grow">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">{editingStore ? "Edit Store" : "Create New Store"}</h2>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setIsPopupOpen(false)
                    if (imagePreview) {
                      URL.revokeObjectURL(imagePreview)
                      setImagePreview(null)
                    }
                  }}
                >
                  <X className="h-6 w-6" />
                </Button>
              </div>
              <form
                onSubmit={editingStore ? handleUpdateStore : handleCreateStore}
                className="space-y-4 flex flex-col h-full"
              >
                <div className="space-y-4 flex-grow overflow-y-auto pr-2">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Store Name
                    </label>
                    <Input
                      id="name"
                      value={newStore.name}
                      onChange={(e) => setNewStore({ ...newStore, name: e.target.value })}
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
                      onChange={(e) => setNewStore({ ...newStore, address: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="manager" className="block text-sm font-medium text-gray-700">
                      Manager
                    </label>
                    <Select
                      value={newStore.manager}
                      onValueChange={(value) => setNewStore({ ...newStore, manager: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a manager" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableManagers().map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name} {user.surname}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                      Phone
                    </label>
                    <Input
                      id="phone"
                      value={newStore.phone}
                      onChange={(e) => setNewStore({ ...newStore, phone: e.target.value })}
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
                    {imagePreview && (
                      <div className="mt-2">
                        <Image
                          src={imagePreview || "/placeholder.svg"}
                          alt="Store preview"
                          width={100}
                          height={100}
                          className="rounded-md"
                        />
                      </div>
                    )}
                  </div>
                </div>
                <Button type="submit" className="w-full mt-4" disabled={loading}>
                  {loading ? "Processing..." : editingStore ? "Update Store" : "Create Store"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}