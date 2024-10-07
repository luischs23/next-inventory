'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { db } from 'app/services/firebase/firebase.config'
import { doc, getDoc, collection, getDocs } from 'firebase/firestore'
import { Card, CardContent, CardHeader, CardTitle } from "app/components/ui/card"
import { Button } from "app/components/ui/button"
import Link from 'next/link'

interface Company {
  id: string
  name: string
  email: string
  phone: string
  address: string
}

interface User {
  id: string
  email: string
  role: string
}

interface Store {
  id: string
  name: string
  address: string
}

export default function CompanyPage({ params }: { params: { companyId: string } }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [company, setCompany] = useState<Company | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role !== 'developer') {
      router.push('/')
    }
  }, [session, status, router])

  useEffect(() => {
    const fetchCompanyData = async () => {
      if (status === 'authenticated' && session?.user?.role === 'developer') {
        try {
          const companyDoc = await getDoc(doc(db, 'companies', params.companyId))
          if (companyDoc.exists()) {
            setCompany({ id: companyDoc.id, ...companyDoc.data() } as Company)
          }

          const usersSnapshot = await getDocs(collection(db, 'companies', params.companyId, 'users'))
          const usersList = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User))
          setUsers(usersList)

          const storesSnapshot = await getDocs(collection(db, 'companies', params.companyId, 'stores'))
          const storesList = storesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Store))
          setStores(storesList)

          setLoading(false)
        } catch (error) {
          console.error('Error fetching company data:', error)
          setLoading(false)
        }
      }
    }

    fetchCompanyData()
  }, [status, session, params.companyId])

  if (loading) {
    return <div>Loading...</div>
  }

  if (status === 'authenticated' && session.user.role !== 'developer') {
    return <div>Access Denied</div>
  }

  if (!company) {
    return <div>Company not found</div>
  }

  return (
    <div className="container mx-auto p-4">
      <Link href="/companies">
        <Button className="mb-4">Back to Companies</Button>
      </Link>

      <h1 className="text-2xl font-bold mb-6">{company.name}</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Company Details</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Email: {company.email}</p>
          <p>Phone: {company.phone}</p>
          <p>Address: {company.address}</p>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent>
          {users.map((user) => (
            <div key={user.id} className="mb-2">
              <p>Email: {user.email}</p>
              <p>Role: {user.role}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stores</CardTitle>
        </CardHeader>
        <CardContent>
          {stores.map((store) => (
            <div key={store.id} className="mb-2">
              <p>Name: {store.name}</p>
              <p>Address: {store.address}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}