'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from "app/lib/utils"
import { ThemeToggle } from 'app/components/ThemeToggle'
import { Button } from "app/components/ui/button"
import { ScrollArea } from "app/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "app/components/ui/sheet/sheet"
import { Store, Warehouse, FileText, Users, User, Settings, HelpCircle, Menu } from 'lucide-react'

interface CompanySidebarProps {
  companyId: string
}

const menuItems = [
  { name: 'Stores', icon: Store, href: '/store' },
  { name: 'Warehouses', icon: Warehouse, href: '/warehouses' },
  { name: 'Invoices', icon: FileText, href: '/invoices' },
  { name: 'Users', icon: Users, href: '/users' },
  { name: 'Profile', icon: User, href: '/profile' },
  { name: 'Settings', icon: Settings, href: '/settings' },
  { name: 'Support', icon: HelpCircle, href: '/support' },
]

export function CompanySidebar({ companyId }: CompanySidebarProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="md:hidden fixed left-4 top-4 z-40">
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0">
          <SidebarContent companyId={companyId} pathname={pathname} />
        </SheetContent>
      </Sheet>

      <aside className="hidden md:flex flex-col h-screen w-64 bg-background border-r">
        <SidebarContent companyId={companyId} pathname={pathname} />
      </aside>
    </>
  )
}

function SidebarContent({ companyId, pathname }: { companyId: string; pathname: string }) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-6">
        <h2 className="text-lg font-semibold">Company Dashboard</h2>
      </div>
      <ScrollArea className="flex-1">
        <nav className="flex flex-col gap-2 p-4">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={`/companies/${companyId}${item.href}`}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                pathname === `/companies/${companyId}${item.href}`
                  ? "bg-secondary text-secondary-foreground"
                  : "hover:bg-secondary/80"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          ))}
        </nav>
      </ScrollArea>
      <div className="p-4 border-t">
        <ThemeToggle />
      </div>
    </div>
  )
}