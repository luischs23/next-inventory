"use client"

import { InventoryDashboardComponent } from "app/components/inventory-dashboard"
import ProductCard from "app/components/product-card"
import { useState, useEffect } from 'react'
import { db } from 'app/services/firebase/firebase.config'
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore'
import { useRouter } from 'next/navigation'

interface Product {
  id: string
  brand: string
  reference: string
  color: string
  gender: 'Dama' | 'Hombre'
  sizes: { [key: string]: number }
  imageUrl: string
  total: number
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const router = useRouter()

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const productsCollection = collection(db, 'products')
        const productsSnapshot = await getDocs(productsCollection)
        const productsList = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product))
        setProducts(productsList)
      } catch (error) {
        console.error('Error fetching products:', error)
      }
    }

    fetchProducts()
  }, [])

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'products', id))
      setProducts((prev) => prev.filter((product) => product.id !== id))
    } catch (error) {
      console.error('Error deleting product:', error)
    }
  }

  return (
    <div>
      <section>
        <InventoryDashboardComponent />
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onDelete={() => handleDelete(product.id)}
            onUpdate={() => router.push(`/update-product/${product.id}`)}
          />
        ))}
      </section>
    </div>
  )
}