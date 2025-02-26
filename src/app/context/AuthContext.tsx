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
      if (!firebaseUser) {
        console.log("No Firebase user, manteniendo estado actual.");
        setLoading(false);
        return;
      }
  
      try {
        const developerUserRef = doc(db, "users", firebaseUser.uid);
        const developerUserSnap = await getDoc(developerUserRef);
  
        if (developerUserSnap.exists()) {
          setUser({
            ...firebaseUser,
            role: "developer",
            companyId: null,
            name: developerUserSnap.data().name,
            isDeveloper: true,
          });
        } else {
          const companiesRef = collection(db, "companies");
          const companiesSnapshot = await getDocs(companiesRef);
  
          let userFound = false;
          for (const companyDoc of companiesSnapshot.docs) {
            const userDocRef = doc(db, `companies/${companyDoc.id}/users`, firebaseUser.uid);
            const userDocSnap = await getDoc(userDocRef);
  
            if (userDocSnap.exists()) {
              setUser({
                ...firebaseUser,
                role: userDocSnap.data().role,
                companyId: companyDoc.id,
                name: userDocSnap.data().name,
                isDeveloper: false,
              });
              userFound = true;
              break;
            }
          }
  
          if (!userFound) {
            console.log("Usuario no encontrado en empresas, manteniendo sesión.");
          }
        }
      } catch (error) {
        console.error("Error obteniendo datos del usuario:", error);
      } finally {
        setLoading(false);
      }
    });
  
    return () => unsubscribe();
  }, []);
  

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