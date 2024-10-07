"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { db, auth } from 'app/services/firebase/firebase.config'
import { collection, doc, setDoc, getDocs} from 'firebase/firestore'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { Button } from "app/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "app/components/ui/card"
import { Input } from "app/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "app/components/ui/select"
import { toast } from "app/components/ui/use-toast"

interface User {
  id: string
  email: string
  role: string
  name: string
}

const roles = ['admin', 'warehouse', 'skater', 'seller', 'manager']

export default function UserManagement() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [newUser, setNewUser] = useState({ email: '', role: '', name: '', password: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role && !['developer', 'manager'].includes(session.user.role)) {
      router.push('/')
    }
  }, [session, status, router])

  useEffect(() => {
    const fetchUsers = async () => {
        if (session?.user?.companyId) {
          const usersRef = collection(db, 'companies', session.user.companyId, 'users')
          const usersSnapshot = await getDocs(usersRef)
          const usersList = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User))
          setUsers(usersList)
        }
      }
  
      if (status === 'authenticated' && session?.user?.companyId) {
        fetchUsers()
      }
    }, [session, status])

    const handleCreateUser = async (e: React.FormEvent) => {
       e.preventDefault()
    setLoading(true)

    try {
      if (!session?.user?.companyId) {
         throw new Error('Company ID not found')
      }

      // Create the user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, newUser.email, newUser.password)
      const user = userCredential.user

      // Add the user to Firestore under the company's users collection
      const userRef = doc(db, 'companies', session.user.companyId, 'users', user.uid)
      await setDoc(userRef, {
         uid: user.uid,
        email: user.email,
        role: newUser.role,
        name: newUser.name,
        isFirstLogin: true,
      })

      setUsers([...users, { id: user.uid, ...newUser }])
      setNewUser({ email: '', role: '', name: '', password: '' })
      toast({
        title: "Success",
        description: "User created successfully",
      })
       } catch (error) {
       console.error('Error creating user:', error)
      toast({
           title: "Error",
        description: "Failed to create user. Please try again.",
         variant: "destructive",
      })
    } finally {
      setLoading(false)
     }
  }

  if (status === 'loading') {
    return <div>Loading...</div>
  }

  if (status === 'authenticated' && session?.user?.role && !['developer', 'manager'].includes(session.user.role)) {
    return <div>Access Denied</div>
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">User Management</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Create New User</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <Input
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser({...newUser, email: e.target.value})}
              placeholder="Email"
              required
            />
            <Input
              type="text"
              value={newUser.name}
              onChange={(e) => setNewUser({...newUser, name: e.target.value})}
              placeholder="Name"
              required
            />
            <Select
              value={newUser.role}
              onValueChange={(value) => setNewUser({...newUser, role: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="password"
              value={newUser.password}
              onChange={(e) => setNewUser({...newUser, password: e.target.value})}
              placeholder="Initial Password"
              required
            />
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create User'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((user) => (
          <Card key={user.id}>
            <CardHeader>
              <CardTitle>{user.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Email: {user.email}</p>
              <p>Role: {user.role}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}