'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth'
import { auth } from 'app/services/firebase/firebase.config'
import { doc, getDoc, collection, getDocs} from 'firebase/firestore'
import { db } from 'app/services/firebase/firebase.config'

interface ExtendedUser extends FirebaseUser {
  role?: string
  companyId?: string | null
  name?: string
}

interface AuthContextType {
  user: ExtendedUser | null
  loading: boolean
  setUser: (user: ExtendedUser | null) => void
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true,
  setUser: () => {}
})

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<ExtendedUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch additional user data from Firestore
        const companiesRef = collection(db, 'companies')
        const companiesSnapshot = await getDocs(companiesRef)

        for (const companyDoc of companiesSnapshot.docs) {
          const userDocRef = doc(db, `companies/${companyDoc.id}/users`, firebaseUser.uid)
          const userDocSnap = await getDoc(userDocRef)

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data()
            setUser({
              ...firebaseUser,
              role: userData.role,
              companyId: companyDoc.id,
              name: userData.name
            })
            break
          }
        }
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const contextValue: AuthContextType = {
    user,
    loading,
    setUser
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)