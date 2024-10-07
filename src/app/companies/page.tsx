'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { db, auth } from 'app/services/firebase/firebase.config'
import { collection, addDoc, getDocs } from 'firebase/firestore'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { Button } from "app/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "app/components/ui/card"
import { Input } from "app/components/ui/input"
import { toast } from "app/components/ui/use-toast"
import Link from 'next/link'

interface Company {
  id: string
  name: string
  email: string
  phone: string
  address: string
}

export default function CompaniesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [companies, setCompanies] = useState<Company[]>([])
  const [newCompany, setNewCompany] = useState({ name: '', email: '', phone: '', address: '', password: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role !== 'developer') {
      router.push('/')
    }
  }, [session, status, router])

  useEffect(() => {
    const fetchCompanies = async () => {
      const companiesCollection = collection(db, 'companies')
      const companiesSnapshot = await getDocs(companiesCollection)
      const companiesList = companiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company))
      setCompanies(companiesList)
    }

    if (status === 'authenticated' && session?.user?.role === 'developer') {
      fetchCompanies()
    }
  }, [status, session])

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Create the company in Firestore
      const companyRef = await addDoc(collection(db, 'companies'), {
        name: newCompany.name,
        email: newCompany.email,
        phone: newCompany.phone,
        address: newCompany.address,
      })

      // Create the manager user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, newCompany.email, newCompany.password)
      const user = userCredential.user

      // Add the user to Firestore as a subcollection of the company
      await addDoc(collection(db, 'companies', companyRef.id, 'users'), {
        uid: user.uid,
        email: user.email,
        role: 'manager',
        isFirstLogin: true,
      })

      setCompanies([...companies, { id: companyRef.id, ...newCompany }])
      setNewCompany({ name: '', email: '', phone: '', address: '', password: '' })
      toast({
        title: "Success",
        description: "Company created successfully",
      })
    } catch (error) {
      console.error('Error creating company:', error)
      toast({
        title: "Error",
        description: "Failed to create company. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return <div>Loading...</div>
  }

  if (status === 'authenticated' && session.user.role !== 'developer') {
    return <div>Access Denied</div>
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Companies Management</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Create New Company</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateCompany} className="space-y-4">
            <Input
              type="text"
              value={newCompany.name}
              onChange={(e) => setNewCompany({...newCompany, name: e.target.value})}
              placeholder="Company Name"
              required
            />
            <Input
              type="email"
              value={newCompany.email}
              onChange={(e) => setNewCompany({...newCompany, email: e.target.value})}
              placeholder="Manager Email"
              required
            />
            <Input
              type="tel"
              value={newCompany.phone}
              onChange={(e) => setNewCompany({...newCompany, phone: e.target.value})}
              placeholder="Phone"
              required
            />
            <Input
              type="text"
              value={newCompany.address}
              onChange={(e) => setNewCompany({...newCompany, address: e.target.value})}
              placeholder="Address"
              required
            />
            <Input
              type="password"
              value={newCompany.password}
              onChange={(e) => setNewCompany({...newCompany, password: e.target.value})}
              placeholder="Initial Manager Password"
              required
            />
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Company'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {companies.map((company) => (
          <Card key={company.id}>
            <CardHeader>
              <CardTitle>{company.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Email: {company.email}</p>
              <p>Phone: {company.phone}</p>
              <p>Address: {company.address}</p>
              <Link href={`/companies/${company.id}`}>
                <Button className="mt-4">View Details</Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}