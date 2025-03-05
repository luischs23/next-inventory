import { cookies } from 'next/headers'
import jwt, { JwtPayload } from 'jsonwebtoken'
import { db } from 'app/services/firebase/firebase.config'
import { doc, getDoc, collection, getDocs } from 'firebase/firestore'

const SECRET_KEY = process.env.JWT_SECRET || 'your_secret_key'

interface AuthenticatedUser extends JwtPayload {
  uid: string
  role: string
  companyId?: string | null
  name?: string
  isDeveloper?: boolean
}

export async function getUserFromToken(): Promise<AuthenticatedUser | null> {
  const cookieStore = cookies()
  const token = cookieStore.get('token')?.value

  if (!token) return null

  try {
    const decoded = jwt.verify(token, SECRET_KEY) as JwtPayload & { uid: string }
    const { uid } = decoded

    if (!uid) return null

    // Buscar si es un developer
    const developerRef = doc(db, "users", uid)
    const developerSnap = await getDoc(developerRef)

    if (developerSnap.exists()) {
      return {
        uid,
        role: "developer",
        companyId: null,
        name: developerSnap.data().name,
        isDeveloper: true
      }
    }

    // Buscar en las compañías
    const companiesRef = collection(db, "companies")
    const companiesSnapshot = await getDocs(companiesRef)

    for (const companyDoc of companiesSnapshot.docs) {
      const userRef = doc(db, `companies/${companyDoc.id}/users`, uid)
      const userSnap = await getDoc(userRef)

      if (userSnap.exists()) {
        return {
          uid,
          role: userSnap.data().role,
          companyId: companyDoc.id,
          name: userSnap.data().name,
          isDeveloper: false
        }
      }
    }

    return null
  } catch (error) {
    console.error('Error verifying token:', error)
    return null
  }
}