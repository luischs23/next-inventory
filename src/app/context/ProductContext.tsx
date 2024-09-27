'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { collection, getDocs, query} from 'firebase/firestore'
import { db } from 'app/services/firebase/firebase.config'
import { FieldValue } from 'firebase/firestore'
import { useAuth } from './AuthContext'

interface Product {
  id: string
  brand: string
  reference: string
  color: string
  gender: 'Dama' | 'Hombre'
  sizes: { [key: string]: { quantity: number; barcodes: string[] } }
  total: number
  imageUrl: string
  baseprice: number
  saleprice: number
  createdAt: number | FieldValue
  comments: string
  exhibition: { [store: string]: string }
  warehouseId: string
}

interface ProductContextType {
  products: Product[]
  addNewProduct: (product: Product) => void
  removeProduct: (id: string) => void
  loading: boolean
}

const ProductContext = createContext<ProductContextType | undefined>(undefined)

export const useProducts = () => {
  const context = useContext(ProductContext)
  if (!context) {
    throw new Error('useProducts must be used within a ProductProvider')
  }
  return context
}

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const { user, userRole } = useAuth()

  useEffect(() => {
    const fetchProducts = async () => {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const productsCollection = collection(db, 'products')
        const productsQuery = query(productsCollection)
        const productsSnapshot = await getDocs(productsQuery)
        const productsList = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product))
        setProducts(productsList)
      } catch (error) {
        console.error('Error fetching products:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [user])

  const addNewProduct = (product: Product) => {
    if (userRole !== 'admin') {
      console.error('Only admins can add products')
      return
    }

    setProducts(prevProducts => {
      const newProduct = {
        ...product,
        createdAt: product.createdAt instanceof FieldValue ? Date.now() : product.createdAt,
        comments: product.comments || '',
        exhibition: product.exhibition || {}
      }
  
      const index = prevProducts.findIndex(p => p.id === product.id)
      if (index !== -1) {
        // If the product already exists, update it
        return prevProducts.map(p => p.id === product.id ? newProduct : p)
      } else {
        // If it's a new product, add it to the beginning of the array
        return [newProduct, ...prevProducts]
      }
    })
  } 

  const removeProduct = (id: string) => {
    if (userRole !== 'admin') {
      console.error('Only admins can remove products')
      return
    }

    setProducts(prevProducts => prevProducts.filter(product => product.id !== id))
  }

  return (
    <ProductContext.Provider value={{ products, addNewProduct, removeProduct, loading }}>
      {children}
    </ProductContext.Provider>
  )
}