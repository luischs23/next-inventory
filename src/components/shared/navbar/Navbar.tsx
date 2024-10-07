'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, FileText, Package, User, Store, Warehouse } from 'lucide-react'
import { cn } from "app/lib/utils"

const Navbar = () => {
  const pathname = usePathname()

  const navItems = [
    { name: "Home", icon: Home, href: '/home', label: 'Home' },
    { name: "Stores", icon: Store, href: '/store', label: 'Store' },
    { name: "Bodegas", icon: Warehouse, href: '/warehouses', label: 'Warehouses' },
    { name: "Invoices", icon: FileText, href: '/invoices', label: 'invoice' },
    { name: "Users", icon: User, href: '/users', label: 'users' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-10 bg-white dark:bg-gray-800 border-t shadow-lg md:top-0 md:left-0 md:h-screen md:w-16 md:border-r md:border-t-0">
      <div className="flex justify-around md:flex-col md:justify-start md:h-full md:p-4">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors",
              pathname === item.href 
                ? "text-blue-600 dark:text-blue-400" 
                : "text-gray-700 dark:text-gray-300"
            )}
          >
            <item.icon className="h-6 w-6" />
            <span className="text-sm">{item.name}</span>
            <span className="sr-only">{item.label}</span>
          </Link>
        ))}
        <div className="pt-2">
        </div>
      </div>
    </nav>
  )
}

export default Navbar