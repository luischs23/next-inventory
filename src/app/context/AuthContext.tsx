'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, User } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from 'app/services/firebase/firebase.config'

interface AuthContextType {
  user: User | null
  userRole: string | null
  companyId: string | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({ user: null, userRole: null, companyId: null, loading: true })

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user)
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            setUserRole(userData?.role || null)
            setCompanyId(userData?.companyId || null)
          } else {
            console.error('User document does not exist')
            setUserRole(null)
            setCompanyId(null)
          }
        } catch (error) {
          console.error('Error fetching user data:', error)
          setUserRole(null)
          setCompanyId(null)
        }
      } else {
        setUserRole(null)
        setCompanyId(null)
      }
      setLoading(false)
    })
  
    return () => unsubscribe()
  }, [])
  
  return (
    <AuthContext.Provider value={{ user, userRole, companyId, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)