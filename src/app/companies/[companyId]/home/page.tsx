'use client'

import { useEffect, useState } from 'react'
import { useAuth } from 'app/app/context/AuthContext'
import { useRouter } from 'next/navigation'
import { Button } from "app/components/ui/button"
import { Card } from "app/components/ui/card"
import Link from 'next/link'
import { 
  Store, 
  Warehouse, 
  FileText, 
  Users, 
  User, 
  Settings, 
  HelpCircle, 
  LogOut 
} from 'lucide-react'
import { db } from 'app/services/firebase/firebase.config'
import { doc, getDoc } from 'firebase/firestore'

export default function Home({ params }: { params: { companyId: string } }) {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [companyName, setCompanyName] = useState('')

  useEffect(() => {
    const fetchCompanyName = async () => {
      if (!user) {
        router.push('/login')
        return
      }

      try {
        const companyRef = doc(db, 'companies', params.companyId)
        const companySnap = await getDoc(companyRef)
        
        if (companySnap.exists()) {
          setCompanyName(companySnap.data().name)
        } else {
          console.error('Company not found')
          router.push('/companies')
        }
      } catch (error) {
        console.error('Error fetching company:', error)
      }
    }

    fetchCompanyName()
  }, [user, params.companyId, router])

  const menuItems = [
    { name: 'Stores', icon: Store, href: `/companies/${params.companyId}/store` },
    { name: 'Warehouses', icon: Warehouse, href: `/companies/${params.companyId}/warehouses` },
    { name: 'Invoices', icon: FileText, href: `/companies/${params.companyId}/invoices` },
    { name: 'Users', icon: Users, href: `/companies/${params.companyId}/users` },
    { name: 'Profile', icon: User, href: `/companies/${params.companyId}/profile` },
    { name: 'Settings', icon: Settings, href: `/companies/${params.companyId}/settings` },
    { name: 'Support', icon: HelpCircle, href: `/companies/${params.companyId}/support` },
  ]

  const handleLogout = () => {  
    logout()
    router.push('/login')
  }

  return (
    <div className="min-h-svh bg-blue-100 flex flex-col">
      {/* Header */}
      <header className="w-full p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">{companyName}</h1>
        <span className="text-gray-700 font-semibold">Welcome, {user?.displayName || 'User'}</span>
      </header>

      {/* Main content */}
      <main className="flex-grow flex items-center justify-center px-4">
        <Card className="w-full max-w-md p-6 bg-white rounded-3xl shadow-xl">
          <h2 className="text-xl font-bold mb-6 text-left text-gray-800">
            Quick Commands
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {menuItems.map((item) => (
              <Link href={item.href} key={item.name}>
                <Button
                  variant="outline"
                  className="w-full h-24 flex flex-col items-center justify-center text-gray-700 hover:bg-blue-50"
                >
                  <item.icon className="w-8 h-8 mb-2" />
                  <span className="text-xs">{item.name}</span>
                </Button>
              </Link>
            ))}
            <Button
              variant="outline"
              className="w-full h-24 flex flex-col items-center justify-center text-gray-700 hover:bg-blue-50"
              onClick={handleLogout}
            >
              <LogOut className="w-8 h-8 mb-2" />
              <span className="text-xs">Sign Out</span>
            </Button>
          </div>
        </Card>
      </main>
    </div>
  )
}