'use client'

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react'
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from 'app/services/firebase/firebase.config'

interface ExtendedUser extends FirebaseUser {
  role?: string;
  companyId?: string | null;
}

interface AuthContextType {
  user: ExtendedUser | null
  userRole: string | null
  companyId: string | null
  loading: boolean
  setUser: (user: ExtendedUser | null) => void
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  userRole: null, 
  companyId: null, 
  loading: true,
  setUser: () => {}
})

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<ExtendedUser | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const updateUserState = async (firebaseUser: FirebaseUser | null) => {
    if (firebaseUser) {
      try {
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
        } else {
          console.warn('User document does not exist. Creating a default one.')
          const defaultUserData = {
            email: firebaseUser.email,
            role: 'user',
            createdAt: new Date()
          }
          await setDoc(doc(db, 'users', firebaseUser.uid), defaultUserData)
          const extendedUser: ExtendedUser = {
            ...firebaseUser,
            role: 'user',
            companyId: null
          }
          setUser(extendedUser)
          setUserRole('user')
          setCompanyId(null)
        }
      } catch (error) {
        console.error('Error fetching user data:', error)
        // Implement retry logic here if needed
        setUser(firebaseUser)
        setUserRole(null)
        setCompanyId(null)
      }
    } else {
      setUser(null)
      setUserRole(null)
      setCompanyId(null)
    }
    setLoading(false)
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, updateUserState)
    return () => unsubscribe()
  }, [])

  const setUserAndUpdateState = (newUser: ExtendedUser | null) => {
    updateUserState(newUser)
  }
  
  const contextValue = useMemo(() => ({
    user,
    userRole,
    companyId,

    loading,
    setUser: setUserAndUpdateState
  }), [user, userRole, companyId, loading])

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)