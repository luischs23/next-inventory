'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "app/components/ui/button"
import { Card } from "app/components/ui/card"
import Link from 'next/link'
import Image from 'next/image'
import { Store, Warehouse, FileText, Users, User } from 'lucide-react'
import { db, auth } from 'app/services/firebase/firebase.config'
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth'
import { HomeSkeleton } from 'app/components/skeletons/home-skeleton'
import { usePermissions } from 'app/hooks/usePermissions'

interface UserProfile {
  id: string
  name: string
  surname: string
  photo: string
  role: string
  isDeveloper?: boolean
}

type MenuItem = {
  name: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  href: string
  permissions: string[]
}

export default function Home({ params }: { params: { companyId?: string } }) {
  const router = useRouter()
  const [, setUser] = useState<FirebaseUser | null>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState('')
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const { hasPermission } = usePermissions()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        fetchUserData(firebaseUser.uid)
      } else {
        setLoading(false)
        router.push('/login')
      }
    })

    return () => unsubscribe()
  }, [router])

  useEffect(() => {
    if (params.companyId && userProfile?.isDeveloper) {
      fetchCompanyData(params.companyId)
    }
  }, [params.companyId, userProfile])

  const fetchUserData = async (uid: string) => {
    try {
      // First, check if the user is a developer (outside of companies)
      const developerUserRef = doc(db, 'users', uid)
      const developerUserSnap = await getDoc(developerUserRef)

      if (developerUserSnap.exists()) {
        const developerData = developerUserSnap.data()
        setUserProfile({
          id: developerUserSnap.id,
          name: developerData.name || 'Developer',
          surname: developerData.surname || '',
          photo: developerData.photo || '',
          role: developerData.role || 'Developer',
          isDeveloper: true
        })
        if (params.companyId) {
          fetchCompanyData(params.companyId)
        } else {
          setCompanyName('Developer Dashboard')
          setLoading(false)
        }
      } else {
        // If not a developer, search in companies
        await fetchRegularUserData(uid)
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
      setLoading(false)
    }
  }

  const fetchRegularUserData = async (uid: string) => {
    const companiesRef = collection(db, 'companies')
    const companiesSnapshot = await getDocs(companiesRef)

    for (const companyDoc of companiesSnapshot.docs) {
      const userQuery = query(
        collection(db, `companies/${companyDoc.id}/users`),
        where('uid', '==', uid)
      )
      const userQuerySnapshot = await getDocs(userQuery)

      if (!userQuerySnapshot.empty) {
        const userData = userQuerySnapshot.docs[0].data()
        setUserProfile({
          id: userQuerySnapshot.docs[0].id,
          name: userData.name || 'User',
          surname: userData.surname || '',
          photo: userData.photo || '',
          role: userData.role || 'User',
          isDeveloper: false
        })
        setCompanyId(companyDoc.id)
        await fetchCompanyData(companyDoc.id)
        break
      }
    }
    setLoading(false)
  }

  const fetchCompanyData = async (companyId: string) => {
    try {
      const companyRef = doc(db, 'companies', companyId)
      const companySnap = await getDoc(companyRef)
      if (companySnap.exists()) {
        setCompanyName(companySnap.data().name)
        setCompanyId(companyId)
      } else {
        console.error('Company not found')
        setCompanyName('Company Not Found')
      }
    } catch (error) {
      console.error('Error fetching company data:', error)
      setCompanyName('Error Fetching Company')
    } finally {
      setLoading(false)
    }
  }

  const menuItems: MenuItem[] = companyId
  ? [
      {
        name: 'Stores',
        icon: Store,
        href: `/companies/${companyId}/store`,
        permissions: ['read', 'customer'],
      },
      {
        name: 'Warehouses',
        icon: Warehouse,
        href: `/companies/${companyId}/warehouses`,
        permissions: ['read', 'customer'],
      },
      {
        name: 'Invoices',
        icon: FileText,
        href: `/companies/${companyId}/invoices`,
        permissions: ['create'],
      },
      {
        name: 'Users',
        icon: Users,
        href: `/companies/${companyId}/users`,
        permissions: ['create'],
      },
      {
        name: 'Profile',
        icon: User,
        href: `/companies/${companyId}/profile`,
        permissions: ['read', 'customer'],
      },
    ]
  : []

  const filteredMenuItems = menuItems.filter((item) =>
    item.permissions.some((permission) => hasPermission(permission))
  )

  if (loading) {
    return <HomeSkeleton />
  }

  if (userProfile?.isDeveloper && !companyId) {
    return (
      <div className="min-h-screen bg-blue-100 flex items-center justify-center">
        <Card className="w-full max-w-md p-6 bg-white rounded-3xl shadow-xl">
          <h2 className="text-xl font-bold mb-6 text-center text-gray-800">
            Select a Company
          </h2>
          <Button
            onClick={() => router.push('/companies')}
            className="w-full"
          >
            Go to Companies
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-blue-100">
      {/* Header */}
      <header className="w-full p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">{companyName}</h1>
        <div className="flex items-center">
          <div className="flex flex-col items-end mr-2">
            <span className="text-gray-700 font-semibold">Welcome,</span>
            <span className="text-gray-600">{userProfile ? `${userProfile.name} ${userProfile.surname}` : 'User'}</span>
          </div>
          {userProfile?.photo ? (
            <Image
              src={userProfile.photo}
              alt="User"
              width={40}
              height={40}
              className="rounded-md object-cover"
              onClick={() => router.push(`/companies/${companyId}/profile`)}
            />
          ) : (
            <div className="w-10 h-10 bg-gray-300 rounded-md flex items-center justify-center"
                 onClick={() => router.push(`/companies/${companyId}/profile`)}>
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
            {filteredMenuItems.map((item) => (
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