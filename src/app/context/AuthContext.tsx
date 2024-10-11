'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from 'app/services/firebase/firebase.config'

interface ExtendedUser extends FirebaseUser {
  role?: string;
  companyId?: string;
}

interface AuthContextType {
  user: ExtendedUser | null
  userRole: string | null
  companyId: string | null
  isSuperUser: boolean
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  userRole: null, 
  companyId: null, 
  isSuperUser: false, 
  loading: true 
})

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<ExtendedUser | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [isSuperUser, setIsSuperUser] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const idTokenResult = await firebaseUser.getIdTokenResult()
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
          
          if (userDoc.exists()) {
            const userData = userDoc.data()
            const extendedUser: ExtendedUser = {
              ...firebaseUser,
              role: userData?.role || null,
              companyId: userData?.companyId || null
            }
            setUser(extendedUser)
            setUserRole(userData?.role || null)
            setCompanyId(userData?.companyId || null)
            setIsSuperUser(!!idTokenResult.claims.superuser)
          } else {
            console.error('User document does not exist')
            setUser(firebaseUser)
            setUserRole(null)
            setCompanyId(null)
            setIsSuperUser(false)
          }
        } catch (error) {
          console.error('Error fetching user data:', error)
          setUser(firebaseUser)
          setUserRole(null)
          setCompanyId(null)
          setIsSuperUser(false)
        }
      } else {
        setUser(null)
        setUserRole(null)
        setCompanyId(null)
        setIsSuperUser(false)
      }
      setLoading(false)
    })
  
    return () => unsubscribe()
  }, [])
  
  return (
    <AuthContext.Provider value={{ user, userRole, companyId, isSuperUser, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)