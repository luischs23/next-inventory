'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Menu, ChevronDown, Store, Box, Users, LogOut, Home, FileText, Package, User } from 'lucide-react'
import { Button } from "app/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "app/components/ui/dropdown-menu"

const stores = [
  { id: 's1', name: 'Store 1', invoices: true, exbInventory: true, unassignableExb: true },
  { id: 's2', name: 'Store 2', invoices: true, exbInventory: true, unassignableExb: false },
]

const warehouses = [
  { id: 'w1', name: 'Warehouse 1', boxesInventory: true, productInventory: true },
  { id: 'w2', name: 'Warehouse 2', boxesInventory: true, productInventory: false },
]

const routes = [
  { icon: Home, href: '/', label: 'Home' },
  { icon: FileText, href: '/form-product', label: 'Form' },
  { icon: Package, href: '/warehouses', label: 'Inventory' },
  { icon: User, href: '/dashboarduser', label: 'User' },
] 

export default function CreativeHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="bg-gradient-to-r from-gray-500 to-gray-600 text-white p-3 shadow-lg">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center">
            <span className="text-lg font-bold text-slate-300">NI</span>
          </div>
          <h1 className="text-lg font-bold">NextInventory</h1>
        </div>
        
        <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-white hover:bg-slate-200">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 mt-2" align="end">
            <DropdownMenuLabel>Navigation</DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {routes.map((route) => (
              <DropdownMenuItem key={route.href} asChild>
                <Link href={route.href} className="flex items-center">
                  <route.icon className="mr-2 h-4 w-4" />
                  <span>{route.label}</span>
                </Link>
              </DropdownMenuItem>
            ))}
            
            <DropdownMenuSeparator />
            
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Store className="mr-2 h-4 w-4" />
                <span>Stores</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {stores.map((store, index) => (
                  <DropdownMenuSub key={index}>
                    <DropdownMenuSubTrigger>{store.name}</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {store.invoices && (
                        <DropdownMenuItem asChild>
                          <Link href={`/stores/${index}/invoices`}>Invoices</Link>
                        </DropdownMenuItem>
                      )}
                      {store.exbInventory && (
                        <DropdownMenuItem asChild>
                          <Link href={`/stores/${index}/exb-inventory`}>Exb Inventory</Link>
                        </DropdownMenuItem>
                      )}
                      {store.unassignableExb && (
                        <DropdownMenuItem asChild>
                          <Link href={`/stores/${index}/unassignable-exb`}>Unassignable exb</Link>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Box className="mr-2 h-4 w-4" />
                <Link href={"/warehouses"}>Warehouses</Link>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {warehouses.map((warehouse, index) => (
                  <DropdownMenuSub key={warehouse.id}>
                    <DropdownMenuSubTrigger>{warehouse.name}</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {warehouse.boxesInventory && (
                        <DropdownMenuItem asChild>
                          <Link href={`/warehouses/${index}/warehouse-inventory`}>Boxes inventory</Link>
                        </DropdownMenuItem>
                      )}
                      {warehouse.productInventory && (
                        <DropdownMenuItem asChild>
                          <Link href={`/warehouses/${index}/inventory`}>Product inventory</Link>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            
            <DropdownMenuItem asChild>
              <Link href="/users" className="flex items-center">
                <Users className="mr-2 h-4 w-4" />
                <span>Users</span>
              </Link>
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}