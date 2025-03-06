import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getDoc, doc } from "firebase/firestore"
import { db } from "app/services/firebase/firebase.config"
import { getAuth } from "firebase-admin/auth"

// Initialize Firebase Admin if it hasn't been initialized y

const adminAuth = getAuth()

async function getUserRole(userId: string): Promise<string | null> {
  try {
    const userDocRef = doc(db, "users", userId)
    const userDocSnap = await getDoc(userDocRef)

    if (userDocSnap.exists()) {
      const userData = userDocSnap.data()
      return userData?.role || null
    } else {
      return null
    }
  } catch (error) {
    console.error("Error getting user role:", error)
    return null
  }
}

// ... (keep the rest of the middleware code)

export async function middleware(req: NextRequest) {
  const token = req.cookies.get("token")?.value

  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid
    const userRole = await getUserRole(userId)

    if (!userRole) {
      return NextResponse.redirect(new URL("/login", req.url))
    }

    if (req.nextUrl.pathname.startsWith("/admin") && userRole !== "admin") {
      return NextResponse.redirect(new URL("/", req.url))
    }

    return NextResponse.next()
  } catch (error) {
    console.error("Error verifying token:", error)
    return NextResponse.redirect(new URL("/login", req.url))
  }
}

export const config = {
  matcher: ["/admin/:path*", "/profile/:path*"],
}