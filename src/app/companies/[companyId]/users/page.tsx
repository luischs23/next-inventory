'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { db, auth, storage } from 'app/services/firebase/firebase.config'
import { ref, deleteObject } from 'firebase/storage'
import { collection, getDocs, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, getDoc, Timestamp, query, where } from 'firebase/firestore'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { Button } from "app/components/ui/button"
import Image from 'next/image'
import { Card, CardContent } from "app/components/ui/card"
import { Input } from "app/components/ui/input"
import { Label } from "app/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "app/components/ui/select"
import { useToast } from "app/components/ui/use-toast"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "app/components/ui/alert-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "app/components/ui/dropdown-menu"
import { PlusIcon, UserIcon, MoreHorizontal, Pencil, Trash2, Eye, EyeOff, ArrowLeft, FilterIcon } from 'lucide-react'
import { UserSkeleton } from 'app/components/skeletons/UserSkeleton'
import { Switch } from "app/components/ui/switch"
import { Checkbox } from "app/components/ui/checkbox"
import { DeletedUsersView } from 'src/components/DeletedUsersView'
import { withPermission } from "app/components/withPermission"
import { usePermissions } from 'app/hooks/usePermissions'


interface User {
  id: string
  name: string
  email: string
  phone: string
  cc: string
  location: string
  role: string
  createdAt: Timestamp
  companyId: string
  uid: string
  photo: string
  status: "active" | "deleted"
}

const roles = [
  { id: "general_manager", name: "General Manager" },
  { id: "warehouse_manager", name: "Warehouse Manager" },
  { id: "warehouse_salesperson", name: "Warehouse Salesperson" },
  { id: "pos_salesperson", name: "Point of Sale Salesperson" },
  { id: "skater", name: "Skater" },
  { id: "customer", name: "Customer" },
]

function UsersPage({ params }: { params: { companyId: string } }) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateAlertDialog, setShowCreateAlertDialog] = useState(false)
  const [showUpdateAlertDialog, setShowUpdateAlertDialog] = useState(false)
  const [showDeleteAlertDialog, setShowDeleteAlertDialog] = useState(false)
  const [showFilterAlertDialog, setShowFilterAlertDialog] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [activeUserId, setActiveUserId] = useState<string | null>(null)
  const initialFormData = {
    name: "",
    email: "",
    phone: "",
    cc: "",
    location: "",
    password: "",
    role: "",
    photo: "",
  }
  const [formData, setFormData] = useState(initialFormData)
  const [showDeletedUsers, setShowDeletedUsers] = useState(false)
  const [selectedRoles, setSelectedRoles] = useState<string[]>(roles.map((role) => role.id))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const { hasPermission } = usePermissions()

  useEffect(() => {
    fetchUsers()
  }, [params.companyId, showDeletedUsers, selectedRoles])

  const fetchUsers = async () => {
    try {
      const usersRef = collection(db, `companies/${params.companyId}/users`)
      const q = query(
        usersRef,
        where("status", "==", showDeletedUsers ? "deleted" : "active"),
        where("role", "in", selectedRoles),
      )
      const snapshot = await getDocs(q)
      const usersList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as User[]
      setUsers(usersList)
    } catch (error) {
      console.error("Error fetching users:", error)
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target
    if (type === "number") {
      const numValue = value === "" ? "" : Number(value)
      setFormData((prev) => ({
        ...prev,
        [name]: numValue,
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }))
    }
  }

  const handleRoleChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      role: value,
    }))
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.role) return
    setIsSubmitting(true)
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password)

      const userData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        cc: formData.cc,
        location: formData.location,
        role: formData.role,
        companyId: params.companyId,
        createdAt: serverTimestamp(),
        uid: userCredential.user.uid,
        photo: "",
        status: "active",
      }

      await addDoc(collection(db, `companies/${params.companyId}/users`), userData)

      toast({
        title: "Success",
        description: "User created successfully",
        style: { background: "#4CAF50", color: "white", fontWeight: "bold" },
      })

      setFormData(initialFormData)
      setShowCreateAlertDialog(false)
      fetchUsers()
    } catch (error) {
      console.error("Error creating user:", error)
      toast({
        title: "Error",
        description: "Failed to create user",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return

    try {
      await updateDoc(doc(db, `companies/${params.companyId}/users`, selectedUser.id), {
        name: formData.name,
        phone: formData.phone,
        cc: formData.cc,
        location: formData.location,
        role: formData.role,
      })

      toast({
        title: "Success",
        description: "User updated successfully",
        style: { background: "#4CAF50", color: "white", fontWeight: "bold" },
      })

      setShowUpdateAlertDialog(false)
      setSelectedUser(null)
      fetchUsers()
    } catch (error) {
      console.error("Error updating user:", error)
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async () => {
    if (!selectedUser) return

    try {
      await updateDoc(doc(db, `companies/${params.companyId}/users`, selectedUser.id), {
        status: "deleted",
      })

      toast({
        title: "Success",
        description: "User moved to trash successfully",
        style: { background: "#4CAF50", color: "white", fontWeight: "bold" },
      })

      setShowDeleteAlertDialog(false)
      setSelectedUser(null)
      fetchUsers()
    } catch (error) {
      console.error("Error moving user to trash:", error)
      toast({
        title: "Error",
        description: "Failed to move user to trash",
        variant: "destructive",
      })
    }
  }

  const handlePermanentDelete = async (userId: string) => {
    try {
      const userDoc = await getDoc(doc(db, `companies/${params.companyId}/users`, userId))
      const userData = userDoc.data() as User

      if (userData.photo) {
        const photoRef = ref(storage, userData.photo)
        try {
          await deleteObject(photoRef)
        } catch (photoError) {
          console.error("Error deleting profile photo:", photoError)
        }
      }

      await deleteDoc(doc(db, `companies/${params.companyId}/users`, userId))

      toast({
        title: "Success",
        description: "User deleted permanently",
        style: { background: "#4CAF50", color: "white", fontWeight: "bold" },
      })

      fetchUsers()
    } catch (error) {
      console.error("Error deleting user permanently:", error)
      toast({
        title: "Error",
        description: "Failed to delete user permanently",
        variant: "destructive",
      })
    }
  }

  const openUpdateAlertDialog = (user: User) => {
    setSelectedUser(user)
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone,
      cc: user.cc,
      location: user.location,
      password: "",
      role: user.role,
      photo: user.photo,
    })
    setShowUpdateAlertDialog(true)
  }

  const handleCardClick = (userId: string) => {
    setActiveUserId(activeUserId === userId ? null : userId)
  }

  const handleOpenCreateDialog = () => {
    setFormData(initialFormData)
    setShowCreateAlertDialog(true)
  }

  const handleRoleFilter = (roleId: string) => {
    setSelectedRoles((prev) => (prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]))
  }

  const groupedUsers = roles.map((role) => ({
    ...role,
    users: users.filter((user) => user.role === role.id),
  }))

  const handleRestoreUser = async (userId: string) => {
    try {
      await updateDoc(doc(db, `companies/${params.companyId}/users`, userId), {
        status: "active",
      })

      toast({
        title: "Success",
        description: "User restored successfully",
        style: { background: "#4CAF50", color: "white", fontWeight: "bold" },
      })

      fetchUsers()
    } catch (error) {
      console.error("Error restoring user:", error)
      toast({
        title: "Error",
        description: "Failed to restore user",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return <UserSkeleton />
  }

  return (
    <div className="container mx-auto bg-white">
      <header className="bg-teal-600 text-white p-3 flex items-center">
        <Button variant="ghost" className="text-white p-0 mr-2" onClick={() => router.back()}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-bold flex-grow">Users</h1>
        <AlertDialog open={showFilterAlertDialog} onOpenChange={setShowFilterAlertDialog}>
          <AlertDialogTrigger asChild>
            <Button variant="secondary" className="mr-2">
              <FilterIcon className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Filter Users</AlertDialogTitle>
            </AlertDialogHeader>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch id="show-deleted" checked={showDeletedUsers} onCheckedChange={setShowDeletedUsers} />
                <Label htmlFor="show-deleted">Show Deleted Users</Label>
              </div>
              <div>
                <h3 className="mb-2 font-semibold">Filter by Role:</h3>
                {roles.map((role) => (
                  <div key={role.id} className="flex items-center space-x-2 mb-2">
                    <Checkbox
                      id={role.id}
                      checked={selectedRoles.includes(role.id)}
                      onCheckedChange={() => handleRoleFilter(role.id)}
                    />
                    <label htmlFor={role.id}>{role.name}</label>
                  </div>
                ))}
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => setShowFilterAlertDialog(false)}>Apply Filters</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {hasPermission("delete") && (
        <AlertDialog open={showCreateAlertDialog} onOpenChange={setShowCreateAlertDialog}>
          <AlertDialogTrigger asChild>
            <Button variant="secondary" onClick={handleOpenCreateDialog}>
              <PlusIcon className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Create New User</AlertDialogTitle>
            </AlertDialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" name="name" value={formData.name} onChange={handleInputChange} required />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="number"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    max="999999999999999"
                  />
                </div>
                <div>
                  <Label htmlFor="cc">C.C.</Label>
                  <Input
                    id="cc"
                    name="cc"
                    type="number"
                    value={formData.cc}
                    onChange={handleInputChange}
                    required
                    max="9999999999999"
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="relative">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 pt-5 flex items-center text-sm leading-5"
                  >
                    {showPassword ? <Eye className="h-6 w-6" /> : <EyeOff className="h-6 w-6" />}
                  </button>
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select value={formData.role} onValueChange={handleRoleChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={!formData.role || isSubmitting}>
                {isSubmitting ? "Creating..." : "Create User"}
              </Button>
            </form>
          </AlertDialogContent>
        </AlertDialog>
        )}
      </header>
      <main className="container mx-auto p-4 mb-14">
        {showDeletedUsers ? (
          <DeletedUsersView users={users} onRestore={handleRestoreUser} onDelete={handlePermanentDelete} />
        ) : (
          groupedUsers.map(
            (group) =>
              group.users.length > 0 && (
                <div key={group.id} className="mb-8">
                  <h2 className="text-xl font-semibold mb-4 text-teal-600">{group.name}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.users.map((user) => (
                      <Card
                        key={user.id}
                        className="overflow-hidden cursor-pointer"
                        onClick={() => handleCardClick(user.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="w-12 h-12 rounded-full overflow-hidden bg-primary/10">
                                {user.photo ? (
                                  <Image
                                    src={user.photo || "/placeholder.svg"}
                                    alt={`${user.name}`}
                                    width={48}
                                    height={48}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <UserIcon className="w-6 h-6 text-primary" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <h3 className="font-semibold">
                                  {user.name}
                                </h3>
                                <p className="text-sm text-gray-500">{user.email}</p>
                                <p className="text-sm text-primary">{group.name}</p>
                              </div>
                            </div>
                            {activeUserId === user.id && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openUpdateAlertDialog(user)}>
                                    <Pencil className="w-4 h-4 mr-2" />
                                    Update
                                  </DropdownMenuItem>
                                  {hasPermission("delete") && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedUser(user)
                                      setShowDeleteAlertDialog(true)
                                    }}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ),
          )
        )}
      </main>
      <AlertDialog open={showUpdateAlertDialog} onOpenChange={setShowUpdateAlertDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update User</AlertDialogTitle>
          </AlertDialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="update-name">Name</Label>
                <Input id="update-name" name="name" value={formData.name} onChange={handleInputChange} required />
              </div>
              <div>
                <Label htmlFor="update-phone">Phone</Label>
                <Input id="update-phone" name="phone" value={formData.phone} onChange={handleInputChange} required />
              </div>
              <div>
                <Label htmlFor="update-cc">C.C.</Label>
                <Input id="update-cc" name="cc" value={formData.cc} onChange={handleInputChange} required />
              </div>
              <div>
                <Label htmlFor="update-location">Location</Label>
                <Input
                  id="update-location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  required
                />
              </div>
              {hasPermission("delete") && (
              <div>
                <Label htmlFor="update-role">Role</Label>
                <Select value={formData.role} onValueChange={handleRoleChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              )}
              </div>
            <Button type="submit" className="w-full">
              Update User
            </Button>
          </form>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteAlertDialog} onOpenChange={setShowDeleteAlertDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user
              {selectedUser && (
                <span className="font-semibold">
                  {" "}
                  {selectedUser.name}
                </span>
              )}
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default withPermission<{ params: { companyId: string } }>(UsersPage, ["create"])