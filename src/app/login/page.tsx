'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth, db } from 'app/services/firebase/firebase.config'
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore'
import { Button } from "app/components/ui/button"
import { Input } from "app/components/ui/input"
import { Label } from "app/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "app/components/ui/card"
import Link from 'next/link'
import { useAuth } from 'app/app/context/AuthContext'
import { Loader2 } from 'lucide-react'

interface UserData {
 
  companyId: string
  role: string
  name: string
  email: string
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { setUser } = useAuth()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!email || !password) {
      setError('Please fill in all fields')
      setLoading(false)
      return
    }

    try {
      // First, authenticate the user
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const firebaseUser = userCredential.user

      // Then, fetch the user's data from Firestore
      let userData: UserData | null = null

      // Check in the root 'users' collection first (for developers)
      const rootUserDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
      if (rootUserDoc.exists()) {
        userData = rootUserDoc.data() as UserData
      } else {
        // If not found in root, check in company-specific collections
        const companiesRef = collection(db, 'companies')
        const companiesSnapshot = await getDocs(companiesRef)

        for (const companyDoc of companiesSnapshot.docs) {
          const usersRef = collection(db, `companies/${companyDoc.id}/users`)
          const q = query(usersRef, where('email', '==', email))
          const querySnapshot = await getDocs(q)

          if (!querySnapshot.empty) {
            userData = querySnapshot.docs[0].data() as UserData
            userData.companyId = companyDoc.id
            break
          }
        }
      }

      if (!userData) {
        throw new Error('User account not found in the system')
      }

      // Set the user in context with additional data
      setUser({
        ...firebaseUser,
        companyId: userData.companyId,
        role: userData.role,
        name: userData.name
      })

      // Redirect based on role and companyId
      if (userData.role === 'developer') {
        router.push('/companies')
      } else if (userData.companyId) {
        switch (userData.role) {
          case 'general_manager':
            router.push(`/companies/${userData.companyId}/home`)
            break
          case 'warehouse_manager':
            router.push(`/companies/${userData.companyId}/home`)
            break
          case 'skater':
          case 'warehouse_salesperson':
            router.push(`/companies/${userData.companyId}/home`)
            break
          case 'pos_salesperson':
            router.push(`/companies/${userData.companyId}/home`)
            break
          case 'customer':
            router.push(`/companies/${userData.companyId}/home`)
            break
          default:
            router.push(`/companies/${userData.companyId}/home`)
        }
      } else {
        throw new Error('User not associated with any company')
      }
    } catch (error) {
      console.error('Login error:', error)
      setError(error instanceof Error ? error.message : 'Failed to log in. Please check your credentials.')
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Log In</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                'Log In'
              )}
            </Button>
          </form>
          <div className="mt-4 text-center space-y-2">
            <p className="text-sm">
              Dont have an account?{' '}
              <Link href="/signup" className="text-blue-500 hover:underline">
                Sign up
              </Link>
            </p>
            <p className="text-sm">
              <Link href="/forgot-password" className="text-blue-500 hover:underline">
                Forgot password?
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}