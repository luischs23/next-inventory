'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth, db } from 'app/services/firebase/firebase.config'
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore'
import { Button } from "app/components/ui/button"
import { Input } from "app/components/ui/input"
import { Label } from "app/components/ui/label"
import { Card, CardContent } from "app/components/ui/card"
import Link from 'next/link'
import { useAuth } from 'app/app/context/AuthContext'
import { Loader2 } from 'lucide-react'

interface UserData {
  companyId: string
  role: string
  name: string
  email: string
  status: 'active' | 'deleted'
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
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const firebaseUser = userCredential.user

      let userData: UserData | null = null

      const rootUserDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
      if (rootUserDoc.exists()) {
        userData = rootUserDoc.data() as UserData
      } else {
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

      if (userData.status === 'deleted') {
        throw new Error('This account has been deactivated. Please contact support for assistance.')
      }

      setUser({
        ...firebaseUser,
        companyId: userData.companyId,
        role: userData.role,
        name: userData.name
      })

      if (userData.role === 'developer') {
        router.push('/companies')
      } else if (userData.companyId) {
        router.push(`/companies/${userData.companyId}/home`)
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <Card className="w-full max-w-[400px] shadow-lg">
        <CardContent className='flex justify-center items-center'>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              <div className="text-2xl font-bold text-center mt-6">
                Welcome Back
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full"
                />
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-500 text-center">
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span>Logging in...</span>
                </div>
              ) : (
                'Log In'
              )}
            </Button>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-center">
                <Link 
                  href="/forgot-password" 
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium mb-6"
                >
                  Forgot password?
                </Link>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}