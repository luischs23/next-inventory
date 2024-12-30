'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth'
import { auth } from 'app/services/firebase/firebase.config'
import { doc, getDoc, collection, getDocs} from 'firebase/firestore'
import { db } from 'app/services/firebase/firebase.config'

interface ExtendedUser extends FirebaseUser {
  id?: string
  role?: string
  companyId?: string | null
  name?: string
  isDeveloper?: boolean
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
        try {
          // First, check if the user is a developer (outside of companies)
          const developerUserRef = doc(db, 'users', firebaseUser.uid)
          const developerUserSnap = await getDoc(developerUserRef)

          if (developerUserSnap.exists()) {
            const developerData = developerUserSnap.data()
            const userData = {
              ...firebaseUser,
              role: 'developer',
              companyId: null,
              name: developerData.name,
              isDeveloper: true
            }
            setUser(userData)
           
          } else {
            // If not a developer, search in companies
            const companiesRef = collection(db, 'companies')
            const companiesSnapshot = await getDocs(companiesRef)

            let userFound = false
            for (const companyDoc of companiesSnapshot.docs) {
              const userDocRef = doc(db, `companies/${companyDoc.id}/users`, firebaseUser.uid)
              const userDocSnap = await getDoc(userDocRef)

              if (userDocSnap.exists()) {
                const userData = userDocSnap.data()
                const extendedUser = {
                  ...firebaseUser,
                  role: userData.role,
                  companyId: companyDoc.id,
                  name: userData.name,
                  isDeveloper: false
                }
                setUser(extendedUser)
                console.log('AuthProvider: Company user set', extendedUser)
                userFound = true
                break
              }
            }
            if (!userFound) {
              setUser(null)
            }
          }
        } catch (error) {
          console.error('AuthProvider: Error fetching user data:', error)
          setUser(null)
        }
      } else {
        console.log('AuthProvider: No Firebase user, setting user to null')
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