'use client'

import React, { useState, useEffect } from 'react'
import { collection, query, getDocs } from 'firebase/firestore'
import { db } from 'app/services/firebase/firebase.config';
import { useAuth } from 'app/app/context/AuthContext'
import Sidebar from 'app/components/shared/sidebar/sidebar'
import Header from 'app/components/shared/header/Header'

interface Store {
  id: string;
  name: string;
  // Add other store properties as needed
}

interface Warehouse {
  id: string;
  name: string;
  // Add other warehouse properties as needed
}

interface ClientWrapperProps {
  companyId: string;
}

export default function ClientWrapper({ companyId }: ClientWrapperProps) {
  const { user } = useAuth()
  const [stores, setStores] = useState<Store[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])

  useEffect(() => {
    const fetchData = async () => {
      if (user) {
        const storesQuery = query(collection(db, `companies/${companyId}/stores`))
        const warehousesQuery = query(collection(db, `companies/${companyId}/warehouses`))

        try {
          const [storesSnapshot, warehousesSnapshot] = await Promise.all([
            getDocs(storesQuery),
            getDocs(warehousesQuery),
          ])

          setStores(storesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Store)))
          setWarehouses(warehousesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Warehouse)))
        } catch (error) {
          console.error("Error fetching data:", error)
          // You might want to set an error state here and display it to the user
        }
      }
    }

    fetchData()
  }, [user, companyId])

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar stores={stores} warehouses={warehouses} />
      <div className="flex flex-col flex-1">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-200 p-4">
          {/* Main content area */}
          <h2 className="text-2xl font-semibold mb-4">Dashboard</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-2">Stores</h3>
              <ul>
                {stores.map((store) => (
                  <li key={store.id}>{store.name}</li>
                ))}
              </ul>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-2">Warehouses</h3>
              <ul>
                {warehouses.map((warehouse) => (
                  <li key={warehouse.id}>{warehouse.name}</li>
                ))}
              </ul>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}