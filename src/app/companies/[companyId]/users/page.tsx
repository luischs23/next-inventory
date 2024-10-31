'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { db, auth } from 'app/services/firebase/firebase.config'
import { collection, getDocs, addDoc, serverTimestamp, deleteDoc, doc, updateDoc, Timestamp } from 'firebase/firestore'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { Button } from "app/components/ui/button"
import { Card, CardContent } from "app/components/ui/card"
import { Input } from "app/components/ui/input"
import { Label } from "app/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "app/components/ui/select"
import { useToast } from "app/components/ui/use-toast"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction} from "app/components/ui/alert-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "app/components/ui/dropdown-menu"
import { PlusIcon, UserIcon, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'

interface User {
  id: string
  name: string
  surname: string
  email: string
  role: string
  createdAt: Timestamp
  companyId: string
  uid: string
}

const roles = [
  { id: 'general_manager', name: 'General Manager' },
  { id: 'warehouse_manager', name: 'Warehouse Manager' },
  { id: 'skater', name: 'Skater' },
  { id: 'warehouse_salesperson', name: 'Warehouse Salesperson' },
  { id: 'pos_salesperson', name: 'Point of Sale Salesperson' },
  { id: 'customer', name: 'Customer' }
]

export default function UsersPage({ params }: { params: { companyId: string } }) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateAlertDialog, setShowCreateAlertDialog] = useState(false)
  const [showUpdateAlertDialog, setShowUpdateAlertDialog] = useState(false)
  const [showDeleteAlertDialog, setShowDeleteAlertDialog] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    email: '',
    password: '',
    role: ''
  })
  
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    fetchUsers()
  }, [params.companyId])

  const fetchUsers = async () => {
    try {
      const usersRef = collection(db, `companies/${params.companyId}/users`)
      const snapshot = await getDocs(usersRef)
      const usersList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as User[]
      setUsers(usersList)
    } catch (error) {
      console.error('Error fetching users:', error)
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
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleRoleChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      role: value
    }))
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      )

      const userData = {
        name: formData.name,
        surname: formData.surname,
        email: formData.email,
        role: formData.role,
        companyId: params.companyId,
        createdAt: serverTimestamp(),
        uid: userCredential.user.uid
      }

      await addDoc(collection(db, `companies/${params.companyId}/users`), userData)

      toast({
        title: "Success",
        description: "User created successfully",
        style: { background: "#4CAF50", color: "white", fontWeight: "bold" },
      })

      setFormData({
        name: '',
        surname: '',
        email: '',
        password: '',
        role: ''
      })
      setShowCreateAlertDialog(false)
      fetchUsers()
    } catch (error) {
      console.error('Error creating user:', error)
      toast({
        title: "Error",
        description: "Failed to create user",
        variant: "destructive",
      })
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return

    try {
      await updateDoc(doc(db, `companies/${params.companyId}/users`, selectedUser.id), {
        name: formData.name,
        surname: formData.surname,
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
      console.error('Error updating user:', error)
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
      await deleteDoc(doc(db, `companies/${params.companyId}/users`, selectedUser.id))

      toast({
        title: "Success",
        description: "User deleted successfully",
        style: { background: "#4CAF50", color: "white", fontWeight: "bold" },
      })

      setShowDeleteAlertDialog(false)
      setSelectedUser(null)
      fetchUsers()
    } catch (error) {
      console.error('Error deleting user:', error)
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      })
    }
  }

  const openUpdateAlertDialog = (user: User) => {
    setSelectedUser(user)
    setFormData({
      name: user.name,
      surname: user.surname,
      email: user.email,
      password: '',
      role: user.role
    })
    setShowUpdateAlertDialog(true)
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Users Management</h1>
        <AlertDialog open={showCreateAlertDialog} onOpenChange={setShowCreateAlertDialog}>
          <AlertDialogTrigger asChild>
            <Button>
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
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="surname">Surname</Label>
                  <Input
                    id="surname"
                    name="surname"
                    value={formData.surname}
                    onChange={handleInputChange}
                    required
                  />
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
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select value={formData.role} onValueChange={handleRoleChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map(role => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full">Create User</Button>
            </form>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map(user => (
          <Card key={user.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <UserIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{user.name} {user.surname}</h3>
                    <p className="text-sm text-gray-500">{user.email}</p>
                    <p className="text-sm text-primary">{roles.find(r => r.id === user.role)?.name}</p>
                  </div>
                </div>
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
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={showUpdateAlertDialog} onOpenChange={setShowUpdateAlertDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update User</AlertDialogTitle>
          </AlertDialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="update-name">Name</Label>
                <Input
                  id="update-name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="update-surname">Surname</Label>
                <Input
                  id="update-surname"
                  name="surname"
                  value={formData.surname}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="update-role">Role</Label>
                <Select value={formData.role} onValueChange={handleRoleChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map(role => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" className="w-full">Update User</Button>
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
                <span className="font-semibold"> {selectedUser.name} {selectedUser.surname}</span>
              )}.
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