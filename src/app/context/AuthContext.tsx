'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth'
import { auth } from 'app/services/firebase/firebase.config'
import { doc, getDoc, collection, getDocs } from 'firebase/firestore'
import { db } from 'app/services/firebase/firebase.config'
import { toast } from "app/components/ui/use-toast"

interface ExtendedUser extends FirebaseUser {
  role?: string
  companyId?: string | null
  name?: string
}

interface AuthContextType {
  user: ExtendedUser | null
  loading: boolean
  setUser: (user: ExtendedUser | null) => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<ExtendedUser | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUserData = useCallback(async (firebaseUser: FirebaseUser): Promise<ExtendedUser | null> => {
    // First, check the top-level users collection
    const topLevelUserRef = doc(db, 'users', firebaseUser.uid)
    const topLevelUserSnap = await getDoc(topLevelUserRef)

    if (topLevelUserSnap.exists()) {
      const userData = topLevelUserSnap.data()
      return {
        ...firebaseUser,
        role: userData.role,
        companyId: null,
        name: userData.name
      }
    }

    // If not found in top-level, check company subcollections
    const companiesRef = collection(db, 'companies')
    const companiesSnapshot = await getDocs(companiesRef)

    for (const companyDoc of companiesSnapshot.docs) {
      const userDocRef = doc(db, `companies/${companyDoc.id}/users`, firebaseUser.uid)
      const userDocSnap = await getDoc(userDocRef)

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data()
        return {
          ...firebaseUser,
          role: userData.role,
          companyId: companyDoc.id,
          name: userData.name
        }
      }
    }

    console.error('User authenticated but not found in any company or top-level users')
    return null
  }, [])

  const refreshUser = useCallback(async () => {
    if (auth.currentUser) {
      try {
        const refreshedUser = await fetchUserData(auth.currentUser)
        setUser(refreshedUser)
        toast({
          title: "Authentication Status",
          description: `User authenticated. Role: ${refreshedUser?.role || 'Unknown'}`,
        })
      } catch (error) {
        console.error('Error refreshing user data:', error)
        toast({
          title: "Error",
          description: "Failed to refresh user data",
          variant: "destructive",
        })
      }
    }
  }, [fetchUserData])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const extendedUser = await fetchUserData(firebaseUser)
          setUser(extendedUser)
          toast({
            title: "Authentication Status",
            description: `User authenticated. Role: ${extendedUser?.role || 'Unknown'}`,
          })
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error('Error fetching user data:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [fetchUserData])

  const contextValue: AuthContextType = {
    user,
    loading,
    setUser,
    refreshUser
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}