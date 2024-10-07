'use client'

import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from 'app/components/ThemeProvider'
import { AuthProvider } from 'app/app/context/AuthContext'
import { ProductProvider } from 'app/app/context/ProductContext'
import { Session } from 'next-auth'

interface ProvidersProps {
    children: React.ReactNode
    session: Session | null
  }

  export function Providers({ children, session }: ProvidersProps) {
  return (
    <SessionProvider session={session}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <AuthProvider>
          <ProductProvider>
            {children}
          </ProductProvider>
        </AuthProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}