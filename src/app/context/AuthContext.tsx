"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { onAuthStateChanged, type User as FirebaseUser, signOut } from "firebase/auth"
import { auth, db } from "app/services/firebase/firebase.config"
import { doc, getDoc, collection, getDocs, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore"

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
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  setUser: () => {},
  logout: async () => {},
})

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<ExtendedUser | null>(null)
  const [loading, setLoading] = useState(true)

  const logout = useCallback(async () => {
    await signOut(auth)
    setUser(null)
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null)
        setLoading(false)
        return
      }

      try {
        const developerUserRef = doc(db, "users", firebaseUser.uid)
        const developerUserSnap = await getDoc(developerUserRef)

        if (developerUserSnap.exists()) {
          const userData = {
            ...firebaseUser,
            role: "developer",
            companyId: null,
            name: developerUserSnap.data().name,
            isDeveloper: true,
          }
          setUser(userData)
          await setDoc(developerUserRef, { lastActivity: serverTimestamp() }, { merge: true })
        } else {
          const companiesRef = collection(db, "companies")
          const companiesSnapshot = await getDocs(companiesRef)

          let userFound = false
          for (const companyDoc of companiesSnapshot.docs) {
            const userDocRef = doc(db, `companies/${companyDoc.id}/users`, firebaseUser.uid)
            const userDocSnap = await getDoc(userDocRef)

            if (userDocSnap.exists()) {
              const userData = {
                ...firebaseUser,
                role: userDocSnap.data().role,
                companyId: companyDoc.id,
                name: userDocSnap.data().name,
                isDeveloper: false,
              }
              setUser(userData)
              await setDoc(userDocRef, { lastActivity: serverTimestamp() }, { merge: true })
              userFound = true
              break
            }
          }

          if (!userFound) {
            console.log("User not found in companies, maintaining session.")
          }
        }
      } catch (error) {
        console.error("Error getting user data:", error)
      } finally {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (user) {
      const userRef = user.isDeveloper
        ? doc(db, "users", user.uid)
        : doc(db, `companies/${user.companyId}/users`, user.uid);
  
      // 🔍 Verifica cada minuto si el usuario ha estado inactivo
      const interval = setInterval(async () => {
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.lastActivity) {
            const lastActivity = data.lastActivity.toDate();
            const inactiveTime = Date.now() - lastActivity.getTime();
            if (inactiveTime > 30 * 60 * 1000) { // 30 minutos de inactividad
              console.warn("Sesión cerrada por inactividad");
              logout();
            }
          }
        }
      }, 60 * 1000); // 🔄 Verifica cada minuto
  
      // También escucha cambios en tiempo real
      const unsubscribe = onSnapshot(userRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          if (data.lastActivity) {
            const lastActivity = data.lastActivity.toDate();
            const inactiveTime = Date.now() - lastActivity.getTime();
            if (inactiveTime > 30 * 60 * 1000) {
              console.warn("Sesión cerrada por inactividad");
              logout();
            }
          }
        }
      });
  
      return () => {
        clearInterval(interval);
        unsubscribe();
      };
    }
  }, [user, logout]);
  

  const contextValue: AuthContextType = {
    user,
    loading,
    setUser,
    logout,
  }

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)