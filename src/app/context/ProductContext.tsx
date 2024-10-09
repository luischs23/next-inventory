'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { collection, getDocs, query, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore'
import { db } from 'app/services/firebase/firebase.config'
import { FieldValue, serverTimestamp } from 'firebase/firestore'
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
  addNewProduct: (product: Omit<Product, 'id' | 'createdAt'>) => Promise<void>
  updateProduct: (product: Product) => Promise<void>
  removeProduct: (id: string) => Promise<void>
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
  const { user, userRole, companyId } = useAuth()

  useEffect(() => {
    const fetchProducts = async () => {
      if (!user || !companyId) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const productsCollection = collection(db, `companies/${companyId}/products`)
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
  }, [user, companyId])

  const addNewProduct = async (product: Omit<Product, 'id' | 'createdAt'>) => {
    if (userRole !== 'admin' || !companyId) {
      console.error('Only admins can add products')
      return
    }

    try {
      const productsCollection = collection(db, `companies/${companyId}/products`)
      const newProductRef = await addDoc(productsCollection, {
        ...product,
        createdAt: serverTimestamp(),
        comments: product.comments || '',
        exhibition: product.exhibition || {}
      })

      const newProduct = {
        ...product,
        id: newProductRef.id,
        createdAt: Date.now()
      } as Product

      setProducts(prevProducts => [newProduct, ...prevProducts])
    } catch (error) {
      console.error('Error adding new product:', error)
    }
  }

  const updateProduct = async (product: Product) => {
    if (userRole !== 'admin' || !companyId) {
      console.error('Only admins can update products')
      return
    }

    try {
      const productRef = doc(db, `companies/${companyId}/products`, product.id)
      const { id, createdAt, ...updateData } = product
      await updateDoc(productRef, updateData)

      setProducts(prevProducts =>
        prevProducts.map(p => p.id === product.id ? product : p)
      )
    } catch (error) {
      console.error('Error updating product:', error)
    }
  }

  const removeProduct = async (id: string) => {
    if (userRole !== 'admin' || !companyId) {
      console.error('Only admins can remove products')
      return
    }

    try {
      const productRef = doc(db, `companies/${companyId}/products`, id)
      await deleteDoc(productRef)

      setProducts(prevProducts => prevProducts.filter(product => product.id !== id))
    } catch (error) {
      console.error('Error removing product:', error)
    }
  }

  return (
    <ProductContext.Provider value={{ products, addNewProduct, updateProduct, removeProduct, loading }}>
      {children}
    </ProductContext.Provider>
  )
}