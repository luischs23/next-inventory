'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc, collection, getDocs, writeBatch } from 'firebase/firestore'
import { auth, db } from 'app/services/firebase/firebase.config'
import { Button } from "app/components/ui/button"
import { Input } from "app/components/ui/input"
import { Label } from "app/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "app/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "app/components/ui/select"
import { useAuth } from 'app/app/context/AuthContext'

interface Company {
    id: string;
    name: string;
  }

export default function CreateGeneralManagerPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [selectedCompanyId, setSelectedCompanyId] = useState('')
  const [companies, setCompanies] = useState<Company[]>([])
  const [error, setError] = useState('')
  const router = useRouter()
  const { user, userRole, loading } = useAuth()

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const companiesCollection = collection(db, 'companies')
        const companiesSnapshot = await getDocs(companiesCollection)
        const companiesList = companiesSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name
        }))
        setCompanies(companiesList)
      } catch (error) {
        console.error('Error fetching companies:', error)
        setError('Failed to load companies. Please try again.')
      }
    }

    fetchCompanies()
  }, [])
  
  
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password || !firstName || !lastName || !selectedCompanyId) {
      setError('Please fill in all fields')
      return
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const newUser = userCredential.user

      const batch = writeBatch(db)

      // Create user document in the company's users subcollection
      const companyUserRef = doc(db, `companies/${selectedCompanyId}/users`, newUser.uid)
      batch.set(companyUserRef, {
        email: newUser.email,
        firstName,
        lastName,
        role: 'generalManager',
        createdAt: new Date(),
        createdBy: user?.uid
      })

      // Create a reference in the main users collection
      const mainUserRef = doc(db, 'users', newUser.uid)
      batch.set(mainUserRef, {
        email: newUser.email,
        companyId: selectedCompanyId,
        role: 'generalManager'
      })

      await batch.commit()

      router.push('/companies')
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        setError('This email is already in use. Please use a different email address.')
      } else {
        setError('Failed to create an account. Please try again.')
        console.error(error)
      }
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Create General Manager Account</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                type="text"
                placeholder="Enter first name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                type="text"
                placeholder="Enter last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyId">Company</Label>
              <Select onValueChange={setSelectedCompanyId} value={selectedCompanyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button type="submit" className="w-full">Create General Manager Account</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}