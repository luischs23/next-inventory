'use client'

import { useEffect, useState } from 'react'
import { useAuth } from 'app/app/context/AuthContext'
import { useRouter } from 'next/navigation'
import { Button } from "app/components/ui/button"
import { Card } from "app/components/ui/card"
import Link from 'next/link'
import Image from 'next/image'
import { Store, Warehouse, FileText, Users, User } from 'lucide-react'
import { db } from 'app/services/firebase/firebase.config'
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'

export default function Home({ params }: { params: { companyId: string } }) {
  const { user } = useAuth()
  const router = useRouter()
  const [companyName, setCompanyName] = useState('')
  const [userProfile, setUserProfile] = useState<{ name: string; photo: string } | null>(null)

  useEffect(() => {
    const fetchCompanyAndUserData = async () => {
      if (!user) {
        return;
      }
      try {
        const companyRef = doc(db, 'companies', params.companyId);
        const companySnap = await getDoc(companyRef);
        if (companySnap.exists()) {
          setCompanyName(companySnap.data().name);
        } else {
          router.push('/companies');
          return;
        }
        // Fetch user profile data
        const usersCollectionRef = collection(db, `companies/${params.companyId}/users`);
        const userQuery = query(usersCollectionRef, where('uid', '==', user.uid));
        const userQuerySnapshot = await getDocs(userQuery);
    
        if (!userQuerySnapshot.empty) {
          const userData = userQuerySnapshot.docs[0].data();
          setUserProfile({
            name: userData.name || user.displayName || 'User',
            photo: userData.photo || ''
          });
        } 
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchCompanyAndUserData()
  }, [user, params.companyId, router])

  const menuItems = [
    { name: 'Stores', icon: Store, href: `/companies/${params.companyId}/store` },
    { name: 'Warehouses', icon: Warehouse, href: `/companies/${params.companyId}/warehouses` },
    { name: 'Invoices', icon: FileText, href: `/companies/${params.companyId}/invoices` },
    { name: 'Users', icon: Users, href: `/companies/${params.companyId}/users` },
    { name: 'Profile', icon: User, href: `/companies/${params.companyId}/profile` },
  ]

  return (
    <div className="min-h-svh bg-blue-100">
      {/* Header */}
      <header className="w-full p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">{companyName}</h1>
        <div className="flex items-center">
        <div className="flex flex-col items-end mr-2">
          <span className="text-gray-700 font-semibold">Welcome,</span>
          <span className="text-gray-600">{userProfile?.name || 'User'}</span>
        </div>
          {userProfile?.photo ? (
            <Image
              src={userProfile.photo}
              alt="User"
              width={40}
              height={40}
              className="rounded-md object-cover"
            />
          ) : (
            <div className="w-10 h-10 bg-gray-300 rounded-md flex items-center justify-center">
              <User className="w-6 h-6 text-gray-600" />
            </div>
          )}
        </div>
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
          </div>
        </Card>
      </main>
    </div>
  )
}