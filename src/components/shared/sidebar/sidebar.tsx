'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Store, Briefcase, Package, Users, Settings } from 'lucide-react'

interface SidebarProps {
  stores: { id: string; name: string }[]
  warehouses: { id: string; name: string }[]
}

export default function Sidebar({ stores, warehouses }: SidebarProps) {
  const pathname = usePathname()

  const isActive = (path: string) => pathname.startsWith(path)

  return (
    <aside className="bg-gray-800 text-white w-64 min-h-screen p-4">
      <nav className="space-y-8">
        <div>
          <h2 className="text-xl font-semibold mb-2">Stores</h2>
          <ul className="space-y-2">
            {stores.map((store) => (
              <li key={store.id}>
                <Link href={`/stores/${store.id}`} className={`flex items-center space-x-2 ${isActive(`/stores/${store.id}`) ? 'text-blue-400' : 'hover:text-gray-300'}`}>
                  <Store className="h-5 w-5" />
                  <span>{store.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-2">Warehouses</h2>
          <ul className="space-y-2">
            {warehouses.map((warehouse) => (
              <li key={warehouse.id}>
                <Link href={`/warehouses/${warehouse.id}`} className={`flex items-center space-x-2 ${isActive(`/warehouses/${warehouse.id}`) ? 'text-blue-400' : 'hover:text-gray-300'}`}>
                  <Briefcase className="h-5 w-5" />
                  <span>{warehouse.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-2">Management</h2>
          <ul className="space-y-2">
            <li>
              <Link href="/products" className={`flex items-center space-x-2 ${isActive('/products') ? 'text-blue-400' : 'hover:text-gray-300'}`}>
                <Package className="h-5 w-5" />
                <span>Products</span>
              </Link>
            </li>
            <li>
              <Link href="/users" className={`flex items-center space-x-2 ${isActive('/users') ? 'text-blue-400' : 'hover:text-gray-300'}`}>
                <Users className="h-5 w-5" />
                <span>Users</span>
              </Link>
            </li>
            <li>
              <Link href="/settings" className={`flex items-center space-x-2 ${isActive('/settings') ? 'text-blue-400' : 'hover:text-gray-300'}`}>
                <Settings className="h-5 w-5" />
                <span>Settings</span>
              </Link>
            </li>
          </ul>
        </div>
      </nav>
    </aside>
  )
}