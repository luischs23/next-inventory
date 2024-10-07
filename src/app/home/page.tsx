'use client'

import { useAuth } from 'app/app/context/AuthContext'
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

export default function Home() {
  const { user, logout } = useAuth()

  const menuItems = [
    { name: 'Stores', icon: Store, href: '/store' },
    { name: 'Warehouses', icon: Warehouse, href: '/warehouses' },
    { name: 'Invoices', icon: FileText, href: '/invoices' },
    { name: 'Users', icon: Users, href: '/users' },
    { name: 'Profile', icon: User, href: '/profile' },
    { name: 'Settings', icon: Settings, href: '/settings' },
    { name: 'Support', icon: HelpCircle, href: '/support' },
  ]

  return (
    <div className="min-h-svh bg-blue-100 flex flex-col">
      {/* Header */}
      <header className="w-full p-4 text-right">
        <span className="text-gray-700 font-semibold">Welcome, {user?.displayName || 'User'}</span>
      </header>

      {/* Main content */}
      <main className="flex-grow flex items-center justify-center px-4">
        <Card className="w-full max-w-md p-6 bg-white rounded-3xl shadow-xl">
          <h1 className="text-xl font-bold mb-6 text-left text-gray-800">
            Quick Commands
          </h1>
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
              onClick={() => logout()}
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