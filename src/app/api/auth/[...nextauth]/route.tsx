import NextAuth, { AuthOptions, Session, User } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth as firebaseAuth, db } from 'app/services/firebase/firebase.config'
import { doc, getDoc } from 'firebase/firestore'
import { FirebaseError } from 'firebase/app'

// Extend the built-in session interface with our custom properties
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      role: string
      companyId: string
      isFirstLogin: boolean
    }
  }
}

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter an email and password')
        }

        try {
          const userCredential = await signInWithEmailAndPassword(firebaseAuth, credentials.email, credentials.password)
          const user = userCredential.user

          // Check if the user is a developer
          if (credentials.email === process.env.DEVELOPER_EMAIL) {
            return {
              id: user.uid,
              email: user.email,
              role: 'developer',
              companyId: null,
              isFirstLogin: false,
            }
          }

          // For non-developer users, fetch their company and role
          const userDoc = await getDoc(doc(db, 'users', user.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            return {
              id: user.uid,
              email: user.email,
              role: userData.role,
              companyId: userData.companyId,
              isFirstLogin: userData.isFirstLogin,
            }
          } else {
            throw new Error('User not found in the database')
          }
        } catch (error) {
          if (error instanceof FirebaseError) {
            switch (error.code) {
              case 'auth/user-not-found':
              case 'auth/wrong-password':
                throw new Error('Invalid email or password')
              case 'auth/too-many-requests':
                throw new Error('Too many failed login attempts. Please try again later.')
              default:
                throw new Error('An error occurred during sign in. Please try again.')
            }
          }
          throw error
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role 
        token.companyId = user.companyId
        token.isFirstLogin = user.isFirstLogin
      }
      return token
    },
    async session({ session, token }): Promise<Session> {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.companyId = token.companyId as string
        session.user.isFirstLogin = token.isFirstLogin as boolean
      }
      return session
    }
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }

// Utility function for role-based access control
export function canAccessResource(userRole: string, resource: string): boolean {
  const permissions = {
    developer: ['all'],
    manager: ['stores', 'warehouses', 'users'],
    employee: ['stores', 'warehouses'],
  }

  return permissions[userRole]?.includes(resource) || permissions[userRole]?.includes('all')
}

// Custom hook for using auth
export const useAuth = () => {
  const { data: session, status } = useSession()
  
  return {
    user: session?.user,
    isAuthenticated: !!session?.user,
    isLoading: status === 'loading',
    canAccess: (resource: string) => canAccessResource(session?.user?.role || '', resource),
  }
}

export const auth = () => NextAuth(authOptions)