'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from 'app/services/firebase/firebase.config'
import { FieldValue } from 'firebase/firestore'

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
}

interface ProductContextType {
  products: Product[]
  addNewProduct: (product: Product) => void
  removeProduct: (id: string) => void
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

  useEffect(() => {
    const fetchProducts = async () => {
      const productsCollection = collection(db, 'products')
      const productsSnapshot = await getDocs(productsCollection)
      const productsList = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product))
      setProducts(productsList)
    }

    fetchProducts()
  }, [])

  const addNewProduct = (product: Product) => {
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
    setProducts(prevProducts => prevProducts.filter(product => product.id !== id))
  }

  return (
    <ProductContext.Provider value={{ products, addNewProduct, removeProduct }}>
      {children}
    </ProductContext.Provider>
  )
}