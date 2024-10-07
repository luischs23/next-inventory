import { useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, DocumentData } from 'firebase/firestore';
import { db } from 'app/services/firebase/firebase.config';

interface Company {
    id: string;
    name: string;
    // Add other company properties as needed
  }
  
  interface AuthUser {
    uid: string;
    email: string;
    role: string;
    companyId: string;
    isFirstLogin: boolean;
    company?: Company;
  }
  
  export function useAuth() {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);
  
    useEffect(() => {
      const auth = getAuth();
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
        if (firebaseUser) {
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userSnap = await getDoc(userRef);
  
          if (userSnap.exists()) {
            const userData = userSnap.data() as DocumentData;
            if (userData.companyId) {
              const companyRef = doc(db, 'companies', userData.companyId);
              const companySnap = await getDoc(companyRef);
              if (companySnap.exists()) {
                setUser({
                  ...userData,
                  company: {
                    id: companySnap.id,
                    ...companySnap.data()
                  } as Company
                } as AuthUser);
              } else {
                setUser(userData as AuthUser);
              }
            } else {
              setUser(userData as AuthUser);
            }
          } else {
            setUser(null);
          }
        } else {
          setUser(null);
        }
        setLoading(false);
      });
  
      return () => unsubscribe();
    }, []);
  
    return { user, loading };
  }